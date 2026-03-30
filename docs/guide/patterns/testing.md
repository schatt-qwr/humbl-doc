---
sidebar_position: 4
title: Testing
---

# Testing Patterns

How to write tests for Humbl modules.

## Test File Location

Mirror the source path under `humbl_core/test/`:

```
humbl_core/lib/pipeline/pipeline_orchestrator.dart
humbl_core/test/pipeline/pipeline_orchestrator_test.dart
```

## Fakes Over Mocks

The codebase prefers hand-written fakes over generated mocks (no mockito dependency):

```dart
class FakeLmGateway implements ILmGateway {
  LmGatewayResponse? nextResponse;
  List<LmGatewayRequest> requests = [];

  @override
  Future<LmGatewayResponse> complete(LmGatewayRequest request) async {
    requests.add(request);
    return nextResponse ?? LmGatewayResponse(
      text: '{"type":"chat","response":"Hello"}',
      finishReason: LmFinishReason.stop,
      providerUsed: 'fake',
      modelUsed: 'fake-model',
    );
  }

  @override
  Stream<LmGatewayToken> stream(LmGatewayRequest request) async* {
    yield LmGatewayToken(text: 'Hello', providerId: 'fake', isDone: true);
  }
}
```

### Why Fakes

- No codegen step.
- Explicit behavior -- you see exactly what the fake does.
- Compile-time safety -- if the interface changes, the fake breaks.
- No runtime magic.

## SQLite in Tests

Tests that need SQLite use `sqflite_ffi`:

```dart
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

void main() {
  setUpAll(() {
    sqfliteFfiInit();
    databaseFactory = databaseFactoryFfi;
  });

  test('stores and retrieves data', () async {
    final service = await SettingsService.open(inMemoryDatabasePath);
    // ...
  });
}
```

This enables SQLite tests on all platforms including CI (no Android/iOS needed).

## Pipeline Testing

Create a `PipelineState` with the minimum fields for your test:

```dart
PipelineState createTestState({
  String inputText = 'test input',
  UserTier tier = UserTier.standard,
}) {
  return PipelineState(
    inputText: inputText,
    sessionId: 'test-session',
    runId: 'test-run',
    userId: 'test-user',
    tier: tier,
    device: const DeviceState(
      batteryPercent: 100,
      isCharging: false,
      thermalState: 'nominal',
      hasInternet: true,
      hasLocalNetwork: true,
      hasGlassesConnected: false,
      ramAvailableMb: 4096,
    ),
  );
}
```

### Testing Individual Nodes

```dart
test('ClassifyNode sets intent', () async {
  final gateway = FakeLmGateway();
  gateway.nextResponse = LmGatewayResponse(
    text: '{"type":"tool_call","tool":"wifi_toggle","params":{"enabled":true}}',
    finishReason: LmFinishReason.stop,
    providerUsed: 'fake',
    modelUsed: 'fake',
  );

  final node = ClassifyNode(gateway);
  final state = createTestState(inputText: 'Turn on WiFi');
  final result = await node.process(state);

  expect(result.activeToolName, 'wifi_toggle');
  expect(result.confidence, greaterThan(0.5));
});
```

### Testing Full Pipeline

```dart
test('full pipeline run', () async {
  final orchestrator = PipelineOrchestrator(
    lmGateway: FakeLmGateway(),
    modelRegistry: ModelRegistry(),
    toolRegistry: createTestToolRegistry(),
  );

  final result = await orchestrator.run(createTestState());
  expect(result.error, isNull);
  expect(result.outputText, isNotNull);
});
```

## Tool Testing

### Test Registration and Schema

```dart
test('tool produces valid MCP schema', () {
  final tool = WifiToggleTool(wifiManager: FakeWifiManager());
  tool.updateState(ToolState.ready);

  final schema = tool.toMcpSchema();
  expect(schema['name'], 'wifi_toggle');
  expect(schema['input_schema']['properties'], contains('enabled'));
});
```

### Test Validation

```dart
test('validates required params', () {
  final tool = WeatherCheckTool();
  expect(tool.validate({}).isValid, isFalse);
  expect(tool.validate({'location': 'Mumbai'}).isValid, isTrue);
});
```

### Test Gate Enforcement

```dart
test('Gate 1 denies restricted caller', () async {
  final tool = SystemPowerTool();
  tool.updateState(ToolState.ready);

  final result = await tool.execute(
    ToolContext(
      userId: 'test',
      tier: UserTier.free,
      device: testDevice,
      memory: MemoryContext(),
      runId: 'test',
      callerAccess: AccessLevel.restricted,
    ),
    {},
  );

  expect(result.success, isFalse);
  expect(result.error, contains('Access denied'));
});
```

## In-Memory Journal

Use `InMemoryJournal` for tests that need logging:

```dart
final journal = InMemoryJournal();
// ... run code that logs ...
expect(journal.events, hasLength(greaterThan(0)));
expect(journal.events.last.eventType, 'info');
```

## Running Tests

```bash
# All tests
cd humbl_core && flutter test

# Single file
cd humbl_core && flutter test test/pipeline/pipeline_orchestrator_test.dart

# By name pattern
cd humbl_core && flutter test --name "LoopCheckNode"

# Verbose output
cd humbl_core && flutter test --reporter expanded
```
