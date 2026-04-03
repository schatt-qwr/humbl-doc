---
sidebar_position: 8
title: Cloud Agent Backend
---

# Cloud Agent Backend

Humbl uses a **local-primary, cloud-extended** agent architecture. The main Humbl Agent always runs in the app on-device. For tasks that require cloud resources (web search, long-running workflows, multi-step reasoning), it dispatches a cloud agent job and communicates via a bidirectional message bus.

## Architecture Overview

```
Main Agent (Dart, on-device)
    |
    | dispatch via Supabase Edge Function
    v
Cloud Worker (Python, Cloud Run)
    |
    | reads/writes via Supabase
    v
Results back to Main Agent via Realtime
```

Cloud agents are **identity-blind** -- they receive minimum required data, no user identity. BYOK users call providers directly; Humbl-quota users route through an Edge Function proxy that shields identity from the cloud provider.

## Three Execution Tiers

| Tier | Runtime | Language | Use Case | LM? |
|------|---------|----------|----------|-----|
| **Heavy** | Cloud Run | Python (FastAPI) | Long-running workflows, web search, code execution, multi-step reasoning | Yes (LangGraph + LiteLLM Python) |
| **Micro** | OS scheduler (Edge Function trigger) | TypeScript | Lightweight periodic checks -- battery, calendar sync, quota reset | No |
| **Main** | App process | Dart (StateGraph + litellm_dart) | All user interactions, tool execution, scout agents, device control | Yes (on-device SLM or cloud via Router) |

The same agent definition works in both Dart and Python because both sides use the same abstractions (StateGraph, BaseTool, Router). Agent YAML configs declare capabilities, and the runtime resolves them to the appropriate language implementation.

## Database Schema

Five Supabase tables power the cloud agent system:

| Table | Purpose |
|-------|---------|
| `agent_jobs` | Job queue. Status lifecycle: `pending` -> `running` -> `completed` / `failed` / `cancelled`. Stores agent type, input, config, result. |
| `agent_messages` | Bidirectional message bus. Types: `dispatch`, `result`, `tool_req`, `tool_res`, `heartbeat`, `control`. |
| `agent_inbox` | User-facing inbox for agent results. Supports pinning, read/unread, and dismissal. |
| `micro_agent_schedules` | Cron-style schedules for micro agents. Stores interval, last run, next run, enabled state. |
| `agent_checkpoints` | LangGraph checkpoint persistence for resumable cloud workflows. |

All tables have Row-Level Security (RLS) policies scoped to `auth.uid()`. Realtime is enabled on `agent_messages` and `agent_inbox` for live updates to the app.

## Supabase Edge Functions

### dispatch-agent-job

Entry point for all cloud agent requests. Performs **Gate 2 quota verification** before inserting a job:

1. Validate the request (agent type, input, config).
2. Call `verify-quota` to check the user's remaining credits against the agent's estimated token cost.
3. If quota passes, insert a row into `agent_jobs` with status `pending`.
4. The Cloud Run worker polls for pending jobs.

### verify-quota

Reads the user's quota directly from Supabase (spend log, subscription tier, top-ups). This is Gate 2 of the dual-gated quota system -- even if the app sends spoofed quota claims (Gate 1), the server verifies independently.

### micro-agent-runner

Executes micro agent schedules. Runs on a cron trigger, checks `micro_agent_schedules` for due agents, executes lightweight checks (no LM), and writes results to `agent_inbox`.

## Cloud Run Worker

A Python FastAPI server that processes heavy agent jobs:

```
Cloud Run Worker
  +-- /health          Health check endpoint
  +-- /process-job     Triggered by job queue poll
  +-- job_worker.py    Polls agent_jobs, runs graphs, writes results
  +-- supervisor.py    Base LangGraph supervisor graph
  +-- cloud_tools/
       +-- web_search.py       Internet search via provider APIs
       +-- fetch_url.py        Fetch and parse web pages
       +-- code_execute.py     Sandboxed code execution
       +-- supabase_query.py   Query Supabase data
       +-- device_proxy.py     Request device tools from Main Agent
```

### Device Tool Proxy

Cloud agents can request device-side tools (camera, contacts, location, sensors) through the Main Agent. The flow:

1. Cloud agent sends a `tool_req` message via `agent_messages`.
2. Main Agent receives via Realtime subscription.
3. Main Agent executes the tool locally (through the full five-gate security model).
4. Main Agent sends the result back as a `tool_res` message.
5. Cloud agent receives the result and continues execution.

This means cloud agents have access to the same tool ecosystem as the on-device agent, without any tools needing cloud-specific implementations.

## Agent Types (28 Total)

### 25 Pre-Built Agents

