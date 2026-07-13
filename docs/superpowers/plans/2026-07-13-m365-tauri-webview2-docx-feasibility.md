# M365 Tauri/WebView2 Controlled DOCX Feasibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove on Windows that an isolated Tauri/WebView2 M365 Copilot session can support manual work-account sign-in, host-controlled attachment of one exact synthetic DOCX, exactly one prompt submission, and complete Markdown response capture with traceable evidence.

**Architecture:** Replace the Grok slot with the distinct provider ID `m365_copilot` in this isolated spike branch. Keep provider WebViews untrusted and without Tauri permissions. The trusted control pane stages one synthetic DOCX into an app-local attempt directory, Rust records and verifies its SHA-256, and a Windows-only WebView2 CDP bridge intercepts the visible M365 file chooser and binds only that registered file.

**Tech Stack:** Tauri `=2.11.5`, WebView2, Rust 2021, React 18, TypeScript, Vite, Vitest, pnpm, WebView2 COM/CDP, existing callback-pull bridge, JSON adapters, SHA-256.

## Global Constraints

- Branch: `spike/m365-tauri-webview2-docx`; never implement this spike directly on `main`.
- Record the actual starting commit before implementation; do not assume a stale SHA.
- Live acceptance is Windows-only. macOS and Linux must continue to compile through `#[cfg(windows)]` and explicit unsupported-platform stubs.
- Use only a synthetic-public DOCX until the final feasibility disposition is recorded.
- Do not use private RA files, client files, passwords, cookies, access tokens, authentication files, or provider credentials.
- The user performs account selection, sign-in, MFA, and Conditional Access interaction normally in the Tauri window.
- Do not spoof a user agent, suppress MFA, weaken tenant policy, or silently fall back to an external browser.
- Provider ID is `m365_copilot`; never relabel historical `grok` records as M365.
- Use a new application identifier and a new provider profile directory.
- Only the `main` control pane may invoke staging/upload commands. Provider WebViews receive zero Tauri command permissions.
- New upload commands must not accept arbitrary provider IDs, URLs, filesystem paths, JavaScript, CDP method names, or selectors.
- Re-hash the staged DOCX immediately before provider binding.
- General evidence must omit absolute paths, work-account identity, raw DOM, raw CDP events, credentials, and source bytes.
- Track file binding, upload completion, prompt submission, and response completion as separate states.
- After a send action may have occurred, an ambiguous failure is `submission_unknown`; do not retry automatically.
- A pass proves only the bounded synthetic-public Windows/Tauri/WebView2 path. It is not private-document qualification or regulatory validation.

---

## Acceptance Criteria

The spike passes only when the same reviewed commit demonstrates all of the following:

1. M365 loads in an isolated Tauri/WebView2 profile.
2. Manual work-account sign-in succeeds and remains ready after an app restart.
3. A deterministic synthetic DOCX is staged and SHA-256 verified.
4. The visible M365 upload action raises an intercepted WebView2 file chooser.
5. Only the registered staged DOCX is bound to that chooser event.
6. M365 displays the expected filename and an upload-complete state.
7. A fixed prompt is submitted exactly once after upload completion.
8. A complete Markdown response is captured from the latest assistant turn.
9. The response contains at least two document facts not included in the prompt.
10. Evidence is complete and redacted; all frontend/Rust/CI gates pass.

## State Model

```text
idle
→ webview_opening
→ login_required | provider_ready | blocked
→ file_selecting
→ file_staged
→ chooser_arming
→ upload_control_opening
→ chooser_intercepted
→ file_bound
→ upload_in_progress
→ upload_verified
→ prompt_ready
→ prompt_submitting
→ prompt_submitted
→ response_streaming
→ response_captured
→ completed
```

Exceptional states:

```text
blocked_auth
blocked_tenant_policy
blocked_provider_unavailable
blocked_upload_control
blocked_file_chooser
blocked_upload_verification
blocked_response_capture
failed_integrity
failed_contract
failed_runtime
cancelled_pre_submission
submission_unknown
```

`file_bound` is not `upload_verified`; `upload_verified` is not `prompt_submitted`; `prompt_submitted` is not `response_captured`.

---

## Planned File Map

### Create

