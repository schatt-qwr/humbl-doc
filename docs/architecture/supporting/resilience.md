---
sidebar_position: 1
title: Resilience
---

# Resilience

Humbl's resilience layer provides automatic recovery from transient failures without burdening tool authors or pipeline nodes with retry logic. Three components work together: **CircuitBreaker** prevents hammering a failing service, **RetryPolicy** controls backoff timing, and **ResilientExecutor** orchestrates both. A fourth component, **Heartbeat**, detects silent failures through push-first monitoring with poll fallback.

All classes live in `humbl_core/lib/resilience/`.

## What

The resilience layer is a set of composable primitives that any service or tool can use to handle transient failures gracefully. Rather than each connector, tool, or service implementing its own retry logic (which inevitably leads to inconsistent behavior, missing jitter, and thundering herds), the resilience layer provides a single `ResilientExecutor` that wraps any async operation with retry, circuit breaking, and fallback.

## Why

Humbl interacts with unreliable external services constantly:

- **Cloud LM providers** (OpenAI, Anthropic, Gemini) return HTTP 429/500/503 regularly, especially during peak hours.
- **BLE connections** to smart glasses drop when the user walks to another room.
- **MCP servers** (external tool providers) may be slow or temporarily unavailable.
- **Supabase** may be unreachable during network transitions (WiFi to cellular).

Without resilience primitives, each of these failure modes would either crash the pipeline or require every caller to implement its own retry loop. The resilience layer centralizes this logic so that:

- A tool author writes `executor.execute(serviceId: 'anthropic', operation: () => api.call())` and gets retry + circuit breaking + fallback for free.
- A failing provider is automatically avoided (circuit breaker open) so subsequent requests don't waste time hitting a known-down service.
- Retries use exponential backoff with jitter, preventing thundering herd when a provider recovers.

## How It Connects

```
Tool / Connector / Service
         │
         ▼
  ResilientExecutor
    ├── CircuitBreakerRegistry.getOrCreate(serviceId)
    │     └── CircuitBreaker (per service)
    ├── RetryPolicy (configurable per call)
    └── Optional fallback function
         │
         ▼
  Success → CircuitBreaker.recordSuccess()
  Failure → CircuitBreaker.recordFailure() → classify → retry or rethrow
```

The `HumblLmGateway` uses `CooldownRegistry` (which wraps circuit breaker concepts) to skip providers that are failing. When a provider fails, it enters exponential cooldown. The gateway's routing algorithm filters out cooled-down providers before selecting the next eligible one. Heartbeats feed additional health data into this filtering.

## CircuitBreaker

A per-service circuit breaker that tracks recent failures and trips open when a threshold is exceeded. This prevents the system from repeatedly calling a service that is clearly down -- saving latency, reducing load on the failing service, and allowing it to recover.

### How It Works

The circuit breaker implements a three-state machine:

**Closed (normal operation).** Requests flow through normally. Each failure is timestamped and added to a sliding window. When the number of failures within the window exceeds `failureThreshold`, the circuit trips to open.

**Open (failing fast).** All requests fail immediately with `CircuitBreakerOpenException` -- no network call is made. This state lasts for `openDuration` (default 30 seconds). After that period, the circuit transitions to half-open automatically on the next `allowRequest` check.

**Half-open (probing).** One test request is allowed through. If it succeeds, the circuit closes (back to normal) and the failure history is cleared. If it fails, the circuit re-opens for another `openDuration` period. Only one request is admitted in half-open -- all others fail fast.

```
         success
  ┌──────────────────┐
  │                  │
  ▼                  │
closed ──(threshold)──► open ──(timeout)──► halfOpen
  ▲                                           │
  │              failure                      │
  └───────────────────────────────────────────┘
```

### States

| State | Behavior |
|-------|----------|
| `closed` | Requests flow through normally. Failures are counted within a sliding window. |
| `open` | All requests fail immediately (no network call). Transitions to `halfOpen` after `openDuration` elapses. |
| `halfOpen` | One test request is allowed through. Success closes the circuit; failure re-opens it. |

### Configuration

```dart
CircuitBreaker({
  required String serviceId,
  int failureThreshold = 5,
  Duration openDuration = const Duration(seconds: 30),
  Duration windowDuration = const Duration(seconds: 60),
});
```

