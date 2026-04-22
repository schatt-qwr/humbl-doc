---
sidebar_position: 2
title: Gap Analysis
---

# Gap Analysis

_Last refreshed: 2026-04-21._

Full category-by-category breakdown of implementation status. Each row shows items completed, partially implemented, and missing. Counts are structural — they reflect feature presence, not test coverage (see [Test Coverage](./test-coverage) for that).

## Category Table

| Category | Done | Partial | Missing | Key Gaps |
|----------|------|---------|---------|----------|
| Pipeline Architecture | 9 | 1 | 1 | `CancellationToken` checks in all long-running nodes (interface exists, enforcement partial) |
| Tool System | 10 | 1 | 1 | Parallel tool execution (sequential only today). SP4 callback handlers complete. |
| Security Model | 5 | 0 | 3 | Privacy mode, cloud-less mode, BYOK key management UI |
| Platform Managers | 5 | 1 | 4 | `IHardwareDeviceManager`, unified device registry, platform+peripheral merge |
| Memory System | 6 | 0 | 5 | Importance scoring, consolidation, facts extraction. SP5 LangChain base classes complete. |
| Observability / Logging | 6 | 1 | 1 | Pipeline trace visualization UI. Sentry wired (commit `aa2443118`), Langfuse wired (today, decorator stack). |
| LM Gateway / Model Registry | 12 | 0 | 1 | Model download progress UI. 12 provider adapters (not 11 — includes Gemini, Azure, Bedrock, Vertex, Cohere, HuggingFace, Together, Mistral, OpenAI, Anthropic, Ollama, OpenAI-compatible). |
| Devices SDK | 6 | 3 | 2 | BLE transport protocol (K900), DPVR G1 + Mentra Live `connect()`/`disconnect()` (throw UnimplementedError) |
| Cloud Agent Backend | 6 | 1 | 1 | End-to-end round-trip testing (designed, not deployed). |
| Resource Management | 4 | 1 | 1 | Buffer sharing between concurrent stream tools |
| Background Agents | 5 | 1 | 0 | Cloud round-trip testing needed |
| Voice I/O | Interfaces + streaming | 0 | 4 concrete | VoiceSessionRunner + streaming LLM-to-TTS works; Whisper.cpp/Piper/platform STT/TTS implementations exist but native binaries not bundled. |
| App Frontend | 40 screens | 0 | 0 | All screens implemented; UI-SP1/2/3 complete. |
| App Settings | Done | 0 | 0 | SettingsService + screens implemented |
| Tracing / Observability Port | 6 | 0 | 0 | BaseTracer/Run/RunType/Console/InMemory migrated to `langchain_dart` 2026-04-21; LangfuseTracer wired. langsmith_dart deleted. |
| Package Structure | — | — | — | `humbl_integrations` created 2026-04-21; `humbl_features`/`humbl_connectors`/`humbl_utility` deleted (empty shells). |

## Detailed Breakdown

### Pipeline Architecture (9 / 1 / 1)

**Done:**
- StateGraph with conditional edges (langchain_graph)
- 4-node pipeline via `buildHumblPipeline()` (classify, route, execute, deliver)
- PipelineOrchestrator (concurrent runs)
- Superstep execution (parallel nodes via Future.wait)
- StreamEvent + streamEvents() with stream modes
- Pipeline streaming (runStream)
- Interrupt handling (UserCancel, ExternalEvent)
- Loop guard (max 20 steps)
- Checkpoint persistence (SqliteCheckpointSaver + PostgresCheckpointSaver)

**Partial:**
- Interrupt system (UserCancel and critical events handled; medium-priority graceful degradation not yet implemented)

**Missing:**
- CancellationToken checked in all long-running nodes (interface exists, not all nodes check it)

### Tool System (9 / 1 / 1) — SP4 Complete

**Done:**
- HumblTool extends `BaseTool` from `langchain_dart` with @nonVirtual template
- Five-gate security (Policy, Access, Permission, Validation, Resource)
- ToolRegistry (register, registerBundle, lookup, byGroup, available)
- MCP schema export (toMcpSchema)
- Streaming support (executeStream with StreamController wrapper)
- Confirmation framework (ConfirmationService + 7 providers)
- 70+ tools registered across 16 domain files
- **6 callback handlers** extending `BaseCallbackHandler` (Policy, AccessControl, Logging, Permission, Quota, ToolFilter)
- **ToolFilterCallbackHandler** for keyword-based tool group selection

**Partial:**
- Tool stubs: ~40 of 121 spec tools are stubs (declared but runTool() returns notImplemented)

