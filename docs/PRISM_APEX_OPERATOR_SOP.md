# Prism Apex Operator SOP

This document defines the **mechanical, repeatable process** for running the Prism Apex delivery using:
- ChatGPT (Prism-Apex Code Expert), and
- Codex Terminal (the only thing that actually edits the repo).

The goal is simple:
- Any future operator can open this file, follow the checklist, and safely continue work without guessing.


## 1. Roles in this workflow

- **Operator (you)**  
  - Owns when and what to build.
  - Starts new ChatGPT chats and Codex sessions.
  - Decides when a step is “done” and updates STATE.

- **ChatGPT – Prism-Apex Code Expert**  
  - Never edits repo directly.
  - Designs architecture, strategies, risk, and UI.
  - Generates *Codex Terminal prompts* and validates OUTCOME REPORTs.
  - Refers to:
    - `docs/PRISM_APEX_DELIVERY_PLAN.md`
    - `docs/PRISM_APEX_STATE.md`

- **Codex Terminal**  
  - Executes exactly one step at a time.
  - Edits files, runs tests, makes commits when instructed.
  - Always prints an OUTCOME REPORT that the operator pastes back into ChatGPT.


## 2. Files that control the process

- `docs/PRISM_APEX_OPERATOR_SOP.md`  
  - This file. How to operate the system.

- `docs/PRISM_APEX_DELIVERY_PLAN.md`  
  - High-level phases and steps of the Prism Apex rebuild.
  - Architecture, strategy engine, risk, metrics, UI, testing, observability.

- `docs/PRISM_APEX_STATE.md`  
  - **Single source of truth for where we are right now.**
  - ChatGPT does not “remember” between chats; this file tells it:
    - current phase,
    - current step,
    - next Codex task,
    - last OUTCOME REPORT date.


## 3. Starting a new ChatGPT session (Prism Apex)

Whenever you open a NEW ChatGPT chat to work on Prism Apex:

1. **Paste the session kickoff text:**

   ```text
   Session Kickoff: Prism-Apex Code Expert.

   Follow the Prism-Apex SOP exactly.
   No deviations.
   All actions run through Codex Terminal.
   You will not edit the repo directly; you will only generate Codex Terminal prompts and reason about OUTCOME REPORTS I paste back.

   I will now paste the current STATE block from docs/PRISM_APEX_STATE.md so you know exactly where we are in the delivery plan.
   ```

2. Open `docs/PRISM_APEX_STATE.md` in your editor and copy its entire contents.
3. Paste that as your next message in ChatGPT.
4. (Optional but helpful) Open `docs/PRISM_APEX_DELIVERY_PLAN.md`, copy the current Phase section, and paste it too.
5. Ask ChatGPT:

   > Given this STATE and delivery plan, what is the next safe Codex Terminal step? Generate the Codex prompt.

6. ChatGPT will:
   - Rehydrate the design from the STATE + plan,
   - Give you exactly one Codex step (WRITE PLAN + SCRIPT + EXPECTED OUTPUTS).

7. Copy that Codex prompt into Codex Terminal and run it.


## 4. Starting a new Codex Terminal session

Every time you start a new Codex Terminal session:

1. From repo root, run the preflight script:

   ```bash
   echo "Preflight: checking Docker..."
   if ! docker info >/dev/null 2>&1; then echo "❌ Docker not running"; exit 1; fi
   echo "✅ Docker OK"

   echo "Preflight: checking git repository..."
   if ! git rev-parse --show-toplevel >/dev/null 2>&1; then echo "❌ Not a git repo"; exit 1; fi
   echo "✅ Git repo OK"

   echo "Preflight: checking clean working tree..."
   if [ -n "$(git status --porcelain)" ]; then echo "❌ Working tree not clean"; git status --short; exit 1; fi
   echo "✅ Working tree clean"

   echo "Preflight: verifying Test branch..."
   if ! git show-ref --verify --quiet refs/heads/Test && ! git show-ref --verify --quiet refs/remotes/origin/Test; then echo "❌ Branch 'Test' missing"; exit 1; fi
   echo "✅ Test branch found"

   echo "✅ READY"
   ```

2. Paste the ChatGPT-generated Codex prompt for the current step into Codex.
3. Let Codex run. It will:
   - Edit files (if APPROVE:WRITE=true),
   - Run tests (if APPROVE:RUN=true),
   - Possibly commit/PR (if APPROVE:PR=true),
   - Print an OUTCOME REPORT.
4. Copy the OUTCOME REPORT back into ChatGPT and ask:

   > Here is the OUTCOME REPORT. Did this step achieve what we planned, and what is next?


## 5. Updating the STATE file after a step

After ChatGPT confirms a step is complete:

1. Open `docs/PRISM_APEX_STATE.md`.
2. Update:
   - Current phase
   - Current step
   - Next Codex task
   - Last OUTCOME REPORT date
3. Save the file.
4. Include it in your next commit (either in the same Codex step or the next doc-only step).
5. On the next day/week/month, you will paste this updated STATE file into a new ChatGPT chat to resume exactly where you left off.


## 6. Recovery checklist (if you’ve been away)

1. Pull latest repo.
2. Open `docs/PRISM_APEX_STATE.md` and read it.
3. Open a new ChatGPT chat and follow “Starting a new ChatGPT session”.
4. Open Codex, run preflight, paste the new Codex prompt from ChatGPT.
5. Repeat.

## Protected implementation areas

The following implementation areas are treated as protected, similar to guardrails and infra/CI/CD:

- Strategy engine modules (e.g., `apps/api/src/strategy/*`)
- Risk engine modules (e.g., `apps/api/src/risk/*`)

Changes to these areas must be explicitly called out in the delivery plan/state and accompanied by updated design docs and tests.