```text
adapters/m365_copilot.json
fixtures/m365/synthetic-review.docx
fixtures/m365/manifest.json
injected/providers/m365.ts
public/m365-harness.html
scripts/generate-m365-fixture.mjs
scripts/check-m365-fixture.mjs
src/m365/types.ts
src/m365/acceptanceMachine.ts
src/m365/acceptanceMachine.test.ts
src/m365/M365FeasibilityPanel.tsx
src/m365/M365FeasibilityPanel.test.tsx
src/m365/contentSpecificity.ts
src/m365/contentSpecificity.test.ts
src-tauri/src/m365_commands.rs
src-tauri/src/m365_evidence.rs
src-tauri/src/upload_registry.rs
src-tauri/src/webview2_cdp.rs
docs/runbooks/m365-tauri-acceptance.md
docs/evidence/m365-tauri-feasibility/README.md
docs/evidence/m365-tauri-feasibility/baseline.md
docs/evidence/m365-tauri-feasibility/final-decision.md
```

### Modify

```text
package.json
shared/types.ts
shared/constants.ts
adapters/schema.json
scripts/check-adapters.mjs
injected/engine.ts
src/App.tsx
src/host/index.ts
src/i18n/keys.ts
src/i18n/en.ts
src/i18n/zh-TW.ts
src-tauri/Cargo.toml
src-tauri/src/lib.rs
src-tauri/src/adapters.rs
src-tauri/src/webviews.rs
src-tauri/capabilities/default.json
src-tauri/tauri.conf.json
.github/workflows/ci.yml
.gitignore
```

---

## Task 0 — Baseline and Isolation

- [ ] Record `git status --short --branch` and `git rev-parse HEAD`.
- [ ] Record Node, pnpm, Rust, Cargo, and Git versions in `docs/evidence/m365-tauri-feasibility/baseline.md` without user paths.
- [ ] Run unchanged baseline gates:

```powershell
pnpm install --frozen-lockfile
pnpm verify
cargo test --manifest-path src-tauri/Cargo.toml
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings
```

- [ ] Add raw M365 feasibility runtime/evidence directories to `.gitignore`.
- [ ] Commit: `docs: record m365 tauri feasibility baseline`.

Stop if the unchanged baseline fails.

## Task 1 — Deterministic Synthetic DOCX

The fixture contains only these facts:

```text
Synthetic device codename: BIRCH-47.
Declared surface temperature limit: 41.7 degrees Celsius.
Single-fault scenarios reviewed: 17.
Deliberate review issue: the submission-readiness statement is unsupported.
```

The fixed prompt must not contain `BIRCH-47`, `41.7`, or `17`.

- [ ] Add a deterministic standard-library Node generator for a minimal stored-ZIP DOCX.
- [ ] Add a checker that recalculates SHA-256 and confirms the four exact statements exist in the DOCX bytes.
- [ ] Reject client identifiers, email addresses, absolute paths, and the substring `Consulting`.
- [ ] Add `generate:m365-fixture` and `check:m365-fixture` scripts without adding runtime dependencies.
- [ ] Run generation twice and confirm the SHA is stable.
- [ ] Commit: `test: add deterministic synthetic m365 docx fixture`.

## Task 2 — Distinct M365 Provider Identity

- [ ] Change `AIProvider` from `grok` to `m365_copilot`.
- [ ] Add M365 metadata with application URL `https://m365.cloud.microsoft/chat/`.
- [ ] Create `adapters/m365_copilot.json`; update adapter schema, checker, Rust registry, UI labels, and i18n.
- [ ] Change the spike application identifier to `com.kiwishane.aiwb.reviewdesktop.m365spike`.
- [ ] Confirm the profile path is derived as `webviews/m365_copilot`; never read or migrate `webviews/grok`.
- [ ] Preserve historical Grok snapshots as `legacy_provider_unavailable`; never replay them through M365 automatically.
- [ ] Remove bundled `adapters/grok.json` only after identity/schema tests pass.
- [ ] Commit: `feat: replace grok slot with isolated m365 provider`.

## Task 3 — Opaque Exact-File Staging

Create Rust records:

```rust
pub struct RegisteredUpload {
    pub upload_id: String,
    pub attempt_id: String,
    pub staged_path: std::path::PathBuf,
    pub file_name: String,
    pub size_bytes: u64,
    pub sha256: String,
    pub expires_at_unix_ms: u128,
}

#[derive(Default)]
pub struct UploadRegistry {
    records: std::sync::Mutex<std::collections::HashMap<String, RegisteredUpload>>,
}
```

