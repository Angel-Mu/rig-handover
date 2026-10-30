---
name: plan-to-issues
description: Split this repo's plan.md into GitHub issues with gh, one per unit of work, after a human has reviewed the split. Use when a plan is ready and has no issues yet.
---

# plan-to-issues

Turns `plan.md` into GitHub issues that workers can pick up cold. Easiest with `gh`, authenticated,
in a shell this agent can run.

## Steps

1. Read `plan.md`, `AGENTS.md` and `docs/adr/`.
2. Draft the split as a table: title · plan section · scope · done when · blocked by.
   One issue per unit of work.
3. **Stop and show the table to the human.** Publish nothing until they approve it.
4. Ask the human what every issue here must carry (fields, labels, wording), unless it is
   already written down in this session or in the repo. In this repo it is: see
   [What every issue carries](#what-every-issue-carries).
5. Create each issue in dependency order, so blocked-by can cite real numbers:

   ```sh
   gh issue create --title "<title>" --body-file <tmp.md>
   ```

6. Record every issue URL from gh's output (not from memory) and reply with the list.

Closing one, with the closing comment from AGENTS.md:

```sh
gh issue close <n> -c "<closing comment>"
```

## What every issue carries

Approved by the human at the morning-digest split (2026-10-30). The reviewer sorts by the first
line and the label, so both are exact.

```md
Source: plan.md § <n>

## Scope
<the plan's words for this unit, plus any reading of an unclear point the human approved>

## Done when
<the plan's "Done when", checkable>

## Blocked by
<#n, … or —; "(needs #n merged for …)" when it can start earlier than it can finish>
```

- Label: `plan:<plan>` from the plan's frontmatter (`gh label create` it once if missing).
- Title: short, names the unit, no section number.
- A step that waits on someone outside the repo (a reviewer, a host, a person) gets its own
  issue. Its "Done when" is their act, not ours: sending a link is not a review. Leave it open
  with a comment naming what it waits on, and block the next step (clean-up) on it.

## No `gh`

Steps 1–4 hold either way. GitHub reachable another way (a connector, the REST API, the web UI):
the same issues, made that way. GitHub issues out of reach altogether: write them as files in
`docs/issues/`, format in ADR 0004, then commit and push.

## Don'ts

- Don't paste the whole plan into one issue, and don't keep issues only in chat.
- Don't invent sections the plan doesn't have. If the plan is unclear, ask.
