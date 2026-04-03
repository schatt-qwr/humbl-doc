---
sidebar_position: 3
title: Test Coverage
---

# Test Coverage

## Summary

| Test Type | Status | Count |
|-----------|--------|-------|
| Unit | ~20% | 700+ tests across all packages |
| Integration | 0% | No multi-module wiring tests |
| E2E | 0% | No full pipeline turn tests |
| Device | 0% | No Android/iOS hardware tests |
| Manual | 0% | No formal QA test plans |

## Unit Tests

700+ unit tests passing across all packages.

### Tests by Package

| Package | Tests | Test Files | Key Tests |
|---------|-------|-----------|-----------|
| `humbl_core` | ~250+ | 63 | Pipeline, tools, gates, memory, payments, providers, LM gateway |
| `langchain_dart` | 175 | 17+ | LCEL chains, runnables (Assign/Pick/Each/Binding/Generator), tool rendering, memory (buffer + summary + entity), callbacks, vector stores, message utilities (merge/trim/filter), prompts (FewShot + Pipeline), parsers (XML), retrievers (contextual compression), fake models |
| `langchain_graph` | 128 | 7+ | StateGraph compilation, superstep execution, Send fan-out, fan-in barriers, subgraph composition, MessageGraph, channels, checkpointing (SQLite + Postgres), 6 prebuilt agents (ReAct, Supervisor, Swarm, Handoff, Plan-and-Execute, Hierarchical) |
| `litellm_dart` | 113 | 7+ | Router strategies, all 12 provider adapters (incl. Gemini/Azure/Bedrock/Vertex/Cohere/HuggingFace/Together/Mistral), cost calculation, cooldown, embedding API, image generation, budget manager, acompletion pipeline, Redis cache |
| `langsmith_dart` | 56 | 4+ | Client HTTP API with pluggable transport, LangChainTracer, run/dataset/example CRUD, evaluate() + evaluateComparative() with datasets, tracers (console, confidential, metrics) |
| `humbl_lm` | — | 2 | Minimal (scaffolded) |
| `humbl_voice` | — | 2 | Minimal (scaffolded) |
| `humbl_runtime` | — | 1 | Minimal (scaffolded) |

**Framework package totals:** 472 tests (up from 314 at the start of the port effort)

### humbl_core Test Distribution

### Test Distribution

| Area | File(s) | Test Count |
|------|---------|-----------|
| Pipeline orchestrator | `pipeline/pipeline_orchestrator_test.dart` | ~18 |
| Route decision node | `pipeline/route_decision_node_test.dart` | ~12 |
| Loop check node | `pipeline/loop_check_node_test.dart` | ~8 |
| Deliver node tokens | `pipeline/deliver_node_tokens_test.dart` | ~6 |
| Confirmation flow | `pipeline/confirmation_flow_test.dart` | ~10 |
| Access control | `tools/gate1_pipeline_access_test.dart` | ~27 |
| Tool context filter | `tools/tool_context_filter_test.dart` | ~12 |
| Confirmation patterns | `tools/confirmation_pattern_test.dart` | ~15 |
| Resource ID | `tools/resource_id_for_test.dart` | ~8 |
| Gate 3 resources | `tools/gate3_resource_test.dart` | ~14 |
| Shell tools | `tools/shell_tools_test.dart` | ~10 |
| Search tools | `tools/search_tools_test.dart` | ~8 |
| Model file tools | `tools/model_file_tools_test.dart` | ~6 |
| Connector registry | `lm_gateway/connector_registry_test.dart` | ~14 |
| Provider registry | `lm_gateway/provider_registry_test.dart` | ~14 |
| Model registry | `models/model_registry_test.dart` | ~14 |
| Memory (noop) | `memory/noop_memory_service_test.dart` | ~22 |
| Payments | `payments/payment_test.dart` | ~14 |
| Providers (connected) | `providers/connected_device_provider_test.dart` | ~12 |
| Providers (tool wiring) | `providers/tool_provider_wiring_test.dart` | ~10 |
| Providers (typed) | `providers/typed_providers_test.dart` | ~8 |
| Productivity tools | `tools/productivity_tools_services_test.dart` | ~8 |

### Testing Patterns Used

- **Fakes over mocks.** Pipeline tests use hand-written fakes (e.g., `FakeIntentProcessor`, `FakeLmGateway`) rather than mockito.
- **sqflite_ffi for SQLite.** Tests that need SQLite use `sqfliteFfiInit()` + `databaseFactoryFfi` for cross-platform support.
- **In-memory journal.** `InMemoryJournal` provides a test-friendly `ISystemJournal` implementation.
- **Isolated state.** Each test creates a fresh `PipelineState` -- no shared mutable state between tests.

## Critical Untested Areas

The following areas have no automated test coverage and represent the highest-risk gaps:

| Area | Risk | Why Untested |
|------|------|-------------|
| `ToolRegistry.execute()` full gate chain | High | The @nonVirtual template runs Gate 4, 1, 2, validation, and 3 in sequence. No single test exercises all five gates end-to-end. |
| Individual tool `run()` for P0 tools | High | Most tool tests cover registration and schema, not actual execution logic. |
| Platform manager native round-trips | High | Kotlin/Swift method channels are not testable without a device. |
| LmEngine inference | High | Requires native llama.cpp libraries and a GGUF model file. |
| Full pipeline E2E | High | No test sends text through the complete pipeline (input to classify to tool to deliver to output). |
| Voice pipeline round-trip | Medium | VoiceSessionRunner has no test with actual audio data. |
| Cloud sync | Medium | Supabase integration is untested (requires running Supabase instance). |
| MCP client | Medium | McpClient tests would need a mock MCP server. |

## Test Commands

```bash
# Run all tests
cd humbl_core && flutter test

# Run a single test file
cd humbl_core && flutter test test/pipeline/pipeline_orchestrator_test.dart

# Run tests matching a name pattern
cd humbl_core && flutter test --name "LoopCheckNode"

# Run with verbose output
cd humbl_core && flutter test --reporter expanded
```
