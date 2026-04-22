---
sidebar_position: 3
title: Test Coverage
---

# Test Coverage

_Last updated: 2026-04-21._

## Summary

| Test Type | Status | Notes |
|---|---|---|
| Unit | healthy ratios in framework packages; gaps in domain packages | **1564 unit tests across 161 files in 11 Dart packages** (verified 2026-04-21 via static count; all packages pass `very_good test`; zero `@Skip` markers) |
| Integration | 0% | No multi-module wiring tests |
| E2E | 0% | No full pipeline turn tests |
| Device | 0% | No Android/iOS hardware tests |
| Manual | 0% | No formal QA test plans |

Baseline count of 1528 (1527 pass, 1 flaky) was verified on 2026-04-10. Re-verified 2026-04-21 after the BaseTracer migration and package consolidation — current total is **1564 tests across 161 files**, all passing. The suite _grew_ through the refactor (net +36) despite discarding the LangSmith-specific `client_test.dart`, `evaluation/evaluate_test.dart`, `evaluation/evaluation_test.dart`, and `feedback`-related tests; `run_test.dart` + `tracer_test.dart` moved into `langchain_dart`.

Prior audits under-reported three domain packages because they counted test files rather than `test(...)` invocations — the corrected numbers for `humbl_voice`, `humbl_lm`, and `humbl_runtime` appear in the per-package table below.

## Tests by Package

### Framework packages (`packages/`)

| Package | Tests | Test Files | Groups | Key Coverage |
|---|---:|---:|---:|---|
| `langchain_dart` | 200 | 24 | 53 | LCEL chains; runnables (Assign / Pick / Each / Binding / Generator / Retry / Fallbacks); tool rendering; memory (buffer / summary / entity); callbacks; prompts (FewShot, Pipeline); parsers (XML); retrievers (contextual compression); fake models; **tracers** (BaseTracer, Run, RunType, ConsoleTracer, InMemoryTracer — migrated from langsmith_dart 2026-04-21) |
| `langchain_graph` | 128 | 15 | 38 | StateGraph compilation; superstep execution; `Send` fan-out; fan-in barriers; subgraph composition; MessageGraph; channels; checkpointing (InMemory / SQLite / Postgres); 6 prebuilt agents |
| `litellm_dart` | 113 | 11 | 30 | Router strategies (simple / costBased / leastBusy / latencyBased / usageBased); 12 provider adapters; cost calculation; cooldown with exponential backoff; embedding + image APIs; budget manager with rolling window; `acompletion` pipeline; Redis response cache |
| `langfuse_dart` | 45 | 6 | 13 | Client with batch ingestion (auto-flush 5s, max 20 per batch, re-queue on failure); LangfuseTracer extending BaseTracer; Trace / Observation / Score / Usage / Dataset types |

### FFI plugins (`packages/`)

| Package | Tests | Test Files | Groups | Notes |
|---|---:|---:|---:|---|
| `whisper_dart` | 51 | 3 | 11 | Dart bindings + type layer tested. **Native `.so` / `.dll` / `.dylib` binaries not yet bundled — FFI integration paths can't be exercised locally until bundling is done.** |
| `piper_dart` | 28 | 2 | 6 | Same shape as `whisper_dart`. |

### Humbl Dart packages

| Package | Tests | Test Files | Groups | Coverage Status |
|---|---:|---:|---:|---|
| `humbl_core` | 732 | 72 | 191 | Historically 1 flaky (`VoiceSessionRunner.turnEvents`) — passed in 2026-04-21 run. Areas well-covered: pipeline, tools/gates, memory, payments, providers, LM gateway. |
| `humbl_app` | 200 | 18 | 27 | Blocs + auth/signup/forgot-password widget tests. Low ratio relative to 127 lib files (expected — UI is pump-tested per screen). |
| `humbl_lm` | 9 | 2 | 3 | Under-tested for 16 lib files. `LmScheduler` has no tests and still references old `ILmGateway`. (Prior "2 tests" number was file count, not test count.) |
| `humbl_voice` | 52 | 6 | 6 | Healthy ratio — 52 tests across STT/TTS/VAD/audio (not "6 tests" as prior audits implied — the 6 was the file count). |
| `humbl_runtime` | 6 | 2 | 1 | Under-tested. ExecuTorch / LiteRT are stubs; concrete ONNX / llama.cpp wiring has minimal tests. |
| `humbl_integrations` | 0 | 0 | 0 | Scaffolded 2026-04-21 — no implementations yet, no tests expected. |

**Monorepo totals:** 1564 tests across 161 files, 379 `group(...)` blocks, zero `@Skip(...)` markers. All packages pass.

