---
sidebar_position: 1
title: ILmGateway
---

# ILmGateway

Top-level gateway interface. Pure routing engine that abstracts all LM providers behind a single API. The concrete `HumblLmGateway` implementation wraps the `litellm_dart` `Router` for provider selection and supports 5 routing strategies (simple, costBased, leastBusy, latencyBased, usageBased).

**File:** `humbl_core/lib/lm_gateway/i_lm_gateway.dart`
**Implementation:** `HumblLmGateway` wraps `Router` from `litellm_dart`

## Interface

```dart
abstract class ILmGateway {
  Future<LmGatewayResponse> complete(LmGatewayRequest request);
  Stream<LmGatewayToken> stream(LmGatewayRequest request);
}
```

## LmGatewayRequest

```dart
class LmGatewayRequest {
  final List<Map<String, dynamic>> messages;
  final List<Map<String, dynamic>>? tools;
  final String? preferredModelId;
  final QueryCategory? category;
  final String userId;
  final String tier;
  final int? estimatedTokenCount;
  final RequestPriority priority;
}
```

| Field | Description |
|-------|-------------|
| `messages` | Chat messages in OpenAI-compatible format |
| `tools` | MCP tool schemas for function calling |
| `preferredModelId` | Hint for model selection (gateway may override) |
| `category` | Query complexity category for routing decisions |
| `userId` | For quota tracking |
| `tier` | User tier (`free`, `standard`, `plus`, `ultimate`) |
| `estimatedTokenCount` | For quota pre-check |
| `priority` | `realtime`, `background`, `batch` |

### RequestPriority

| Priority | Description |
|----------|-------------|
| `realtime` | User-facing, low latency required |
| `background` | Scout agents, not time-sensitive |
| `batch` | Bulk operations, lowest priority |

## LmGatewayResponse

```dart
class LmGatewayResponse {
  final String text;
  final List<LmToolCall>? toolCalls;
  final LmFinishReason finishReason;
  final String providerUsed;
  final String modelUsed;
  final int inputTokens;
  final int outputTokens;
  final int latencyMs;
  final bool wasEscalated;
  final String? escalatedFrom;
}
```

| Field | Description |
|-------|-------------|
| `text` | Generated text response |
| `toolCalls` | Tool calls requested by the model |
| `finishReason` | `stop`, `toolCall`, `lengthLimit`, `error` |
| `providerUsed` | Which provider instance handled the request |
| `modelUsed` | Which model was used |
| `wasEscalated` | Whether the request was escalated from one provider to another |

## LmGatewayToken

Streaming token for `stream()`:

```dart
class LmGatewayToken {
  final String text;
  final String providerId;
  final bool isDone;
}
```

## LmToolCall

```dart
class LmToolCall {
  final String id;
  final String name;
  final Map<String, dynamic> arguments;
}
```

## Concrete Implementation: HumblLmGateway

`HumblLmGateway` implements `ILmGateway` with policy-based routing:

1. Filter providers by tier constraints.
2. Filter by cooldown (exponential backoff for failing providers).
3. Filter by health status.
4. Filter by context window (skip if request too large).
5. Sort by policy preset (`auto`, `onDeviceOnly`, `cloudOnly`, `cloudFirst`, custom).
6. Try first eligible provider.
7. On failure: record cooldown, try next if auto-failover enabled.
8. All exhausted: return error response.

**File:** `humbl_core/lib/lm_gateway/humbl_lm_gateway.dart`

## Usage Example

```dart
final response = await gateway.complete(LmGatewayRequest(
  messages: [
    {'role': 'system', 'content': systemPrompt},
    {'role': 'user', 'content': 'Turn on WiFi'},
  ],
  tools: toolSchemas,
  userId: 'user-1',
  tier: 'standard',
  priority: RequestPriority.realtime,
));

if (response.toolCalls != null) {
  for (final call in response.toolCalls!) {
    await toolRegistry.lookup(call.name)?.execute(ctx, call.arguments);
  }
}
```