YAML-configured agents covering productivity, health, communication, system, and lifestyle categories:

| Category | Agents |
|----------|--------|
| Productivity | Morning Briefing, Meeting Prep, Expense Tracker, Task Planner, Email Digest |
| Health | Health Monitor, Sleep Analyzer, Fitness Coach, Hydration Reminder, Posture Check |
| Communication | Notification Digest, Smart Reply, Contact Insights, Call Summary, Message Scheduler |
| System | Battery Optimizer, Storage Cleanup, App Usage, Security Check, Update Manager |
| Lifestyle | Smart Commute, News Curator, Language Coach, Recipe Finder, Event Discovery |

### Custom Agent

One user-configurable agent slot per tier. Users define the agent's goal, tools, schedule, and constraints via the settings UI. The custom agent uses the base supervisor graph with user-specified parameters.

### 2 Micro Agents

Lightweight agents that run on the OS scheduler without LM:
- **Calendar Sync** -- periodically syncs calendar events for proactive reminders
- **Quota Monitor** -- checks spend against budget and sends warnings

## Agent YAML Config Format

Each agent is defined by a YAML config that works identically in Dart and Python:

```yaml
agent_id: morning_briefing
display_name: Morning Briefing
category: productivity
requires_cloud: true
estimated_tokens: 2000
default_interval: 24h
active_hours: [6, 10]  # Only run between 6am-10am
tools:
  - web_search
  - calendar_read
  - weather_check
  - news_fetch
graph_type: supervisor  # Uses base supervisor graph
system_prompt: |
  You are a morning briefing assistant. Summarize the user's
  day ahead: weather, calendar, top news, and any pending tasks.
```

The `graph_type` field determines which prebuilt graph to use. Most agents use `supervisor`. Agents with complex workflows can specify `custom` and provide a graph definition.

## Message Bus Protocol

All communication between Main Agent and Cloud Worker uses typed messages in `agent_messages`:

| Type | Direction | Purpose |
|------|-----------|---------|
| `dispatch` | App -> Cloud | Start a new agent job |
| `result` | Cloud -> App | Final result of a completed job |
| `tool_req` | Cloud -> App | Cloud agent requests a device tool |
| `tool_res` | App -> Cloud | Main Agent returns tool result |
| `heartbeat` | Cloud -> App | Cloud agent is still alive (prevents timeout) |
| `control` | App -> Cloud | Cancel, pause, or reconfigure a running job |

Messages are delivered via Supabase Realtime (WebSocket). If Realtime is unavailable, the app falls back to polling `agent_messages` on a 5-second interval.

## Dual-Gated Quota

Cloud agent execution is protected by two independent quota gates:

- **Gate 1 (Client)**: The app sends the user's tier, remaining credits, and BYOK keys in the dispatch request. The Edge Function reads this config.
- **Gate 2 (Server)**: The Edge Function independently queries the user's spend log and subscription from Supabase. Even if Gate 1 claims unlimited credits, Gate 2 enforces the actual quota.

Both gates must pass before a job is dispatched. This prevents client-side spoofing while keeping the app responsive (Gate 1 catches most denials locally without a server round-trip).

## Credit Model

| Tier | Agent Slots | Cloud Agents | Micro Agents |
|------|------------|--------------|--------------|
| Free | 0 | None | Calendar Sync, Quota Monitor |
| Standard | 2 | Credits per run | All micro agents |
| Plus | 5 | Credits per run | All micro agents |
| Ultimate | 10 | Credits per run | All micro agents |

Local-only agents (on-device, `requiresCloud: false`) are free on all tiers. Micro agents are free because they consume no LM tokens. Cloud agents deduct credits based on actual token usage reported by the Python worker.

## Source Files

| File | Description |
|------|-------------|
| `humbl_backend/supabase/functions/dispatch-agent-job/` | Dispatch Edge Function |
| `humbl_backend/supabase/functions/verify-quota/` | Quota verification Edge Function |
| `humbl_backend/supabase/functions/micro-agent-runner/` | Micro agent scheduler |
| `humbl_backend/supabase/migrations/` | SQL schema (5 tables + RLS + Realtime) |
| `humbl_backend/cloud-run/` | Python Cloud Run worker (FastAPI + LangGraph) |
| `humbl_backend/agents/` | 28 agent YAML configs |
| `humbl_core/lib/agents/agent_manager.dart` | AgentManager (local scheduling, lifecycle) |
| `humbl_core/lib/agents/i_background_agent.dart` | IBackgroundAgent interface |
| `humbl_app/lib/blocs/agent_inbox/` | AgentInbox BLoC + UI |
| `humbl_app/lib/services/humbl/agent_message_service.dart` | Message bus client |
