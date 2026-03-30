---
sidebar_position: 2
title: Connectors
---

# LM Connectors

Each LM provider (Anthropic, OpenAI, Ollama, etc.) has a connector that knows how to validate configs, test connectivity, and create provider instances.

**File:** `humbl_core/lib/lm_gateway/connectors/i_lm_connector.dart`

## ILmConnector Interface

```dart
abstract class ILmConnector {
  String get connectorId;
  String get displayName;
  LmProviderType get providerType;
  List<ConnectorConfigField> get configSchema;
  Set<Type> get supportedConfigTypes;

  String? validateConfig(dynamic config, IKeyVault keyVault);
  Future<ConfigTestResult> testConfig(dynamic config, IKeyVault keyVault);
  Future<ILmProvider> createProvider(dynamic config, IKeyVault keyVault);
}
```

| Method | Description |
|--------|-------------|
| `configSchema` | Describes fields needed for configuration (API key, endpoint, model ID) |
| `validateConfig()` | Validates config without network calls. Returns null if valid, error string otherwise. |
| `testConfig()` | Live connectivity and auth test against the endpoint. |
| `createProvider()` | Creates a ready-to-use `ILmProvider` from validated config. |

## ConnectorConfigField

Describes a single configuration field for UI rendering:

```dart
class ConnectorConfigField {
  final String key;
  final String label;
  final String type;       // 'string', 'secret', 'url', 'select', 'number', 'boolean'
  final bool required;
  final dynamic defaultValue;
  final List<String>? options;  // For 'select' type
  final String? placeholder;
  final String? helpText;
}
```

## ConfigTestResult

```dart
class ConfigTestResult {
  final bool success;
  final String message;
  final int? latencyMs;
  final List<String>? availableModels;
}
```

## Built-in Connectors

| Connector | ID | Provider Type | Description |
|-----------|-----|--------------|-------------|
| **AnthropicConnector** | `anthropic` | `appCloud` | Claude models via Anthropic API |
| **OpenAiConnector** | `openai` | `appCloud` | GPT models via OpenAI API |
| **GeminiConnector** | `gemini` | `appCloud` | Gemini models via Google AI API |
| **MistralConnector** | `mistral` | `appCloud` | Mistral models via Mistral API |
| **CohereConnector** | `cohere` | `appCloud` | Command models via Cohere API |
| **XaiConnector** | `xai` | `appCloud` | Grok models via xAI API |
| **SarvamConnector** | `sarvam` | `appCloud` | Indic language models via Sarvam AI |
| **OllamaConnector** | `ollama` | `localNetwork` | Local Ollama server |
| **LmStudioConnector** | `lm_studio` | `localNetwork` | LM Studio local server |
| **OpenAiCompatibleConnector** | `openai_compatible` | `byok` | Any OpenAI-compatible endpoint |
| **OpenAiCompatibleProvider** | -- | `byok` | BYOK wrapper for user-provided endpoints |

### LmProviderType

| Type | Description |
|------|-------------|
| `onDevice` | llama.cpp, ExecuTorch, LiteRT running locally |
| `localNetwork` | Ollama, LM Studio on LAN |
| `appCloud` | Humbl-managed cloud API keys |
| `byok` | User-provided (bring your own key) API keys |

## ConnectorRegistry

Manages all registered connectors:

```dart
class ConnectorRegistry {
  void register(ILmConnector connector);
  ILmConnector? get(String connectorId);
  List<ILmConnector> get all;
}
```

## Source Files

| File | Description |
|------|-------------|
| `humbl_core/lib/lm_gateway/connectors/i_lm_connector.dart` | ILmConnector, ConnectorConfigField, ConfigTestResult |
| `humbl_core/lib/lm_gateway/connectors/anthropic_connector.dart` | Anthropic Claude |
| `humbl_core/lib/lm_gateway/connectors/openai_connector.dart` | OpenAI GPT |
| `humbl_core/lib/lm_gateway/connectors/gemini_connector.dart` | Google Gemini |
| `humbl_core/lib/lm_gateway/connectors/ollama_connector.dart` | Ollama local |
| `humbl_core/lib/lm_gateway/connectors/lm_studio_connector.dart` | LM Studio |
| `humbl_core/lib/lm_gateway/connectors/openai_compatible_connector.dart` | OpenAI-compatible |
