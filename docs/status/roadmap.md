---
sidebar_position: 5
title: Roadmap
---

# Roadmap

Development priorities ordered by impact and dependency chain.

## Completed Sprints

### SP4 — Tool System Refactor (Callback Handlers)
**Status:** Complete.
- HumblTool extends `BaseTool` from `langchain_dart`
- 6 callback handlers extending `BaseCallbackHandler`: Policy, AccessControl, Logging, Permission, Quota, ToolFilter
- `run()` renamed to `runTool()` for BaseTool compatibility

### SP5 — Memory Refactor (LangChain Base Classes)
**Status:** Complete.
- `ConversationStore` implements `BaseChatMessageHistory` with `bindSession()`, `addMessage()`, `clear()`
- `IMemoryService` extends `BaseMemory`
- `IVectorStore` extends `VectorStore`
- `IEmbeddingProvider` extends `Embeddings`

### SP7 — LM Gateway Refactor (LiteLLM Router)
**Status:** Complete.
- `HumblLmGateway` wraps `litellm_dart` `Router`
- 5 routing strategies: simple, costBased, leastBusy, latencyBased, usageBased
- SpendLog + CostCalculator + CooldownManager integrated
- Per-deployment latency and request metrics

## Current Priority

### SP6 — Pipeline Refactor (StateGraph)
**Status:** Unblocked by SP7 completion. Not yet started.
**Goal:** Refactor `PipelineOrchestrator` to use `langchain_graph` `StateGraph` directly, replacing the custom graph implementation.

**Remaining:**
- Replace custom pipeline graph with `StateGraph` from `langchain_graph`
- Wire `BaseCheckpointSaver` for checkpoint persistence
- Integrate callback handlers into graph execution lifecycle
- Update all pipeline tests to use the new graph-based orchestrator

## Upcoming Sprints

### SP3 — Error Recovery & Resilience
**Status:** Mostly complete.
**Remaining:** Wire `ResilientExecutor` into all network-calling nodes. Add retry logic to `HumblLmGateway` provider failover. Integrate `HeartbeatRegistry` with `ServiceEventBus` for health broadcasting.

### SP8 — Cloud Gateway Wiring
**Status:** Supabase auth and basic services exist in `humbl_app`.
**Remaining:**
- Complete Supabase Edge Functions for spend-log, cloud sync, and quota validation.
- Wire `IDataSyncService` for memory/settings cloud sync.
- Implement cloud-first routing policy in `HumblLmGateway`.
- End-to-end test: user sign-up to cloud LM request to spend tracking.

### SP9 — Background Agents
**Status:** Not started (0%).
**Remaining:**
- Agent Manager framework for scheduling and lifecycle.
- 6 named agents (weather, news, calendar, fitness, commute, smart home).
- Background run promotion (escalate to foreground notification).
- Credit gating per tier (free: 0 slots, standard: 2, plus: 5, ultimate: 10).
- 25 pre-built agent templates + 1 user-configurable.

### SP10 — iOS/Android Native Services
**Status:** Kotlin/Swift plugin files exist but most are stubs.
**Remaining:**
- Wire native method channels for: Timer, Alarm, Calendar, Routine, Biometric, STT, TTS, ExecuTorch, LiteRT.
- Implement actual native logic in each plugin.
- Add device-level integration tests.

### SP11 — Full Voice Wiring
**Status:** Interfaces and `VoiceSessionRunner` exist.
**Remaining:**
- Concrete Whisper.cpp STT provider.
- Concrete Piper TTS provider.
- Platform native STT/TTS providers (Android SpeechRecognizer, iOS Speech framework).
- Concrete VAD engine (Silero VAD or custom energy-based).
- AEC native implementation.
- End-to-end voice round-trip test.

## Future Sprints

| Sprint | Area | Description |
|--------|------|-------------|
| SP12 | Local Networking | INetworkDiscovery, ILocalTransfer, P2P tools, headless operation |
| SP13 | Memory T2-T4 | Full importance scoring, consolidation, embedding migration |
| SP14 | LoRA / Training | Training data export, adapter validation, QLoRA integration |
| SP15 | Marketplace | Plugin marketplace, signature verification, auto-update |
| SP16 | App Frontend | 15 BLoCs, 28+ screens, Phase 1-4 UI implementation |

## Dependency Chain

```
[DONE] SP4 (Tools) ──┐
[DONE] SP5 (Memory) ──┤
[DONE] SP7 (Gateway) ─┘
         │
         ▼
   SP6 (Pipeline) ── SP3 (Resilience) ── SP8 (Cloud) ── SP9 (Background Agents)
                                                       ── SP10 (Native Services)
                                                       ── SP11 (Voice)
                                                                │
                                                                ▼
                                                       SP16 (App Frontend)
```

SP4, SP5, and SP7 are complete. SP6 (pipeline refactor to langchain_graph) is the current priority. Cloud gateway (SP8) depends on resilience (SP3). Background agents (SP9) depend on cloud sync. Voice (SP11) depends on native service wiring (SP10).
