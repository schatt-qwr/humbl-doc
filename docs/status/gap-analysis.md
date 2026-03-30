---
sidebar_position: 2
title: Gap Analysis
---

# Gap Analysis

Full category-by-category breakdown of implementation status. Each row shows items completed, partially implemented, and missing.

## Category Table

| Category | Done | Partial | Missing | Key Gaps |
|----------|------|---------|---------|----------|
| Pipeline Architecture | 7 | 1 | 3 | 3-layer interrupt system, CancellationToken checks in all nodes, checkpoint persistence |
| Tool System | 9 | 1 | 1 | Parallel tool execution (sequential only today). SP4 callback handlers complete. |
| Security Model | 5 | 0 | 3 | Privacy mode, cloud-less mode, BYOK key management |
| Platform Managers | 5 | 1 | 4 | IHardwareDeviceManager, unified device registry, platform+peripheral merge |
| Memory System | 6 | 0 | 5 | Importance scoring, consolidation, facts extraction. SP5 LangChain base classes complete. |
| Logging / Metrics | 4 | 1 | 3 | Sentry integration, pipeline trace visualization, analytics cloud sync |
| LM Gateway / Model Registry | 9 | 0 | 2 | Routing policy presets in UI, model download progress UI |
| Devices SDK | 6 | 3 | 2 | BLE transport protocol (K900), BLE recovery/reconnect |
| Cloud Gateway | 2 | 0 | 3 | Full gateway implementation, Supabase backend round-trip, cloud sync service |
| Resource Management | 4 | 1 | 1 | Buffer sharing between concurrent stream tools |
| Background Agents | 0 | 0 | 4 | Agent Manager, 6 named agents, run promotion, credit gating |
| Voice I/O | Interfaces done | 0 | 0 concrete | VoiceSessionRunner exists but no concrete VAD/STT/TTS providers wired |
| App Settings | Mostly done | 0 | 0 | SettingsService implemented; needs more providers registered |

## Detailed Breakdown

### Pipeline Architecture (7 / 1 / 3)

**Done:**
- StateGraph with conditional edges
- PipelineOrchestrator (concurrent runs)
- All 7 nodes (ContextAssembly, Classify, RouteDecision, AskUser, ExecuteTool, Deliver, LoopCheck)
- PipelineState immutable with `_absent` sentinel
- Pipeline streaming (runStream)
- Basic interrupt handling (UserCancel, ExternalEvent)
- Loop guard (max 20 steps)

**Partial:**
- Interrupt system (UserCancel and critical events handled; medium-priority graceful degradation not yet implemented)

**Missing:**
- CancellationToken checked in all long-running nodes (interface exists, not all nodes check it)
- Checkpoint persistence (ICheckpointStore interface exists, no SQLite implementation)
- Full 3-layer interrupt system (immediate/deferred/queued)

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

### Voice I/O (Interfaces done / 0 concrete)

**Done:**
- IVadEngine interface (TTS-aware, source latching)
- ISttProvider interface (barge-in support)
- ITtsProvider interface (streaming)
- VoiceSessionRunner (full pipeline: AEC, RingBuffer, VAD, STT, pipeline dispatch, TTS)
- AudioStreamBuffer, MicSource, RingBuffer
- AEC layer (SoftwareAec interface)
- Provider factory interfaces (SttProviderFactory, TtsProviderFactory)

**Missing:**
- Concrete Whisper.cpp STT provider
- Concrete Piper TTS provider
- Platform native STT/TTS providers (Android, iOS)
- Concrete VAD engine implementation
- End-to-end voice round-trip test

### Background Agents (0 / 0 / 4)

**Missing:**
- Agent Manager (background task coordinator)
- 6 named background agents (weather, news, calendar, fitness, commute, smart home)
- Run promotion (background to foreground escalation)
- Credit gating (background agents consume credits per tier allocation)
