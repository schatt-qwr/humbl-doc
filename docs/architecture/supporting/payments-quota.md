---
sidebar_position: 4
title: Payments & Quota
---

# Payments & Quota

The payments and quota system tracks cloud LM usage, enforces tier limits, and provides rate limiting. Client-side enforcement is for UX only (immediate feedback to the user before a request is sent). Server-side enforcement via Supabase Edge Functions is authoritative -- the client can be bypassed, but the server cannot.

All classes live in `humbl_core/lib/payments/`.

## What

The quota system answers two questions on every cloud LM request:

1. **Can this user make this request right now?** (Rate limits: RPM and TPM within a sliding window.)
2. **Does this user have budget remaining this month?** (Token quota: monthly cap by subscription tier.)

It also provides the data for the usage dashboard: how many tokens were used, which models, which providers, what did it cost, and how is usage trending over the billing period.

## Why

Humbl is edge-first -- 60-80% of queries run on-device via the SLM at zero marginal cost. But complex queries escalate to cloud providers (OpenAI, Anthropic, Gemini, etc.), and each cloud token costs money. Without quota enforcement:

- A free-tier user could drain Humbl's cloud API budget accidentally (or maliciously).
- A paid user could exceed their subscription's value within hours via rapid-fire requests.
- There would be no visibility into cost -- users would be surprised by charges, and Humbl would have no data for pricing decisions.

The dual client/server architecture exists because:

- **Client-side** provides instant feedback. The user sees "You've used 90% of your monthly quota" or "Rate limited, try again in 3 seconds" without waiting for a network round-trip.
- **Server-side** is the source of truth. A tampered client cannot bypass Supabase Edge Function validation. The server maintains the authoritative monthly counter and rejects requests that exceed the user's entitlement.

## How It Connects

```
Pipeline → IQuotaManager.checkRateLimit() → allow/deny
    │
    ▼
LmGateway → IQuotaManager.recordUsage() → SpendLog (SQLite)
    │                                          │
    ▼                                          ▼
QuotaManager ◄── refreshLocal() ◄── Supabase Edge Function (spend-log)
```

1. Before any cloud LM request, the pipeline calls `QuotaManager.checkRateLimit()`. This checks the `SlidingWindowCounter` for RPM/TPM limits and the current month's token usage against the tier cap. If denied, the pipeline falls back to the local SLM or returns an error.

2. After a cloud LM response, `LmGateway` calls `QuotaManager.recordUsage()`. This writes a `SpendEntry` to the local `SpendLog` SQLite table and increments the sliding window counters. The entry includes the model, provider, token counts (input + output), cost in USD, and the quota source that was charged.

3. Periodically (and on app launch), `QuotaManager.refreshLocal()` syncs the local spend data with the Supabase backend. The server returns the authoritative monthly usage counter, which corrects any drift from multi-device usage or server-side adjustments.

## QuotaManager

Concrete implementation of `IQuotaManager`. Wraps `SpendLog` for persistence and `SlidingWindowCounter` for rate limiting.

```dart
class QuotaManager implements IQuotaManager {
  QuotaManager({required SpendLog spendLog});

  QuotaSnapshot getSnapshot(String userId);
  Future<void> recordUsage(String instanceId, String userId, TokenUsage usage);
  ProviderQuotaInfo? getProviderQuota(String instanceId);
  Future<void> refreshLocal(String userId);
  void updateTier(String userId, String tier, {int? monthlyLimit, int? topUp});
  QuotaCheckResult checkRateLimit(String userId, {int estimatedTokens = 0});
  String warningLevel(String userId);
}
```

### Quota Chain Priority

When a cloud request arrives, quota sources are checked in order:

1. **Privacy/cloud-less mode** -- Block all cloud requests. The user has explicitly opted out of cloud processing. Fail immediately with `QuotaCheckResult.denied('cloud-less mode enabled')`.

2. **Tier monthly quota** -- Deduct from the monthly token budget included in the user's subscription. Free tier has 0 cloud tokens (all local). Standard/Plus/Ultimate have increasing caps.

3. **Top-up balance** -- If the monthly quota is exhausted, deduct from prepaid credits (purchased via in-app purchase). Credits are denominated in INR (1 credit = 1 INR) and converted to tokens at the current exchange rate.

4. **BYOK key** -- If the user has configured their own API key for a provider (Bring Your Own Key), route via that key. Humbl quota is not consumed -- the user pays their provider directly. Usage is still tracked locally for the dashboard, but no Humbl-side limit is enforced.

5. **None available** -- Fall back to local SLM. The request is re-routed to on-device inference. If the local model cannot handle the request (context too large, task too complex), return an error explaining that cloud quota is exhausted.

### Tier Limits

| Tier | Monthly Tokens | RPM | TPM | Background Agent Slots |
|------|---------------|-----|-----|----------------------|
| `free` | 0 | 0 | 0 | 0 (local only) |
| `standard` | 500,000 | 10 | 50,000 | 2 |
| `plus` | 750,000 | 20 | 100,000 | 5 |
| `ultimate` | 1,000,000 | 60 | 300,000 | 10 |

