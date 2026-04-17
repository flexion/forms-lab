---
status: working
tags: [architecture, security, threat-model]
---

# Threat Model

Trust boundary and data flow analysis for Forms Lab. Each section documents a boundary where data crosses between components with different trust levels, the threats at that crossing, current mitigations, and residual risk.

For methodology and rationale, see the [living threat model decision](../decisions/architecture/living-threat-model.md).

## System context

Forms Lab is a server-rendered web application that accepts government PDF forms, extracts structured data using an LLM, delivers a form-filling experience, and produces completed PDFs. The system uses git-based persistence, deploys to a single EC2 instance via GitHub webhooks, and will authenticate form creators via GitHub OAuth.

See [system overview](system-overview.md) and [data model](data-model.md) for full architecture details.

## Trust boundaries

### Browser to Caddy

**What crosses:** HTTPS requests from users (form creators and form fillers), static asset requests, OAuth callback redirects.

**Threats:**
- **TLS misconfiguration** -- weak cipher suites or expired certificates could allow interception of form data in transit.
- **Request smuggling** -- malformed HTTP requests could bypass routing rules.
- **DDoS** -- volumetric attacks against the public endpoint.

**Mitigations:**
- Caddy terminates TLS using a self-signed certificate (`tls internal`) because the current hostname is an AWS compute domain that Let's Encrypt will not issue certificates for. Traffic is encrypted in transit, but clients cannot verify the server's identity through a trusted CA chain.
- Caddy's HTTP parser rejects malformed requests.
- No DDoS mitigation currently; single EC2 instance is the only target.

**Residual risk:** Self-signed TLS means browsers will show certificate warnings and users must manually trust the connection. A MITM attacker could present their own self-signed certificate. Acceptable for a class project with known users; a production deployment would use a custom domain with CA-issued certificates. DDoS against a single instance with no upstream protection is also unmitigated.

### Caddy to Hono application

**What crosses:** Proxied HTTP requests (headers, body, query params) over localhost.

**Threats:**
- **Header injection** -- Caddy forwards headers that the app trusts (e.g., `X-Forwarded-For`). A misconfigured proxy could allow clients to spoof these.
- **Path traversal** -- subpath routing (`/main/`, `/slice-1/`) maps to branch-specific processes. Malformed paths could route to unintended processes.

**Mitigations:**
- Caddy's default `reverse_proxy` behavior sets `X-Forwarded-For` and related headers. No explicit header stripping or `trusted_proxies` directives are configured.
- Subpath routing uses prefix matching in Caddy config; branch-specific routes are loaded from `/srv/forms-lab/caddy.d/branch-*.caddy` files.
- Communication is localhost-only; not exposed to the network.

**Residual risk:** Low. Internal-only communication. The application does not currently rely on forwarded headers for security decisions, so header spoofing is not exploitable in the current architecture.

### Hono application to form project repos

**What crosses:** Reads and writes to bare git repos at `${REPOS_PATH}/<slug>.git`. Each form project has its own repo containing spec JSON, form JSON, confidence data, and the source PDF. The app invokes git via `Bun.spawn` — no working tree is ever checked out. The `ProjectStore` in SQLite acts as a lightweight index (slug, status, owner, fork provenance); the git repos are the source of truth for spec content.

**Threats:**
- **Path traversal** -- user-controlled input (project names) could be used to read or write files outside `REPOS_PATH`.
- **Command injection** -- slug or path values passed to `git --git-dir` arguments could be interpreted as options or shell metacharacters.
- **Arbitrary file write** -- a malicious PDF filename or project slug could overwrite application code or configuration.
- **Orphaned index rows** -- a git operation that fails mid-flight could leave a SQLite row referencing a nonexistent repo, leading to stuck "extracting" projects.
- **Data integrity** -- concurrent writes against the same bare repo's index file could corrupt commits.
- **Stale data on detached HEAD** -- a bug in the commit flow could advance `refs/heads/main` to a commit that doesn't include all expected files.

