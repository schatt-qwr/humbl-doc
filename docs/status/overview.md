---
sidebar_position: 1
title: Implementation Status
---

# Implementation Status

_Last updated: 2026-04-21 (branch `claude/implement-plan-folder-TFg7A`, 184 commits ahead of `main`)._

This page is a **snapshot of truth**: what exists today, what's planned next, and what's still open. The working principle of this doc: **current state is stated descriptively, future work is clearly separated.** If a claim reads like a normative rule ("must stay X"), it should be read as "currently X" unless traced to a user-stated requirement.

## Truth — What Exists Today

### Framework Packages (`packages/`)

| Package | Port of | Tests | What it is |
|---|---|---:|---|
| `langchain_dart` | LangChain Core | 175+ (incl. migrated tracer tests) | Faithful Dart port: Runnables (LCEL), Tools, Memory, Callbacks, Chat Models, Prompts, Output Parsers, Documents, Embeddings, Vector Stores, Retrievers, Stores, **Tracers** (generic BaseTracer/Run/RunType/Console/InMemory migrated here 2026-04-21) |
| `langchain_graph` | LangGraph | 128 | Faithful Dart port: StateGraph, channels (LastValue, Topic, BinaryOperatorAggregate, EphemeralValue), checkpointing (InMemory, SQLite, Postgres), prebuilt agents (ReAct, Supervisor, Swarm, Handoff, Plan-and-Execute, Hierarchical), Runtime |
| `litellm_dart` | LiteLLM | 113 | Faithful Dart port: Router (5 strategies), 12 provider adapters, Cost Calculator, SpendLog, Cooldown, Budget, embedding + image APIs, acompletion, Redis cache |
| `langfuse_dart` | Langfuse | 45 | Faithful Dart port: LangfuseClient with batch ingestion (auto-flush 5s, max 20 per batch, re-queue on failure), LangfuseTracer extends BaseTracer, full Trace / Observation / Score / Usage / Dataset types |

### FFI Plugins (`packages/`)

| Package | Tests | What it is |
|---|---:|---|
| `whisper_dart` | 51 | Flutter FFI plugin for whisper.cpp on-device STT. `ffiPlugin: true` for android/windows/linux/ios/macos. **Native `.so` / `.dll` / `.dylib` binaries are not yet bundled.** |
| `piper_dart` | 28 | Flutter FFI plugin for Piper on-device TTS. Same plugin shape. **Native binaries not yet bundled.** |

### Humbl Dart Packages

| Package | Tests | Lib files | Status |
|---|---:|---:|---|
| `humbl_core` | 732 (1 flaky) | 436 | Central Flutter plugin. Tool registry, StateGraph pipeline, 21 platform managers, tools (70+), services, auth, memory (T1–T4 SQLite), LM gateway, devices SDK, voice session orchestrator, payments/quota, MCP, resilience, settings. |
| `humbl_app` | 200 | 127 | Primary Flutter app (`com.qwr.humbl`). 40 screens, 16 BLoCs, 24 widgets, navigation, 20-step startup wiring. Langfuse + Sentry wired. |
| `humbl_lm` | 2 | 16 | 10+ LM connectors (Anthropic, OpenAI, Gemini, Mistral, Cohere, xAI, Sarvam, Ollama, LM Studio, OpenAI-compatible) + LmScheduler (stale — see pending) + adapter training scaffolding. |
| `humbl_voice` | 6 | 15 | STT/TTS provider implementations, Silero VAD engine, audio stream buffer, mic source. 5 STT + 6 TTS. |
| `humbl_runtime` | 2 | 11 | llama.cpp FFI, ONNX, whisper.cpp, ExecuTorch (stub), LiteRT (stub), GpuDetector. |
| `humbl_integrations` | 0 | 1 | **Scaffolded 2026-04-21.** Landing spot for 3rd party service bindings (Spotify, Google, Apple, fitness, email). Replaces deleted `humbl_features` / `humbl_connectors` / `humbl_utility` shells. |

### Backend (`humbl_backend/`)

Not a Dart package — no `pubspec.yaml`. Deliberately multi-language:

- **`agent_worker/`** — Python Cloud Run worker (FastAPI + LangGraph), 10 files
- **`supabase/functions/`** — 42 TypeScript/Deno Edge Functions including: `dispatch-agent-job`, `verify-quota`, `micro-agent-runner`, `cloud-sync`, `journal-sync`, `expire-subscriptions`, `gateway-models`, `gateway-providers`, and streaming proxies for Anthropic / Gemini / Cohere
- **Auto-deploy** configured

### What's Actually Working

- **Pipeline.** 4-node `buildHumblPipeline()` on `StateGraph` from `langchain_graph`. Streaming, cancellation, concurrent runs, superstep execution.
- **Tool system.** `HumblTool extends BaseTool`. Named gates (Policy → Access → Permission → validate → Quota → Resource). 70+ tools, 6 callback handlers.
- **LM Gateway.** `HumblChatModel extends BaseChatModel` routing through `litellm_dart Router`. 10+ connectors, 5 strategies, cooldown, budget.
- **Memory.** `IMemoryService extends BaseMemory`, `ConversationStore implements BaseChatMessageHistory`, SQLite persistence, T1–T4 hierarchy (partial).
- **Tracing (new 2026-04-21).** Decorator stack `ConfidentialTracer → MetricsTracer → LangfuseTracer` wired in `main.dart`. Sentry also wired for crash reporting.
- **App frontend.** 40 screens implemented (not the earlier claimed 34). All auth, onboarding, chat, media, features, settings, security, and agent-inbox screens exist.

