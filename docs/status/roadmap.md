---
sidebar_position: 5
title: Roadmap
---

# Roadmap

Development priorities ordered by impact and dependency chain.

## Completed Sprints

### SP4 -- Tool System Refactor (Callback Handlers)
**Status:** Complete.
- HumblTool extends `BaseTool` from `langchain_dart`
- 6 callback handlers extending `BaseCallbackHandler`: Policy, AccessControl, Logging, Permission, Quota, ToolFilter
- `run()` renamed to `runTool()` for BaseTool compatibility

### SP5 -- Memory Refactor (LangChain Base Classes)
**Status:** Complete.
- `ConversationStore` implements `BaseChatMessageHistory` with `bindSession()`, `addMessage()`, `clear()`
- `IMemoryService` extends `BaseMemory`
- `IVectorStore` extends `VectorStore`
- `IEmbeddingProvider` extends `Embeddings`

### SP6 -- Pipeline Refactor (StateGraph)
**Status:** Complete.
- Custom 7-node pipeline replaced with 4-node `buildHumblPipeline()` using langchain_graph StateGraph
- `createToolsNode` delegates to framework `ToolNode`
- `ICheckpointStore` extends `BaseCheckpointSaver`

### SP7 -- LM Gateway Refactor (LiteLLM Router)
**Status:** Complete.
- `HumblLmGateway` wraps `litellm_dart` `Router`
- 5 routing strategies: simple, costBased, leastBusy, latencyBased, usageBased
- SpendLog + CostCalculator + CooldownManager integrated

### SP7.5 -- litellm Router + Gateway Refactor
**Status:** Complete.
- `Router.completion()` with retry + fallback + cooldown orchestration
- `HumblLmGateway` slimmed to tier+quota wrapper
- `HumblChatModel extends BaseChatModel` -- single LM entry point

### SP8a -- Graph Streaming
**Status:** Complete.
- `StreamEvent` type, `CompiledStateGraph.streamEvents()` with stream modes (values/updates/messages/custom)
- `HumblChatModel.stream()` yields AIMessageChunks via `streamWriter`

### SP8b -- Voice-Graph Integration
**Status:** Complete.
- `VoiceSessionRunner.onPipelineStream` -- streaming pipeline callback
- LLM tokens pipe to `TTS.synthesizeFromStream()` in real-time
- `StreamingToken` + `StreamInterrupted` events for UI

### SP8c -- Voice Provider Routing
**Status:** Complete.
- VoiceProviderRouter with tier gating

### SP8d -- Provider Cost Model
**Status:** Complete.
- IProviderCostModel, UsageRecord, universal quota across all providers

### SP10 -- Agent Refactor
**Status:** Complete.
- `AgentContext.model` field (BaseChatModel)
- All 10 background agents migrated from `gateway.complete()` to `model.invoke()`

### Framework 1:1 Port
**Status:** Complete (MUST/SHOULD items). 314 -> 472 tests.
- langchain_dart: 14 features (messages, runnables, tools, LM, callbacks, prompts, memory, parsers, retrievers)
- langchain_graph: 5 features (superstep, Send, fan-in, subgraph, MessageGraph) + 6 prebuilt agents + checkpoint adapters
- litellm_dart: 10 features (8 providers, embedding, budget, acompletion, Redis cache, image generation)
- langsmith_dart: 10 features (Client, CRUD, evaluate, evaluateComparative, LangChainTracer)

### Cloud Agent Backend
**Status:** Complete (design + implementation).
- SQL schema: 5 tables with RLS + Realtime
- 3 Supabase Edge Functions: dispatch-agent-job, verify-quota, micro-agent-runner
- Python Cloud Run worker with LangGraph supervisor graph and 5 cloud tools
- 28 agent YAML configs (25 pre-built + custom + 2 micro)
- Bidirectional message bus protocol
- Device tool proxy for cloud-to-device tool access

### App Frontend
**Status:** Complete (all 34 screens implemented).
- AuthBloc wired to Supabase (signIn/signUp/resetPassword/signOut + auth stream)
- AgentInbox BLoC + full screen (dispatch, detail, swipe dismiss, pin/unpin)
- AgentMessageService with injectable HTTP
- 3 auth screens, settings screens, all remaining screens

## Current Priority

### SP3 -- Error Recovery & Resilience
**Status:** Mostly complete.
**Remaining:** Wire `ResilientExecutor` into all network-calling nodes. Integrate `HeartbeatRegistry` with `ServiceEventBus` for health broadcasting.

## Upcoming Sprints

### SP9 -- Cloud Round-Trip Testing
**Status:** Infrastructure complete, testing not started.
**Remaining:**
- End-to-end test: user sign-up -> cloud agent dispatch -> result delivery -> spend tracking
- Cloud Run worker deployment and health monitoring
- Supabase Realtime message bus reliability testing
- Device tool proxy round-trip testing

### SP10b -- Native Service Wiring
**Status:** Kotlin/Swift plugin files exist but most are stubs.
**Remaining:**
- Wire native method channels for: Timer, Alarm, Calendar, Routine, Biometric, STT, TTS, ExecuTorch, LiteRT
- Implement actual native logic in each plugin
- Add device-level integration tests

### SP11 -- Full Voice Wiring
**Status:** Interfaces and `VoiceSessionRunner` exist with streaming integration.
**Remaining:**
- Concrete Whisper.cpp STT provider
- Concrete Piper TTS provider
- Platform native STT/TTS providers (Android SpeechRecognizer, iOS Speech framework)
- Concrete VAD engine (Silero VAD or custom energy-based)
- AEC native implementation
- End-to-end voice round-trip test

## Future Sprints

| Sprint | Area | Description |
|--------|------|-------------|
| SP12 | Local Networking | INetworkDiscovery, ILocalTransfer, P2P tools, headless operation |
| SP13 | Memory T2-T4 | Full importance scoring, consolidation, embedding migration |
| SP14 | LoRA / Training | Training data export, adapter validation, QLoRA integration |
| SP15 | Marketplace | Plugin marketplace, signature verification, auto-update |

## Dependency Chain

```
[DONE] SP4 (Tools) ──┐
[DONE] SP5 (Memory) ──┤
[DONE] SP7 (Gateway) ─┘
         |
         v
   [DONE] SP6 (Pipeline) ── [DONE] SP7.5 (Router) ── [DONE] SP8 (Streaming)
                                                            |
                                                            v
   [DONE] SP10 (Agents) ── [DONE] Cloud Backend ── SP9 (Round-Trip Testing)
                                                  ── SP10b (Native Services)
                                                  ── SP11 (Voice)
   [DONE] Framework Port ── [DONE] App Frontend
```

All core sprints (SP4-SP10, Framework Port, Cloud Backend, App Frontend) are complete. Remaining work is integration testing (SP9), native wiring (SP10b), and voice providers (SP11).
