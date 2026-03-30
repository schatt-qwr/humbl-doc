---
sidebar_position: 2
title: ToolRegistry
---

# ToolRegistry

Pure registration and discovery. No execution methods -- tool execution is handled by `HumblTool`'s `@nonVirtual` templates.

**File:** `humbl_core/lib/tools/tool_registry.dart`

## Class Signature

```dart
class ToolRegistry {
  // ── Registration ──
  void register(HumblTool tool);
  void registerAll(List<HumblTool> tools);
  void registerBundle(String bundleId, List<HumblTool> tools, {
    required AccessLevel grantedAccess,
    bool skipInRelease = false,
  });
  void unregister(String name);
  void unregisterBundle(String bundleId);
  void notifySchemaChanged(String toolName);

  // ── Policy ──
  void updatePolicy(ToolPolicy policy);
  ToolPolicy get policy;

  // ── Lookup (filtered by policy) ──
  HumblTool? lookup(String name);
  List<HumblTool> get allTools;
  List<HumblTool> get allRegistered;  // Unfiltered
  List<HumblTool> byGroup(ToolGroup group);
  List<HumblTool> byGroups(Set<ToolGroup> groups);
  List<HumblTool> byPriority(ToolPriority priority);
  List<HumblTool> available(ToolContext context);
  int get count;

  // ── State Queries ──
  ToolState? getState(String name);
  List<HumblTool> byState(ToolState state);
  Map<ToolState, int> get stateSummary;

  // ── Bundle Queries ──
  Map<String, AccessLevel> get loadedBundles;
  String? bundleOf(String toolName);

  // ── Events ──
  Stream<ToolChangeEvent> get toolsChanged;

  // ── Provider Integration ──
  ProviderRegistry? providerRegistry;

  void dispose();
}
```

## Registration

### register()

Registers a single tool. Throws `StateError` if a tool with the same name already exists. If the tool declares `requiredProviderTypes` and a `ProviderRegistry` is set, automatically wires a `ToolProviderRegistry` and subscribes to provider changes.

### registerBundle()

Registers a group of tools with access capping. Used for MCP servers, third-party plugins, and test bundles.

```dart
toolRegistry.registerBundle(
  'mcp_weather_server',
  bridgeTools,
  grantedAccess: AccessLevel.standard,
);
```

Each tool in the bundle has `applyGrantedAccess()` called before registration. This caps the tool's effective access level -- it can never exceed `grantedAccess`.

### unregisterBundle()

Removes all tools from a bundle in one call.

## Lookup

### lookup()

Returns null if the tool does not exist or is denied by the current `ToolPolicy`.

### allTools vs allRegistered

- `allTools` -- filtered by policy (what the LM sees).
- `allRegistered` -- unfiltered (for settings UI and diagnostics).

### available()

Returns tools that can actually run right now given the `ToolContext`:

```dart
List<HumblTool> available(ToolContext context) =>
    allTools.where((t) => t.canExecute(context)).toList();
```

This checks tool state, user tier, device connectivity, and glasses connection.

## Policy

`ToolPolicy` controls which tools are visible and executable. Updated at runtime via `updatePolicy()`.

```dart
class ToolPolicy {
  final List<String> toolNames;  // Tool names to match
  final PolicyAction action;     // none, deny, allow

  bool isAllowed(HumblTool tool);
}
```

- `ToolPolicy.allowAll()` -- default, all tools allowed.
- Custom policies can deny specific tools or allow only a whitelist.

Double-gating: policy is checked both at `lookup()` time (registry filter) and in the `execute()` template (Gate 4).

## Events

`toolsChanged` emits when tools are added, removed, or their schemas change. `ContextAssemblyNode` subscribes to rebuild the LM tool list.

```dart
enum ToolChangeType { added, removed, schemaChanged, policyChanged }

class ToolChangeEvent {
  final ToolChangeType type;
  final String? toolName;
  final String? bundleId;
}
```

## Usage Example

```dart
final registry = ToolRegistry();
registry.register(WifiToggleTool(wifiManager: wifi));
registry.register(BluetoothScanTool(btManager: bluetooth));

// Lookup by name
final tool = registry.lookup('wifi_toggle');

// Get tools available for the current context
final available = registry.available(ToolContext(
  userId: 'user-1',
  tier: UserTier.standard,
  device: deviceState,
  memory: MemoryContext(),
  runId: 'run-1',
));

// Listen for changes
registry.toolsChanged.listen((event) {
  if (event.type == ToolChangeType.added) {
    rebuildToolList();
  }
});
```
