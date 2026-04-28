---
sidebar_position: 2
title: Module Map
---

# Module Map

Complete inventory of all packages and modules in the Humbl project. The project consists of 4 framework packages (under `packages/`) and the main `humbl_core` Flutter plugin.

## Framework Packages

These are Dart ports of industry-standard Python AI frameworks. They have **no Flutter dependency** and can be used in any Dart project.

| Package | Port of | Modules | Tests | Key Exports |
|---------|---------|---------|-------|-------------|
| `langchain_dart` | LangChain | 14 | 166 | `BaseRunnable`, `RunnableAssign`, `RunnablePick`, `RunnableEach`, `RunnableBinding`, `BaseTool`, `ToolException`, `BaseMemory`, `ConversationSummaryMemory`, `BaseChatMessageHistory`, `BaseCallbackHandler`, `RunManager`, `BaseChatModel`, `BaseLLM`, `FewShotPromptTemplate`, `RemoveMessage`, `FunctionMessage`, `merge_message_runs`, `trim_messages`, `filter_messages`, `BaseEmbedding`, `BaseVectorStore`, `BaseRetriever` |
| `langfuse_dart` | Langfuse | 3 | 45 | `LangfuseClient`, `LangfuseTracer` (extends `BaseTracer`), `Trace`, `Observation`, `Score`, `Usage`, `Dataset`, `IngestionEvent`. Batch ingestion with auto-flush + re-queue on failure. |
| `litellm_dart` | LiteLLM | 8 | 113 | `Router`, `BaseProvider`, `GeminiProvider`, `AzureOpenAIProvider`, `BedrockProvider`, `VertexAIProvider`, `CohereProvider`, `HuggingFaceProvider`, `TokenCounter`, `CostCalculator`, `SpendLog`, `CooldownManager`, `BudgetManager`, `EmbeddingRequest`, `EmbeddingResponse`, `acompletion`, `createCompletionFunction` |
| `langchain_graph` | LangGraph | 11 | 109 | `StateGraph`, `CompiledStateGraph`, `MessageGraph`, `Send`, `addWaitingEdge`, `addSubgraph`, `BaseChannel`, `BaseCheckpointSaver`, `ToolNode`, `create_react_agent` |

### langchain_dart Modules

| Module | Key Classes | Description |
|--------|------------|-------------|
| `callbacks` | `BaseCallbackHandler`, `CallbackManager`, `StdoutCallbackHandler` | Event-driven hooks into execution lifecycle |
| `documents` | `BaseDocument` | Document abstraction with metadata |
| `embeddings` | `BaseEmbedding`, `FakeEmbedding` | Embedding provider interface |
| `language_models` | `BaseLanguageModel`, `BaseChatModel`, `BaseLLM`, `FakeLanguageModel`, `RunManager` | LLM base classes (chat and text-completion) |
| `memory` | `BaseMemory`, `BaseChatMessageHistory`, `BufferMemory`, `ConversationSummaryMemory` | Conversation memory stores |
| `messages` | `HumanMessage`, `AIMessage`, `SystemMessage`, `ToolMessage`, `FunctionMessage`, `RemoveMessage`, `merge_message_runs`, `trim_messages`, `filter_messages` | Message types and utilities |
| `output_parsers` | `StringParser`, `JSONParser`, `ListParser` | LLM output parsing |
| `prompts` | `Prompt`, `ChatPrompt`, `FewShotPromptTemplate` | Prompt templates with variable substitution and few-shot examples |
| `retrievers` | `BaseRetriever`, `VectorStoreRetriever` | Retriever interface |
| `runnables` | `BaseRunnable`, `LambdaRunnable`, `SequenceRunnable`, `ParallelRunnable`, `BranchRunnable`, `RetryRunnable`, `FallbackRunnable`, `RunnableAssign`, `RunnablePick`, `RunnableEach`, `RunnableBinding` | LCEL composable units |
| `stores` | `BaseStore`, `InMemoryStore` | Key-value stores |
| `text_splitters` | `CharacterTextSplitter` | Document chunking |
| `tools` | `BaseTool`, `StructuredTool`, `ToolException` | Tool definitions |
| `vectorstores` | `BaseVectorStore`, `InMemoryVectorStore` | Vector database interface |

### litellm_dart Modules

