---
sidebar_position: 1
title: HumblTool
---

# HumblTool

Abstract base class for every tool in the registry, extending `BaseTool` from `langchain_dart`. Every Humbl tool is a valid LangChain tool -- it can be used in LCEL chains, passed to `create_react_agent()`, and discovered by any LangChain-compatible system. Schema is MCP-compatible so any LLM can discover and invoke tools.

**File:** `humbl_core/lib/tools/humbl_tool.dart`
**Extends:** `BaseTool` from `langchain_dart`

## Class Signature

```dart
abstract class HumblTool extends BaseTool {
  // ── Identity ──
  String get name;
  String get description;

  // ── Capability flags (default false, tool opts in) ──
  bool get supportsOneShot => false;
  bool get supportsStream => false;

  // ── Groups ──
  Set<ToolGroup> get groups => {};

  // ── State ──
  ToolState get state;
  String? get stateError;
  void updateState(ToolState newState, {String? error});

  // ── Access Control ──
  AccessLevel get declaredAccessLevel => AccessLevel.trusted;
  AccessLevel get accessLevel;       // Effective (capped by bundle)
  AccessLevel get grantedAccess;

  // ── Schemas ──
  Map<String, dynamic> get inputSchema;
  Map<String, dynamic> get streamInputSchema => inputSchema;
  Map<String, dynamic> get outputSchema;
  Map<String, dynamic> get streamOutputSchema => outputSchema;

  // ── Metadata ──
  ToolPriority get priority;
  Set<ResourceType> get requiredResources;
  ConnectivityRequirement get connectivity => ConnectivityRequirement.offline;
  Set<UserTier> get availableTiers;
  Duration get executionTimeout => const Duration(seconds: 30);
  ConfirmationLevel? get confirmationLevel => null;
  bool get forceAcquireResources => false;
  Set<PeripheralCapabilityFlag> get requiredCapabilities => const {};
  AccessMode get resourceAccessMode => AccessMode.shared;

  // ── Provider Requirements ──
  List<Type> get requiredProviderTypes => const [];

  // ── Execution (both @nonVirtual) ──
  Future<ToolResult> execute(ToolContext ctx, Map<String, dynamic> params);
  Stream<ToolStreamEvent> executeStream(ToolContext ctx, Map<String, dynamic> params);

  // ── Subclass overrides ──
  @protected Future<ToolResult> run(ToolContext ctx, Map<String, dynamic> params);
  @protected Stream<ToolStreamEvent> runStream(ToolContext ctx, Map<String, dynamic> params);

  // ── Validation ──
  ValidationResult validate(Map<String, dynamic> params);
  ValidationResult validateAgainst(Map<String, dynamic> params, Map<String, dynamic> schema);
  bool canExecute(ToolContext context);

  // ── MCP Schema ──
  Map<String, dynamic> toMcpSchema();
}
```

## Five-Gate Security Template

Both `execute()` and `executeStream()` are `@nonVirtual`. Subclasses cannot bypass the gate chain.

### Gate Order

| Gate | Check | Failure |
|------|-------|---------|
| **Gate 4: Policy** | `ctx.toolPolicy.isAllowed(this)` | "disabled by user policy" |
| **Gate 1: Access** | `AccessControl.canAccess(ctx.callerAccess, accessLevel)` | "Access denied" |
| **Gate 2: State** | `state == ToolState.ready && canExecute(ctx)` | "Tool not ready" or "Cannot execute" |
| **Validation** | `validateAgainst(params, schema)` | "Missing required params" or type errors |
| **Gate 3: Resource** | `resourceManager.acquire()` for each `requiredResources` | "Resource acquisition failed" |

After all gates pass, `run()` is called (for `execute()`) or `runStream()` is called (for `executeStream()`).

### Resource Cleanup

All acquired leases are released in a `finally` block, whether `run()` succeeds or throws.

## execute() Flow

```
execute(ctx, params)
  ├── Check supportsOneShot
  ├── Gate 4: Policy check
  ├── Gate 1: Access check
  ├── Gate 2: State + canExecute
  ├── Validation against inputSchema
  ├── Gate 3: Acquire resource leases
  ├── Log tool start
  ├── Call run(ctx, params) with timeout
  ├── Log tool end
  └── Release all leases (finally)
```

## executeStream() Flow

```
executeStream(ctx, params)
  ├── Check supportsStream
  ├── Gate 4, 1, 2, Validation (same as execute)
  ├── Return StreamController
  │     onListen:
  │       ├── Gate 3: Acquire leases
  │       ├── Subscribe to runStream(ctx, params)
  │       └── Forward events
  │     onCancel:
  │       └── Release all leases
  └── 5s idle timeout if no listener
```

## Access Level Capping

```dart
@nonVirtual
void applyGrantedAccess(AccessLevel granted) {
  // Caps effective access — can only restrict, never escalate
}
```

Called by `ToolRegistry.registerBundle()` when installing third-party or MCP tools.

## canExecute()

Checks runtime conditions beyond gate enforcement:

```dart
bool canExecute(ToolContext context) {
  if (state != ToolState.ready) return false;
  if (!availableTiers.contains(context.tier)) return false;
  if (!context.device.meetsConnectivity(connectivity)) return false;
  if (requiredResources.contains(ResourceType.ble) &&
      !context.device.hasGlassesConnected) return false;
  return true;
}
```

## toMcpSchema()

Produces MCP-compatible tool descriptor:

```dart
{
  'name': 'wifi_toggle',
  'description': 'Toggle WiFi on or off',
  'input_schema': { ... },
  'x-humbl-output-schema': { ... },
  'x-humbl-groups': ['wifi', 'system'],
  'x-humbl-supports-one-shot': true,
  'x-humbl-supports-stream': false,
  'x-humbl-priority': 'p0',
  'x-humbl-resources': [],
  'x-humbl-connectivity': 'offline',
  'x-humbl-access-level': 'trusted',
  'x-humbl-state': 'ready',
  'x-humbl-tiers': ['free', 'standard', 'plus', 'ultimate'],
}
```
