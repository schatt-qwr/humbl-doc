---
sidebar_position: 3
title: Vector Store
---

# Vector Store

IVectorStore and SqliteVecStore for on-device semantic search using 384-dimensional embeddings.

## IVectorStore Interface

```dart
abstract class IVectorStore {
  Future<void> upsert(String id, List<double> embedding, {
    String? textContent,
    Map<String, dynamic>? metadata,
    double importance = 0.5,
  });

  Future<List<VectorSearchResult>> search(List<double> queryEmbedding, {
    int topK = 10,
    double minSimilarity = 0.0,
  });

  Future<void> delete(String id);
  Future<int> get count;
}
```

## VectorSearchResult

```dart
class VectorSearchResult {
  final String id;
  final double similarity;
  final String? textContent;
  final Map<String, dynamic>? metadata;
  final double importance;
  final DateTime createdAt;
}
```

## SqliteVecStore

Backed by `sqlite_vector`'s native distance functions. Vector similarity is computed inside SQLite via `vector_full_scan` -- only top-K results cross the FFI boundary.

**File:** `humbl_core/lib/memory/sqlite_vec_store.dart`

```dart
class SqliteVecStore implements IVectorStore {
  static Future<SqliteVecStore> open(String dbPath, {
    required IEmbeddingProvider embedder,
  });

  // IVectorStore implementation
}
```

### Capacity

Supports up to ~500K on-device vectors before ANN indexing would be needed. With daily use, this covers years of memories.

### Schema

```sql
CREATE TABLE vector_store (
  id TEXT NOT NULL,
  embedding BLOB NOT NULL,
  text_content TEXT,
  metadata_json TEXT,
  importance REAL NOT NULL DEFAULT 0.5,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

### Important Notes

- Uses a **separate** `sqlite3` connection from the main `sqflite` connection. This is required because the `sqlite_vector` extension must be loaded without affecting sqflite's global state.
- Embeddings are stored as FLOAT32 BLOBs.
- Importance index enables efficient filtering by importance score.

## Usage Example

```dart
final store = await SqliteVecStore.open('vectors.db',
  embedder: onnxEmbedder,
);

// Store a memory
final embedding = await embedder.embed('User prefers Hindi language');
await store.upsert('pref-lang', embedding,
  textContent: 'User prefers Hindi language',
  importance: 0.8,
);

// Search
final queryEmb = await embedder.embed('What language?');
final results = await store.search(queryEmb, topK: 5);
```
