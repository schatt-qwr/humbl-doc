---
sidebar_position: 3
title: Naming Conventions
---

# Naming Conventions

Consistent naming rules across the codebase.

## Dart Code

| Entity | Convention | Example |
|--------|-----------|---------|
| Files | `snake_case.dart` | `lm_engine.dart`, `tool_registry.dart` |
| Classes | `PascalCase` | `LmEngine`, `ToolRegistry`, `PipelineState` |
| Abstract interfaces | `I` prefix | `ISystemManager`, `IWifiManager`, `ILmGateway` |
| Enums | No prefix, PascalCase | `ToolDomain`, `AccessLevel`, `ToolState` |
| Enum values | `camelCase` | `AccessLevel.system`, `ToolState.ready` |
| Constants | `camelCase` or `SCREAMING_SNAKE` | `_batchSize`, `_pruneAge` |
| Private fields | `_` prefix | `_tools`, `_state`, `_controller` |
| Static tags | `_tag` const | `static const _tag = 'ToolRegistry';` |

## Native Code

| Entity | Convention | Example |
|--------|-----------|---------|
| Kotlin files | `PascalCase.kt` | `CameraPlugin.kt`, `AlarmPlugin.kt` |
| Swift files | `PascalCase.swift` | `HumblCorePlugin.swift`, `TimerPlugin.swift` |
| Method channels | Reverse domain | `com.qwr.humbl.core/alarm` |

## Directories

| Type | Convention | Example |
|------|-----------|---------|
| Feature folders | `snake_case` | `voice_session/`, `speech_to_text/` |
| Platform subfolder | `snake_case` | `platform/wifi/`, `platform/bluetooth/` |
| Per-platform impl | `platform_feature_type.dart` | `android_wifi_manager.dart` |

## Interface + Implementation Pattern

```
platform/wifi/
  ├── i_wifi_manager.dart              # Interface
  ├── android_wifi_manager.dart        # Android
  ├── ios_wifi_manager.dart            # iOS
  ├── windows_wifi_manager.dart        # Windows
  ├── macos_wifi_manager.dart          # macOS
  └── linux_wifi_manager.dart          # Linux
```

## Tool Naming

| Component | Convention | Example |
|-----------|-----------|---------|
| Tool class | `PascalCase` + `Tool` | `WifiToggleTool`, `WeatherCheckTool` |
| Tool name (string) | `snake_case` | `'wifi_toggle'`, `'weather_check'` |
| Domain factory | `create` + `PascalCase` + `Tools` | `createConnectivityTools()` |

## Test File Naming

| Convention | Example |
|-----------|---------|
| Mirror source path | `test/pipeline/pipeline_orchestrator_test.dart` |
| Suffix with `_test` | `tool_registry_test.dart` |
| Group by feature | `test/tools/`, `test/pipeline/`, `test/memory/` |

## Abbreviations

| Abbreviation | Meaning | Used In |
|-------------|---------|---------|
| `LM` / `Lm` | Language Model | `LmGateway`, `ILmProvider` |
| `SLM` | Small Language Model | Documentation only |
| `STT` | Speech-to-Text | `ISttProvider`, `SttResult` |
| `TTS` | Text-to-Speech | `ITtsProvider`, `TtsChunk` |
| `VAD` | Voice Activity Detection | `IVadEngine`, `VadConfig` |
| `BLE` | Bluetooth Low Energy | `ResourceType.ble` |
| `AEC` | Acoustic Echo Cancellation | `IAecProcessor` |
| `MCP` | Model Context Protocol | `McpClient`, `McpBridgeTool` |
| `KV` | Key-Value | `getKv()`, `setKv()` |
