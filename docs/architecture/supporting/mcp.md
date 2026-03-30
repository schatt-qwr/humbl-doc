---
sidebar_position: 6
title: MCP Integration
---

# MCP Integration

Humbl acts as a **Model Context Protocol (MCP) host**, allowing users to install external MCP servers and expose their tools to the LM. MCP tools are wrapped as standard `HumblTool` instances, always capped at `AccessLevel.standard` for security.

All classes live in `humbl_core/lib/mcp/`.

## What

MCP (Model Context Protocol) is an open standard for LLM-to-tool communication, defining how language models discover, describe, and invoke external tools via JSON-RPC 2.0. Humbl implements the host/client side of MCP: it connects to external MCP servers, discovers their tools, and wraps each tool as a `HumblTool` so the pipeline can execute them through the standard five-gate security model.

## Why MCP?

MCP is the industry-standard protocol for LLM tool integration. Using MCP rather than a custom tool protocol provides three benefits:

1. **Ecosystem compatibility.** Any MCP server -- whether it is a Slack integration, a database query tool, a code execution sandbox, or a home automation bridge -- works with Humbl without custom integration code. The user installs it, Humbl discovers its tools, and the LM can invoke them.

2. **No vendor lock-in for tool authors.** A developer who builds an MCP server for Humbl's ecosystem can also use it with Claude Desktop, Cursor, or any other MCP host. This lowers the barrier for third-party tool development.

3. **Standardized schema.** MCP tools self-describe with JSON Schema input/output definitions. Humbl's `HumblTool.toMcpSchema()` already exports tools in this format for LM consumption. MCP servers import with the same format. There is zero translation overhead.

### Security Constraint

MCP tools always receive `AccessLevel.standard`. This is a hard security boundary: a third-party MCP server cannot gain access to system-level or confidential resources, even if it declares higher access in its tool descriptions. The reasoning:

- MCP servers are external processes, often running on remote machines. They are inherently untrusted.
- A malicious MCP server could declare `AccessLevel.system` in its tool schema, hoping to gain access to emergency controls, power management, or confidential data.
- By capping at `standard`, MCP tools can read non-sensitive data and invoke standard actions (web search, calendar read, etc.) but cannot toggle radios, access confidential logs, or invoke system-level tools.

## How It Connects

```
MCP Server (external) ◄──► IMcpTransport ◄──► McpClient ◄──► McpConnectionManager
                                                                      │
                                                                      ▼
                                                                ToolRegistry
                                                              (McpBridgeTool instances)
                                                                      │
                                                                      ▼
                                                            Pipeline (ExecuteToolNode)
```

The connection flows in layers:

1. **`IMcpTransport`** handles the raw communication channel (HTTP, WebSocket, SSE, stdio).
2. **`McpClient`** handles the JSON-RPC 2.0 protocol: initialization handshake, capability negotiation, tool discovery, and tool invocation.
3. **`McpConnectionManager`** manages the lifecycle of MCP server connections and bridges them into the tool registry.
4. **`McpBridgeTool`** wraps each MCP tool as a `HumblTool`, making it discoverable by the LM and executable through the pipeline.

The pipeline never talks to MCP directly. From the pipeline's perspective, an MCP tool is just another `HumblTool` in the registry with `ToolGroup.mcp`. The five-gate security model, resource management, and logging all apply identically.

## IMcpTransport

Abstracts the communication channel between Humbl and MCP servers. Multiple transport types are planned, prioritized by implementation difficulty and demand.

```dart
abstract class IMcpTransport {
  String get transportId;
  bool get isConnected;

  Future<void> connect(McpServerConfig config);
  Future<void> disconnect();
  Future<Map<String, dynamic>> request(Map<String, dynamic> jsonRpcRequest);
  Future<void> notify(Map<String, dynamic> jsonRpcNotification);

  Stream<Map<String, dynamic>> get serverMessages;
  Stream<McpConnectionState> get connectionState;
  Future<void> dispose();
}
```

### Transport Types

| Type | Priority | Description | Use Case |
|------|----------|-------------|----------|
| `http` | P0 | Simplest, stateless. Each request is an independent HTTP POST. | Cloud MCP servers, REST-based tool APIs. |
| `webSocket` | P1 | Persistent, bidirectional. Supports server push and streaming. | Real-time MCP servers, chat integrations. |
| `sse` | P1 | Server-sent events (legacy servers). Client sends via HTTP POST, server pushes via SSE. | Older MCP implementations. |
| `stdio` | P2 | Desktop only. Spawns a local process and communicates via stdin/stdout. | Local CLI tools, sandboxed code execution. |
| `inMemory` | Testing | Direct function call, no serialization. | Unit tests for McpClient and McpConnectionManager. |

