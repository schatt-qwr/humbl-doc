---
sidebar_position: 4
title: Module Completion
---

# Module Completion

_Last refreshed: 2026-04-21. Percentages are structural completeness (features implemented vs. planned), not test coverage — see [Test Coverage](./test-coverage) for that._

Per-module completion status for all packages. Framework packages (`packages/`) are listed first, followed by `humbl_core` modules.

## Framework Packages

| Package | Status | Completion | Notes |
|---------|--------|-----------|-------|
| `langchain_dart` | Complete | 95% | All core modules implemented. 24 test files (200 tests) incl. tracers migrated from langsmith_dart (2026-04-21). |
| `langchain_graph` | Complete | 92% | StateGraph, channels, checkpointing (InMemory/SQLite/Postgres), 6 prebuilt agents (ReAct, Supervisor, Swarm, Handoff, Plan-and-Execute, Hierarchical), Runtime with Zones. 15 test files (128 tests). |
| `litellm_dart` | Complete | 95% | Router with 5 strategies, 12 provider adapters (OpenAI, Anthropic, Gemini, Azure, Bedrock, Vertex, Cohere, HuggingFace, Together, Mistral, Ollama, OpenAI-compatible), cost, cooldown, embedding/image APIs, budget, Redis cache. 11 test files (113 tests). |
| `langfuse_dart` | Complete | 95% | Batch-ingestion client + LangfuseTracer (extends BaseTracer). ConfidentialTracer and MetricsTracer (Humbl extensions) wire in front. 6 test files (45 tests). |

## FFI Flutter Plugins

| Package | Status | Completion | Notes |
|---------|--------|-----------|-------|
| `whisper_dart` | Dart layer complete | 60% | FFI bindings + type layer. **Native `.so`/`.dll`/`.dylib` binaries not yet bundled** (pending in plan `docs/superpowers/plans/2026-04-07-native-library-bundling.md`). 3 test files (51 tests). |
| `piper_dart` | Dart layer complete | 60% | Same shape as `whisper_dart` — bindings done, native binaries pending. 2 test files (28 tests). |

## humbl_core Modules

## Completion Table