Free-tier users get the full Humbl experience locally -- SLM classification, tool execution, voice interaction, memory -- all without cloud access. Cloud escalation is a paid feature.

RPM (requests per minute) prevents burst abuse. TPM (tokens per minute) prevents sustained high-volume abuse. Both are enforced client-side via `SlidingWindowCounter` and server-side via the Edge Function.

### BYOK (Bring Your Own Key)

BYOK users configure their own API keys in Humbl settings (e.g., their personal OpenAI API key). When a cloud request is routed via a BYOK key:

- The request goes directly to the provider using the user's key.
- **No Humbl quota is consumed.** The user pays their provider directly.
- **Usage is still tracked** in the local `SpendLog` for the dashboard. The user can see how many tokens they've used and what it cost (estimated from public pricing).
- **No rate limiting by Humbl.** The provider's own rate limits apply.
- The `quota_source` field in `SpendEntry` is set to `'byok'`.

### QuotaCheckResult

Sealed class for quota check outcomes:

```dart
sealed class QuotaCheckResult {
  bool get isAllowed;
  String? get reason;

  const factory QuotaCheckResult.allowed();
  const factory QuotaCheckResult.denied(String reason);
  const factory QuotaCheckResult.rateLimited(String reason);
}
```

The distinction between `denied` and `rateLimited` is important for UX:
- **`denied`** means the user has exhausted their monthly quota or is in cloud-less mode. The UI shows a persistent warning and suggests upgrading or purchasing credits.
- **`rateLimited`** means the user is sending requests too fast. The UI shows `timeUntilSlot` ("Try again in 3 seconds") and auto-retries after the delay.

### Warning Levels

The `warningLevel()` method returns dashboard alerts based on monthly usage percentage:

| Level | Condition | UI Treatment |
|-------|-----------|--------------|
| `none` | Under 80% usage | No indicator |
| `approaching_80` | 80-89% usage | Yellow badge on quota widget |
| `approaching_90` | 90-99% usage | Orange badge + notification |
| `exhausted` | 100%+ usage | Red badge + "Upgrade" CTA |

## SpendLog

SQLite-backed spend tracking. Separate from the system journal because they have different lifecycles: the journal is for audit/debugging and follows 180-day retention rules, while the SpendLog is for billing and retains data for the current billing period plus history for the dashboard.

### How SpendLog Works

Every cloud LM API call -- whether routed via Humbl quota, top-up credits, or BYOK -- writes a `SpendEntry` to the `spend_log` table. The entry records:

