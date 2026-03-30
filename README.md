# Humbl Documentation

Technical documentation for the [Humbl AI](https://github.com/qwr-app/humbl) project — a voice-native, edge-first personal AI assistant for smart glasses and connected devices.

Built with [Docusaurus 3](https://docusaurus.io/).

## What's Documented

| Section | Pages | Covers |
|---------|-------|--------|
| **Architecture** | 19 | System overview, LangChain framework (4 Dart ports), 8 core subsystems, 7 supporting systems, data flow, DB layout, startup sequence, concurrency model |
| **API Reference** | 26 | Pipeline, tools, LM gateway, memory, devices, security, resources, services, voice, platform |
| **Status** | 5 | Implementation status (~60%), gap analysis, module completion, test coverage (509+ tests / 101 files), roadmap |
| **Developer Guide** | 11 | Getting started, project setup, 4 how-to guides, 4 pattern guides |

## Architecture Highlights

The docs cover Humbl's architecture built on native Dart ports of four AI frameworks:

- **`langchain_dart`** — LangChain Core (runnables, tools, memory, callbacks)
- **`langchain_graph`** — LangGraph (StateGraph, channels, checkpoints)
- **`litellm_dart`** — LiteLLM (multi-provider routing, cost tracking)
- **`langsmith_dart`** — LangSmith (tracing, evaluation, feedback)

All Humbl features are extensions of these ports: `HumblTool extends BaseTool`, `IMemoryService extends BaseMemory`, `HumblLmGateway` wraps `litellm_dart Router`, 6 callback handlers extend `BaseCallbackHandler`.

## Local Development

```bash
npm install
npx docusaurus start
```

Opens at [http://localhost:3000/humbl-doc/](http://localhost:3000/humbl-doc/). Changes are reflected live.

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
- Dark theme with orange accent (#FF6D00)
- Dart, Kotlin, Swift, SQL syntax highlighting
- 4 sidebars: Architecture, Status, API Reference, Developer Guide

## Contributing

Documentation lives in `docs/` as Markdown files. Sidebar structure is defined in `sidebars.ts`. Site configuration is in `docusaurus.config.ts`.