## Modules With Zero Tests (humbl_core)

These are the critical untested subsystems called out in `memory/pending-design-items.md` §8:

- `mcp/` — `IMcpTransport`, `McpClient`, `McpBridgeTool`, `McpConnectionManager` have no tests.
- `resilience/` — `CircuitBreaker`, `RetryPolicy`, `ResilientExecutor`, `Heartbeat` — code exists, no tests.
- `services/` — `HumblAgent`, `ServiceRegistry`, `ServiceEventBus`, `AgentSession` — no tests.
- `settings/` — `SettingsService`, `ISettingsProvider`, `SettingDefinition` — no tests.
- `sync/` — `SyncStatus`, `ISyncStatusService`, `DeviceSyncConfig` — no tests.
- `input/` — `InputSourceRegistry`, `InputArbitrator`, `IInputSource` — no tests.
- `voice_activity_detection/` — `IVadEngine`, `SileroVadEngine`, `IWakeWordEngine` — no tests.

Filling these is a standing backlog item.

## humbl_core Test Distribution (sample)

| Area | File | Test Count |
|---|---|---:|
| Pipeline orchestrator | `pipeline/pipeline_orchestrator_test.dart` | ~18 |
| Route decision node | `pipeline/route_decision_node_test.dart` | ~12 |
| Loop check node | `pipeline/loop_check_node_test.dart` | ~8 |
| Deliver node tokens | `pipeline/deliver_node_tokens_test.dart` | ~6 |
| Confirmation flow | `pipeline/confirmation_flow_test.dart` | ~10 |
| Access control (Gate 1) | `tools/gate1_pipeline_access_test.dart` | ~27 |
| Tool context filter | `tools/tool_context_filter_test.dart` | ~12 |
| Confirmation patterns | `tools/confirmation_pattern_test.dart` | ~15 |
| Resource ID | `tools/resource_id_for_test.dart` | ~8 |
| Gate 3 resources | `tools/gate3_resource_test.dart` | ~14 |
| Shell tools | `tools/shell_tools_test.dart` | ~10 |
| Connector registry | `lm_gateway/connector_registry_test.dart` | ~14 |
| Provider registry | `lm_gateway/provider_registry_test.dart` | ~14 |
| Model registry | `models/model_registry_test.dart` | ~14 |
| Memory (noop) | `memory/noop_memory_service_test.dart` | ~22 |
| Payments | `payments/payment_test.dart` | ~14 |

## Testing Patterns

- **Fakes over mocks** for pipeline tests (e.g., `FakeIntentProcessor`, `FakeLmGateway`) — keeps type safety and behavior explicit.
- **`sqflite_common_ffi`** for SQLite across platforms (`sqfliteFfiInit()` + `databaseFactoryFfi`).
- **`InMemoryJournal`** test-friendly `ISystemJournal` implementation.
- **`bloc_test`** for BLoC state machine testing.
- **`mocktail`** preferred over `mockito` (project convention).
- **Isolated state** per test; no shared mutable state.

## Critical Untested Areas

| Area | Risk | Why untested |
|---|---|---|
| Full pipeline E2E (text in → output) | High | No test runs through all 4 nodes with a real `HumblChatModel` and `ToolRegistry`. |
| `ToolRegistry.execute()` full gate chain | High | The `@nonVirtual` template runs all named gates in sequence — no single end-to-end test. |
| Platform manager native round-trips | High | Kotlin / Swift method channels are untestable without a device. |
| LmEngine inference | High | Requires native `llama.cpp` libraries and a GGUF model file. |
| Voice pipeline with audio | Medium | `VoiceSessionRunner` has no test with real audio; `.turnEvents` is flaky. |
| Cloud sync | Medium | Requires a running Supabase instance. |
| MCP client | Medium | Needs a mock MCP server. |
| BLE devices | Medium | Providers throw `UnimplementedError` for DPVR G1 and Mentra Live. |

## Commands

```bash
# Pure-Dart framework packages (run with `dart`)
cd packages/langchain_dart && dart test
cd packages/langchain_graph && dart test
cd packages/litellm_dart && dart test
cd packages/langfuse_dart && dart test

# Flutter packages (including FFI plugins)
cd packages/whisper_dart && flutter test
cd packages/piper_dart && flutter test
cd humbl_core && flutter test
cd humbl_app && flutter test
cd humbl_lm && flutter test
cd humbl_voice && flutter test
cd humbl_runtime && flutter test

# Single file / pattern
cd humbl_core && flutter test test/pipeline/pipeline_orchestrator_test.dart
cd humbl_core && flutter test --name "LoopCheckNode"
```
