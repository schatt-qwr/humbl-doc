---
sidebar_position: 1
title: API Reference
---

# API Reference

Complete API reference for the Humbl project. The project consists of four framework packages (`packages/`) and the main `humbl_core` Flutter plugin.

## Framework Packages

The four framework packages are documented in the [LangChain Framework](../architecture/subsystems/langchain-framework) architecture page:

- **`langchain_dart`** -- Core framework (Runnables, BaseTool, BaseMemory, BaseCallbackHandler, Embeddings, VectorStores)
- **`langfuse_dart`** -- Observability (LangfuseClient, LangfuseTracer extending BaseTracer, Trace/Observation/Score)
- **`litellm_dart`** -- Multi-provider gateway (Router, Providers, CostCalculator, SpendLog)
- **`langchain_graph`** -- State machines (StateGraph, Channels, CheckpointSaver, ReAct agent)

## humbl_core Sections

### [Pipeline](./pipeline/pipeline-orchestrator)

- [PipelineOrchestrator](./pipeline/pipeline-orchestrator) -- Entry point for running pipeline turns.
- [PipelineState](./pipeline/pipeline-state) -- Immutable state object that flows through every node.
- [StateGraph](./pipeline/state-graph) -- Generic graph engine with nodes and conditional edges.
- [Pipeline Nodes](./pipeline/nodes) -- All 7 nodes and what each reads/writes.

### [Tool System](./tools/humbl-tool)

- [HumblTool](./tools/humbl-tool) -- Abstract base class with five-gate security template.
- [ToolRegistry](./tools/tool-registry) -- Registration, discovery, and bundle management.
- [Models](./tools/models) -- Enums (AccessLevel, ToolGroup, ResourceType) and data classes (ToolResult, ToolContext).

### [LM Gateway](./lm-gateway/i-lm-gateway)

- [ILmGateway](./lm-gateway/i-lm-gateway) -- Top-level gateway interface for LM routing.
- [Connectors](./lm-gateway/connectors) -- ILmConnector interface and 11 built-in connectors.
- [Scheduling](./lm-gateway/scheduling) -- LmScheduler for priority preemption and background queuing.

### [Memory](./memory/i-memory-service)

- [IMemoryService](./memory/i-memory-service) -- Unified memory abstraction (T2-T4).
- [ConversationStore](./memory/conversation-store) -- Persistent conversation turn storage with quality scoring.
- [Vector Store](./memory/vector-store) -- IVectorStore and SqliteVecStore for semantic search.
- [EmbeddingGateway](./memory/embedding-gateway) -- On-device + cloud embedding with fallback.

### [Devices SDK](./devices/i-peripheral-provider)

- [IPeripheralProvider](./devices/i-peripheral-provider) -- Interface for adding new device types.
- [IConnectedDevice](./devices/i-connected-device) -- Connected device with capability interfaces.
- [DeviceRegistry](./devices/device-registry) -- Device discovery and management.

### [Security](./security/access-control)

- [AccessControl](./security/access-control) -- Privilege math and gate enforcement.
- [PermissionService](./security/permission-service) -- OS permission probing and tool state management.
- [ConfirmationService](./security/confirmation-service) -- Multi-provider user confirmation.

### [Resources](./resources/hardware-resource-manager)

- [IHardwareResourceManager](./resources/hardware-resource-manager) -- Lease-based hardware resource control.
- [ResourceLease](./resources/resource-lease) -- Lease model, access modes, and events.

### [Services & Agent](./services/humbl-agent)

- [HumblAgent](./services/humbl-agent) -- Always-free dispatcher with concurrent runs and scouts.
- [ServiceEventBus](./services/service-event-bus) -- Typed pub/sub for inter-service communication.

### [Voice I/O](./voice/vad-stt-tts)

- [VAD, STT, TTS](./voice/vad-stt-tts) -- Voice pipeline interfaces.
- [VoiceSessionRunner](./voice/voice-session-runner) -- Main voice pipeline orchestrator.

### [Platform](./platform/platform-factory)

- [PlatformFactory](./platform/platform-factory) -- Runtime platform selection.
- [Manager Interfaces](./platform/manager-interfaces) -- All 25+ platform manager interfaces.
