---
sidebar_position: 3
title: ConfirmationService
---

# ConfirmationService

Orchestrates user confirmation across multiple providers when a tool requires explicit user consent before executing.

**File:** `humbl_core/lib/confirmation/confirmation_service.dart`

## Class Signature

```dart
class ConfirmationService {
  ConfirmationService({
    required List<IConfirmationProvider> providers,
    Duration defaultTimeout = const Duration(seconds: 15),
    int defaultMaxReprompts = 1,
  });

  Future<ConfirmationResult> requestConfirmation(ConfirmationRequest request);
}
```

## Confirmation Flow

1. Filter providers by `ConfirmationLevel` policy AND availability.
2. Present the request to all eligible providers simultaneously.
3. **First response wins** -- all others are cancelled.
4. On timeout: reprompt once (configurable), then deny.

## ConfirmationLevel

Tools declare their required confirmation level:

| Level | Allowed Methods | Use Case |
|-------|----------------|----------|
| `normal` | Voice, gesture, tap, button, notification, UI | Toggle WiFi, set timer |
| `elevated` | Voice fingerprint, biometric | Send message, make purchase |
| `critical` | Platform biometric only (Face ID, fingerprint) | Delete data, emergency call |

## IConfirmationProvider

```dart
abstract class IConfirmationProvider {
  ConfirmationMethod get method;
  bool get isAvailable;

  Future<ConfirmationResponse> requestConfirmation(ConfirmationRequest request);
  void cancel();
}
```

### 7 Built-in Providers

| Provider | Method | Platform |
|----------|--------|----------|
| VoiceConfirmationProvider | `voice` | All (via STT) |
| GestureConfirmationProvider | `gesture` | Glasses (nod/shake) |
| TapConfirmationProvider | `tap` | Glasses (touch) |
| ButtonConfirmationProvider | `button` | Glasses (hardware button) |
| NotificationConfirmationProvider | `notification` | Android, iOS |
| UiConfirmationProvider | `ui` | Companion app dialog |
| BiometricConfirmationProvider | `biometric` | Android, iOS (Face ID, fingerprint) |

## ConfirmationRequest

```dart
class ConfirmationRequest {
  final String toolName;
  final ConfirmationLevel level;
  final String message;         // What to show/speak to user
  final Map<String, dynamic>? metadata;
  final Duration? timeout;
  final int? maxReprompts;
}
```

## ConfirmationResult

```dart
class ConfirmationResult {
  final ConfirmationOutcome outcome;
  final ConfirmationMethod? method;
  final double? confidence;     // For voice/gesture (0.0-1.0)
  final String? error;

  const ConfirmationResult.confirmed({ConfirmationMethod? method, double? confidence});
  const ConfirmationResult.denied({ConfirmationMethod? method});
  const ConfirmationResult.timeout();
  const ConfirmationResult.error(String error);
}
```

### ConfirmationOutcome

```dart
enum ConfirmationOutcome { confirmed, denied, timeout, error }
```

## Integration with HumblTool

Tools declare `confirmationLevel` as a getter:

```dart
class DeleteAllDataTool extends HumblTool {
  @override
  ConfirmationLevel? get confirmationLevel => ConfirmationLevel.critical;
}
```

`ExecuteToolNode` checks `toolResult.isConfirmationRequired` and sets `PipelineState.needsConfirmation`. The app layer presents the confirmation UI, and on user confirmation sets `PipelineState.userConfirmed = true` before resuming.