| Parameter | Default | Description |
|-----------|---------|-------------|
| `serviceId` | required | Identifies the service (used in logs and registry lookup) |
| `failureThreshold` | 5 | Number of failures within `windowDuration` before tripping open |
| `openDuration` | 30s | How long the circuit stays open before allowing a probe request |
| `windowDuration` | 60s | Sliding window for counting failures. Failures older than this are discarded. |

**Tuning guidance:** For latency-sensitive services (LM inference), use a lower threshold (3) and shorter open duration (15s). For background services (cloud sync), use a higher threshold (10) and longer open duration (60s) to avoid premature tripping on transient network blips.

### Key Properties

| Property | Type | Description |
|----------|------|-------------|
| `state` | `CircuitState` | Current state (auto-transitions from `open` to `halfOpen` on time check) |
| `allowRequest` | `bool` | Whether a request should be attempted now |

### Methods

| Method | Description |
|--------|-------------|
| `recordSuccess()` | Transitions `halfOpen` to `closed`, clears failure history. In `closed` state, this is a no-op. |
| `recordFailure()` | Adds failure timestamp to the sliding window. Trips circuit to `open` if threshold is exceeded in `closed` state. Re-opens if in `halfOpen` state. |
| `reset()` | Force-resets to `closed` with empty failure history (for testing or manual recovery). |

### CircuitBreakerRegistry

A centralized map of breakers keyed by service ID. Services retrieve their breaker via the registry rather than creating and managing their own instances. This ensures one breaker per service across the entire app.

```dart
final registry = CircuitBreakerRegistry();
final breaker = registry.getOrCreate('anthropic', failureThreshold: 3);
registry.resetAll(); // Force-close all breakers (useful after network recovery)
```

The registry is injected into `ResilientExecutor` at construction. When the executor runs an operation for service ID `'anthropic'`, it calls `registry.getOrCreate('anthropic')` to get or create the breaker, then checks `allowRequest` before proceeding.

## RetryPolicy

Configures exponential backoff with jitter for transient failures. The policy is stateless -- it computes delays from the attempt number without maintaining internal state. This means the same policy instance can be shared across concurrent operations.

```dart
class RetryPolicy {
  final int maxAttempts;
  final Duration baseDelay;
  final Duration maxDelay;
  final double jitterFactor; // 0.0-1.0

  Duration delayForAttempt(int attempt);
}
```

### Why Exponential Backoff with Jitter?

Fixed-delay retries cause thundering herd: if a service goes down and 100 clients all retry after exactly 1 second, the service gets hammered by 100 simultaneous requests when it comes back up. Exponential backoff spreads retries over time (1s, 2s, 4s, 8s...). Jitter adds randomness so that even clients with identical backoff schedules don't collide.

### Delay Calculation

```
base = min(baseDelay * 2^(attempt-1), maxDelay)
jitter = base * jitterFactor * random(-1.0, 1.0)
delay = base + jitter
```

Example with `baseDelay=1s, maxDelay=10s, jitterFactor=0.25`:
- Attempt 1: 1s +/- 0.25s = 0.75-1.25s
- Attempt 2: 2s +/- 0.5s = 1.5-2.5s
- Attempt 3: 4s +/- 1s = 3-5s
- Attempt 4: 8s +/- 2s = 6-10s
- Attempt 5: 10s +/- 2.5s = 7.5-10s (capped)

### Built-in Presets

| Preset | maxAttempts | baseDelay | maxDelay | Use Case |
|--------|------------|-----------|----------|----------|
| `RetryPolicy.none` | 0 | -- | -- | No retries. Use for operations that should fail fast (user-facing, latency-critical). |
| `RetryPolicy.fast` | 2 | 100ms | 500ms | Local operations (SQLite write, file I/O). Failures are usually transient (file lock). |
| `RetryPolicy.standard` | 3 | 1s | 10s | Network operations (HTTP API calls). Covers typical cloud provider blips. |
| `RetryPolicy.aggressive` | 5 | 2s | 60s | Critical operations (auth token refresh, cloud sync). These must eventually succeed. |

### Error Classification

Errors are classified to determine whether retrying is appropriate. This prevents wasting time retrying errors that will never succeed (like a 401 authentication failure).

