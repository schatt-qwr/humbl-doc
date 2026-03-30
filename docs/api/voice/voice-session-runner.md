---
sidebar_position: 2
title: VoiceSessionRunner
---

# VoiceSessionRunner

Main voice pipeline orchestrator. Discovers the mic tool via ToolRegistry, feeds audio through AEC, RingBuffer, VAD, STT, pipeline dispatch, and TTS with barge-in support.

**File:** `humbl_core/lib/voice_session/voice_session_runner.dart`

## Constructor

```dart
VoiceSessionRunner({
  required ToolRegistry toolRegistry,
  required IVadEngine vad,
  required ISttProvider stt,
  required ITtsProvider tts,
  required IAudioPlayer audioPlayer,
  VoiceConfig config = const VoiceConfig(),
  Future<String> Function(String userText)? onPipelineRequest,
});
```

| Parameter | Description |
|-----------|-------------|
| `toolRegistry` | For discovering the mic tool by group |
| `vad` | Voice activity detection engine |
| `stt` | Speech-to-text provider |
| `tts` | Text-to-speech provider |
| `audioPlayer` | Platform audio output |
| `config` | Pre-buffer duration, silence thresholds |
| `onPipelineRequest` | Callback: receives user text, returns assistant response |

## VoiceSessionState

```dart
enum VoiceSessionState {
  idle,
  listening,
  processing,
  speaking,
  error,
}
```

## Audio Pipeline

```
Mic → AEC (echo cancel) → RingBuffer (pre-buffer) → VAD (speech detect)
                                                        │
                                               speechStart → STT stream
                                               speechEnd   → Final text
                                                               │
                                                        onPipelineRequest()
                                                               │
                                                        TTS → AudioPlayer
                                                               │
                                                     (barge-in cancels TTS)
```

### Key Components

| Component | Class | Description |
|-----------|-------|-------------|
| AEC | `IAecProcessor` | Acoustic echo cancellation (removes TTS output from mic input) |
| RingBuffer | `RingBuffer` | Circular buffer that holds audio before speech detection |
| AudioStreamBuffer | `AudioStreamBuffer` | Zero-audio-lost buffer between VAD and STT |
| MicSource | `MicSource` | Represents a mic source (phone, glasses, BLE headset) |

### MicSource

```dart
class MicSource {
  final String id;
  final String displayName;
  final MicSourceType type;  // phone, glasses, bleHeadset, usbMic

  DeviceCapabilities get deviceCapabilities;
}
```

## IVoiceSessionController

Interface that `VoiceSessionRunner` implements:

```dart
abstract class IVoiceSessionController {
  VoiceSessionState get state;
  Stream<VoiceSessionState> get stateChanges;
  Stream<VoiceTurnEvent> get turnEvents;

  Future<void> startListening();
  Future<void> stopListening();
  Future<void> cancelCurrentTurn();
  Future<void> dispose();
}
```

## VoiceTurnEvent

Emitted for each completed voice turn:

```dart
class VoiceTurnEvent {
  final String userText;
  final String? assistantText;
  final Duration sttDuration;
  final Duration pipelineDuration;
  final Duration ttsDuration;
}
```

## Barge-In

When the user speaks while TTS is playing:

1. VAD detects `speechStart` while TTS is active.
2. TTS is immediately stopped.
3. VAD notifies the STT provider.
4. New user utterance is processed.

The VAD's `setTtsSpeaking(bool)` flag prevents the VAD from triggering on the assistant's own audio output.
