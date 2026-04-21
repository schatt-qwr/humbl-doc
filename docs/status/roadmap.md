---
sidebar_position: 5
title: Roadmap
---

# Roadmap

_Last updated: 2026-04-21._

Development priorities grouped by state. See [Implementation Status](./overview) for the snapshot of what exists today.

## Completed Sprints

### SP1 — LangChain Core Dart Port
**Status:** Complete.
- Full port of langchain-core: Runnables (LCEL + Assign/Pick/Each/Binding/Generator), Tools (`BaseTool`, `StructuredTool`, `ToolException`), Memory (buffer, summary, entity), Chat Models, Callbacks, Prompts (FewShot, Pipeline), Output Parsers (String, JSON, List, XML), Documents, Embeddings, Vector Stores, Retrievers (incl. ContextualCompressionRetriever), Stores.
- 175+ tests.

### SP2 — LangGraph Dart Port
**Status:** Complete.
- Full port: `StateGraph`, Pregel-style superstep execution via `Future.wait`, channels (LastValue, BinaryOperatorAggregate, Topic, EphemeralValue), checkpointing (InMemory + SQLite + Postgres), `Send` fan-out, `addWaitingEdge` fan-in, `addSubgraph` composition, `MessageGraph`, Runtime with Zones.
- 6 prebuilt agents: `createReactAgent`, `createSupervisor`, `createSwarm`, `createHandoffTool`, `createPlanAndExecute`, `createHierarchicalAgent`.
- 128 tests.

### SP3 — LiteLLM Dart Port
**Status:** Complete.
- Full port: Router (5 strategies), 12 provider adapters (OpenAI, Anthropic, Gemini, Azure OpenAI, Bedrock, Vertex AI, Cohere, HuggingFace, Together AI, Mistral, Ollama, OpenAI-compatible), token counter, cost calculator, SpendLog, CooldownManager with exponential backoff, BudgetManager with rolling window, caching (memory + Redis pluggable), embedding + image APIs, `acompletion()` async pipeline.
- 113 tests.

### SP4 — Tool System Refactor (Callback Handlers)
**Status:** Complete.
- `HumblTool extends BaseTool` from `langchain_dart`.
- 6 callback handlers extending `BaseCallbackHandler`: Policy, AccessControl, Logging, Permission, Quota, ToolFilter.

### SP5 — Memory Refactor (LangChain Base Classes)
**Status:** Complete.
- `ConversationStore implements BaseChatMessageHistory` with `bindSession()`, `addMessage()`, `clear()`.
- `IMemoryService extends BaseMemory`, `IVectorStore extends VectorStore`, `IEmbeddingProvider extends Embeddings`.

### SP6 — Pipeline Refactor (StateGraph)
**Status:** Complete.
- Custom pipeline replaced with 4-node `buildHumblPipeline()` on `langchain_graph StateGraph` (commit `423b12e57`). 110 lines, down from 709.
- `createToolsNode` delegates to framework `ToolNode`.
- `ICheckpointStore extends BaseCheckpointSaver`.

### SP7 / SP7.5 — LM Gateway Refactor
**Status:** Complete.
- `HumblLmGateway` wraps `litellm_dart Router`.
- `HumblChatModel extends BaseChatModel` — single LM entry point via litellm.

### SP8a/b/c/d — Streaming & Voice Integration
**Status:** Complete.
- `StreamEvent`, `CompiledStateGraph.streamEvents()` with modes (values / updates / messages / custom).
- `HumblChatModel.stream()` yields `AIMessageChunk`s via `streamWriter`.
- `VoiceSessionRunner.onPipelineStream` — LLM tokens pipe to `TTS.synthesizeFromStream()` in real-time.
- `VoiceProviderRouter` with tier gating; `IProviderCostModel`, `UsageRecord`, universal quota.

### SP10 — Agent Refactor
**Status:** Complete.
- `AgentContext.model` field (`BaseChatModel`).
- All 10 background agents migrated from `gateway.complete()` to `model.invoke()`.

### UI-SP1/2/3 — UI Port from QWR Companion
**Status:** Complete.
- SP1: Design system, nav shell, theming (Material 3), light/dark.
- SP2: Core tab screens (chat, devices, gallery, settings).
- SP3: Feature screens — notes, memory browser, voice journal, badges, voice enrollment, streaming, onboarding wizard, media (image/video/audio players with media_kit).

### Langfuse + Sentry Observability
**Status:** Complete.
- `langfuse_dart` built and wired in `humbl_app/lib/main.dart`.
- Decorator stack: `ConfidentialTracer → MetricsTracer → LangfuseTracer`.
- Sentry crash reporting across app layers (breadcrumbs + error capture).

### BaseTracer Migration (2026-04-21)
**Status:** Complete.
- Moved `BaseTracer`, `Run`, `RunType`, `RunEvent`, `InMemoryTracer`, `ConsoleTracer` from `langsmith_dart` to `langchain_dart/lib/src/tracers/` — matches upstream Python `langchain_core.tracers`.
- Deleted `langsmith_dart` package entirely. LangSmith-specific code (Client, feedback, evaluation) discarded. Humbl uses Langfuse.

### Package Consolidation (2026-04-21)
**Status:** Complete.
- Deleted empty `humbl_features`, `humbl_connectors`, `humbl_utility` shells. Their stated scopes already lived in `humbl_app` / `humbl_core` / `humbl_voice`.
- Created `humbl_integrations` as the single landing spot for 3rd-party service bindings.

## In Progress

### Native Library Bundling
**Plan:** `docs/superpowers/plans/2026-04-07-native-library-bundling.md`.
- Dart layer for `whisper_dart` and `piper_dart` is done. Precompiled `.so` / `.dll` / `.dylib` binaries are not yet bundled in `jniLibs/` / `windows/libs/` / other platform dirs.
- Biggest single unblocker for on-device voice.