| Category | Retryable | Examples | Why |
|----------|-----------|----------|-----|
| `transient` | Yes | Timeout, connection reset, broken pipe | Server was momentarily overloaded or the connection was interrupted. |
| `serverError` | Yes | HTTP 500, 502, 503 | Server-side issue, likely to resolve on its own. |
| `rateLimited` | Yes | HTTP 429, "rate limit" in message | The request was valid but throttled. Retry after backoff will likely succeed. |
| `unknown` | Yes | Unrecognized errors | Conservative: retry in case it was transient. Better to retry unnecessarily than to fail permanently on a recoverable error. |
| `clientError` | No | HTTP 401, 403, 404 | The request itself is wrong. Retrying the same request will get the same result. |
| `networkUnavailable` | No | DNS failure, no route to host | No connectivity. Retrying wastes battery. Wait for a `NetworkStateChangedEvent` to indicate recovery. |

The `classifyError()` function inspects the exception type, HTTP status code, and error message to categorize. Custom classification can be provided via the `isRetryable` callback on `ResilientExecutor.execute()`.

## ResilientExecutor

Orchestrates retry and circuit breaker in a single call. This is the primary API for resilient operations. Tool authors, connectors, and services use `ResilientExecutor` rather than directly interacting with `CircuitBreaker` and `RetryPolicy`.

```dart
class ResilientExecutor {
  ResilientExecutor({
    required CircuitBreakerRegistry circuitBreakers,
    RetryPolicy defaultPolicy = RetryPolicy.standard,
  });

  Future<T> execute<T>({
    required String serviceId,
    required Future<T> Function() operation,
    Future<T> Function()? fallback,
    RetryPolicy? policy,
    bool Function(Object error)? isRetryable,
  });

  Future<T> executeWithTimeout<T>({
    required String serviceId,
    required Future<T> Function() operation,
    required Duration timeout,
    Future<T> Function()? fallback,
    RetryPolicy? policy,
  });
}
```

### Execution Flow (Step by Step)

1. **Circuit breaker check.** Get or create the breaker for `serviceId`. If the breaker is open, skip directly to step 5 (fallback). This avoids wasting time on a service known to be down.

2. **Attempt the operation.** Call `operation()`. This is the actual work -- an HTTP request, a BLE write, a database query.

3. **On success.** Call `breaker.recordSuccess()`. If the breaker was in `halfOpen`, this closes it. Return the result.

4. **On failure.** Call `breaker.recordFailure()`. Classify the error:
   - If **not retryable** (client error, network unavailable): skip to step 5.
   - If **retryable** and attempts remaining: wait for `policy.delayForAttempt(attempt)`, then go to step 1.
   - If **retryable** but all attempts exhausted: skip to step 5.

5. **Fallback or rethrow.** If a `fallback` function was provided, call it and return its result. Otherwise, rethrow the last error. The fallback is the escape hatch -- e.g., falling back to the local SLM when a cloud provider fails.

### Usage Example

```dart
final executor = ResilientExecutor(
  circuitBreakers: CircuitBreakerRegistry(),
  defaultPolicy: RetryPolicy.standard,
);

// Cloud LM call with local fallback
final response = await executor.execute(
  serviceId: 'anthropic',
  operation: () => anthropicConnector.complete(request),
  fallback: () => localLm.complete(request),
  policy: RetryPolicy.standard, // 3 retries, 1s-10s backoff
);

// BLE write with fast retry, no fallback
await executor.execute(
  serviceId: 'ble_glasses',
  operation: () => bleTransport.write(command),
  policy: RetryPolicy.fast, // 2 retries, 100ms-500ms backoff
);

// Critical sync with aggressive retry
await executor.execute(
  serviceId: 'supabase_sync',
  operation: () => syncService.pushPendingEntries(),
  policy: RetryPolicy.aggressive, // 5 retries, 2s-60s backoff
);
```

### CircuitBreakerOpenException

Thrown when the circuit is open and no fallback is provided:

```dart
class CircuitBreakerOpenException implements Exception {
  final String serviceId;
}
```

Callers can catch this specifically to provide a user-facing message: "The cloud service is temporarily unavailable. Your request will be processed locally."

## Heartbeat

Detects when a service becomes unresponsive through two complementary modes. Heartbeats feed health data into circuit breakers and the LM gateway's routing algorithm.

### Why Heartbeat?

Circuit breakers only detect failures when you try to use a service. If no requests are made (e.g., during a period of local-only processing), the breaker stays in whatever state it was in. Heartbeats provide passive health monitoring:

