---
sidebar_position: 2
title: Gate Model
---

# Five-Gate Security Model

Every tool execution passes through five sequential gates before business logic runs. The gates are enforced by `@nonVirtual` template methods on `HumblTool` -- subclasses cannot bypass them.

## Gate Order

```
execute(ctx, params)
  │
  ├── Gate 4: PolicyGate      → Is this tool allowed by user policy?
  ├── Gate 1: AccessGate      → Does the caller have sufficient privilege?
  ├── Gate 2: StateGate       → Is the tool ready? Can it execute in this context?
  ├── Validation              → Do the params match the schema?
  └── Gate 3: ResourceGate    → Can hardware resources be acquired?
       │
       ▼
     run(ctx, params)          → Business logic
       │
       ▼
     Release all leases        → Cleanup (always, via finally)
```

## Gate 4: Policy

Checks if the user has disabled this tool via `ToolPolicy`:

```dart
if (!ctx.toolPolicy.isAllowed(this)) {
  return ToolResult(success: false, error: '$name is disabled by user policy');
}
```

Users can disable individual tools or entire groups through the settings UI.

## Gate 1: Access

Checks caller privilege against the tool's effective access level:

```dart
if (!AccessControl.canAccess(ctx.callerAccess, accessLevel)) {
  return ToolResult(success: false, error: 'Access denied');
}
```

The `accessLevel` is the **effective** level -- it may be lower than `declaredAccessLevel` if the tool was registered via `registerBundle()` with a capping `grantedAccess`.

## Gate 2: State

Two checks:

1. **Tool state:** Must be `ToolState.ready`.
2. **Context check:** `canExecute(ctx)` verifies tier, connectivity, and device requirements.

```dart
if (state != ToolState.ready) {
  return ToolResult(success: false, error: 'Tool not ready: ${state.name}');
}
if (!canExecute(ctx)) {
  return ToolResult(success: false, error: 'Cannot execute in this context');
}
```

## Validation

Validates parameters against the tool's JSON Schema:

- Checks required fields.
- Rejects unknown fields.
- Validates types (string, integer, number, boolean, array, object).

```dart
final validation = validateAgainst(params, inputSchema);
if (!validation.isValid) {
  return ToolResult(success: false, error: validation.error);
}
```

For streaming, `executeStream()` validates against `streamInputSchema` instead.

## Gate 3: Resource

Acquires hardware leases for each `requiredResources`:

```dart
for (final resource in requiredResources) {
  final lease = await ctx.resourceManager!.acquire(
    resource,
    resourceIdFor(resource),
    callerId: '${name}_${ctx.traceId}',
    callerAccess: grantedAccess,
    mode: resourceAccessMode,
    timeout: executionTimeout,
    force: forceAcquireResources,
  );
  leases.add(lease);
}
```

If any lease acquisition fails, all previously acquired leases are released before returning an error.

## @nonVirtual Enforcement

Both `execute()` and `executeStream()` are marked `@nonVirtual`:

```dart
@nonVirtual
Future<ToolResult> execute(ToolContext ctx, Map<String, dynamic> params) async {
  // Gate chain here -- cannot be overridden
  // ...
  final result = await run(ctx, params); // calls subclass logic
  // ...
}
```

Subclasses override `run()` (one-shot) or `runStream()` (streaming), never the gate template itself.

## Access Level Capping

When tools are registered via `registerBundle()` (for MCP, third-party), their access is capped:

```dart
tool.applyGrantedAccess(grantedAccess);
```

This means:
- A tool declaring `AccessLevel.system` but registered with `grantedAccess: AccessLevel.standard` can only be invoked by callers with `standard` or higher access.
- Capping can only restrict, never escalate.

## Sealed GateResult Types

Each gate returns either a `ToolResult` error (denied) or `null` (passed). The shared `_checkGates()` method runs Gates 4, 1, 2, and validation in sequence.