| Module | Key Classes | Description |
|--------|------------|-------------|
| `providers` | `BaseProvider`, `OpenAIProvider`, `AnthropicProvider`, `GeminiProvider`, `AzureOpenAIProvider`, `BedrockProvider`, `VertexAIProvider`, `CohereProvider`, `HuggingFaceProvider`, `TogetherAIProvider`, `MistralProvider`, `OllamaProvider`, `CustomOpenAIProvider` | 12 provider adapters |
| `router` | `Router`, `Deployment`, `CooldownManager` | Multi-provider routing with 5 strategies |
| `cost` | `CostCalculator`, `ModelPrices`, `SpendLog`, `BudgetManager` | Cost tracking, spend logging, and budget enforcement |
| `token_counter` | `TokenCounter` | Per-provider token counting |
| `embedding` | `EmbeddingRequest`, `EmbeddingResponse`, `EmbeddingData`, `EmbeddingUsage` | Embedding API types |
| `cache` | `BaseCache`, `MemoryCache` | Response caching |
| `types` | `CompletionRequest`, `CompletionResponse` | Request/response models |
| `exceptions` | Custom exception hierarchy | Provider-specific errors |
| `main` | `acompletion`, `createCompletionFunction` | Async completion pipeline and CompletionFunction bridge |

### langchain_graph Modules

| Module | Key Classes | Description |
|--------|------------|-------------|
| `graph` | `StateGraph`, `CompiledStateGraph`, `MessageGraph`, `Send`, `addWaitingEdge`, `addSubgraph` | Graph builder and executor with superstep execution, fan-out/fan-in, and subgraph composition |
| `channels` | `LastValueChannel`, `BinaryOperatorAggregateChannel`, `TopicChannel`, `EphemeralValueChannel` | State communication between nodes |
| `checkpoint` | `BaseCheckpointSaver`, `InMemorySaver`, `CheckpointID` | Graph state persistence |
| `prebuilt` | `ToolNode`, `create_react_agent`, `tools_condition` | Pre-built agent templates |
| `store` | `BaseStore`, `InMemoryStore` | Persistent graph state |
| `runtime` | `GraphRuntime` | Execution with Dart Zones |

---

## humbl_core Module Inventory

The export count reflects the number of public symbols in the `humbl_core.dart` barrel file for each module. Paths are relative to `humbl_core/lib/`.

| Module | Path | Description | Exports |
|--------|------|-------------|---------|
| **confirmation** | `confirmation/` | Confirmation framework with 7 providers (voice command, head gesture, biometric, fingerprint, glasses input, notification, UI dialog) | 9 |
| **platform** | `platform/` | 21 manager interfaces with per-platform implementations (Android, iOS, Windows, macOS, Linux) plus stubs | 90+ |
| **tools** | `tools/` | `HumblTool` base, `ToolRegistry`, 16 domain files, 6 connector tools, policy, schema export, context filter | 17 |
| **pipeline** | `pipeline/` | `StateGraph` engine, `PipelineOrchestrator`, 9 node types, 8 prompt adapters, cancellation, checkpoints, interrupts | 26 |
| **memory** | `memory/` | T2 KV store, T3 vector similarity, T4 interaction log, `ConversationStore`, embedding gateway, migration service | 16 |
| **lm_gateway** | `lm_gateway/` | `ILmGateway`, `HumblLmGateway`, 12 connectors, provider registry, routing policies, cooldown, quota, capability, training, marketplace | 40+ |
| **devices** | `devices/` | `IPeripheralProvider`, `IConnectedDevice`, 4 built-in providers, BLE transport, K900 protocol, head gesture recognizer, hardware device manager | 16 |
| **session** | `session/` | `StreamSessionCoordinator`, `IStreamSessionCoordinator`, audio I/O, `AudioStreamBuffer`, `RingBuffer`, `MicSource`, platform audio player/source | 8 |
| **services** | `services/` | `HumblAgent`, `ServiceRegistry`, `ServiceEventBus`, `AgentSession`, `IServiceHost` | 6 |
| **resources** | `resources/` | `HardwareResourceManager`, `ResourceLease`, `ExecutionHandle`, `IResourceStreamProvider` | 5 |
| **permissions** | `permissions/` | `AccessControl`, `ToolStateManager`, `IPermissionService`, mobile/desktop implementations, resource-permission map | 7 |
| **auth** | `auth/` | `IUserManager`, `HumblUser`, `HumblSession`, `AuthEvent`, `IKeyVault`, `HumblKeyNames`, `NoopUserManager` | 7 |
| **logging** | `logging/` | `PartitionedJournal`, `HumblLogger`, `SqliteJournal`, `JournalSchema`, `TraceId`, `ConfidentialLog` | 7 |
| **payments** | `payments/` | `QuotaManager`, `SpendLog`, `SlidingWindowCounter`, `PaymentRouter`, `PaymentConfig`, `IPaymentProvider`, `IQuotaService`, product/purchase/event models | 11 |
| **settings** | `settings/` | `SettingsService`, `ISettingsProvider`, `SettingDefinition`, `IAppSettingsService`, `AppSettingsModels` | 5 |
| **resilience** | `resilience/` | `CircuitBreaker`, `RetryPolicy`, `ResilientExecutor`, `Heartbeat` | 4 |
| **input** | `input/` | `InputSourceRegistry`, `InputArbitrator`, `IInputSource` | 3 |
| **network** | `network/` | `INetworkMonitor`, `IDataUsageTracker`, `DataUsageModels`, `NoopDataUsageTracker` | 4 |
| **mcp** | `mcp/` | `McpClient`, `McpBridgeTool`, `McpConnectionManager`, `IMcpTransport`, `McpManifest` | 5 |
| **providers** | `providers/` | `IProvider`, `ProviderRegistry`, `ToolProviderRegistry`, typed providers (vision, web search, connected device, platform automation, embedding), adapter | 8 |
| **model_manager** | `model_manager/` | `ModelManager`, `ModelIndex`, `ModelDownloadService`, `ModelInfo`, `ModelFormat`, HuggingFace/custom URL repositories | 10 |
| **models** | `models/` | `ModelConfig`, `ModelRegistry`, `RoutingPolicy`, `TaskType` | 4 |
| **metrics** | `metrics/` | `SystemMetrics` | 1 |
| **storage** | `storage/` | `IBlobStorageService`, `NoopBlobStorage` | 2 |
| **sync** | `sync/` | `SyncStatus`, `ISyncStatusService`, `DeviceSyncConfig` | 3 |
| **profile** | `profile/` | `IProfileService` | 1 |
| **analytics** | `analytics/` | `IAnalyticsService` | 1 |
| **voice_activity_detection** | `voice_activity_detection/` | `IVadEngine`, `VadConfig`, `SileroVadEngine`, `IWakeWordEngine` | 4 |
| **speech_to_text** | `speech_to_text/` | `ISttProvider`, `SttModels`, `SttConfig`, `SttCapabilities`, `SttProviderFactory`, 4 providers (Android, iOS, Whisper API, Whisper.cpp) | 9 |
| **text_to_speech** | `text_to_speech/` | `ITtsProvider`, `TtsModels`, `SpeechSynthesisConfig`, `VoicePersona`, `TtsProviderFactory`, 5 providers (Android, iOS, ElevenLabs, OpenAI, Piper) | 10 |
| **platform/hardware** | `platform/hardware/` | `IHardwareInfoManager`, `HardwareInfoModels`, `StubHardwareInfoManager` | 3 |