- **Push mode** detects active disconnections. BLE emits a disconnect event, WebSocket emits a close frame. These are immediate -- the system knows within milliseconds that the service is down.
- **Poll mode** detects silent failures. If a BLE device stops responding to GATT pings but never sends a disconnect (radio interference, device crash), the poll catches it after the timeout. Similarly, if an HTTP health endpoint stops responding, the poll detects it.

The push-first design minimizes unnecessary polling. If push events are flowing, the poll timer is unnecessary overhead. Polling activates only when push events stop or as a safety net for services that don't support push.

```dart
class Heartbeat {
  Heartbeat({
    required String serviceId,
    Duration timeout = const Duration(seconds: 60),
    Duration? pollInterval,
    Future<bool> Function()? healthCheck,
  });

  bool get isHealthy;
  Duration? get timeSinceLastBeat;
  Stream<HeartbeatStatus> get status;

  void beat();       // Push mode: call when alive signal received
  void start();      // Begin monitoring
  void stop();       // Stop monitoring
  Future<void> dispose();
}
```

### How It Works

1. On `start()`, a timer begins counting from now.
2. Each `beat()` call (push event) resets the timer.
3. If `pollInterval` is set, a periodic timer fires the `healthCheck()` function. A successful check calls `beat()` internally.
4. If no `beat()` is received within `timeout`, the service is marked unhealthy and a `HeartbeatStatus(isHealthy: false)` is emitted on the `status` stream.
5. The next `beat()` restores health and emits `HeartbeatStatus(isHealthy: true)`.

### Per-Module Configuration

| Module | Mode | Interval | Timeout | Why This Config |
|--------|------|----------|---------|-----------------|
| BLE | Push + Poll | 35s GATT ping | 60s | BLE disconnect events are fast (push). GATT ping catches silent radio loss (poll). 35s interval is below the 60s timeout to allow one missed poll before declaring unhealthy. |
| MCP | Push only | -- | 60s | MCP servers send keep-alive over WebSocket. No poll needed -- if keep-alive stops, the timeout fires. |
| LLM providers | Poll only | 60s HTTP health check | 120s | Cloud APIs don't push health. Poll their health endpoint. 120s timeout allows for transient network blips. |
| Supabase | Push only | Realtime subscription | 60s | Supabase Realtime sends periodic heartbeats. Loss of heartbeat indicates disconnection. |

### HeartbeatStatus

```dart
class HeartbeatStatus {
  final String serviceId;
  final bool isHealthy;
  final DateTime timestamp;
}
```

### HeartbeatRegistry

Centralized registry of all heartbeat monitors. The LM gateway and service dashboard query this to get a snapshot of service health.

```dart
class HeartbeatRegistry {
  Heartbeat register(Heartbeat heartbeat);
  Heartbeat? get(String serviceId);
  List<Heartbeat> get all;
  List<String> get unhealthyServices;
  Future<void> disposeAll();
}
```

`unhealthyServices` returns the IDs of all services currently marked unhealthy. The LM gateway uses this to filter out unhealthy providers before routing. The debug dashboard displays it as a service health grid.

## Integration with LM Gateway

The `HumblLmGateway` uses `CooldownRegistry` (which wraps circuit breaker concepts) to skip providers that are failing. The integration works as follows:

1. When a provider request fails, `CooldownRegistry.recordFailure(providerId)` is called. The provider enters exponential cooldown (similar to circuit breaker open state).
2. Before routing a new request, the gateway calls `CooldownRegistry.isInCooldown(providerId)` for each candidate provider. Cooled-down providers are filtered out.
3. If a heartbeat marks a provider unhealthy, the gateway additionally filters it out via `HeartbeatRegistry.unhealthyServices`.
4. When a provider recovers (successful request or heartbeat resumes), the cooldown is cleared.

This means the gateway automatically routes around failures without explicit configuration. If Anthropic's API is down, requests automatically go to OpenAI or Gemini. When Anthropic recovers (half-open probe succeeds), it re-enters the routing pool.

## Source Files

| File | Description |
|------|-------------|
| `humbl_core/lib/resilience/circuit_breaker.dart` | CircuitBreaker + CircuitBreakerRegistry |
| `humbl_core/lib/resilience/retry_policy.dart` | RetryPolicy + ErrorCategory + classifyError() |
| `humbl_core/lib/resilience/resilient_executor.dart` | ResilientExecutor |
| `humbl_core/lib/resilience/heartbeat.dart` | Heartbeat + HeartbeatRegistry |