Policy:

- `.docx` only; nonzero; maximum 10 MiB.
- Reject UNC, alternate data streams, symlinks, junctions, and reparse points.
- Copy under app-local `m365-feasibility/<attempt-id>/staging/<upload-id>/input.docx`.
- Hash before and after copy; hashes must match.
- Frontend receives only opaque IDs, filename, size, SHA-256, and expiry.
- Register the registry through `tauri::Builder::manage`.
- Only `main` gets stage-command permissions.
- Commit: `feat: stage exact docx files in an opaque upload registry`.

## Task 4 — M365 Named DOM Strategies and Local Harness

Add reviewed fixed operations, not arbitrary adapter scripts:

```text
readiness probe
nested GPT model observation/selection
visible upload-menu opening
upload-completion observation
fixed prompt submission
latest response extraction
```

Create `public/m365-harness.html` with M365-like controls:

```text
model selector + nested GPT menu
Add and manage sources
Upload images and files
<input type="file" accept=".docx">
upload filename + upload finished
prompt editor
send button
deterministic Markdown response
```

Provide only fixed surfaces:

```text
Harness → packaged local harness
Live    → https://m365.cloud.microsoft/chat/
```

No frontend-supplied URL. Use separate labels/profiles for harness and live. Commit: `feat: add bounded m365 dom strategies and local harness`.

## Task 5 — WebView2 CDP Capability Probe

Before writing upload logic:

```powershell
cargo tree --manifest-path src-tauri/Cargo.toml -i webview2-com
```

- [ ] Record the exact version already used by pinned Tauri.
- [ ] Add a direct Windows-only dependency at exactly that version; do not allow incompatible duplicate COM types.
- [ ] Implement fixed internal wrappers for `Runtime.evaluate`, `Page.enable`, `Page.setInterceptFileChooserDialog`, and `DOM.setFileInputFiles`.
- [ ] Do not expose a general CDP command to the frontend.
- [ ] Add a fixed harness probe returning only document title/readiness.
- [ ] Provide a non-Windows `unsupported_platform` implementation.
- [ ] Run the harness probe before Task 6.
- [ ] Commit: `spike: prove fixed webview2 cdp access`.

Stop if native WebView2/CDP access cannot be demonstrated.

## Task 6 — Controlled File Chooser Binding

Normative sequence:

```text
validate upload ID and attempt ID
→ re-hash staged file
→ Page.enable
→ subscribe Page.fileChooserOpened
→ Page.setInterceptFileChooserDialog(enabled=true)
→ invoke visible M365 upload controls
→ receive first backendNodeId
→ DOM.setFileInputFiles(exact one staged path)
→ emit bounded file-bound receipt
→ disable interception and remove event handler
```

Tests cover unknown/expired upload IDs, hash mismatch, chooser timeout, missing `backendNodeId`, duplicate chooser events, and cleanup in all failure paths. General receipts contain filename/hash but no absolute path. Commit: `feat: bind registered docx through intercepted webview2 chooser`.

## Task 7 — Guided Feasibility State Machine and Panel

The panel exposes only ordered actions:

1. Open harness/live M365.
2. Check readiness.
3. Stage synthetic DOCX.
4. Arm chooser and attach exact file.
5. Verify upload completion.
6. Observe/select model.
7. Submit fixed prompt.
8. Capture response.
9. Open local evidence folder.

Invalid transitions are rejected. The UI permanently states: `Synthetic-public fixture only. Do not select or upload real/private RA documents in this feasibility run.` Commit: `feat: add guided m365 feasibility workflow`.

## Task 8 — Single Submission and Response Capture

Fixed prompt:

```text
Review the attached synthetic document. Return plain Markdown in this chat only.

Use these headings:
# Document Facts
# Findings
# Limitations

Under Document Facts, identify the synthetic device codename, the declared surface-temperature limit, and the number of single-fault scenarios stated in the document. Do not create, save, export, download, or attach a separate file. Do not claim regulatory approval or submission readiness.
```