| Module | Path | Status | Notes |
|--------|------|--------|-------|
| Pipeline | `lib/pipeline/` | 85% | `buildHumblPipeline()` — 4-node StateGraph (classify, route, execute, deliver) on `langchain_graph` (SP6). Orchestrator, concurrent runs, streaming, interrupts. Missing: full CancellationToken integration in all nodes. |
| Tool Registry | `lib/tools/` | 92% | Registry, 5-gate template, streaming, MCP schema, 6 callback handlers (SP4). HumblTool extends BaseTool. Missing: parallel execution. |
| Tool Domains | `lib/tools/domains/` | 70% | 70+ tools registered across 16 files. ~40 stubs remain. |
| Tool Connectors | `lib/tools/connectors/` | 80% | Read-only query tools wrapping platform managers. |
| Access Control | `lib/permissions/` | 90% | AccessControl, IPermissionService, ToolStateManager. Missing: privacy mode. |
| Confirmation | `lib/confirmation/` | 95% | ConfirmationService, 7 providers, sealed models. |
| Platform Factory | `lib/platform/` | 85% | 21 interfaces, per-platform impls. Missing: IHardwareDeviceManager. |
| Platform: WiFi | `lib/platform/wifi/` | 90% | All 5 platforms. |
| Platform: Bluetooth | `lib/platform/bluetooth/` | 85% | All 5 platforms. macOS needs more testing. |
| Platform: Camera | `lib/platform/camera/` | 80% | All 5 platforms, basic capture. |
| Platform: Microphone | `lib/platform/microphone/` | 80% | All 5 platforms. |
| Platform: Sensors | `lib/platform/sensors/` | 70% | Android/iOS full, desktop stubs. |
| Platform: Contacts | `lib/platform/contacts/` | 75% | Native Kotlin/Swift handlers. Desktop partial. |
| Platform: Notifications | `lib/platform/notifications/` | 75% | All platforms, show() method added. |
| Platform: Location | `lib/platform/location/` | 70% | All 5 platforms. |
| Platform: Media | `lib/platform/media/` | 70% | All 5 platforms. |
| Platform: Calendar | `lib/platform/calendar/` | 40% | Android/iOS native plugins, desktop stub. |
| Platform: Timer/Alarm | `lib/platform/timer/`, `alarm/` | 40% | Android/iOS native plugins, desktop stub. |
| Platform: Routine | `lib/platform/routine/` | 30% | Android/iOS native plugins, desktop stub. |
| LM Gateway | `lib/lm_gateway/` | 90% | `HumblChatModel extends BaseChatModel` (SP7.5) routing through litellm Router (SP7). 5 strategies, spend tracking, latency metrics, cooldown, budget. |
| LM Connectors | `lib/lm_gateway/connectors/` | 85% | 10+ connectors: Anthropic, OpenAI, Ollama, Gemini, Mistral, Cohere, LM Studio, xAI, Sarvam, OpenAI-compatible. LmScheduler still references old `ILmGateway` — **rewrite pending** (see pending-design-items §8). |
| LM Runtimes | `lib/lm_gateway/runtime/` | 60% | 5 runtime interfaces. Concrete wiring incomplete. |
| Model Manager | `lib/model_manager/` | 70% | LocalModelManager, HuggingFace download, GGUF discovery. |
| Memory Service | `lib/memory/` | 65% | IMemoryService extends BaseMemory (SP5). SqliteMemoryService, SqliteVecStore. Missing: consolidation, scoring. |
| Conversation Store | `lib/memory/conversation_store.dart` | 90% | Implements BaseChatMessageHistory (SP5). bindSession, addMessage, clear. |
| Embedding Gateway | `lib/memory/embedding_gateway.dart` | 80% | IEmbeddingProvider extends Embeddings (SP5). On-device + cloud fallback. |
| Devices SDK | `lib/devices/` | 70% | DeviceRegistry, 4 built-in providers. Missing: BLE transport, recovery. |
| BLE Commands | `lib/devices/ble/` | 40% | Interface defined, K900 protocol started. |
| Session | `lib/session/` | 65% | `StreamSessionCoordinator` (renamed from `VoiceSessionRunner`, commit `7a5603214`), `RingBuffer`, `AudioStreamBuffer`, `MicSource`, AEC interface, streaming LLM-to-TTS integration (SP8b). |
| VAD/STT/TTS | `lib/voice_activity_detection/`, `speech_to_text/`, `text_to_speech/` | 55% | `SileroVadEngine`, `IVadEngine`, `IWakeWordEngine`; 5 STT providers (Android, iOS, WhisperApi, WhisperCpp + factory); 6 TTS providers (inc. Piper, ElevenLabs, OpenAI). Native binaries not bundled — wiring blocked on bundling plan. |
| Input System | `lib/input/` | 85% | IInputSource, InputSourceRegistry, InputArbitrator. |
| Resilience | `lib/resilience/` | 95% | CircuitBreaker, RetryPolicy, ResilientExecutor, Heartbeat. |
| Settings | `lib/settings/` | 90% | SettingsService, ISettingsProvider, SettingDefinition. |
| Payments/Quota | `lib/payments/` | 80% | QuotaManager, SpendLog, SlidingWindowCounter, PaymentRouter. |
| Logging | `lib/logging/` | 85% | HumblLogger, ISystemJournal, PartitionedJournal, confidential logging. |
| MCP | `lib/mcp/` | 75% | IMcpTransport, McpClient, McpBridgeTool, McpConnectionManager. No concrete transport. |
| Services/Agent | `lib/services/` | 80% | HumblAgent, SessionManager, ServiceEventBus. |
| Network Monitor | `lib/network/` | 40% | INetworkMonitor interface. No concrete implementation. |
| Resources | `lib/resources/` | 85% | HardwareResourceManager, ResourceLease, ExecutionHandle. |
| Context Budget | `lib/pipeline/context_budget.dart` | 70% | ContextBudget for prompt assembly. |
| Event Triggers | `lib/pipeline/events/` | 60% | EventTriggerManager. |
| Training Export | `lib/lm_gateway/training/` | 50% | ITrainingDataExporter interface. |

## Humbl Domain Packages (outside humbl_core)

| Package | Status | Completion | Notes |
|---------|--------|-----------|-------|
| `humbl_app` | Complete | 95% | 40 screens, 16 BLoCs, 24 widgets, navigation, 20-step startup. Langfuse + Sentry wired. |
| `humbl_lm` | Populated | 70% | LM connectors + LmScheduler + adapter training scaffolding. LmScheduler stale — see pending. 16 lib files, 9 tests across 2 files. |
| `humbl_voice` | Populated | 75% | STT/TTS/VAD/audio plumbing. 15 lib files, 52 tests across 6 files. |
| `humbl_runtime` | Populated | 55% | 5 runtime dirs (llama_cpp, onnx, whisper_cpp, executorch stub, litert stub), gpu detector. 11 lib files, 6 tests. |
| `humbl_integrations` | Scaffolded | 5% | Created 2026-04-21 — empty barrel only. Landing spot for Spotify/Google/Apple/fitness/email bindings. |
| `humbl_backend` | Populated | 80% | 42 Supabase Edge Functions + Python Cloud Run worker. Not a Dart package. |

## Summary by Layer

| Layer | Modules | Avg Completion |
|-------|---------|---------------|
| Framework packages (4 LangChain-ecosystem ports) | 4 | 94% |
| FFI plugins (whisper_dart, piper_dart) | 2 | 60% (blocked on native binary bundling) |
| Pipeline | 3 | 80% |
| Tools | 4 | 83% |
| Security | 2 | 92% |
| Platform | 15 | 65% |
| LM | 4 | 78% |
| Memory | 3 | 78% |
| Devices | 2 | 55% |
| Voice | 3 | 60% |
| Infrastructure | 6 | 80% |
| Humbl domain packages | 6 | 63% |