### SP9 — Vision-to-Text (partial)
- Designed in `docs/superpowers/plans/2026-04-02-sp9-vision-to-text.md`.
- Missing: `VisionProviderRouter`, `VisionSessionRunner`, concrete providers (GPT-4V, Gemini Vision, on-device). Tool wiring (OcrTool, BlindAssistTool) should default to VTT.

### Connected Device BLE (partial)
- DPVR G1 and Mentra Live providers exist but `connect()` / `disconnect()` throw `UnimplementedError`.
- Designed in `docs/superpowers/plans/2026-04-09-connected-device-capabilities.md`.

## Upcoming — Queued Work

| Area | Description | Blocker |
|---|---|---|
| LmScheduler rewrite | `humbl_lm/lib/scheduling/lm_scheduler.dart` still references old `ILmGateway`. Rewrite to wrap `BaseChatModel`. | None — contained |
| VoiceSessionRunner → StreamSessionCoordinator | Class + interface + directory + ~587 test lines | None — pure refactor |
| MCP offline / local-network routing | Replace `requiresCloud: bool` with three connectivity predicates; filter by device state. | Design pending decisions |
| INR pricing tables in QuotaManager | Encode FREE / STANDARD / PLUS / ULTIMATE tiers, per-category caps, top-ups, FX config | Design pending |
| Receipt verification | Real verification in `humbl_backend/.../verify-purchase.ts`; complete 2 stubbed micro-agent handlers | None |
| Test backfill | 7 modules have zero tests (`mcp/`, `resilience/`, `services/`, `settings/`, `sync/`, `input/`, `voice_activity_detection/`) | None |

## Designed but Not Started

### SP12 — Cloud Agent Backend
- Local-primary, 3 tiers, 25+1 agents, bidirectional message bus.
- SQL schema: 5 tables (agent_jobs, agent_messages, agent_inbox, micro_agent_schedules, agent_checkpoints) with RLS + Realtime — designed.
- Python Cloud Run worker with LangGraph supervisor graph — designed.
- 28 agent YAML configs — drafted.
- Device tool proxy protocol (cloud agents request device tools via Main Agent) — designed.

### SP9 Local Networking Subsystem
- `INetworkDiscoveryService` — mDNS + DNS-SD + UDP multicast + BLE.
- `ILocalTransferService` — HTTPS REST (LocalSend-style) + WiFi Direct + Bluetooth.
- `IRemoteFileService` — SFTP (`dartssh2`), FTP, SMB, WebDAV.
- `INetworkToolService` — ping, subnet scan, port scan, WOL.
- Headless P2P tools; platform share as fallback; TLS + consent-based cross-user sharing.

### SoC Execution-Provider Strategy
- Per-SoC table (Snapdragon / MediaTek / Exynos / Tensor / Intel NPU / AMD XDNA / Snapdragon X / ROCm / Arc / Coral).
- Fallback chain to CPU baseline; 6 ARM variants for llama.cpp.
- Auto-detected at first launch, validated via benchmarking.

### Runtime Deferrals
- **Play Asset Delivery** — post-MVP. Ship all variants in AAB (~70 MB native libs) for now.
- **LiteRT-LM** — Google's optimized runtime for Pixel/Tensor. Currently stub.
- **MediaPipe LLM Inference** — replaces LiteRT-LM where supported (mobile only, `.task` format). Not integrated.
- **ONNX Runtime GenAI** — LLM generation on top of ONNX (Phi-3/4, Llama). Separate library (~15 MB). Pending.

### Cloud Sync
- `IDataSyncService` universal orchestrator — partial.
- `ICloudSyncProvider` backends (HumblCloud, Google Drive, iCloud, OneDrive) — not built.
- `IHumblServerDataSyncService` sub-interfaces (.pricing, .quota, .config, .user, .settings, .logging, .analytics, .agents) — scaffolding needed.
- Per-category conflict resolution.

## Explicitly Undecided

- **BG Agent Tool Policy on iOS** — requires BGTaskScheduler research.
- **LM Warm Start strategy** — cold-start mitigation approach not yet scoped.

## Dependency Chain

```
[DONE] SP1 (LangChain)     ──┐
[DONE] SP2 (LangGraph)     ──┤
[DONE] SP3 (LiteLLM)       ──┘
         │
         v
[DONE] SP4 (Tools)         ──┐
[DONE] SP5 (Memory)        ──┤
[DONE] SP6 (Pipeline)      ──┤
[DONE] SP7/7.5 (Gateway)   ──┘
         │
         v
[DONE] SP8a/b/c/d (Streaming) ── [DONE] SP10 (Agents) ── [DONE] UI-SP1/2/3
         │                                                        │
         v                                                        v
[DONE] Langfuse + Sentry wiring                             [DONE] Package
[DONE] BaseTracer Migration (2026-04-21)                      consolidation
         │                                                     (humbl_integrations)
         v
[IN PROGRESS] Native library bundling ── [PARTIAL] SP9 VTT ── [PARTIAL] BLE connect
         │
         v
[QUEUED] LmScheduler rewrite ── [QUEUED] VoiceSessionRunner rename
         │
         v
[DESIGNED] SP12 Cloud Agent Backend ── [DESIGNED] SP9 Local Networking
[DESIGNED] SoC strategy ── [DESIGNED] Runtime deferrals (LiteRT/MediaPipe/ONNX GenAI)
[DESIGNED] MCP offline routing ── [DESIGNED] Cloud Sync IDataSyncService
[DESIGNED] INR pricing tables in QuotaManager
         │
         v
[UNDECIDED] iOS BG Agent Tool Policy ── [UNDECIDED] LM Warm Start
```
