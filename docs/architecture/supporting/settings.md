---
sidebar_position: 3
title: Settings
---

# Settings System

The settings system provides a generic, namespace-based, reactive settings registry. Modules register `ISettingsProvider` implementations that declare their settings. The central `SettingsService` handles persistence (SQLite), access control (per-setting), reactive streams, and cloud sync readiness.

All classes live in `humbl_core/lib/settings/`.

## What

The settings system is a centralized key-value registry where each module owns a namespace and declares its settings with type, default value, access control, and persistence rules. It provides:

- **Namespace isolation** -- modules cannot read or write each other's settings except through the service.
- **Reactive streams** -- UI and services subscribe to setting changes and react immediately.
- **Access-controlled writes** -- each setting declares who can change it (user, LM, module, cloud sync).
- **Persistence by category** -- configuration and preference settings persist in SQLite; status settings are memory-only.
- **LM integration** -- the `SettingsTool` exposes readable/writable settings to the LM so the user can say "set camera resolution to 4K" via natural language.

## Why

Without a centralized settings system, each module would manage its own settings storage, leading to:

- **Fragmented persistence.** Some modules store settings in SharedPreferences, others in SQLite, others in files. Migration, backup, and cloud sync become per-module problems.
- **No access control.** The LM could change any setting without restriction. A user's privacy settings could be modified by a tool or a malicious MCP server.
- **No reactivity.** When a setting changes, dependent code would need to poll or be manually notified. With reactive streams, a camera module instantly adjusts when the user changes resolution.
- **No discoverability.** The LM has no way to know what settings exist, what values are valid, or what each setting does. The settings system's definitions include labels, descriptions, allowed values, and ranges -- all available to the LM via `SettingsTool`.

## How It Connects

```
CameraSettingsProvider ──┐
VoiceSettingsProvider  ──┼──► SettingsService (SQLite + in-memory cache)
LmSettingsProvider     ──┘         │
CloudSettingsProvider ───┘         ├── get() / set() ◄── UI, modules, cloud sync
                                   ├── onSettingsChanged stream ──► UI, dependent services
                                   └── SettingsTool ◄── LM (via pipeline)
```

At startup, each module registers its `ISettingsProvider` with `SettingsService`. The service loads persisted values from SQLite and merges them with the provider's declared defaults. From that point:

1. **UI** reads settings via `get(namespace, key)` and writes via `set(namespace, key, value, source: user)`.
2. **LM** reads and writes via `SettingsTool`, which enforces `SettingAccess` rules (see access control below).
3. **Modules** read their own settings and receive change notifications via the provider's `updates` stream.
4. **Cloud sync** writes via `set(namespace, key, value, source: cloudSync)` during sync reconciliation.

### Namespace Pattern

Each module registers a provider with a unique namespace. Settings are keyed as `namespace.key`:

- `camera.defaultResolution` -- 1080p, 4K, etc.
- `camera.hdr` -- boolean, whether HDR is enabled.
- `voice.wakeWord` -- the wake word string (e.g., "Hey Humbl").
- `voice.sttProvider` -- which STT provider to use.
- `cloud.routingPreference` -- onDeviceOnly, cloudFirst, auto.
- `privacy.cloudLessMode` -- boolean, blocks all cloud requests.
- `lm.defaultModel` -- which model to use for SLM classification.

This namespacing prevents collisions (both `camera` and `voice` can have a `quality` setting without conflict) and enables module-level operations (export all `camera.*` settings for backup).

### fromDatabase Pattern

`SettingsService` shares `humbl_core.db` with `ModelIndex` and `SpendLog`. All three services use the `fromDatabase(Database db)` factory:

```dart
final coreDb = await openDatabase('${appDir.path}/humbl_core.db', version: 1);
final settingsService = await SettingsService.fromDatabase(coreDb);
final modelIndex = await ModelIndex.fromDatabase(coreDb);
final spendLog = await SpendLog.fromDatabase(coreDb);
```

Each service creates its tables idempotently (`CREATE TABLE IF NOT EXISTS ...`). The `_ownsDb` flag is set to `false` when created via `fromDatabase()`, preventing any service from closing the shared database handle. Only the caller that opened the database is responsible for closing it.

This pattern exists because three small tables (settings, model_index, spend_log) do not justify three separate SQLite files. A single `humbl_core.db` file means one file handle, one WAL, and one backup target for all core configuration data that rarely changes.

## SettingsService

Central settings service with namespace-based isolation.

```dart
class SettingsService {
  static Future<SettingsService> open(String dbPath);
  static Future<SettingsService> fromDatabase(Database db);

  Future<void> register(ISettingsProvider provider);
  void unregister(String namespace);

  dynamic get(String namespace, String key);
  Map<String, dynamic> getAll(String namespace);
  Map<String, Map<String, dynamic>> getAllNamespaces();

  Future<bool> set(String namespace, String key, dynamic value, {
    SettingChangeSource source = SettingChangeSource.user,
  });
  Future<bool> reset(String namespace, String key);

  Stream<SettingUpdate> get onSettingsChanged;
  List<String> get namespaces;
  List<SettingDefinition> getDefinitions(String namespace);

  Future<void> dispose();
}
```

