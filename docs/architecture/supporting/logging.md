---
sidebar_position: 5
title: Logging
---

# Logging

Humbl's logging system has three tiers: console logging via `HumblLogger`, persistent structured logging via `PartitionedJournal`, and confidential logging via `ILogEncryptor`. All tiers are connected by `TraceId` for end-to-end correlation across pipeline runs, tool executions, and cloud requests.

## What

The logging system captures every significant event in the Humbl runtime -- pipeline state transitions, tool invocations, LM requests, auth events, sync operations, errors, and confidential user interactions. Events flow from a singleton logger (`HumblLogger`) through to a partitioned SQLite journal (`PartitionedJournal`) that handles persistence, sync tracking, and retention.

## Why

An edge-first assistant running on a personal device needs a logging system that satisfies three competing concerns:

1. **Debuggability.** When a voice command fails mid-pipeline on a user's phone, the only way to diagnose it is a structured audit trail with trace correlation. Every pipeline run, every gate check, every LM call must be traceable end-to-end.

2. **Privacy.** The user's conversations contain personal information. Confidential events (messages, tool parameters with PII, location data) must be encrypted at rest. The journal must never store plaintext for confidential entries -- even during early startup before the encryption key is available.

3. **Storage efficiency on mobile.** A journal that grows without bound will fill up a phone's storage. Monthly rotation means pruning is instant -- delete a file, no vacuum required. WAL mode enables concurrent reads (UI dashboard, cloud sync) without blocking writes (pipeline logging).

## How It Connects

```
HumblLogger (singleton)
    │
    ├── d() ──────────► Console only (development)
    ├── i() / w() ────► Console + PartitionedJournal
    ├── e() ──────────► Console + PartitionedJournal (bypasses buffer)
    ├── c() ──────────► ILogEncryptor → PartitionedJournal (journal only, never console)
    ├── tool() ───────► PartitionedJournal (structured tool_start/tool_end)
    └── event() ──────► PartitionedJournal (structured with full metadata)
                             │
                             ▼
                        PartitionedJournal
                             ├── humbl_journal.db (current month, read-write, WAL mode)
                             └── humbl_journal_archive/
                                  ├── 2026_01.db (read-only)
                                  ├── 2026_02.db (read-only)
                                  └── ...
```

At startup, the app creates `HumblLogger.instance`, then calls `setJournal()` with a `PartitionedJournal` and `setEncryptor()` with the user's `ILogEncryptor`. Any confidential log entries generated before the encryptor is available are queued in memory (capped at 50 entries to limit plaintext exposure) and flushed through encryption once `setEncryptor()` is called. The pipeline, tool system, and all services use `HumblLogger` directly -- they never interact with the journal backend.

## HumblLogger

Singleton structured logger. Seven methods, three output paths:

### Method Reference

| Method | Output | Buffered | Description |
|--------|--------|----------|-------------|
| `d(tag, message)` | Console only | N/A | Debug messages for development. Stripped in release builds. Never persisted. |
| `i(tag, message)` | Console + Journal | Yes | Informational messages. Typical: service startup, config loaded, session created. Batched with other journal entries. |
| `w(tag, message)` | Console + Journal | Yes | Non-critical warnings. Typical: deprecated API used, fallback triggered, retry attempted. |
| `e(tag, message, [error, stack])` | Console + Journal | **No** | Errors and exceptions. **Bypasses the write buffer** and flushes immediately. This ensures crash-adjacent errors are persisted even if the app terminates shortly after. |
| `c(tag, message)` | Journal only | Yes | Confidential entries. **Never printed to console** (prevents PII leaking to logcat/Xcode console). Encrypted via `ILogEncryptor` before reaching the journal. Returns a `Future<ConfidentialLogEntry?>` so callers can await encryption completion if needed. |
| `tool(toolName, action, details)` | Journal | Yes | Structured tool action log. Creates paired `tool_start`/`tool_end` events with execution time, gate results, and tool parameters. |
| `event(eventType, traceId, metadata)` | Journal | Yes | Structured event with full metadata map. Used by pipeline nodes, auth flows, sync operations, and any subsystem that needs rich structured logging. |

### Why These Tiers?

The tier split reflects the reality of mobile development:

- **Console-only (`d()`)** exists because developers need fast feedback during debugging, but debug noise must never reach production storage. On Android, `d()` maps to `Log.d()` which is filterable; in release, it compiles to a no-op.
- **Error bypass** (`e()`) exists because the most critical log entries happen right before crashes. If errors were buffered with everything else, the batch might never flush before the process dies.
- **Confidential-only (`c()`)** exists because a voice assistant processes deeply personal content ("Call my doctor about the test results"). This content must be auditable (for the user's own debugging), but never visible in console output, never stored in plaintext, and only decryptable by the user's private key.

```dart
class HumblLogger {
  static final HumblLogger instance = HumblLogger._();

  void setEncryptor(ILogEncryptor encryptor);
  void setJournal(ISystemJournal journal);

  void d(String tag, String message);            // Debug
  void i(String tag, String message);            // Info (also journals)
  void w(String tag, String message);            // Warning (also journals)
  void e(String tag, String message,             // Error (also journals)
      [Object? error, StackTrace? stackTrace]);
  Future<ConfidentialLogEntry?> c(               // Confidential
      String tag, String message);
  void tool(String toolName, String action,      // Tool action
      Map<String, dynamic> details);
  void event(String eventType, String traceId,   // Structured event
      Map<String, dynamic> metadata);
}
```

### Journal Auto-Forwarding

When `setJournal()` is called at startup, `i()`, `w()`, `e()`, and `event()` automatically create `JournalEvent` entries and forward them to the persistent journal backend. Before `setJournal()` is called (during very early startup), these methods only print to console. No events are lost -- early startup events are typically low-value (`d()`-level) and do not need persistence.

### Confidential Logging

The `c()` method implements a three-phase encryption pipeline:

1. **If an `ILogEncryptor` is configured:** Encrypt the message immediately via `encryptor.encrypt(plaintext)`. Create a `ConfidentialLogEntry` with the encrypted payload and scrubbed metadata. Persist via `journal.logConfidential()`. The journal entry has `is_confidential = 1`, `metadata_json` is empty (scrubbed), and the content lives only in `encrypted_payload`.

2. **If no encryptor is set yet (early startup):** Queue the message in an in-memory list capped at 50 entries. This limits plaintext exposure in process memory. If the cap is reached, the oldest entry is dropped with a warning.

3. **When `setEncryptor()` is called later:** Flush all queued messages through encryption and persist them. The queue is cleared.

**Security invariant:** The journal database never contains plaintext for confidential entries. `metadata_json` is scrubbed (set to `null` or `{}`) for any event where `is_confidential = 1`. Only the user's private key (held in secure storage, never synced) can decrypt `encrypted_payload`.

```dart
abstract class ILogEncryptor {
  Future<String> encrypt(String plaintext);
  Future<String> decrypt(String ciphertext);
}
```

In practice, `ILogEncryptor` wraps platform-specific key storage: Android Keystore, iOS Keychain, or Windows DPAPI. The encryption is **non-deterministic** — the same plaintext produces a different ciphertext each time (using a random nonce/IV), but decryption always yields the original value. Only the user's private key can decrypt PII fields.

**Important:** Logs are mostly readable plaintext. Only PII sections (conversation content, contact names, location data, file paths) are encrypted. All users — including free and unregistered — have their logs and anonymised telemetry synced to the server. Humbl can analyse system health, usage patterns, and model performance from the plaintext portions, while remaining unable to read any personal content in the encrypted fields.

## PartitionedJournal

The production journal backend. Replaces the legacy `SqliteJournal` with monthly rotation, sync tracking, and smart pruning.

### Why Partitioned?

A naive single-file journal creates three problems on mobile:

1. **Pruning is expensive.** Deleting old rows from a single SQLite file leaves dead pages. `VACUUM` rewrites the entire file -- for a 200 MB journal, this means 200 MB of I/O, potentially seconds of blocking on a phone with flash wear. With monthly partitions, pruning is instant: `File('journal_2025_11.db').deleteSync()`. No vacuum, no fragmentation, no I/O spike.

2. **Size estimation is trivial.** Each partition file's size on disk directly represents that month's storage cost. Total journal size = sum of file sizes. No need to query `SELECT COUNT(*)` or `PRAGMA page_count`.

3. **Archive isolation.** Previous months become read-only. This means cloud sync can read old partitions without any risk of write contention with the active month's logging.

### WAL Mode

The active partition uses SQLite's Write-Ahead Logging mode. WAL is critical for the journal because:

- **Pipeline logging must never block.** The pipeline runs on the main isolate. If a tool execution triggers a journal write that blocks on a concurrent read (e.g., cloud sync querying unsynced entries), it would stall the user's response. WAL mode allows concurrent readers and a single writer without mutual blocking.
- **Crash safety.** WAL provides atomic commits. If the app crashes mid-write, the WAL file is rolled back on next open. No corrupt journal entries.

### Sync Tracking (is_synced)

Every journal entry has an `is_synced` column (default `0`). The cloud sync flow works as follows:

1. **Cloud sync service** calls `journal.queryUnsynced(limit: 500)` to get the next batch of unsynced entries.
2. Entries are pushed to the Supabase backend (batched, compressed).
3. On successful push, the sync service calls `journal.markSynced(traceIds)` to flip `is_synced = 1` for the batch.
4. **Pruning only deletes synced entries.** This is the critical invariant: `DELETE FROM journal_events WHERE is_synced = 1 AND timestamp < ?`. Unsynced entries survive even past size limits. If a user is offline for weeks, their journal grows beyond the normal size limit -- but no audit data is lost. Once they come back online and sync completes, pruning resumes.

The 180-day minimum floor means no entry (synced or not) is pruned if it is less than 180 days old. This floor exists to comply with CERT-In India's data retention mandate, which requires organizations to maintain logs for 180 days.

### Batch Writes

The journal buffers up to 100 events before flushing to SQLite in a single transaction. This dramatically reduces I/O on mobile (100 individual inserts = 100 `fsync()` calls; 1 batched transaction = 1 `fsync()`).

Two event types bypass the buffer entirely:
- **Error events** (`e()`) flush immediately because they often precede crashes.
- **Audit events** (authentication, permission changes) flush immediately for compliance.

### Key Features Summary

| Feature | Description |
|---------|-------------|
| **Monthly rotation** | New SQLite file each month (`journal_2026_03.db`). Old files are read-only. |
| **Sync tracking** | Each entry has `is_synced` flag. Cloud sync only pushes unsynced entries. |
| **WAL mode** | Write-ahead logging for concurrent read/write without blocking. |
| **Smart pruning** | Only prunes synced entries. Unsynced entries are retained regardless of age. 180-day floor for all entries (CERT-In India mandate). |
| **Batch writes** | Buffers up to 100 events before flushing (error and audit events bypass the buffer). |
| **Instant prune** | Delete a partition file -- no vacuum, no fragmentation, no I/O spike. |

### ISystemJournal Interface

```dart
abstract class ISystemJournal {
  Future<void> log(JournalEvent event);
  Future<void> logConfidential(ConfidentialLogEntry entry);
  Stream<JournalEvent> query({String? traceId, String? eventType, DateTime? since});
  Future<void> flush();
  Future<void> sync();
  Future<void> markSynced(List<String> traceIds);
  Stream<JournalEvent> queryUnsynced({int limit = 500});
}
```

The `query()` method searches across all partitions (active + archived) using a union query. This enables the debug dashboard to search historical events without the caller needing to know about partitioning.

### JournalEvent

The atomic unit of the system journal:

```dart
class JournalEvent {
  final String traceId;
  final String userId;
  final String sessionId;
  final String eventType;
  final DateTime timestamp;
  final int? durationMs;
  final bool isConfidential;
  final Map<String, dynamic> metadata;
  final String? encryptedPayload;
}
```

For confidential events, `metadata` is empty and `encryptedPayload` contains the encrypted content. For non-confidential events, `metadata` contains the structured data (tool name, parameters, gate results, etc.) and `encryptedPayload` is null.

### Event Types

| Type | Source | Description |
|------|--------|-------------|
| `info` | `HumblLogger.i()` | General informational messages |
| `warning` | `HumblLogger.w()` | Non-critical warnings |
| `error` | `HumblLogger.e()` | Errors and exceptions (bypasses buffer) |
| `confidential_log` | `HumblLogger.c()` | Encrypted confidential data |
| `tool_start` / `tool_end` | `HumblLogger.tool()` | Tool execution lifecycle with timing |
| `pipeline.start` / `pipeline.end` | `HumblLogger.event()` | Pipeline run lifecycle |
| `lm.request` / `lm.response` | `HumblLogger.event()` | LM inference requests and responses |
| `auth.*` | `HumblLogger.event()` | Authentication events |
| `sync.*` | `HumblLogger.event()` | Cloud sync events |
| Custom | `HumblLogger.event()` | Any subsystem-specific structured event |

## TraceId

Every pipeline run generates a unique trace ID (UUID v4) that flows through all nodes, tool executions, LM requests, and journal entries. This enables end-to-end correlation for debugging.

When a user reports "my WiFi toggle didn't work," the trace ID lets a developer query the journal for every event in that pipeline run: context assembly, classification result, gate checks, tool execution, and delivery -- all in chronological order.

```dart
class TraceId {
  static String generate(); // UUID v4
}
```

Scout agents receive their own trace ID (prefixed with `scout_`) so their events can be distinguished from user-initiated pipeline runs while still being correlatable via the parent run's trace ID stored in metadata.

## InMemoryJournal

Development and testing backend that holds events in a capped list (max 10,000). Used in unit tests to assert that specific events were logged without touching the filesystem.

```dart
class InMemoryJournal implements ISystemJournal {
  List<JournalEvent> get events;
  void clear();
}
```

The cap prevents memory exhaustion in long-running test suites. When the cap is reached, the oldest events are dropped (FIFO). In tests, callers typically `clear()` between test cases.

## Source Files

| File | Description |
|------|-------------|
| `humbl_core/lib/logging/humbl_logger.dart` | HumblLogger singleton |
| `humbl_core/lib/logging/system_journal.dart` | ISystemJournal, JournalEvent, InMemoryJournal |
| `humbl_core/lib/logging/sqlite_journal.dart` | SqliteJournal (legacy, deprecated -- replaced by PartitionedJournal) |
| `humbl_core/lib/logging/confidential_log.dart` | ConfidentialLogEntry, ILogEncryptor |
| `humbl_core/lib/logging/trace_id.dart` | TraceId |
| `humbl_core/lib/logging/journal_schema.dart` | SQLite schema constants for partition tables |