**Mitigations:**
- Slugs are generated server-side via `slugify()` (lowercase alphanumerics + hyphens, extension stripped, duplicates handled with numeric suffixes). User input never flows directly into paths.
- `Bun.spawn` uses an argv array rather than shell interpolation, so metacharacters in arguments are passed verbatim to `git` as single arguments rather than being shell-evaluated.
- Git operations always target `repoDir(slug)` which joins against a fixed `REPOS_PATH` base.
- `ProjectService.createProject` is atomic: if `repo.init()` or the initial `repo.commit()` throws, the just-inserted `ProjectStore` row is deleted before the error is rethrown.
- Each `commit()` call uses a fresh `GIT_INDEX_FILE` (named with `crypto.randomUUID()`) to avoid cross-request index collisions and is cleaned up in a `finally` block.
- Extraction is fire-and-forget but errors are captured in `.catch()` and written back to the `error` column on the index row.
- PDF uploads are capped by Hono's body parser at the server level.

**Residual risk:** Slug collisions are resolved by appending `-2`, `-3`, etc., but this does not prevent a malicious user from enumerating slugs by trial. Path traversal is prevented by slug generation, but a bug that allowed raw user input to reach `repoDir()` would be serious — worth keeping the enforcement visible in code review. No cleanup job reaps orphaned `source/*.pdf` blobs or confidence files from deleted projects; disk usage grows monotonically with project churn. The atomic createProject fix does not cover a server crash between the SQLite insert and the git operations — a restart may leave stuck rows that require manual cleanup or a future reaper script.

### Browser to read-only git HTTP

**What crosses:** Anonymous HTTP GET requests to `/git/<slug>.git/*`. Caddy serves the bare repo directory as static files using the dumb HTTP transport. Anyone can `git clone` any project.

**Threats:**
- **Information disclosure** -- every form project, including its source PDF and extracted data, is publicly clonable. A project containing PII would leak that PII to anyone who knows the slug.
- **Slug enumeration** -- slugs are human-readable and sometimes sequential (`-2`, `-3`), making directory scanning cheap.
- **Stale refs** -- `git update-server-info` must be called after every ref update for dumb HTTP clients to see new commits. If it fails, clones may return stale data.
- **Directory listing exposure** -- Caddy's `file_server browse` enables directory listing, which reveals the slug namespace.

**Mitigations:**
- Platform policy: git projects are intentionally public. There is no project-level visibility control; anything uploaded is published.
- Fixtures and test data currently contain no real PII.
- `form-project-repo.ts` calls `git update-server-info` as the final step of every commit.
- Only Caddy's `file_server` has access; there is no write path over HTTP — the app is the sole writer to the bare repos.

**Residual risk:** This is by design — Forms Lab positions itself as a "forms forge" where transparency is a feature. The residual risk is that users do not expect their uploads to be publicly clonable. The UI surfaces the clone URL prominently on the project page, but there is no onboarding step that makes "public by default" explicit before an upload. A future iteration should add a visibility setting or at minimum a consent banner on the upload form. Directory listing makes slug enumeration trivial; removing `browse` from the Caddy handler would raise the bar slightly but does not change the fundamental public-by-default posture.

### Hono application to ProjectService (permission enforcement)

**What crosses:** Requests from route handlers for project reads, mutations, and forks. The service takes the requesting `SessionUser | null` and decides whether the operation is permitted.

**Threats:**
- **Missing ownership check** -- a route handler that calls the store directly, bypassing the service, would skip permission enforcement.
- **Broken permission predicate** -- a bug in `requireOwner` or `resolveProject` could allow non-owners to mutate projects.
- **TOCTOU on ownership** -- a project could theoretically change owners between the check and the mutation, though there is currently no path that does this.
- **Fork under wrong identity** -- the fork path writes a new `project.json` and SQLite row; a bug could let a user fork a project under a different login.

**Mitigations:**
- All project mutations flow through `ProjectService`. Route handlers are thin wrappers that parse requests, call the service, and render responses. The service throws typed errors (`UnauthenticatedError`, `ForbiddenError`, `NotFoundError`, `BadRequestError`) that the route catches and maps to HTTP status codes.
- `resolveProject(owner, slug)` refuses to return a project when the URL's owner does not match `project.createdBy`, preventing access via a mismatched URL.
- `requireOwner(project, user)` is a single helper used by every mutating method (`deleteProject`, `retryExtraction`, future editors).
- 25 service-layer unit tests cover the permission matrix directly (owner/non-owner/anonymous × each mutation), independent of HTTP semantics.
- 34 route integration tests exercise the same paths end-to-end with real sessions, confirming that the route → service wiring enforces permissions in practice.