**Missing:**
- Parallel tool execution (tools execute sequentially; no concurrent tool dispatch)

### Security Model (5 / 0 / 3)

**Done:**
- AccessLevel hierarchy (system > core > confidential > trusted > standard > restricted)
- AccessControl.canAccess() privilege math
- ToolStateManager (OS permission probing, state management)
- applyGrantedAccess() capping for bundles
- IPermissionService interface + mobile/desktop implementations

**Missing:**
- Privacy mode (disable all cloud/network features)
- Cloud-less mode (disable cloud LM but allow local network)
- BYOK key management (secure storage and rotation for user-provided API keys)

### Memory System (6 / 0 / 5) — SP5 Complete

**Done:**
- `IMemoryService` extends `BaseMemory` from `langchain_dart` (T2 KV, T3 vector, T4 audit)
- `ConversationStore` implements `BaseChatMessageHistory` with `bindSession()`, `addMessage()`, `clear()`
- `IVectorStore` extends `VectorStore` from `langchain_dart`
- `IEmbeddingProvider` extends `Embeddings` from `langchain_dart`
- SqliteMemoryService basic implementation
- SqliteVecStore (sqlite_vector for similarity search)

**Missing:**
- Importance scoring and decay
- Memory consolidation (daily/weekly summarization)
- T2 structured facts extraction from conversations
- T3 hybrid scoring (similarity + importance + recency)
- Memory export for cloud sync

### Voice I/O (Interfaces + streaming done / 0 concrete providers)

**Done:**
- IVadEngine interface (TTS-aware, source latching)
- ISttProvider interface (barge-in support)
- ITtsProvider interface (streaming)
- VoiceSessionRunner (full pipeline: AEC, RingBuffer, VAD, STT, pipeline dispatch, TTS)
- VoiceSessionRunner.onPipelineStream -- streaming pipeline callback
- LLM token-to-TTS streaming (tokens pipe to `TTS.synthesizeFromStream()` in real-time)
- VoiceProviderRouter with tier gating
- AudioStreamBuffer, MicSource, RingBuffer
- AEC layer (SoftwareAec interface)
- Provider factory interfaces (SttProviderFactory, TtsProviderFactory)

**Missing:**
- Concrete Whisper.cpp STT provider
- Concrete Piper TTS provider
- Platform native STT/TTS providers (Android, iOS)
- Concrete VAD engine implementation
- End-to-end voice round-trip test

### Background Agents (5 / 1 / 0)

**Done:**
- AgentManager (scheduling, lifecycle)
- 10 built-in background agents (all migrated to `model.invoke()`)
- IBackgroundAgent interface with AgentContext + AgentCategory
- Credit gating per tier (free: 0, standard: 2, plus: 5, ultimate: 10 slots)
- 28 cloud agent YAML configs (25 pre-built + custom + 2 micro)

**Partial:**
- Cloud agent round-trip testing (infrastructure exists, end-to-end not verified)

### Cloud Agent Backend (6 / 1 / 1)

**Done:**
- SQL schema: 5 tables (agent_jobs, agent_messages, agent_inbox, micro_agent_schedules, agent_checkpoints)
- RLS policies + Realtime enabled
- 3 Supabase Edge Functions (dispatch-agent-job, verify-quota, micro-agent-runner)
- Python Cloud Run worker (FastAPI + LangGraph supervisor + 5 cloud tools)
- Bidirectional message bus protocol
- Device tool proxy pattern

**Partial:**
- Cloud Run deployment (Dockerfile + cloudbuild.yaml exist, not yet deployed)

**Missing:**
- End-to-end round-trip test (dispatch to result delivery)

### App Frontend (40 / 0 / 0)

**Done:**
- All 40 screens implemented (zero stubs). UI-SP1/2/3 all merged.
- AuthBloc wired to Supabase (signIn/signUp/resetPassword/signOut + auth stream)
- AgentInbox BLoC + full screen (dispatch dialog, detail sheet, swipe dismiss, pin/unpin)
- AgentMessageService with injectable HTTP
- 3 auth screens (login, signup, forgot password) + onboarding 4-step wizard
- Settings screens (API Keys, LM Providers, general)
- Feature screens: memory browser, notes (CRUD), voice journal (with mood selection + recording), badges grid (progress rings, tiers, detail sheet), voice enrollment
- Media screens: image viewer (pinch-zoom + page indicators), video player (media_kit, full codec), audio player (media_kit, seek/skip), streaming (platform grid + RTMP config + live preview)
- 20-step startup wiring in main.dart; Langfuse + Sentry wired.
