---
sidebar_position: 1
title: IMemoryService
---

# IMemoryService

Unified memory abstraction for 3 tiers, extending `BaseMemory` from `langchain_dart`. T1 (performance cache) was removed due to near-zero cache hit rate for NLP workloads. All storage is SQLite-backed.

**File:** `humbl_core/lib/memory/i_memory_service.dart`
**Extends:** `BaseMemory` from `langchain_dart`

## Interface

```dart
abstract class IMemoryService extends BaseMemory {
  // ── T2: KV Store (structured facts, preferences) ──
  Future<Map<String, dynamic>?> getKv(String userId, String key);
  Future<void> setKv(String userId, String key, Map<String, dynamic> value, {
    double importanceScore = 0.5,
  });
  Future<Map<String, dynamic>> getManyKv(String userId, List<String> keys);
  Future<List<KvEntry>> getKvModifiedSince(String userId, DateTime since);

  // ── T3: Vector Store (semantic search) ──
  Future<List<MemoryEntry>> querySemanticMemory(String userId, String query, {
    int maxResults = 10,
    double minSimilarity = 0.5,
  });
  Future<void> writeSemanticMemory(String userId, String content, {
    Map<String, dynamic>? metadata,
    double importanceScore = 0.5,
  });

  // ── T4: Audit Log ──
  Future<void> logInteraction(InteractionLog log);

  // ── Context Assembly ──
  Future<MemoryContext> assembleContext(String userId, String inputText, {
    List<Map<String, dynamic>> conversationHistory = const [],
  });

  // ── Lifecycle ──
  Future<void> initialize();
  Future<void> dispose();
}
```

## Memory Tiers

| Tier | Storage | Purpose |
|------|---------|---------|
| T2 | SQLite KV | Structured facts, user preferences, patterns |
| T3 | sqlite_vector | Semantic search via 384-dim embeddings |
| T4 | SQLite append-only | Audit trail, tool calls, timing data |

## MemoryEntry

Returned from semantic search (T3):

```dart
class MemoryEntry {
  final String id;
  final String content;
  final double similarityScore;
  final double importanceScore;
  final Map<String, dynamic>? metadata;
  final DateTime createdAt;
}
```

## InteractionLog

Pipeline interaction record for T4:

```dart
class InteractionLog {
  final String userId;
  final String sessionId;
  final String runId;
  final String? traceId;
  final String inputText;
  final String? outputText;
  final String? toolName;
  final bool success;
  final int durationMs;
  final int tokensUsed;
  final DateTime timestamp;
}
```

## Context Assembly

`assembleContext()` is called by `ContextAssemblyNode` to build the full memory context for a pipeline run:

1. Query T2 for user preferences and known facts.
2. Query T3 for semantically relevant memories.
3. Combine with conversation history.
4. Return `MemoryContext` with ranked entries.

## Implementations

| Class | Description |
|-------|-------------|
| `SqliteMemoryService` | Full SQLite implementation (T2 + T3 + T4) |
| `NoopMemoryService` | Returns empty results (for testing or when memory is disabled) |

## Usage Example

```dart
// Write a structured fact
await memory.setKv('user-1', 'preferences.language', {'value': 'Hindi'});

// Semantic search
final memories = await memory.querySemanticMemory(
  'user-1', 'What language does the user prefer?',
  maxResults: 5,
);

// Context assembly for pipeline
final context = await memory.assembleContext('user-1', 'Set a timer',
  conversationHistory: recentTurns,
);
```