## Platform Managers Breakdown

The `platform/` module is the largest, with 21 manager interfaces and 60+ concrete implementations:

| Interface | Android | iOS | Windows | macOS | Linux | Stub |
|-----------|---------|-----|---------|-------|-------|------|
| `ISystemManager` | yes | yes | yes | yes | yes | yes |
| `IWifiManager` | yes | yes | yes | yes | yes | -- |
| `IBluetoothManager` | yes | yes | yes | yes | yes | -- |
| `ICellularManager` | yes | yes | -- | -- | -- | yes |
| `IConnectivityManager` | yes | yes | yes | yes | yes | -- |
| `ICameraManager` | yes | yes | yes | yes | yes | -- |
| `IMediaManager` | yes | yes | yes | yes | yes | -- |
| `IMicrophoneManager` | yes | yes | yes | yes | yes | -- |
| `IContactsManager` | yes | yes | yes | yes | yes | -- |
| `IPhoneManager` | yes | yes | -- | -- | -- | yes |
| `INotificationManager` | yes | yes | yes | yes | yes | -- |
| `ILocationManager` | yes | yes | yes | yes | yes | -- |
| `ISensorManager` | yes | yes | yes | yes | yes | yes |
| `IAudioManager` | -- | -- | -- | -- | -- | yes |
| `IDisplayManager` | -- | -- | -- | -- | -- | yes |
| `IDevicePolicyManager` | -- | -- | -- | -- | -- | yes |
| `IIntentsService` | -- | -- | -- | -- | -- | yes |
| `IVisionService` | -- | -- | -- | -- | -- | yes |
| `IAccessibilityService` | -- | -- | -- | -- | -- | yes |
| `INfcManager` | -- | -- | -- | -- | -- | yes |
| `ITimerService` | yes | yes | -- | -- | -- | yes |
| `IAlarmService` | yes | yes | -- | -- | -- | yes |
| `ICalendarService` | yes | yes | -- | -- | -- | yes |
| `IRoutineService` | yes | yes | -- | -- | -- | yes |
| `INoteService` | -- | -- | -- | -- | -- | yes |
| `IHardwareInfoManager` | -- | -- | -- | -- | -- | yes |
| `IMeteredConnectionDetector` | -- | -- | -- | -- | -- | yes |

