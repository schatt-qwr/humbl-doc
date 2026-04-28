---
sidebar_position: 1
title: Add a Tool
---

# How to Add a Tool

Step-by-step guide to building a new tool for the Humbl tool system.

## Overview

1. Extend `HumblTool`.
2. Override required getters.
3. Implement `run()`.
4. Register in the domain factory.
5. Wire in `createToolRegistry()`.
6. Write a test.

## Step 1: Create the Tool Class

Create a new file in the appropriate domain. For this example, we will build a `weather_check` tool.

```dart
// humbl_core/lib/tools/domains/weather_tools.dart

import 'package:meta/meta.dart';
import '../humbl_tool.dart';
import '../models.dart';

class WeatherCheckTool extends HumblTool {
  @override
  String get name => 'weather_check';

  @override
  String get description => 'Check current weather for a location';

  @override
  bool get supportsOneShot => true;

  @override
  Set<ToolGroup> get groups => {ToolGroup.web, ToolGroup.ai};

  @override
  ToolPriority get priority => ToolPriority.p1;

  @override
  Set<ResourceType> get requiredResources => {};

  @override
  ConnectivityRequirement get connectivity =>
      ConnectivityRequirement.internet;

  @override
  Set<UserTier> get availableTiers =>
      {UserTier.standard, UserTier.premium, UserTier.ultimate};

  @override
  AccessLevel get declaredAccessLevel => AccessLevel.trusted;

  @override
  Map<String, dynamic> get inputSchema => {
    'type': 'object',
    'properties': {
      'location': {
        'type': 'string',
        'description': 'City name or "current" for device location',
      },
      'units': {
        'type': 'string',
        'description': 'Temperature units: celsius or fahrenheit',
      },
    },
    'required': ['location'],
  };

  @override
  Map<String, dynamic> get outputSchema => {
    'type': 'object',
    'properties': {
      'temperature': {'type': 'number'},
      'condition': {'type': 'string'},
      'humidity': {'type': 'number'},
    },
  };

  @protected
  @override
  Future<ToolResult> run(ToolContext ctx, Map<String, dynamic> params) async {
    final location = params['location'] as String;
    final units = params['units'] as String? ?? 'celsius';

    // TODO: Call weather API
    // For now, return mock data
    return ToolResult.ok(
      data: {
        'temperature': 24.5,
        'condition': 'Partly cloudy',
        'humidity': 65,
        'units': units,
      },
      displayText: 'It is 24.5 degrees and partly cloudy in $location.',
    );
  }
}
```

## Step 2: Key Decisions

### Which getters to override

| Getter | When to override |
|--------|-----------------|
| `supportsOneShot` | Set to `true` if tool has a one-shot `run()` |
| `supportsStream` | Set to `true` if tool has a streaming `runStream()` |
| `groups` | Always -- determines how the tool is categorized |
| `priority` | Always -- p0 is highest (emergency), p3 is lowest |
| `requiredResources` | If the tool needs camera, mic, BLE, etc. |
| `connectivity` | If the tool needs network (`localNetwork` or `internet`) |
| `availableTiers` | Which user tiers can use this tool |
| `declaredAccessLevel` | Default is `trusted`. Lower for system tools, higher for third-party. |
| `confirmationLevel` | If the tool needs user confirmation before executing |
| `executionTimeout` | Default is 30s. Override for long-running tools. |

### input/output schemas

Schemas follow JSON Schema format. The `required` array lists mandatory parameters. These are validated automatically by the gate template before `run()` is called.

## Step 3: Register in a Domain Factory

Add a factory function or add to an existing one:

```dart
// In humbl_core/lib/tools/domains/weather_tools.dart

List<HumblTool> createWeatherTools() {
  return [
    WeatherCheckTool(),
  ];
}
```

## Step 4: Wire in createToolRegistry()

Add to the tool registration in `register_all.dart`:

```dart
// humbl_core/lib/tools/register_all.dart

ToolRegistry createToolRegistry({ ... }) {
  final registry = ToolRegistry();
  // ... existing registrations ...
  registry.registerAll(createWeatherTools());
  return registry;
}
```

## Step 5: Write a Test

```dart
// humbl_core/test/tools/weather_tools_test.dart

import 'package:flutter_test/flutter_test.dart';
import 'package:humbl_core/tools/domains/weather_tools.dart';
import 'package:humbl_core/tools/models.dart';

void main() {
  group('WeatherCheckTool', () {
    late WeatherCheckTool tool;

    setUp(() {
      tool = WeatherCheckTool();
      tool.updateState(ToolState.ready);
    });

    test('has correct metadata', () {
      expect(tool.name, 'weather_check');
      expect(tool.supportsOneShot, isTrue);
      expect(tool.connectivity, ConnectivityRequirement.internet);
    });

    test('validates required params', () {
      final result = tool.validate({});
      expect(result.isValid, isFalse);
      expect(result.error, contains('location'));
    });

    test('validates with location param', () {
      final result = tool.validate({'location': 'Mumbai'});
      expect(result.isValid, isTrue);
    });

    test('produces MCP schema', () {
      final schema = tool.toMcpSchema();
      expect(schema['name'], 'weather_check');
      expect(schema['input_schema']['required'], contains('location'));
    });
  });
}
```

## Step 6: Run Tests

```bash
cd humbl_core
flutter test test/tools/weather_tools_test.dart
```

## Advanced: Streaming Tool

For tools that produce continuous output (camera stream, sensor data):

```dart
class LiveLocationTool extends HumblTool {
  @override bool get supportsStream => true;
  @override Set<ResourceType> get requiredResources => {ResourceType.gps};

  @protected
  @override
  Stream<ToolStreamEvent> runStream(ToolContext ctx, Map<String, dynamic> params) async* {
    // Yield location updates
    yield ToolStreamEvent(
      toolName: name,
      data: LocationStreamData(LocationFrame(
        lat: 19.076, lng: 72.877, timestamp: DateTime.now(),
      )),
      timestamp: DateTime.now(),
    );
  }
}
```

## Advanced: Tool with Confirmation

```dart
class DeleteAllDataTool extends HumblTool {
  @override
  ConfirmationLevel? get confirmationLevel => ConfirmationLevel.critical;

  @protected
  @override
  Future<ToolResult> run(ToolContext ctx, Map<String, dynamic> params) async {
    if (!ctx.userConfirmed) {
      return ToolResult.confirmationRequired(
        message: 'This will delete all your data. Are you sure?',
      );
    }
    // Proceed with deletion
    return ToolResult.ok(displayText: 'All data deleted.');
  }
}
```
