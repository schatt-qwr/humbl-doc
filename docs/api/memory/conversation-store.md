---
sidebar_position: 2
title: ConversationStore
---

# ConversationStore

Persistent conversation turn store backed by SQLite, implementing `BaseChatMessageHistory` from `langchain_dart`. Stores every user/assistant/tool turn with quality scoring. Uses LangChain message types (`HumanMessage`, `AIMessage`, `ToolMessage`) for interoperability with LangChain chains and agents.

**File:** `humbl_core/lib/memory/conversation_store.dart`
**Implements:** `BaseChatMessageHistory` from `langchain_dart`

## Class Signature

```dart
class ConversationStore implements BaseChatMessageHistory {
  static Future<ConversationStore> open(String dbPath);
  static Future<ConversationStore> fromDatabase(Database db);

  // Write
  Future<int> appendTurn(ConversationTurn turn);
  Future<int> appendUserTurn(ConversationTurn turn);

  // Read
  Future<List<ConversationTurn>> getSession(String sessionId);
  Future<List<ConversationTurn>> getUserHistory(String userId, {int limit = 100, DateTime? since});
  Future<int> nextTurnIndex(String sessionId);
  Future<int> countTurns(String userId);

  // Update
  Future<void> setQualityScore(int turnId, double score, {String? feedback});
  Future<void> setFeedback(int turnId, String feedback);

  // Export
  Future<List<Map<String, dynamic>>> exportSession(String sessionId);

  Future<void> close();
}
```

## ConversationTurn

```dart
class ConversationTurn {
  final int? id;
  final String sessionId;
  final String userId;
  final int turnIndex;
  final String role;            // 'user', 'assistant', 'tool'
  final String content;
  final String? modelId;
  final String? toolName;
  final double qualityScore;    // 0.0-1.0
  final String? feedback;       // Explicit user feedback
  final int tokensUsed;
  final DateTime timestamp;

  Map<String, dynamic> toJson();
}
```

## Quality Scoring

Quality scoring is **implicit by default**:

- Default score: `0.7` (neutral, no signal).
- If the user sends a follow-up within 30 seconds (`rephraseWindow`), the previous assistant turn is marked as low quality (`0.3`) -- this indicates the user was rephrasing because the response was inadequate.
- Explicit feedback overrides implicit scoring via `setQualityScore()` or `setFeedback()`.

### appendUserTurn()

This method implements rephrase detection:

```dart
Future<int> appendUserTurn(ConversationTurn turn) async {
  // Check if previous assistant turn was within rephraseWindow
  // If so, mark it as quality 0.3
  // Then insert the new user turn
}
```

## Schema

```sql
CREATE TABLE conversation_turns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  turn_index INTEGER NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  model_id TEXT,
  tool_name TEXT,
  quality_score REAL NOT NULL DEFAULT 0.7,
  feedback TEXT,
  tokens_used INTEGER NOT NULL DEFAULT 0,
  timestamp TEXT NOT NULL
);
```

## Usage Example

```dart
final store = await ConversationStore.open('conversations.db');

// Append user turn with rephrase detection
await store.appendUserTurn(ConversationTurn(
  sessionId: 'session-1',
  userId: 'user-1',
  turnIndex: 0,
  role: 'user',
  content: 'What is the weather?',
  timestamp: DateTime.now(),
));

// Get full session
final turns = await store.getSession('session-1');

// Export for training data
final json = await store.exportSession('session-1');
```