## LM Gateway Connectors

The `lm_gateway/connectors/` module provides 12 connector implementations:

| Connector | Provider Type | Protocol |
|-----------|--------------|----------|
| `OpenAiConnector` | BYOK / App Cloud | OpenAI API |
| `AnthropicConnector` | BYOK / App Cloud | Anthropic Messages API |
| `GeminiConnector` | BYOK / App Cloud | Google Generative AI API |
| `MistralConnector` | BYOK / App Cloud | Mistral API |
| `XaiConnector` | BYOK | xAI Grok API |
| `CohereConnector` | BYOK | Cohere API |
| `SarvamConnector` | BYOK | Sarvam AI API |
| `LmStudioConnector` | Local Network | OpenAI-compatible (localhost) |
| `OllamaConnector` | Local Network | Ollama REST API |
| `OpenAiCompatibleConnector` | Any | Generic OpenAI-compatible endpoint |
| `OpenAiCompatibleProvider` | Any | Full provider wrapping OpenAI-compatible connector |

## Tool Domains

The `tools/domains/` and `tools/connectors/` directories organize 70+ tools:

| File | Tools | Description |
|------|-------|-------------|
| `system_control_tools.dart` | Power, volume, brightness, DND, flashlight | Device system controls |
| `media_capture_tools.dart` | Photo, video start/stop, record audio, screenshot | Camera and audio capture |
| `communication_tools.dart` | Send message, make call, read notifications | Messaging and calls |
| `connectivity_tools.dart` | WiFi toggle/scan, BLE scan/connect, cellular toggle | Network management |
| `productivity_tools.dart` | Timer, alarm, calendar, notes, reminders, routine | Personal productivity |
| `ai_vision_tools.dart` | Describe scene, read text (OCR), identify object | AI-powered vision |
| `navigation_a11y_tools.dart` | Navigate, find nearby, accessibility announce | Navigation and accessibility |
| `subsystem_tools.dart` | Memory query, conversation history, model info | Internal subsystem access |
| `system_settings_tools.dart` | Get/set settings | Settings management |
| `search_tools.dart` | Web search, knowledge lookup | Information retrieval |
| `web_tools.dart` | Fetch URL, parse page | Web content access |
| `shell_tools.dart` | Shell execute (sandboxed) | Desktop shell commands |
| `platform_tools.dart` | Platform info, battery status | Platform queries |
| `model_file_tools.dart` | List models, download model, delete model | Model management |
| `download_tool.dart` | Download file | General file download |
| `permission_tool.dart` | Request/check permission | Permission management meta-tool |
| `settings_tool.dart` | Unified settings tool | Settings read/write |

### Connector Tools (read-only query wrappers)

| File | Tools | Description |
|------|-------|-------------|
| `system_connector_tool.dart` | System info, battery, storage | System state queries |
| `wifi_connector_tool.dart` | WiFi status, SSID | WiFi state queries |
| `bluetooth_connector_tool.dart` | BLE device list, connection state | Bluetooth state queries |
| `cellular_connector_tool.dart` | Signal strength, carrier | Cellular state queries |
| `notification_connector_tool.dart` | Notification list, unread count | Notification queries |
| `file_tools.dart` | List files, read file (sandboxed) | File system queries |

## Native Plugins

Kotlin and Swift method channel handlers for platform-specific operations:

| Plugin | Android (Kotlin) | iOS (Swift) |
|--------|-----------------|-------------|
| Core entry point | `HumblCorePlugin.kt` | `HumblCorePlugin.swift` |
| Alarms | `AlarmPlugin.kt` | `AlarmPlugin.swift` |
| Biometric auth | `BiometricPlugin.kt` | `BiometricPlugin.swift` |
| BLE commands | `BleCommandPlugin.kt` | `BleCommandPlugin.swift` |
| Calendar access | `CalendarPlugin.kt` | `CalendarPlugin.swift` |
| ExecuTorch runtime | `ExecuTorchPlugin.kt` | `ExecuTorchPlugin.swift` |
| LiteRT (TFLite) runtime | `LiteRtPlugin.kt` | `LiteRtPlugin.swift` |
| Routines | `RoutinePlugin.kt` | `RoutinePlugin.swift` |
| Speech-to-text | `SttPlugin.kt` | `SttPlugin.swift` |
| Timer | `TimerPlugin.kt` | `TimerPlugin.swift` |
| Text-to-speech | `TtsPlugin.kt` | `TtsPlugin.swift` |