The `http` transport is implemented first because it covers the majority of MCP servers and requires no persistent connection management. `webSocket` follows for servers that need bidirectional communication (e.g., streaming tool results).

### McpServerConfig

```dart
class McpServerConfig {
  final String serverId;          // Unique ID for this server installation
  final String displayName;       // Human-readable name ("Slack Integration")
  final McpTransportType transportType;
  final Uri? url;                 // For http/webSocket/sse transports
  final String? command;          // For stdio transport (executable path)
  final List<String>? args;       // For stdio transport (command arguments)
  final Map<String, String>? headers;  // Auth headers, API keys
  final Duration timeout;         // Request timeout (default: 30s)
  final bool autoReconnect;       // Auto-reconnect on disconnect (default: true)
}
```

The `timeout` default of 30 seconds is chosen to accommodate tool executions that involve external API calls (e.g., a web search MCP tool that calls Google). For local stdio tools, callers should set a shorter timeout (5-10s).

### McpConnectionState

`disconnected` | `connecting` | `connected` | `reconnecting` | `error`

The `connectionState` stream enables the UI to show connection status per MCP server. `reconnecting` is distinct from `connecting` -- it indicates a previously-connected server that lost connection and is attempting recovery (via `autoReconnect`).

## McpClient

JSON-RPC 2.0 client that handles protocol-level communication. Transport-agnostic -- it receives an `IMcpTransport` and uses it for all communication.

```dart
class McpClient {
  McpClient({required IMcpTransport transport});

  Future<void> connect(McpServerConfig config);
  Future<List<McpToolSchema>> listTools();
  Future<McpToolResult> callTool(String toolName, Map<String, dynamic> arguments);
  Future<void> disconnect();

  String? get serverName;
  List<McpToolSchema>? get tools;
  bool get isConnected;
}
```

### Capability Negotiation

On `connect()`, the client performs the MCP initialization handshake:

1. **Send `initialize`** with `protocolVersion: '2024-11-05'` and client capabilities (Humbl declares support for `tools` capability).
2. **Receive server info** including server name, version, and capabilities. The server declares which MCP features it supports (tools, resources, prompts, etc.).
3. **Send `notifications/initialized`** to confirm the connection is ready.

This three-step handshake ensures both sides agree on the protocol version and supported features before any tool calls are made. If the server declares a protocol version Humbl does not support, the connection fails with a clear error.

### Tool Discovery

After initialization, `listTools()` sends a `tools/list` JSON-RPC request. The server responds with an array of tool schemas. Each schema includes:

- `name` -- the tool's identifier (unique within this server).
- `description` -- human-readable description for the LM.
- `inputSchema` -- JSON Schema describing the tool's parameters.

These are converted to `McpToolSchema` objects and cached on the client.

### McpToolSchema

```dart
class McpToolSchema {
  final String name;
  final String description;
  final Map<String, dynamic> inputSchema;

  Map<String, dynamic> toToolMap(); // Same format as HumblTool.toMcpSchema()
}
```

`toToolMap()` produces the same JSON structure that Humbl's native tools export via `toMcpSchema()`. This means the LM sees MCP tools and native tools in an identical format -- no special handling needed in the prompt adapter.

### Tool Invocation

`callTool(toolName, arguments)` sends a `tools/call` JSON-RPC request with the tool name and argument map. The server executes the tool and returns a `McpToolResult` containing the output content (text, images, or structured data).

### McpError

```dart
class McpError implements Exception {
  final int code;     // JSON-RPC error code
  final String message;
  final dynamic data; // Optional error details
}
```

Standard JSON-RPC error codes are used: `-32600` (invalid request), `-32601` (method not found), `-32602` (invalid params), `-32603` (internal error). MCP-specific codes are in the `-32000` to `-32099` range.

## McpBridgeTool

Wraps a single MCP server tool as a `HumblTool`. Created by `McpConnectionManager` for each discovered tool. This is the bridge that makes MCP tools look identical to native tools from the pipeline's perspective.

```dart
class McpBridgeTool extends HumblTool {
  // name = 'mcp_{serverId}_{toolName}'
  // groups = {ToolGroup.mcp}
  // declaredAccessLevel = AccessLevel.standard (always, hardcoded)
  // connectivity = ConnectivityRequirement.internet
  // supportsOneShot = true
  // priority = ToolPriority.p2
}
```

### Naming Convention

