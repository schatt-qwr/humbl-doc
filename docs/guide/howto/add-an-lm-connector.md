---
sidebar_position: 3
title: Add an LM Connector
---

# How to Add an LM Connector

Implement a new LM provider connector to support a new cloud API, local server, or on-device runtime.

## Steps

### 1. Implement ILmConnector

```dart
// humbl_core/lib/lm_gateway/connectors/my_provider_connector.dart

class MyProviderConnector implements ILmConnector {
  @override
  String get connectorId => 'my_provider';

  @override
  String get displayName => 'My Provider';

  @override
  LmProviderType get providerType => LmProviderType.appCloud;

  @override
  List<ConnectorConfigField> get configSchema => [
    ConnectorConfigField(
      key: 'api_key',
      label: 'API Key',
      type: 'secret',
      required: true,
      placeholder: 'sk-...',
    ),
    ConnectorConfigField(
      key: 'model',
      label: 'Model',
      type: 'select',
      required: true,
      options: ['model-small', 'model-large'],
      defaultValue: 'model-small',
    ),
  ];

  @override
  Set<Type> get supportedConfigTypes => {MyProviderConfig};

  @override
  String? validateConfig(dynamic config, IKeyVault keyVault) {
    if (config is! MyProviderConfig) return 'Invalid config type';
    if (config.apiKey.isEmpty) return 'API key required';
    return null; // Valid
  }

  @override
  Future<ConfigTestResult> testConfig(dynamic config, IKeyVault keyVault) async {
    // Make a lightweight API call to verify the key works
    try {
      final response = await http.get(
        Uri.parse('https://api.myprovider.com/v1/models'),
        headers: {'Authorization': 'Bearer ${config.apiKey}'},
      );
      return ConfigTestResult(
        success: response.statusCode == 200,
        message: response.statusCode == 200 ? 'Connected' : 'Auth failed',
        latencyMs: response.duration.inMilliseconds,
      );
    } catch (e) {
      return ConfigTestResult(success: false, message: 'Connection failed: $e');
    }
  }

  @override
  Future<ILmProvider> createProvider(dynamic config, IKeyVault keyVault) async {
    return MyProviderLmProvider(config: config as MyProviderConfig);
  }
}
```

### 2. Implement ILmProvider

```dart
class MyProviderLmProvider implements ILmProvider {
  final MyProviderConfig config;
  MyProviderLmProvider({required this.config});

  @override
  String get instanceId => 'my_provider_${config.model}';

  @override
  Future<LmGatewayResponse> complete(LmGatewayRequest request) async {
    // Convert request to provider's API format
    // Make the API call
    // Convert response back to LmGatewayResponse
  }

  @override
  Stream<LmGatewayToken> stream(LmGatewayRequest request) async* {
    // SSE streaming implementation
  }

  @override
  bool get isHealthy => true;

  @override
  int get maxContextTokens => 128000;
}
```

### 3. Register the Connector

```dart
// In app startup or connector initialization
connectorRegistry.register(MyProviderConnector());
```

### 4. Define Config Model

```dart
class MyProviderConfig {
  final String apiKey;
  final String model;
  final String? baseUrl;

  const MyProviderConfig({
    required this.apiKey,
    required this.model,
    this.baseUrl,
  });
}
```

## LmProviderType

Choose the correct provider type:

| Type | When to Use |
|------|------------|
| `onDevice` | llama.cpp, ExecuTorch, LiteRT on the phone |
| `localNetwork` | Ollama, LM Studio on LAN |
| `appCloud` | Humbl-managed API keys (Anthropic, OpenAI, etc.) |
| `byok` | User-provided API keys |

## Config Schema Field Types

| Type | Description |
|------|-------------|
| `string` | Plain text input |
| `secret` | Password/API key (masked in UI) |
| `url` | URL with validation |
| `select` | Dropdown with options list |
| `number` | Numeric input |
| `boolean` | Toggle switch |