- **Who:** `userId`
- **What model:** `modelId` (e.g., `claude-sonnet-4-20250514`, `gpt-4o`)
- **What provider:** `providerId` (e.g., `anthropic`, `openai`)
- **What was charged:** `quotaSource` (`subscription`, `top_up`, `promo`, `referral`, `byok`, `local`)
- **How much:** `inputTokens`, `outputTokens`, `costUsd` (computed from the provider's public pricing)
- **Correlation:** `traceId` linking back to the pipeline run in the journal

```dart
class SpendLog {
  static Future<SpendLog> open(String dbPath);
  static Future<SpendLog> fromDatabase(Database db);

  Future<void> record(SpendEntry entry);
  Future<int> monthlyTokensUsed(String userId);
  Future<double> monthlySpendUsd(String userId);
  Future<List<Map<String, dynamic>>> modelBreakdown(String userId, {DateTime? since});
  Future<List<Map<String, dynamic>>> sourceBreakdown(String userId, {DateTime? since});
  Future<List<Map<String, dynamic>>> dailySpend(String userId, {int days = 30});
  Future<void> close();
}
```

### Dashboard Queries

The SpendLog provides five query methods for the usage dashboard:

| Method | Returns | Dashboard Widget |
|--------|---------|-----------------|
| `monthlyTokensUsed(userId)` | Total tokens (input + output) this month | Quota progress bar |
| `monthlySpendUsd(userId)` | Total cost in USD this month | Cost display (converted to INR for UI) |
| `modelBreakdown(userId)` | Per-model token and cost breakdown | Pie chart: "60% Claude, 30% GPT-4o, 10% local" |
| `sourceBreakdown(userId)` | Per-source breakdown (subscription, top-up, byok) | Bar chart: which quota pools were charged |
| `dailySpend(userId, days: 30)` | Day-by-day token and cost totals | Line chart: usage trend over time |

All user-facing pricing is displayed in INR. The `costUsd` stored in the database is converted to INR using an exchange rate pushed from the Supabase server. There is no hardcoded fallback rate -- if the server rate is unavailable (offline), the UI shows tokens only and hides the INR cost.

### SpendEntry

```dart
class SpendEntry {
  final String userId;
  final String modelId;
  final String providerId;
  final String quotaSource;  // 'subscription', 'top_up', 'promo', 'referral', 'byok', 'local'
  final int inputTokens;
  final int outputTokens;
  final double costUsd;
  final String? traceId;
  final DateTime timestamp;

  int get totalTokens => inputTokens + outputTokens;
}
```

### Schema

```sql
CREATE TABLE spend_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  model_id TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  quota_source TEXT NOT NULL,
  input_tokens INTEGER NOT NULL,
  output_tokens INTEGER NOT NULL,
  cost_usd REAL NOT NULL,
  trace_id TEXT,
  timestamp TEXT NOT NULL
);

CREATE INDEX idx_spend_user_month ON spend_log (user_id, timestamp);
CREATE INDEX idx_spend_model      ON spend_log (model_id, timestamp);
```

The `fromDatabase()` pattern means SpendLog shares `humbl_core.db` with `SettingsService` and `ModelIndex`. It creates the `spend_log` table idempotently and sets `_ownsDb = false` to prevent double-close (the caller owns the database handle).

## SlidingWindowCounter

Client-side rate limiter for RPM (requests per minute) and TPM (tokens per minute). Uses a sliding window algorithm -- not a fixed window -- to prevent burst-at-boundary attacks (sending 10 requests at 0:59 and 10 more at 1:01 would bypass a fixed 1-minute window but not a sliding one).

```dart
class SlidingWindowCounter {
  SlidingWindowCounter({Duration window = const Duration(minutes: 1)});

  int get currentCount;
  bool wouldExceed(int limit, {int count = 1});
  void record(int count);
  Duration? get timeUntilSlot;
  void reset();
}
```

### How It Works

The counter maintains a list of `(timestamp, count)` entries. On each `wouldExceed()` check:

1. Purge entries older than `window` duration.
2. Sum remaining counts.
3. Return `true` if `sum + count > limit`.

`timeUntilSlot` returns the duration until the oldest entry in the window expires, giving the UI a precise "try again in X seconds" message.

Two counters are maintained per user: one for RPM (incremented by 1 per request) and one for TPM (incremented by `estimatedTokens` per request). Both must allow the request for it to proceed.

## PaymentRouter & PaymentConfig

Payment routing selects the correct payment handler based on platform and subscription state.

- `PaymentConfig` holds tier definitions, pricing, and feature flags. All pricing is server-driven -- the app fetches pricing from Supabase on launch and caches locally. No pricing is hardcoded.
- `PaymentRouter` dispatches to the appropriate payment provider (Google Play on Android, App Store on iOS, Stripe on desktop/web).

### Pricing Tiers

| Tier | Description | Cloud Access | Background Agents |
|------|-------------|-------------|-------------------|
| `free` | Full local experience, no cloud | None | Local only |
| `standard` | Cloud access with moderate limits | 500K tokens/month | 2 cloud slots |
| `plus` | Higher limits, more features | 750K tokens/month | 5 cloud slots |
| `ultimate` | Maximum limits, all features | 1M tokens/month | 10 cloud slots |

All user-facing pricing is in INR. USD is used only for internal provider cost reconciliation (the `cost_usd` field in SpendLog).

### Credit System

Credits are the prepaid currency for Humbl cloud access. 1 credit = 1 INR. Credits can be:

- **Purchased** via in-app purchase (Google Play, App Store) or Stripe.
- **Earned** via referral program (both referrer and referee get credits).
- **Granted** via promotional campaigns.

When the monthly subscription quota is exhausted, credits are consumed automatically (if available). The `quota_source` field tracks which pool was charged for each request.

## Server-Side: Supabase Edge Function

The `spend-log` Edge Function (`humbl_backend/supabase/functions/spend-log/`) provides server-side quota enforcement:

- **Validates spend entries** against the user's subscription tier and remaining quota.
- **Maintains the authoritative monthly usage counter** in Supabase PostgreSQL. This is the source of truth -- the client's local SpendLog is a cache.
- **Returns updated quota snapshots** for client-side caching. After each server-side recording, the function returns `{tokensUsed, tokensLimit, creditsRemaining}` so the client can update its local state.
- **Handles multi-device reconciliation.** If the user sends requests from both phone and desktop, the server aggregates usage across all devices.

The Edge Function runs on Supabase's Deno runtime, close to the database. Latency for the validation call is ~50-100ms, which is added to the cloud LM request. The pipeline can optionally pre-check server-side quota at session start and rely on client-side checks during the session for lower latency.

## Source Files

| File | Description |
|------|-------------|
| `humbl_core/lib/payments/quota_manager.dart` | QuotaManager, QuotaCheckResult |
| `humbl_core/lib/payments/spend_log.dart` | SpendLog, SpendEntry |
| `humbl_core/lib/payments/sliding_window_counter.dart` | SlidingWindowCounter |
| `humbl_core/lib/payments/payment_router.dart` | PaymentRouter |
| `humbl_core/lib/payments/payment_config.dart` | PaymentConfig |
| `humbl_backend/supabase/functions/spend-log/` | Server-side quota enforcement Edge Function |
