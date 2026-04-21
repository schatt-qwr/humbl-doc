# Humbl AI -- Compliance & Standards Tracking

This document tracks Humbl AI's compliance posture across security, privacy, AI governance, code quality, accessibility, and data handling. It reflects what is implemented today versus what is required for each tier.

**Last updated:** 2026-04-02

---

## Priority Tiers

### Tier 1: Must Have (Pre-Launch)

| Standard | Scope | Status |
|----------|-------|--------|
| OWASP MASVS L1 | Mobile security baseline -- storage, crypto, network, platform, code quality | Partial |
| DPDPA 2023 (India) | Data Protection and Digital Personal Data Act -- consent, access, erasure, breach notification | Partial |
| GDPR (EU) | General Data Protection Regulation -- lawful basis, data subject rights, DPIAs | Partial |
| WCAG 2.1 AA | Accessibility -- perceivable, operable, understandable, robust | Not started |
| Effective Dart + `dart analyze` clean | Static analysis, lint rules, code style | Done |

### Tier 2: Enterprise Ready

| Standard | Scope | Status |
|----------|-------|--------|
| SOC 2 Type II | Security, availability, processing integrity, confidentiality, privacy controls | Not started |
| ISO/IEC 42001 | AI management system -- risk, governance, lifecycle | Partial (architecture only) |
| OWASP MASVS L2 | Advanced mobile security -- defense in depth, tamper detection | Not started |
| ISO/IEC 25010 | Software product quality -- functional suitability, reliability, performance, security, maintainability | Partial |

### Tier 3: Differentiator

| Standard | Scope | Status |
|----------|-------|--------|
| NIST AI RMF 1.0 | AI Risk Management Framework -- govern, map, measure, manage | Not started |
| EU AI Act | AI system classification, transparency, high-risk obligations | Not started |
| ISO 27001 | Information security management system (ISMS) | Not started |
| IEEE 7000 | Ethical engineering of autonomous/intelligent systems | Not started |

---

## Current Compliance Status

### 1. Security

#### What Humbl already has

| Capability | Implementation | File(s) |
|------------|---------------|---------|
| Encrypted key storage | `SecureKeyVault` wraps Flutter Secure Storage (Keychain on iOS, EncryptedSharedPreferences on Android) | `humbl_app/lib/services/humbl/secure_key_vault.dart` |
| 4-gate access control on tools | PolicyGate, AccessGate, PermissionGate, QuotaGate -- all enforced in `@nonVirtual run()` template | `humbl_core/lib/tools/humbl_tool.dart` |
| Tier-gated LLM access | `HumblChatModel` filters model access by subscription tier before any LLM call | `humbl_core/lib/lm_gateway/humbl_chat_model.dart` |
| Access level hierarchy | 6-level hierarchy: system > core > confidential > trusted > standard > restricted | `humbl_core/lib/tools/humbl_tool.dart` |
| Human-in-the-loop for dangerous actions | `ConfirmationLevel` enum with 7 confirmation providers (biometric, voice fingerprint, head gesture, UI dialog, voice command, glasses input, notification) | `humbl_core/lib/confirmation/confirmation_models.dart` |
| Graph interrupt support | `GraphInterrupt` in langchain_graph halts pipeline execution pending human approval | `packages/langchain_graph/lib/src/errors.dart` |
| PII redaction in traces | `ConfidentialTracer extends BaseTracer` -- redacts PII from trace output | `humbl_core/lib/tracing/confidential_tracer.dart` |
| Circuit breaker + retry | `CircuitBreaker`, `RetryPolicy`, `ResilientExecutor` for fault isolation | `humbl_core/lib/resilience/` |
| Cooldown on failed providers | `CooldownManager` with failure counting + exponential backoff | `packages/litellm_dart/lib/src/router/` |

#### What is missing

| Gap | Priority | Notes |
|-----|----------|-------|
| TLS certificate pinning | High | Not implemented. Required for MASVS L1 network security. Add via `dio` certificate pinning or platform-native pinning. |
| Root/jailbreak detection | High | No tamper detection. Required for MASVS L1. Consider `flutter_jailbreak_detection` or native checks. |
| Code obfuscation configuration | Medium | Flutter `--obfuscate --split-debug-info` not yet configured in release builds. |
| Security headers on Supabase Edge Functions | Medium | Verify CSP, HSTS, X-Content-Type-Options on all Edge Function responses. |
| API key rotation mechanism | Medium | `SecureKeyVault` stores keys but no automated rotation or expiry tracking. |
| Input validation/sanitization layer | Medium | Tool parameters validated per-tool but no centralized sanitization framework. |
| Dependency vulnerability scanning | High | No automated CVE scanning in CI (e.g., `dart pub audit`, Snyk, or Dependabot). |
| Binary integrity checks | Low | No checksum verification on downloaded GGUF model files. |

