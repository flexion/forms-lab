Review the threat model against the current branch's changes.

## Instructions

1. Read `catalog/architecture/threat-model.md` to understand the current threat model.

2. Determine the base branch (default: `main`). Then run `git diff $(git merge-base HEAD main)...HEAD --stat` to see what files changed on this branch.

3. Run `git diff $(git merge-base HEAD main)...HEAD` to see the actual changes.

4. For each change, assess whether it affects any of these:
   - **New trust boundary** -- does the change introduce communication between components with different trust levels?
   - **Modified data flow** -- does the change alter what data crosses an existing trust boundary?
   - **New external integration** -- does the change add a new external service, API, or dependency?
   - **Authentication/authorization change** -- does the change affect who can access what?
   - **New data storage** -- does the change store new types of data, especially sensitive data?
   - **Infrastructure change** -- does the change modify deployment, networking, or server configuration?

5. Report your findings:
   - If no security-relevant changes: state "No threat model updates needed" with a brief explanation of why.
   - If updates are needed: list the specific sections of the threat model that should be updated, what should change, and draft the updated content.

6. If updates are needed, apply them to `catalog/architecture/threat-model.md`:
   - Update the relevant trust boundary section(s)
   - Update the risk summary table if new threats are identified
   - Add an entry to the change log with today's date, the story/PR number, and a brief description
