# M365 Tauri/WebView2 Feasibility Evidence Boundary

This directory stores only reviewed, redacted evidence summaries for the M365 Tauri/WebView2 controlled-DOCX feasibility spike.

## Allowed to commit

- Git commit SHA and application version.
- Synthetic fixture filename, byte count, and SHA-256.
- Adapter and protocol versions.
- Bounded state transitions and machine-readable status codes.
- Test commands, exit codes, and aggregate pass/fail counts.
- Redacted acceptance summaries.
- Limitations and open issues.

## Must remain local/private

- Absolute source or staging paths.
- Usernames, home directories, machine identifiers, or work-account email addresses.
- Passwords, cookies, access tokens, authorization headers, browser profiles, or authentication files.
- Raw provider DOM, raw CDP event payloads, or unbounded stdout/stderr.
- Screenshots that expose account identity, tenant details, private content, or browser chrome.
- Raw provider response content unless it is separately reviewed synthetic-public evidence.
- Any real RA, client, product, submission, or consulting document.

Local/private evidence belongs under the app-local attempt directory or `docs/evidence/m365-tauri-feasibility/local-private/`, which is gitignored.

## Qualification boundary

A successful synthetic fixture run demonstrates only the observed Windows/Tauri/WebView2 transport path for the exact reviewed commit, environment, provider surface, and fixture SHA. It does not establish:

- private-document authorization;
- production readiness;
- unattended reliability;
- cross-tenant compatibility;
- regulatory validation;
- semantic correctness of provider output;
- long-term selector stability.

Every committed acceptance summary must use the sections:

```text
Evidence
Findings
Risks
Open Issues
Recommendation
Disposition: PASS | CONDITIONAL | FAIL
```