---

### 2. Privacy

#### What Humbl already has

| Capability | Implementation | File(s) |
|------------|---------------|---------|
| Edge-first architecture | 60-80% on-device SLM processing (Qwen3-0.6B via llama.cpp FFI). User data stays on device by default. | `humbl_core/lib/lm_gateway/`, `humbl_runtime/` |
| PII redaction in tracing | `ConfidentialTracer` strips personal data from all trace/log output | `humbl_core/lib/tracing/confidential_tracer.dart` |
| On-device memory storage | T1-T4 memory tiers stored locally in SQLite. No cloud sync unless user opts in. | `humbl_core/lib/memory/sqlite_memory_service.dart` |
| Confidential logging | `ILogEncryptor` interface for encrypting sensitive log entries | `humbl_core/lib/tracing/` |
| User-controlled cloud sync | Free tier: own cloud (Drive/iCloud/OneDrive). Subscriber tier: Humbl cloud. Always opt-in. | Architecture decision (not yet implemented in UI) |
| Spend/usage tracking | `SpendLog` tracks LLM usage per-request for transparency | `humbl_core/lib/payments/spend_log.dart`, `packages/litellm_dart/lib/src/cost/spend_log.dart` |

#### What is missing

| Gap | Priority | Notes |
|-----|----------|-------|
| Consent management UI | High | No consent collection/management screens. DPDPA and GDPR require explicit, granular consent before processing. |
| Data access/export (DSAR) | High | No mechanism for users to export all their data (Article 15 GDPR, Section 11 DPDPA). |
| Data deletion (right to erasure) | High | No user-facing "delete all my data" flow. Must cover: local SQLite, Supabase records, cloud sync targets, model caches. |
| Privacy policy + in-app disclosures | High | No privacy policy document or in-app data collection disclosures. |
| Data Processing Impact Assessment (DPIA) | Medium | Not yet conducted. Required for GDPR when processing at scale or using AI profiling. |
| Data retention policy | Medium | No defined retention periods for conversations, memories, logs, or telemetry. |
| Cross-border data transfer safeguards | Medium | Supabase region selection and SCCs/adequacy decisions not documented. |
| Telemetry opt-out | Medium | Architecture decision says all-user telemetry+logging. Need opt-out mechanism for GDPR compliance. |
| Minor/child protections | Low | No age verification. DPDPA has specific obligations for processing children's data. |

---

### 3. AI Governance

#### What Humbl already has

| Capability | Implementation | File(s) |
|------------|---------------|---------|
| Human-in-the-loop | `ConfirmationLevel` + `GraphInterrupt` -- dangerous tool calls require explicit user approval before execution | `humbl_core/lib/confirmation/`, `packages/langchain_graph/` |
| Model transparency (cost) | `IProviderCostModel` + `SpendLog` + `CostCalculator` -- every LLM call tracked with cost, tokens, provider | `humbl_core/lib/providers/i_provider_cost_model.dart`, `packages/litellm_dart/` |
| Provider routing with fallback | `litellm_dart Router` with 5 strategies (simple, costBased, leastBusy, latencyBased, usageBased) + cooldown | `packages/litellm_dart/lib/src/router/` |
| Audit trail | `IMemoryService.logInteraction()` records all pipeline interactions (T4 audit log) | `humbl_core/lib/memory/i_memory_service.dart` |
| Tracing framework | `BaseTracer`, `ConsoleTracer`, `InMemoryTracer`, `ConfidentialTracer`, `MetricsTracer`, `LangfuseTracer` -- full observability stack wired via decorator `ConfidentialTracer → MetricsTracer → LangfuseTracer` | `packages/langchain_dart/lib/src/tracers/`, `packages/langfuse_dart/`, `humbl_core/lib/tracing/` |
| Tool execution gating | 4-gate system prevents unauthorized tool execution. Tools declare `ConfirmationLevel`. | `humbl_core/lib/tools/humbl_tool.dart` |

#### What is missing