### Key Behaviors

- **Namespace isolation.** Each provider owns a namespace (e.g., `camera`, `voice`, `lm`). A `get()` or `set()` call must specify the namespace. There is no global "get by key" -- callers must know which module owns the setting.

- **In-memory cache.** All settings are cached in a `Map<String, Map<String, dynamic>>` (namespace -> key -> value). `get()` reads from the cache (O(1)), never from SQLite. `set()` updates both the cache and SQLite. This means reads are essentially free -- important because pipeline nodes may check settings on every run.

- **Persistence by category.** `configuration` and `preference` settings are stored in SQLite. `status` settings are memory-only (they represent runtime state like "is the camera active" and would be stale after a restart).

- **Default values.** On first access (no persisted value), the provider's declared default is used. Defaults are never written to SQLite -- they exist only in the provider's `SettingDefinition`. This means adding a new setting with a default requires no migration.

- **Access control enforcement.** Each `set()` call checks the setting's `SettingAccess` against the `SettingChangeSource`. If the source is `lm` and the access is `userOnly`, the write is rejected (returns `false`). See access control section below.

- **Allowed values validation.** If `SettingDefinition.allowedValues` is set, writes outside the list are rejected. If `min`/`max` are set, numeric values outside the range are rejected. This prevents invalid state (e.g., setting camera resolution to "banana").

- **Reactive updates.** All changes emit on `onSettingsChanged` (global stream) and on the provider's `updates` stream (namespace-scoped). The UI subscribes to the global stream to update settings screens. Individual modules subscribe to their provider's stream to react to changes.

## ISettingsProvider

Modules implement this interface to declare and manage their settings.

```dart
abstract class ISettingsProvider {
  String get namespace;
  List<SettingDefinition> get definitions;
  Stream<SettingUpdate> get updates;
  Future<void> onSettingChanged(String key, dynamic value);
}
```

- **`namespace`** -- the unique namespace string (e.g., `'camera'`).
- **`definitions`** -- the full list of settings this module exposes, with types, defaults, access rules, and descriptions.
- **`updates`** -- a stream that the `SettingsService` pushes changes to. The module listens on this stream to react to external changes (e.g., the user changed resolution via UI, the module needs to reconfigure the camera).
- **`onSettingChanged(key, value)`** -- called by the service when a setting in this namespace changes. The module can perform validation, apply the change, or trigger side effects.

### Example Provider

```dart
class CameraSettingsProvider implements ISettingsProvider {
  @override
  String get namespace => 'camera';

  @override
  List<SettingDefinition> get definitions => [
    SettingDefinition(
      key: 'camera.defaultResolution',
      label: 'Default Resolution',
      category: SettingCategory.preference,
      access: SettingAccess.open,
      valueType: String,
      defaultValue: '1080p',
      allowedValues: ['720p', '1080p', '4K'],
      description: 'Default camera capture resolution',
    ),
    SettingDefinition(
      key: 'camera.hdr',
      label: 'HDR Mode',
      category: SettingCategory.preference,
      access: SettingAccess.lmWithConfirm,
      valueType: bool,
      defaultValue: false,
      description: 'Enable HDR for photo and video capture',
    ),
  ];

  // ...
}
```

## SettingDefinition

Describes a single setting exposed by a module. This is the complete metadata for a setting -- enough for the UI to render a settings screen, the LM to understand what the setting does, and the service to validate writes.

```dart
class SettingDefinition {
  final String key;           // Full key including namespace (e.g., "camera.defaultResolution")
  final String label;         // Human-readable label for UI ("Default Resolution")
  final SettingCategory category;
  final SettingAccess access;
  final Type valueType;       // String, int, bool, double, List, Map
  final dynamic defaultValue;
  final List<dynamic>? allowedValues;  // Enum-like constraint
  final dynamic min;          // Numeric minimum
  final dynamic max;          // Numeric maximum
  final String? description;  // For LM context / help text
}
```

The `description` field is particularly important: it is included in the `SettingsTool`'s output when the LM queries available settings. A good description lets the LM explain settings to the user: "HDR mode improves photo quality in high-contrast scenes but uses more battery."

## SettingCategory

Determines persistence behavior:

| Category | Persisted | Cloud Synced | Description | Examples |
|----------|-----------|-------------|-------------|----------|
| `configuration` | SQLite | Yes | System config, rarely changed after setup. Survives app restart and device migration. | `cloud.routingPreference`, `privacy.cloudLessMode` |
| `preference` | SQLite | Yes | User preferences, changed occasionally. Survives app restart and device migration. | `camera.defaultResolution`, `voice.wakeWord` |
| `status` | Memory only | No | Runtime state, changes frequently. Lost on app restart (recalculated at startup). | `camera.isActive`, `network.currentType` |

