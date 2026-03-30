---
sidebar_position: 4
title: EmbeddingGateway
---

# EmbeddingGateway

Routes embedding requests to the best available provider with automatic fallback.

**File:** `humbl_core/lib/memory/embedding_gateway.dart`

## IEmbeddingGateway Interface

```dart
abstract class IEmbeddingGateway {
  int get dimensions;
  String get modelId;
  bool get isOnDeviceAvailable;

  Future<void> setPreferredSource(EmbeddingSource source);
  Future<List<double>> embed(String text);
  Future<List<List<double>>> embedBatch(List<String> texts);
}
```

## EmbeddingSource

```dart
enum EmbeddingSource {
  onDevice,  // Always use on-device ONNX model
  cloud,     // Always use cloud embedding API
  auto,      // Prefer on-device, fall back to cloud
}
```

## EmbeddingGateway

Concrete implementation with on-device primary and optional cloud fallback:

```dart
class EmbeddingGateway implements IEmbeddingGateway {
  EmbeddingGateway({
    required IEmbeddingProvider onDevice,
    IEmbeddingProvider? cloud,
  });
}
```

### Fallback Behavior

1. Try the active provider (on-device by default).
2. If it fails and a cloud provider is configured, fall back to cloud.
3. If no fallback available, rethrow the error.

## IEmbeddingProvider Interface

```dart
abstract class IEmbeddingProvider {
  String get modelId;
  int get dimensions;

  Future<List<double>> embed(String text);
  Future<List<List<double>>> embedBatch(List<String> texts);
}
```

### Planned Implementations

| Provider | Type | Model | Dimensions |
|----------|------|-------|-----------|
| OnnxEmbeddingProvider | On-device | all-MiniLM-L6-v2 | 384 |
| Cloud embedding | Cloud | text-embedding-3-small | 384 (truncated) |

## EmbeddingMigrationService

Handles re-embedding when the embedding model changes (e.g., upgrading from MiniLM to a better model):

1. Reads all vectors from `SqliteVecStore`.
2. Re-embeds text content with the new provider.
3. Updates embeddings in place.
4. Tracks migration state for resumability.

## Usage Example

```dart
final gateway = EmbeddingGateway(
  onDevice: onnxProvider,
  cloud: openAiEmbedder,
);

// Embed a single text
final vector = await gateway.embed('User likes coffee');

// Batch embed
final vectors = await gateway.embedBatch([
  'User likes coffee',
  'User prefers morning meetings',
]);
```
