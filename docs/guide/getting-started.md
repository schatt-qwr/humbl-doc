---
sidebar_position: 1
title: Getting Started
---

# Getting Started

Prerequisites, clone, build, and test instructions for the Humbl codebase.

## Prerequisites

| Requirement | Version |
|-------------|---------|
| Flutter SDK | 3.38+ |
| Dart SDK | 3.10+ |
| Git | Any recent |
| Platform SDK | Android SDK 34+, Xcode 15+, Visual Studio 2022+, or equivalent |

### Platform-Specific

- **Android:** Android Studio with NDK for native plugins.
- **iOS:** Xcode 15+ with CocoaPods.
- **Windows:** Visual Studio 2022 with C++ desktop development workload.
- **macOS:** Xcode command line tools.
- **Linux:** `clang`, `cmake`, `ninja-build`, `pkg-config`, `libgtk-3-dev`.

## Clone

```bash
git clone https://github.com/qwr-app/humbl.git
cd humbl
```

## Build

### Framework Packages (pure Dart, no Flutter required)

The four framework packages under `packages/` are pure Dart and can be built and tested without Flutter:

```bash
# LangChain Core
cd packages/langchain_dart && dart pub get && dart test && cd ../..

# LangGraph (depends on langchain_dart)
cd packages/langchain_graph && dart pub get && dart test && cd ../..

# LiteLLM (depends on langchain_dart)
cd packages/litellm_dart && dart pub get && dart test && cd ../..

# Langfuse (depends on langchain_dart for BaseTracer)
cd packages/langfuse_dart && dart pub get && dart test && cd ../..
```

### humbl_core (Flutter plugin)

```bash
cd humbl_core
flutter pub get
dart analyze
flutter test
```

`humbl_core` depends on all four framework packages via local path references in `pubspec.yaml`. Running `flutter pub get` resolves these automatically.

### humbl_app (Flutter app)

```bash
cd humbl_app
flutter pub get
dart analyze
```

### Run the app

```bash
cd humbl_app
flutter run -d windows    # or -d macos, -d linux, -d chrome
flutter run -d android    # with device connected
flutter run -d ios        # with simulator or device
```

## Test

### Run all tests (humbl_core)

```bash
cd humbl_core
flutter test
```

All 509+ tests run without Supabase, device hardware, or LM models. Every dependency is mocked via interfaces.

### Run framework package tests

```bash
cd packages/langchain_dart && dart test
cd packages/langchain_graph && dart test
cd packages/litellm_dart && dart test
cd packages/langfuse_dart && dart test
```

### Run a single test file

```bash
cd humbl_core
flutter test test/pipeline/pipeline_orchestrator_test.dart
```

### Run tests matching a name pattern

```bash
cd humbl_core
flutter test --name "LoopCheckNode"
```

### Run with verbose output

```bash
cd humbl_core
flutter test --reporter expanded
```

## Documentation Site

```bash
cd humbl-doc
npm install
npx docusaurus start
# Opens at http://localhost:3000/humbl-doc/
```

## Project Structure

```
packages/
  langchain_dart/       LangChain Core (runnables, tools, memory, callbacks, tracers)
  langchain_graph/      LangGraph (StateGraph, channels, checkpoints)
  litellm_dart/         LiteLLM (multi-provider routing, cost tracking)
  langfuse_dart/        Langfuse (observability, batch ingestion, LangfuseTracer)
  whisper_dart/         Flutter FFI plugin — whisper.cpp STT
  piper_dart/           Flutter FFI plugin — Piper TTS

humbl_core/             Flutter plugin — pipeline, tools, security, platform managers
humbl_app/              Flutter app — startup wiring, BLoC state management, UI
humbl_lm/               LM connector implementations
humbl_voice/            Voice provider implementations
humbl_runtime/          Native inference runtimes (scaffolded)
humbl_backend/          Supabase Edge Functions (partial)
humbl-doc/              Documentation site (Docusaurus)
```

## Next Steps

- [Project Setup](./project-setup) -- SDK versions, dependency management, platform builds.
- [Add a Tool](./howto/add-a-tool) -- Build your first custom tool.
- [Architecture Overview](../architecture/overview) -- Understand the system design.
- [LangChain Framework](../architecture/subsystems/langchain-framework) -- How the Dart ports work.