## Plans — What's Being Worked On

| Item | Plan doc | Status |
|---|---|---|
| Native library bundling (whisper_dart + piper_dart `.so`/`.dll`/`.dylib`) | `docs/superpowers/plans/2026-04-07-native-library-bundling.md` | Plan exists; execution pending |
| SP9 Vision-to-Text finish (`VisionProviderRouter`, `VisionSessionRunner`, GPT-4V / Gemini Vision / on-device providers) | `docs/superpowers/plans/2026-04-02-sp9-vision-to-text.md` | Partial implementation |
| Cloud agent backend end-to-end (SP12) | `memory/design-cloud-agent-backend.md` | Designed: local-primary, 3 tiers, 25+1 agents, message bus. Not yet implemented. |
| Connected device capabilities (DPVR G1, Mentra Live BLE `connect()` / `disconnect()`) | `docs/superpowers/plans/2026-04-09-connected-device-capabilities.md` | Providers exist, methods throw UnimplementedError |
| UI Sprint 3 feature screens (memory browser, notes, journal, badges, voice enrollment) | `docs/superpowers/plans/2026-04-09-ui-port-sp3-feature-screens.md` | Complete (merged) |

## Pending — Open Design and Trailing Work

These are real gaps, grouped by type. See `memory/pending-design-items.md` for the load-bearing detail.

### Design-level (not yet implemented, require decisions)

1. **INR pricing tables in QuotaManager.** FREE / STANDARD (₹199) / PLUS (₹399) / ULTIMATE (₹799). Per-tier cloud AI budgets, premium/standard/budget model caps, top-up packs (₹49 / ₹99 / ₹249 / ₹499), BYOK, cross-device flag, INR-primary FX policy with Supabase-cron-updated exchange rates. Not yet encoded in code.
2. **MCP offline / local-network routing.** Replace `HumblTool.requiresCloud: bool` (too coarse) with `requiresInternet` / `worksOnLocalNetwork` / `worksOffline`. `ToolRegistry.available(context)` filters by `DeviceState.hasNetwork + hasLocalNetwork`. Pipeline `RouteDecisionNode` must be connectivity-aware.
3. **SP9 Local Networking subsystem.** `INetworkDiscoveryService` (mDNS + UDP multicast + BLE), `ILocalTransferService` (HTTPS REST + WiFi Direct + BT), `IRemoteFileService` (SFTP, FTP, SMB, WebDAV), `INetworkToolService` (ping, subnet scan, port scan, WOL). Cross-user sharing via mDNS + consent + TLS.
4. **SoC execution-provider strategy.** Per-silicon table (Qualcomm Snapdragon, MediaTek, Exynos, Google Tensor, Intel NPU, AMD XDNA, Qualcomm Snapdragon X, AMD ROCm, Intel Arc, Google Coral). Fallback chains to CPU baseline. 6 ARM variants for llama.cpp. Auto-detect at first launch.
5. **Cloud Sync IDataSyncService.** Universal orchestrator partial; pluggable `ICloudSyncProvider` backends (HumblCloud / Google Drive / iCloud / OneDrive) not built; per-category conflict resolution pending.
6. **Runtime deferrals.** Play Asset Delivery (post-MVP), LiteRT-LM (stub), MediaPipe LLM Inference (not integrated), ONNX Runtime GenAI (pending).

### Trailing work (implementation-only, no open decisions)

- **LmScheduler rewrite** (`humbl_lm/lib/scheduling/lm_scheduler.dart` still references the old `ILmGateway` — rewrite on top of `BaseChatModel`)
- **VoiceSessionRunner → StreamSessionCoordinator rename** (class + interface + directory + ~587 test lines)
- **UserTier `'plus'` → `'premium'` residual cleanup** (check JSON / SQL for stringly-typed leftovers)
- **Receipt verification** (`humbl_backend/.../verify-purchase.ts` always returns valid; 2 micro-agent handlers stubbed)
- **Test backfill** — zero tests in: `mcp/`, `resilience/`, `services/`, `settings/`, `sync/`, `input/`, `voice_activity_detection/`

### Explicitly undecided by design

- **BG Agent Tool Policy on iOS** — needs BGTaskScheduler research before committing a design
- **LM Warm Start strategy** — cold-start mitigation not yet scoped

## Recent Session Activity (2026-04-21)

- `b64c2652f` — BaseTracer migration: moved generic tracing primitives from `langsmith_dart` to `langchain_dart/lib/src/tracers/`. Deleted `langsmith_dart` entirely (LangSmith-specific client, feedback, evaluation discarded — Humbl uses Langfuse).
- `ecceba7d9` — Root `analysis_options.yaml`: exclude `humbl_references/**`, `qwr_companion_main_reference/**`, `build/`, `.dart_tool/`, and generated files from analyzer.
- `376636162` — Package consolidation: deleted `humbl_features/`, `humbl_connectors/`, `humbl_utility/` (empty shells whose scopes already lived elsewhere). Created `humbl_integrations/` as the single landing spot for 3rd-party service bindings.

See [Roadmap](./roadmap) for the sprint-by-sprint view and [Test Coverage](./test-coverage) for per-package test detail.