**Residual risk:** A future developer could add a route that talks to the store directly, bypassing the service. Convention alone protects this; there is no lint rule or architectural test that forbids it. Collaborators (multiple writers per project) and organization-scoped ownership are out of scope — when they land, the simple `createdBy === user.login` check must be replaced with a collaborator table and the permission helpers updated.

### Hono application to Claude API

**What crosses:** PDF content sent for extraction, structured specs returned. API key sent with every request.

**Threats:**
- **API key exposure** -- key leaked in logs, error messages, or client responses.
- **Data exfiltration** -- PDF content (potentially containing PII) sent to external API.
- **Prompt injection** -- malicious content in uploaded PDFs could manipulate the extraction prompt.
- **Response manipulation** -- a compromised or spoofed API response could inject malicious content into generated specs.

**Mitigations:**
- API key stored as environment variable, not hardcoded. Managed via sops-nix on the server.
- Claude API uses HTTPS; data encrypted in transit.
- PDF extraction uses a structured prompt with output schema validation; extracted specs are validated against TypeScript types before persistence.
- LLM service uses strategy pattern (`PdfExtractor` interface) allowing implementation swaps without changing calling code.

**Residual risk:** PDF content is sent to Anthropic's API -- acceptable per Anthropic's data handling policies, but government forms may contain sensitive data. A production system would evaluate data residency requirements. Prompt injection in PDFs is partially mitigated by output validation but not fully preventable.

### GitHub to webhook listener

**What crosses:** Push event payloads containing repository, branch, and commit metadata. Delivered over HTTPS to a public endpoint.

**Threats:**
- **Webhook forgery** -- an attacker sends fake push events to trigger unauthorized deployments.
- **Replay attacks** -- a valid webhook payload is captured and replayed to re-deploy an older (potentially vulnerable) commit.
- **Information disclosure** -- webhook payloads contain repository metadata; the listener endpoint reveals that the deploy system exists.

**Mitigations:**
- HMAC-SHA256 signature validation using `X-Hub-Signature-256` header with constant-time comparison (`timingSafeEqual`). Webhook secret managed via sops-nix.
- The webhook listener validates the signature before processing any payload.
- Listener binds to localhost:9000 and is accessed via Caddy's `/.webhook` reverse proxy path, not as a separate public endpoint. This means webhook traffic also benefits from Caddy's TLS termination and HTTP parsing.
- Only ports 22, 80, and 443 are open in the firewall; port 9000 is not directly accessible.

