---
sidebar_position: 1
title: AccessControl
---

# AccessControl

Gate 1 enforcement logic. Checks if a caller's access level permits invoking a tool.

**File:** `humbl_core/lib/permissions/access_control.dart`

## Class

```dart
class AccessControl {
  static int privilegeOf(AccessLevel level);
  static bool canAccess(AccessLevel callerLevel, AccessLevel toolLevel);
  static AccessLevel resolveCallerAccess(CallerType caller);
}
```

## AccessLevel Hierarchy

Lower numeric value = higher privilege.

| Level | Value | Description |
|-------|-------|-------------|
| `system` | 0 | Firmware, emergency, power management |
| `core` | 1 | Built-in pipeline tools |
| `confidential` | 2 | Encrypted/private data access |
| `trusted` | 3 | Default for built-in tools |
| `standard` | 4 | Third-party tools, MCP |
| `restricted` | 5 | Untrusted or sandboxed |

## canAccess()

```dart
static bool canAccess(AccessLevel callerLevel, AccessLevel toolLevel) {
  return privilegeOf(callerLevel) <= privilegeOf(toolLevel);
}
```

A caller at level N can invoke tools at level N or below (higher numeric value = lower privilege).

Examples:
- `core` caller can invoke `trusted` tool (`1 <= 3`): **allowed**
- `standard` caller can invoke `trusted` tool (`4 <= 3`): **denied**
- `system` caller can invoke anything (`0 <= any`): **allowed**

## resolveCallerAccess()

Maps caller types to default access levels:

| CallerType | Default Access | Rationale |
|------------|---------------|-----------|
| `pipeline` | `core` | Can invoke all built-in tools but not system-tier |
| `slm` | `core` | Same as pipeline |
| `user` | `trusted` | Direct user actions get trusted |
| `plugin` | `restricted` | Default for plugins; signature can upgrade |

## Gate Integration

Gate 1 is checked in `HumblTool.execute()` and `HumblTool.executeStream()`:

```dart
if (!AccessControl.canAccess(ctx.callerAccess, accessLevel)) {
  return ToolResult(success: false, error: 'Access denied');
}
```
