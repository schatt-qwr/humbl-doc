# Humbl Documentation

Technical documentation for the [Humbl AI](https://github.com/qwr-app/humbl) project — a voice-native, edge-first personal AI companion on the phone, extended by connected devices (smart glasses, pendants, AI pins, watches).

Built with [Docusaurus 3](https://docusaurus.io/).

## What's Documented

| Section | Pages | Covers |
|---------|-------|--------|
| **Architecture** | 19 | System overview, 4 LangChain-ecosystem Dart ports, 2 FFI plugins, 8 core subsystems, 7 supporting systems, data flow, DB layout, startup sequence, concurrency model |
| **API Reference** | 26 | Pipeline, tools, LM gateway, memory, devices, security, resources, services, voice, platform |
| **Status** | 5 | Current state (truth / plans / pending), gap analysis, module completion, test coverage (~1500 tests across 11 Dart packages), roadmap |
| **Developer Guide** | 11 | Getting started, project setup, 4 how-to guides, 4 pattern guides |

## Architecture Highlights

Humbl is built on native Dart ports of four AI frameworks, plus two Flutter FFI plugins for on-device inference:

### Framework Packages (faithful Dart ports — LangChain ecosystem)

- **`langchain_dart`** — LangChain Core (runnables, tools, memory, callbacks, **tracers** [generic BaseTracer/Run/RunType/Console/InMemory as of 2026-04-21])
- **`langchain_graph`** — LangGraph (StateGraph, channels, checkpointing, 6 prebuilt agents)
- **`litellm_dart`** — LiteLLM (Router with 5 strategies, 12 provider adapters, cost tracking, budget enforcement)
- **`langfuse_dart`** — Langfuse (observability, batch ingestion, LangfuseTracer extends BaseTracer)

### FFI Plugins (Flutter plugins for on-device inference)

- **`whisper_dart`** — whisper.cpp FFI bindings for STT
- **`piper_dart`** — Piper FFI bindings for TTS

### How Humbl Extends Them

All Humbl features are native extensions of these ports, never wrappers:

- `HumblTool extends BaseTool`
- `HumblChatModel extends BaseChatModel`
- `IMemoryService extends BaseMemory`
- `ConversationStore implements BaseChatMessageHistory`
- 6 callback handlers extend `BaseCallbackHandler`
- `HumblLmGateway` wraps `litellm_dart Router`
- `ConfidentialTracer` / `MetricsTracer` / `LangfuseTracer` extend `BaseTracer` (from `langchain_dart`)
- Pipeline IS a `StateGraph` (from `langchain_graph`)

## Local Development

```bash
npm install
npx docusaurus start
```

Opens at [http://localhost:3000/humbl-doc/](http://localhost:3000/humbl-doc/). Changes reflected live.

## Build

```bash
npx docusaurus build
```

Generates static files in `build/`.

## Deployment

Deployed to GitHub Pages via the `gh-pages` branch:

```bash
GIT_USER=<username> npx docusaurus deploy
```

## Tech Stack

- Docusaurus 3 with TypeScript config
- Mermaid diagrams (architecture, data flow, sequence diagrams)
- Dark theme with orange accent (`#FF6D00`)
- Dart, Kotlin, Swift, SQL syntax highlighting
- 4 sidebars: Architecture, Status, API Reference, Developer Guide

## Contributing

Documentation lives in `docs/` as Markdown files. Sidebar structure is in `sidebars.ts`. Site configuration is in `docusaurus.config.ts`.