| Gap | Priority | Notes |
|-----|----------|-------|
| Model card / transparency documentation | High | No published documentation of model capabilities, limitations, training data provenance, or known biases for on-device SLM. |
| Bias testing framework | High | No systematic bias evaluation for LLM outputs. Need benchmark suite for fairness across demographics. |
| Output safety filtering | High | No content safety classifier on LLM outputs. Consider guardrails layer (profanity, harmful content, hallucination detection). |
| AI incident response plan | Medium | No documented procedure for handling AI safety incidents (harmful outputs, data leaks via model). |
| Model versioning and rollback | Medium | `LocalModelManager` exists but no versioned deployment tracking or rollback procedure for on-device models. |
| Explainability layer | Medium | No mechanism to explain why the AI made a particular decision or tool call to the user. |
| Red-teaming / adversarial testing | Low | No adversarial prompt testing program. Important for smart glasses where voice input may be manipulated. |
| AI ethics review board/process | Low | No formal review process for new AI capabilities before deployment. |

---

### 4. Code Quality

#### What Humbl already has

| Capability | Implementation | Status |
|------------|---------------|--------|
| `dart analyze` clean | Zero analysis errors across all packages | Done -- enforced in development |
| Comprehensive test suite | 509+ tests across humbl_core, 4 framework packages with their own test suites | Done |
| Framework-level testing | langchain_dart (24 test files incl. migrated tracers), langchain_graph (15), litellm_dart (11), langfuse_dart (6), whisper_dart (3), piper_dart (2) | Done |
| Modular architecture | 31 modules in humbl_core, 4 framework packages, clean separation of concerns | Done |
| Sealed types for type safety | `GateResult`, `ToolStreamData`, `PipelineInput` use sealed classes for exhaustive matching | Done |
| Callback handler architecture | 6 callback handlers (Policy, AccessControl, Logging, Permission, Quota, ToolFilter) | Done |

#### What is missing

| Gap | Priority | Notes |
|-----|----------|-------|
| CI/CD pipeline | High | No automated build/test/deploy pipeline. Need GitHub Actions for: `dart analyze`, `flutter test`, dependency audit. |
| Code coverage tracking | High | No coverage measurement or enforcement. Target: 80%+ line coverage for humbl_core. |
| Integration test suite | Medium | Unit tests exist but no end-to-end integration tests for full pipeline (voice-in to response-out). |
| Performance benchmarks | Medium | No automated performance regression testing (LLM latency, memory usage, battery impact). |
| DCM (Dart Code Metrics) enforcement | Medium | DCM configured as MCP but not integrated into CI. Should enforce cyclomatic complexity, lines of code per method. |
| Mutation testing | Low | No mutation testing to validate test quality. |
| API documentation generation | Low | No `dart doc` generation in CI. Framework packages should publish API docs. |

---

### 5. Accessibility

#### What Humbl already has

| Capability | Implementation | Status |
|------------|---------------|--------|
| Voice-first interaction | Core interaction model is voice-native, inherently accessible for vision-impaired users | Architecture-level |
| Multi-modal confirmation | 7 confirmation providers including voice command, head gesture -- non-touch options | Done |

#### What is missing

| Gap | Priority | Notes |
|-----|----------|-------|
| Semantic labels on all widgets | High | No systematic `Semantics` widget usage audit. Every interactive element needs labels for screen readers. |
| Color contrast compliance | High | No color contrast audit against WCAG 2.1 AA (4.5:1 for normal text, 3:1 for large text). |
| Focus management | High | No keyboard/switch access focus order testing. Critical for desktop (Windows/macOS/Linux). |
| Touch target sizes | High | WCAG requires minimum 44x44dp touch targets. No audit performed. |
| Screen reader testing | High | No testing with TalkBack (Android), VoiceOver (iOS), or Narrator (Windows). |
| Reduced motion support | Medium | No `MediaQuery.disableAnimations` checks. Users with vestibular disorders need this. |
| Text scaling support | Medium | No testing with system font size scaling (up to 200%). |
| RTL language support | Low | No right-to-left layout testing. Required if targeting Arabic/Hebrew markets. |
| Accessibility CI checks | Medium | No automated accessibility linting (e.g., `flutter_accessibility_service` or custom lint rules). |

---

### 6. Data Handling

#### What Humbl already has

| Capability | Implementation | File(s) |
|------------|---------------|---------|
| Encryption at rest (keys) | `SecureKeyVault` uses platform Keychain/Keystore for API keys and secrets | `humbl_app/lib/services/humbl/secure_key_vault.dart` |
| Encrypted logging | `ILogEncryptor` interface -- sensitive log entries encrypted before storage | `humbl_core/lib/tracing/` |
| SQLite local storage | All memory tiers (T1-T4) stored in local SQLite -- no cloud exposure by default | `humbl_core/lib/memory/sqlite_memory_service.dart` |
| Audit trail logging | `IMemoryService.logInteraction()` records pipeline interactions with timestamps | `humbl_core/lib/memory/i_memory_service.dart` |
| Cost/spend audit trail | Every LLM call logged with provider, model, token count, cost | `humbl_core/lib/payments/spend_log.dart` |
| Training data export controls | `ITrainingDataExporter` with privacy/consent gating -- 4 export formats | `humbl_core/lib/lm_gateway/training/training_data_exporter.dart` |
| Tier-gated cloud sync | Cloud sync is opt-in. Free tier uses user's own cloud; subscriber tier uses Humbl cloud. | Architecture decision |