- [ ] Create a submission nonce; reject a second submit request for the same attempt.
- [ ] After a possibly successful click, ambiguous failure becomes `submission_unknown` with no retry.
- [ ] Capture only the latest assistant response container.
- [ ] Reject empty, prompt-echo, or visibly truncated output.
- [ ] Require headings `Document Facts`, `Findings`, and `Limitations`.
- [ ] Require at least two of `BIRCH-47`, `41.7`, and `17`.
- [ ] Store raw response only in the private attempt directory; return hash/bytes/fact labels.
- [ ] Commit: `feat: capture and validate m365 document-specific responses`.

## Task 9 — Redacted Evidence Package

App-local tree:

```text
m365-feasibility/<attempt-id>/
├── general/
│   ├── environment.json
│   ├── readiness.json
│   ├── input-manifest.json
│   ├── upload-receipt.json
│   ├── prompt-receipt.json
│   ├── response-receipt.json
│   ├── transition-log.jsonl
│   └── acceptance-summary.json
├── private/
│   ├── response.md
│   └── bounded-diagnostics.json
└── staging/
    └── <upload-id>/input.docx
```

General evidence must fail tests if it contains an absolute path, account email, cookie/token/auth material, raw DOM/CDP payloads, or source bytes. Commit: `feat: write redacted m365 feasibility evidence`.

## Task 10 — Offline Harness Gate

Complete the full sequence without Microsoft/network credentials. Required negative cases:

```text
missing upload control
chooser timeout
duplicate chooser
staged-file tampering
upload never completes
send button missing
empty response
prompt echo
insufficient hidden facts
cancel before submit
ambiguous post-submit failure
```

Do not start live M365 testing until this gate passes. Commit: `test: pass m365 controlled upload harness gate`.

## Task 11 — Live M365 Login Gate

- User completes normal login/MFA/tenant prompts.
- Require composer and upload control with no pending interstitial.
- Restart app and re-check readiness.
- PASS: login works and persists.
- CONDITIONAL: login works but requires repeated user intervention.
- FAIL: tenant/embedded-browser policy prevents stable session.

On FAIL, stop. Do not weaken authentication controls.

## Task 12 — Live Controlled DOCX Upload Gate

- Stage only the committed synthetic fixture.
- Arm chooser before visible upload action.
- Require exactly one intercepted chooser event with `backendNodeId`.
- Re-hash before bind.
- Bind exactly one registered path.
- Require M365 filename and upload-complete observation.
- Do not submit prompt in this gate.

PASS requires host-controlled exact-file binding. A manual chooser-only result is CONDITIONAL and is insufficient for private-document control.

## Task 13 — Live Prompt/Response Gate

- Record actual model/mode; do not guess hidden model state.
- Submit fixed prompt once.
- Capture complete latest response.
- Pass Markdown and hidden-fact checks.
- If complete Markdown is captured before trailing file generation, preserve it and record the limitation; if incomplete, block.

## Task 14 — Failure Matrix and Final Decision

Minimum final evidence:

- three successful complete runs;
- across at least two app restarts;
- same reviewed commit and fixture SHA;
- distinct attempt IDs;
- no duplicate prompt submission;
- all evidence packages pass redaction checks.

Final gates:

```powershell
pnpm check:m365-fixture
pnpm verify
cargo test --manifest-path src-tauri/Cargo.toml
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings
git diff --check
git status --short --branch
```

Write `docs/evidence/m365-tauri-feasibility/final-decision.md` with `Evidence`, `Findings`, `Risks`, `Open Issues`, `Recommendation`, exact commit, fixture SHA, attempt IDs, limitations, and disposition.

### PASS

Controlled exact-file upload, single submission, complete content-specific response capture, repeated runs, and redacted evidence all pass. Proceed to a separate AIWB PDP/Desktop PEP integration plan.

### CONDITIONAL

The interaction works but a required control remains manual or unstable. Do not use private documents; resolve the named gap or compare external-browser CDP/API routes.

### FAIL

Embedded sign-in, controlled upload, or response capture cannot be made reliable without weakening security. Stop this path and evaluate a separately identified external-browser or API PEP.

---

## Required Verification and Review Checkpoints

- Review after provider/app identity isolation.
- Review after staging/path policy.
- Stop/review after the CDP capability probe.
- Security review after exact-file chooser interception.
- Human authorization before the first synthetic provider transmission.
- Final human review before recording PASS/CONDITIONAL/FAIL.

Every task uses failing tests first where executable in the current environment, targeted tests, full repository gates, a focused diff review, and a focused commit. A code-complete branch without live acceptance is not proof that M365 works in Tauri/WebView2.