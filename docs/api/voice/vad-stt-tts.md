---
sidebar_position: 1
title: VAD, STT, TTS
---

# VAD, STT, TTS Interfaces

Voice pipeline interfaces for Voice Activity Detection, Speech-to-Text, and Text-to-Speech.

## IVadEngine

Detects speech in an audio stream. TTS-aware (does not trigger on its own output) and source-latching (stays locked to the active mic source during an utterance).

```dart
abstract class IVadEngine {
  Stream<VadEvent> process(Stream<AudioChunk> audioStream);
  void setTtsSpeaking(bool isSpeaking);
  VadConfig get config;
  void updateConfig(VadConfig config);
}
```

### VadEvent

```dart
class VadEvent {
  final VadEventType type;   // speechStart, speechEnd, speechContinue
  final DateTime timestamp;
  final double? energy;       // Audio energy level
  final double? confidence;   // Speech probability
}
```

### VadConfig

```dart
class VadConfig {
  final double energyThreshold;
  final Duration speechStartDelay;
  final Duration speechEndDelay;
  final Duration maxUtteranceDuration;
  final bool ttsPauseEnabled;
}
```

## ISttProvider

Converts audio stream to text. Supports barge-in (user can interrupt the assistant mid-response).

```dart
abstract class ISttProvider {
  String get providerId;
  String get displayName;
  List<String> get supportedLanguages;

  Future<SttResult> transcribe(List<AudioChunk> audio, {String? language});
  Stream<SttPartialResult> transcribeStream(Stream<AudioChunk> audio, {String? language});
  Future<void> dispose();
}
```

### SttResult

```dart
class SttResult {
  final String text;
  final double confidence;
  final String? language;
  final Duration duration;
  final List<SttWord>? words;
}
```

### SttPartialResult

```dart
class SttPartialResult {
  final String text;
  final bool isFinal;
  final double? confidence;
}
```

## ITtsProvider

Converts text to audio. Supports streaming (audio starts playing before full text is synthesized).

```dart
abstract class ITtsProvider {
  String get providerId;
  String get displayName;
  List<String> get supportedLanguages;
  List<String> get availableVoices;

  Future<TtsResult> synthesize(String text, {String? voice, String? language});
  Stream<TtsChunk> synthesizeStream(String text, {String? voice, String? language});
  Future<void> stop();
  Future<void> dispose();
}
```

### TtsChunk

```dart
class TtsChunk {
  final Uint8List audioBytes;
  final String encoding;    // 'pcm16', 'opus', 'mp3'
  final int sampleRate;
  final bool isFinal;
}
```

## AudioChunk

Shared audio data model used across VAD, STT, and the voice pipeline:

```dart
class AudioChunk {
  final Uint8List bytes;
  final int sampleRate;
  final int channels;
  final String encoding;    // 'pcm16', 'float32'
  final DateTime timestamp;
  final Duration duration;
}
```

## Planned Providers

| Provider | Type | Technology |
|----------|------|-----------|
| WhisperSttProvider | STT | Whisper.cpp via FFI |
| PiperTtsProvider | TTS | Piper via FFI |
| AndroidSttProvider | STT | Android SpeechRecognizer |
| IosSttProvider | STT | iOS Speech framework |
| AndroidTtsProvider | TTS | Android TextToSpeech |
| IosTtsProvider | TTS | iOS AVSpeechSynthesizer |
| SileroVadEngine | VAD | Silero VAD ONNX model |

## Source Files

| File | Description |
|------|-------------|
| `humbl_core/lib/voice_activity_detection/i_vad_engine.dart` | IVadEngine |
| `humbl_core/lib/voice_activity_detection/vad_config.dart` | VadConfig |
| `humbl_core/lib/speech_to_text/i_stt_provider.dart` | ISttProvider |
| `humbl_core/lib/speech_to_text/stt_models.dart` | AudioChunk, SttResult |
| `humbl_core/lib/text_to_speech/i_tts_provider.dart` | ITtsProvider |