#### What is missing

| Gap | Priority | Notes |
|-----|----------|-------|
| SQLite database encryption | High | Local SQLite databases are NOT encrypted at rest. Use `sqflite_sqlcipher` or `sqlite3` with SQLCipher for full database encryption. |
| TLS enforcement validation | High | No runtime verification that all network calls use TLS 1.2+. Add network security config for Android, ATS for iOS. |
| Data classification scheme | Medium | No formal classification (public/internal/confidential/restricted) applied to data fields. Needed for SOC 2. |
| Backup encryption | Medium | No policy for encrypting device backups that may contain Humbl data. Android `allowBackup` and iOS backup exclusion rules needed. |
| Audit log tamper protection | Medium | Audit logs in SQLite can be modified. Consider append-only log with hash chaining or remote attestation. |
| Data flow documentation | Medium | No formal data flow diagram showing where user data moves (device, Supabase, cloud LLM providers, sync targets). |
| Secure deletion | Medium | No verified secure deletion (overwrite) of sensitive data. Standard `DELETE` in SQLite does not zero pages. |
| Network security config (Android) | High | No `network_security_config.xml` restricting cleartext traffic and pinning certificates. |
| App Transport Security (iOS) | High | Verify ATS is not disabled in `Info.plist`. No exceptions for cleartext HTTP. |

---

## Compliance Roadmap

### Phase 1: Pre-Launch (Tier 1 critical gaps)

Target: Before public release.

1. **Security hardening**
   - Add TLS certificate pinning (dio interceptor or platform-native)
   - Add root/jailbreak detection
   - Configure release build obfuscation
   - Add `network_security_config.xml` (Android) and verify ATS (iOS)
   - Set up dependency vulnerability scanning in CI

2. **Privacy compliance**
   - Build consent management UI (DPDPA + GDPR)
   - Implement data export (DSAR) endpoint
   - Implement "delete all my data" flow
   - Write and publish privacy policy
   - Add telemetry opt-out toggle

3. **AI safety**
   - Document model card for on-device SLM
   - Add output safety filtering / guardrails layer
   - Create initial bias test suite

4. **Accessibility**
   - Audit all widgets for semantic labels
   - Run color contrast checks
   - Test with TalkBack and VoiceOver
   - Verify touch target sizes

5. **Data protection**
   - Enable SQLite encryption (SQLCipher)
   - Verify TLS 1.2+ enforcement on all platforms
   - Configure Android backup rules and iOS backup exclusions

6. **Code quality CI**
   - Set up GitHub Actions: analyze, test, coverage
   - Enforce 80%+ code coverage gate

### Phase 2: Enterprise Ready (Tier 2)

Target: 6-12 months post-launch.

1. SOC 2 Type II readiness -- formal controls documentation, access reviews, incident response
2. ISO/IEC 42001 -- AI management system policies and procedures
3. OWASP MASVS L2 -- advanced tamper detection, runtime integrity checks, anti-debugging
4. Performance benchmarking suite for ISO/IEC 25010

### Phase 3: Differentiator (Tier 3)

Target: 12-24 months post-launch.

1. NIST AI RMF adoption -- formal risk assessment for all AI capabilities
2. EU AI Act classification and compliance (if targeting EU market)
3. ISO 27001 ISMS certification
4. IEEE 7000 ethical impact assessment

---

## Summary Scorecard

| Area | Implemented | Gaps (High) | Gaps (Medium) | Gaps (Low) |
|------|------------|-------------|---------------|------------|
| Security | 9 capabilities | 3 | 3 | 1 |
| Privacy | 6 capabilities | 5 | 3 | 1 |
| AI Governance | 6 capabilities | 3 | 3 | 2 |
| Code Quality | 6 capabilities | 2 | 3 | 2 |
| Accessibility | 2 capabilities | 5 | 3 | 1 |
| Data Handling | 7 capabilities | 4 | 4 | 0 |
| **Total** | **36 capabilities** | **22 high** | **19 medium** | **7 low** |

Humbl's edge-first architecture and 4-gate tool security provide a strong privacy and security foundation. The primary gaps are in user-facing compliance features (consent UI, data export/deletion), platform hardening (TLS pinning, SQLite encryption), AI safety (output filtering, bias testing), and accessibility (no systematic audit performed yet).