MCP bridge tools are named `mcp_{serverId}_{toolName}` to prevent collisions with native tools and between multiple MCP servers. For example, a Slack MCP server with ID `slack_workspace` exposing a `send_message` tool becomes `mcp_slack_workspace_send_message`.

### Why AccessLevel.standard?

`declaredAccessLevel` is hardcoded to `AccessLevel.standard` in `McpBridgeTool` and cannot be overridden. Even if the MCP server's tool description claims it needs system access, the bridge tool caps it at standard. This means:

- MCP tools **can** read non-sensitive data, perform web searches, access public APIs, manage calendar events.
- MCP tools **cannot** toggle radios (WiFi, Bluetooth), access confidential logs, invoke emergency features, modify system settings, or access resources gated above `standard`.

### Connectivity Requirement

All MCP bridge tools declare `ConnectivityRequirement.internet` because they communicate with an external server over the network. If the device is offline, MCP tools are filtered out of `availableTools` and the LM will not attempt to invoke them.

### Priority

MCP tools are `ToolPriority.p2` (lower than native P0/P1 tools). When the LM has a choice between a native tool and an MCP tool that do the same thing (e.g., native `web_search` vs. MCP `mcp_tavily_search`), the native tool is preferred because it is faster (no network hop to an MCP server) and more reliable.

## McpConnectionManager

Manages the full lifecycle of MCP server connections and registers bridge tools into the `ToolRegistry`.

```dart
class McpConnectionManager {
  McpConnectionManager({required ToolRegistry toolRegistry});

  Future<void> install(McpServerConfig config, IMcpTransport transport);
  Future<void> uninstall(String serverId);
  Future<void> reconnect(String serverId);

  List<McpServerConfig> get installedServers;
  Stream<McpConnectionEvent> get events;
  bool isInstalled(String serverId);
  Future<void> dispose();
}
```

### Install Flow (Step by Step)

1. **Create `McpClient`** with the provided transport.
2. **Connect** to the MCP server and perform capability negotiation (initialize handshake).
3. **Discover tools** via `tools/list`. The server returns its available tools with JSON Schema descriptions.
4. **Create `McpBridgeTool`** for each server tool. Each bridge tool wraps the MCP tool schema and delegates `run()` to `McpClient.callTool()`.
5. **Register all bridge tools** as a bundle via `ToolRegistry.registerBundle(tools, grantedAccess: AccessLevel.standard)`. The bundle ID is the server ID. Access is capped at `standard` regardless of what the tools declare.
6. **Emit `McpConnectionEvent(type: installed, toolCount: N)`** on the events stream.

After installation, the MCP server's tools appear in `ToolRegistry.availableTools()` and are included in the tool schemas sent to the LM for classification. The LM can invoke them just like native tools.

### Uninstall Flow

1. **Unregister the tool bundle** from `ToolRegistry` by server ID. All `McpBridgeTool` instances for this server are removed.
2. **Disconnect** the `McpClient` (sends close notification to the server).
3. **Dispose** the transport resources (close sockets, terminate stdio process).
4. **Emit `McpConnectionEvent(type: uninstalled)`**.

### Reconnect Flow

When an MCP server disconnects unexpectedly (network failure, server restart):

1. If `autoReconnect` is enabled in the config, the transport enters `reconnecting` state.
2. Reconnection uses exponential backoff (via `RetryPolicy.standard`).
3. On successful reconnect, `tools/list` is re-issued to detect any tool changes.
4. If the tool set changed (tools added or removed), the bundle is re-registered.
5. **Emit `McpConnectionEvent(type: reconnected, toolCount: N)`**.

During disconnection, the MCP server's bridge tools remain in the registry but are marked as unavailable (they will fail at execution with a connection error). This prevents the LM from selecting them for new queries while reconnection is in progress.

### McpConnectionEvent

```dart
class McpConnectionEvent {
  final String serverId;
  final McpConnectionEventType type; // installed, uninstalled, reconnected, disconnected, error
  final int? toolCount;              // Number of tools (for installed/reconnected)
  final String? error;               // Error message (for error type)
}
```

## Source Files

| File | Description |
|------|-------------|
| `humbl_core/lib/mcp/i_mcp_transport.dart` | IMcpTransport, McpServerConfig, McpConnectionState |
| `humbl_core/lib/mcp/mcp_client.dart` | McpClient, McpToolSchema, McpToolResult, McpError |
| `humbl_core/lib/mcp/mcp_bridge_tool.dart` | McpBridgeTool |
| `humbl_core/lib/mcp/mcp_connection_manager.dart` | McpConnectionManager, McpConnectionEvent |