**Residual risk:** No replay protection (GitHub webhooks don't include nonce or timestamp validation). An attacker with a captured valid payload could replay it, but the effect is re-deploying the same commit -- not deploying arbitrary code. Acceptable for this project.

### Webhook listener to deploy pipeline

**What crosses:** Branch name and commit SHA extracted from validated webhook payload, used to trigger deployment scripts.

**Threats:**
- **Command injection** -- branch names or commit SHAs injected into shell commands could execute arbitrary code.
- **Caddy config injection** -- branch names are written directly into Caddy config files (`branch-$UNIT_NAME.caddy`). A branch name containing Caddy syntax characters could inject arbitrary directives.
- **Unauthorized code execution** -- the deploy script pulls and runs code from the repository; a compromised repository means compromised deploys.
- **Resource exhaustion** -- rapid successive deploys could exhaust system resources.

**Mitigations:**
- HMAC signature verification constrains deploy triggers to GitHub, so branch names come from a trusted source.
- Branch names are sanitized with `tr '/' '-'` for filesystem and systemd unit names. Shell variables are double-quoted.
- Deploy script tooling is Nix-packaged (`writeShellScriptBin` with absolute paths to `git`, `bun`, `jq`). Application dependencies are resolved at deploy time from the lockfile via `bun install`.
- Services run under a dedicated `forms-lab` user with passwordless sudo limited to restarting app services and reloading Caddy. No systemd sandboxing or resource limits are configured.

**Residual risk:** No branch name validation beyond `tr '/' '-'` -- special characters in branch names could affect Caddy config or shell behavior. The risk is constrained by HMAC verification (only GitHub can trigger deploys) but a compromised repository could exploit this. Repository compromise also leads to arbitrary code execution on the server, mitigated by GitHub branch protection rules and required reviews.

### Browser to Hono application (authentication)

**What crosses:** OAuth authorization codes, encrypted session cookies, user identity information (login, display name, avatar URL).

**Threats:**
- **Session hijacking** -- stolen session cookies used to impersonate authenticated users.
- **Session cookie tampering** -- attacker modifies cookie payload to change identity.
- **CSRF** -- cross-site requests that perform state-changing actions (sign-out) using the user's session.
- **OAuth token theft** -- authorization codes intercepted during the OAuth redirect flow.
- **Privilege escalation** -- users gaining authoring access without proper GitHub repo permissions.
- **Open redirect** -- attacker crafts sign-in URL with `returnTo` pointing to external site.
- **Session fixation** -- attacker sets a known session cookie before user authenticates.

**Mitigations:**
- Session cookies use AES-GCM encryption with PBKDF2-derived key (100k iterations, SHA-256) and random 12-byte IV per session. Cookie attributes: `HttpOnly`, `SameSite=Lax`, 7-day max-age. `Secure` flag set in production.
- No access tokens or secrets stored in session -- only user profile data (login, name, avatar URL). GitHub OAuth tokens are used server-side only during callback and immediately discarded.
- OAuth state parameter carries `returnTo` path as JSON. Authorization codes are exchanged server-to-server with client secret.
- Authorization checks verify GitHub repo write/admin permission via collaborator API -- authentication alone is insufficient.
- Public routes include `/` (landing), `/:owner` (profile), `/:owner/:slug` (project overview), `/:owner/:slug/{tree,blob,commits,commit}/*` (git browsing), `/catalog/*`, `/health`, `/static/*`, and `/git/*`. Routes that mutate state (`/new`, `/:owner/:slug/settings`, `/:owner/:slug/fork`) require auth. Ownership is additionally enforced at the service layer for mutations — see "Hono application to ProjectService" above.
- Sign-out is POST-only (form submission), preventing GET-based CSRF. SameSite=Lax prevents cross-origin POST cookie sending.
- Session cookie is only created after successful OAuth callback with a fresh random IV, so pre-set cookies are simply invalid.

**Residual risk:** The `returnTo` parameter is not validated against a whitelist of internal paths -- an attacker could craft a sign-in link that redirects to an external site after authentication. Mitigation: validate that `returnTo` starts with `/` and does not contain `//` or protocol schemes. No server-side session revocation -- sessions rely on cookie expiry (7 days). No PKCE in the OAuth flow (GitHub OAuth Apps do not support PKCE; only GitHub Apps do). No rate limiting on the OAuth callback endpoint beyond GitHub's own rate limits.

### Hono application to LLM (form shaping)

**What crosses:** FormSpec and DataCollectionSpec sent to LLM for suggested edits. LLM-generated FormSpec mutations returned and validated before persistence.

**Threats:**
- **Prompt injection via form content** -- malicious field labels, group names, or page titles in the FormSpec could manipulate LLM behavior to produce unexpected output.
- **Data leakage** -- FormSpec structure and field metadata sent to external LLM API could reveal sensitive information about the form domain.
- **Response manipulation** -- compromised or malicious LLM response could inject invalid data structures or attempt to bypass validation.
- **Strategy misconfiguration** -- incorrect LLM strategy registration could route requests to unintended models or APIs.
- **Unauthorized FormSpec mutation** -- unauthenticated or non-owner users attempting to modify form structure.
- **LLM cost abuse via refinement loop** — an authenticated project owner can submit refinement feedback repeatedly, driving unbounded LLM calls. Each call costs real money and takes seconds to complete.
- **Prompt injection via `previousAttempt.feedback`** — refinement feedback is concatenated into the shaping prompt. A project owner could craft feedback that attempts to manipulate later LLM behavior. Attacker must already be authenticated and own the project, so severity is low; worth recording the surface.

**Mitigations:**
- LLM receives only FormSpec and DataCollectionSpec structure (field labels, groups, pages) -- no user-submitted PII or form filling data is sent.
- All LLM output is validated against the FormSpec Zod schema before acceptance; invalid responses are rejected entirely and not persisted.
- Form shaping routes (`GET /:owner/:slug/edit`, `POST /:owner/:slug/edit/intent`, `POST /:owner/:slug/edit/save`, `POST /:owner/:slug/edit/undo`) verify the authenticated user owns the project; only the owner can trigger LLM-assisted edits or commit a staged batch.
- `POST /:owner/:slug/edit/save` enforces optimistic concurrency via a `parentSha` guard and returns `409` on stale parent — two tabs cannot silently clobber each other.
- Every FormSpec change is committed to git with the user's intent as the commit message and the authenticated user as the author, providing an immutable audit trail.
- LLM strategies are registered at server startup via the `FormShapingStrategyRegistry`; strategies are not user-configurable at runtime.
- Communication with external LLM APIs uses HTTPS; credentials managed via environment variables and sops-nix.

**Residual risk:** Prompt injection via form field labels is partially mitigated by output validation but cannot be fully prevented -- a carefully crafted label could influence the LLM to produce valid but unexpected suggestions. The risk is limited because the LLM cannot produce invalid FormSpec output (schema validation rejects it) and cannot directly modify the filesystem (mutations are applied by authenticated application code). FormSpec metadata sent to the LLM could reveal domain-specific information about government forms, acceptable per the LLM provider's data handling policies but a consideration for production deployments with sensitive form domains.

## Non-data-flow threats

### Dependency supply chain

**Threat:** Compromised npm packages introduce malicious code.

**Mitigations:** Lock file (`bun.lock`) pins exact versions. Dependabot or manual review for updates. Small dependency footprint (Hono, markdown-it, few others).

**Residual risk:** Transitive dependencies are not audited individually. Acceptable given the small dependency tree.

### Infrastructure access

**Threat:** Unauthorized SSH access to the EC2 instance.

**Mitigations:** SSH key-based authentication only (no password auth, root login prohibited except by key). NixOS declarative configuration means the server state is reproducible and auditable.

**Residual risk:** The AWS security group allows SSH from all IPs (`0.0.0.0/0`), so the SSH port is exposed to the internet. Key-based auth prevents brute-force password attacks, but a compromised SSH key grants full server access from any network. Key rotation and access review are manual processes. Restricting the security group to known IPs would reduce exposure.

### Secrets management

**Threat:** API keys, webhook secrets, or OAuth credentials exposed in code, logs, or error messages.

**Mitigations:** Secrets managed via sops-nix (encrypted in repo, decrypted only on host). Environment variables used at runtime, never hardcoded. Error messages and logs must not include secret values (aligned with Flexion security-compliance practices).

**Residual risk:** Secrets are decrypted on the host filesystem. A server compromise exposes all secrets. Acceptable for single-instance deployment.

## Risk summary

| Threat | Boundary | Likelihood | Impact | Mitigation | Status |
|--------|----------|-----------|--------|------------|--------|
| Self-signed TLS | Browser-Caddy | Certain | Medium | TLS encryption in transit, but no CA chain | Accepted |
| DDoS against public endpoint | Browser-Caddy | Medium | High | None | Accepted |
| Path traversal via user input | Hono-Filesystem | Low | High | Slug generation, path validation | Mitigated |
| API key exposure in logs | Hono-Claude API | Low | High | Env vars, sops-nix | Mitigated |
| PDF data sent to external API | Hono-Claude API | Certain | Medium | Anthropic data policies, HTTPS | Accepted |
| Prompt injection via PDF content | Hono-Claude API | Medium | Medium | Output validation, type checking | Partially mitigated |
| Webhook forgery | GitHub-Webhook | Low | High | HMAC-SHA256 validation | Mitigated |
| Webhook replay | GitHub-Webhook | Low | Low | Re-deploys same commit | Accepted |
| Caddy config injection via branch name | Webhook-Deploy | Low | High | HMAC verification, `tr` sanitization | Partially mitigated |
| Command injection in deploy | Webhook-Deploy | Low | Critical | HMAC verification, quoted variables, Nix packaging | Partially mitigated |
| Repository compromise | Webhook-Deploy | Low | Critical | Branch protection, required reviews | Partially mitigated |
| Session hijacking | Browser-Hono Auth | Medium | High | AES-GCM encrypted cookies, HttpOnly, SameSite=Lax | Mitigated |
| Open redirect via returnTo | Browser-Hono Auth | Low | Medium | None -- returnTo not validated | Unmitigated |
| Prompt injection via form labels | Hono-LLM (form shaping) | Medium | Medium | Output validation, Zod schema enforcement | Partially mitigated |
| FormSpec metadata leakage | Hono-LLM (form shaping) | Certain | Low | HTTPS, LLM provider data policies | Accepted |
| Unauthorized FormSpec mutation | Hono-LLM (form shaping) | Low | High | requireAuth + requireOwner middleware | Mitigated |
| LLM strategy misconfiguration | Hono-LLM (form shaping) | Low | Medium | Server startup registration, not user-configurable | Mitigated |
| Refinement-loop cost abuse | Hono-LLM (form shaping) | Low | Medium | Authentication + ownership check; no rate limit yet | Partially mitigated |
| Refinement-feedback prompt injection | Hono-LLM (form shaping) | Low | Low | Output validation, Zod schema enforcement | Partially mitigated |
| Dependency supply chain | N/A | Low | High | Lock file, small dependency tree | Partially mitigated |
| SSH open to all IPs | Infrastructure | Medium | Critical | Key-based auth only, no password | Partially mitigated |
| Secrets exposure on host | Infrastructure | Low | Critical | sops-nix encryption | Partially mitigated |
| Path traversal via slug | Hono-Form project repos | Low | High | Server-side slug generation, argv-based git invocation | Mitigated |
| Orphaned project rows on git failure | Hono-Form project repos | Low | Low | Atomic createProject with rollback | Mitigated |
| Server crash during project creation | Hono-Form project repos | Low | Low | None — may require manual cleanup | Accepted |
| PII disclosure via public git clone | Browser-Git HTTP | Medium | High | Platform policy: projects are public by design | Accepted |
| Slug enumeration via directory listing | Browser-Git HTTP | Certain | Low | Intentional public browsing | Accepted |
| Non-owner bypass of mutations | Hono-ProjectService | Low | High | Service-layer permission checks, 59 unit + integration tests | Mitigated |
| Direct store access bypassing service | Hono-ProjectService | Low | High | Convention only — no architectural test | Partially mitigated |

## Change log

| Date | Story/PR | Change |
|------|----------|--------|
| 2026-04-09 | #14 | Initial threat model covering Slice 0 architecture |
| 2026-04-09 | #14 | Corrected mitigations to match actual infrastructure after deploy PR #12 merge |
| 2026-04-09 | #11 / Story 2 | Updated authentication boundary from planned to implemented; added open redirect risk |
| 2026-04-14 | #50 / Story 3 | Replaced filesystem boundary with bare git repo boundary (form project storage moved to managed bare repos). Added new boundaries for read-only git HTTP serving and ProjectService permission enforcement. Updated auth boundary for user-scoped routes. |
| 2026-04-14 | Story 4 | Added LLM form shaping trust boundary; prompt injection, unauthorized mutation, and data leakage threats |
| 2026-04-15 | Story 4 v2 | Replaced full-spec rewrite with command-based shaping. LLM uses AI SDK tool-use mode to emit validated domain commands. Each command is individually executable and auditable. Command schemas replace free-form JSON validation as the primary integrity boundary for LLM output. |
| 2026-04-17 | Story 4 review + PR #54 | Updated shaping route references for unified `/edit/save` (single commit endpoint, `parentSha` optimistic-concurrency guard). Added refinement-loop abuse and refinement-feedback prompt-injection threats surfaced in story-4 code review. |

## Sources

- [System overview](system-overview.md)
- [Data model](data-model.md)
- [Deployment architecture](deployment.md)
- [Caddy reverse proxy decision](../decisions/infrastructure/caddy-reverse-proxy.md)
- [GitHub webhook deploys decision](../decisions/infrastructure/github-webhook-deploys.md)
- [Nix-built processes decision](../decisions/infrastructure/nix-built-processes.md)
