Create a new user story and optionally begin implementation.

## Arguments

$ARGUMENTS — a natural language description of the desired outcome. Can be a brief phrase or a detailed description.

## Instructions

1. **Clarify the story** if the description is vague. Ask one clarifying question at most. If the intent is clear, proceed.

2. **Identify the persona.** Determine which persona this story is for based on the catalog:
   - Maya (form creator) -- authoring, uploading, shaping forms
   - Carlos (form filler) -- completing, submitting forms
   - Developer -- infrastructure, tooling, evaluation, security
   If unclear, ask.

3. **Draft the GitHub issue** with this structure:

   ```
   ## User Story

   As a **[persona]**, in order to **[goal/purpose]**, I want **[desired capability]**

   ## Preconditions

   - [What must be true before this story can start]

   ## Acceptance Criteria

   - [ ] [Outcome-oriented, testable criterion]
   - [ ] [Each criterion describes a user-observable result]

   ## Success Metrics

   - [Measurable indicators of success]

   ## Notes

   - [Implementation hints, constraints, or open questions]

   ## Definition of Done

   - [ ] Acceptance criteria met
   - [ ] Threat model updated if security-relevant
   - [ ] Tests pass
   - [ ] Type checking passes
   - [ ] CI pipeline green
   - [ ] Deployed and demoable
   ```

4. **Show the draft** to the user for approval before creating. Make any requested changes.

5. **Create the GitHub issue:**

   ```bash
   gh issue create --title "<story title>" --label "user-story" --milestone "Final Project" --body "<body>"
   ```

6. **Create the story notes directory:**

   ```bash
   mkdir -p notes/story-<N>-<short-name>/
   ```

   Where `<N>` is the issue number and `<short-name>` is a kebab-case slug derived from the title.

7. **Ask the user:** "Story #N created. Start implementation now, or just file it?"

8. If starting now, tell the user to run `/start-story <N>` (do not invoke it directly -- the user should start a fresh session or continue explicitly).