The distinction between `configuration` and `preference` is semantic (for UI grouping) rather than technical (both persist and sync identically). Status settings are intentionally ephemeral -- persisting "camera is active" would be wrong after a restart.

## SettingAccess

Controls who can read and write a setting. This is the access control layer that prevents the LM from changing privacy settings or the cloud sync from overwriting local-only configuration.

| Access Level | UI | LM Read | LM Write | Module | Cloud Sync |
|-------------|-----|---------|----------|--------|------------|
| `open` | Full | Yes | Yes | Full | Yes |
| `lmReadOnly` | Full | Yes | No | Full | Yes |
| `lmWithConfirm` | Full | Yes | With confirmation | Full | Yes |
| `userOnly` | Full | No | No | Full | Yes |
| `system` | Read | No | No | Write | No |

- **`open`** -- the LM can read and write freely. Used for non-sensitive preferences like camera resolution, display brightness.
- **`lmReadOnly`** -- the LM can see the current value (useful for context: "your wake word is currently 'Hey Humbl'") but cannot change it. Used for settings where accidental LM changes would be disruptive.
- **`lmWithConfirm`** -- the LM can propose a change, but the user must confirm via the confirmation framework. Used for settings with mild impact (HDR mode, notification preferences).
- **`userOnly`** -- the LM cannot even see the current value. Used for sensitive settings (API keys, privacy toggles). The user changes these through the UI only.
- **`system`** -- only the owning module can write. The UI can read (to display) but not modify. Used for internal state that the module manages (e.g., `lm.lastModelLoadTime`).

## SettingChangeSource

Identifies who initiated a change. The service uses this to enforce `SettingAccess` rules:

| Source | Description | Access Check |
|--------|-------------|-------------|
| `user` | Changed via UI | Always allowed |
| `lm` | Changed by LM via settings tool | Checked against `SettingAccess` (open, lmWithConfirm only) |
| `module` | Changed by the owning module internally | Always allowed |
| `cloudSync` | Changed by cloud sync reconciliation | Allowed unless `system` access |
| `reset` | Reset to default | Always allowed |

## SettingUpdate

Event emitted when a setting changes. Subscribers receive the old value, new value, and the source of the change.

```dart
class SettingUpdate {
  final String namespace;
  final String key;
  final dynamic oldValue;
  final dynamic newValue;
  final SettingChangeSource source;
  final DateTime timestamp;

  String get fullKey => '$namespace.$key';
}
```

The `source` field lets subscribers distinguish between user-initiated changes (show a toast), LM-initiated changes (show a confirmation), and sync-initiated changes (silent update).

## SettingsTool

The `SettingsTool` is a `HumblTool` that gives the LM read/write access to settings. It is registered in the tool registry like any other tool.

When the LM processes a user request like "set camera resolution to 4K," the pipeline's `ClassifyNode` identifies the intent as a tool call to `settings` with params `{namespace: 'camera', key: 'defaultResolution', value: '4K'}`. The `SettingsTool.run()` method calls `settingsService.set('camera', 'defaultResolution', '4K', source: SettingChangeSource.lm)`, which checks access control, validates the value, persists it, and emits the change event.

For read requests ("what is my camera resolution?"), the tool returns the current value along with the setting's label and description.

## Usage Example

```dart
// Startup: open shared database, create service
final coreDb = await openDatabase('${appDir.path}/humbl_core.db');
final service = await SettingsService.fromDatabase(coreDb);

// Register module providers
await service.register(cameraSettingsProvider);
await service.register(voiceSettingsProvider);
await service.register(privacySettingsProvider);

// Read a setting (from in-memory cache, O(1))
final resolution = service.get('camera', 'defaultResolution'); // '1080p'

// Write a setting (with access control)
final success = await service.set('camera', 'defaultResolution', '4K',
    source: SettingChangeSource.user);
// success == true (user can always write open settings)

// LM tries to write a userOnly setting
final denied = await service.set('privacy', 'cloudLessMode', true,
    source: SettingChangeSource.lm);
// denied == false (LM cannot write userOnly settings)

// Listen for changes (UI subscribes to update settings screen)
service.onSettingsChanged.listen((update) {
  print('${update.fullKey}: ${update.oldValue} → ${update.newValue} (by ${update.source})');
});
```

## Source Files

| File | Description |
|------|-------------|
| `humbl_core/lib/settings/settings_service.dart` | SettingsService |
| `humbl_core/lib/settings/i_settings_provider.dart` | ISettingsProvider interface |
| `humbl_core/lib/settings/setting_definition.dart` | SettingDefinition, SettingCategory, SettingAccess, SettingUpdate |
| `humbl_core/lib/tools/domains/settings_tool.dart` | SettingsTool (LM access to settings) |
