# /deploy — famcal.ai Deploy Agent

You are acting as a DevOps agent for famcal.ai. When the user invokes `/deploy`, orchestrate the full deployment pipeline described below. Run each step in sequence. **Stop and ask the user before proceeding past any checkpoint marked ⏸.**

---

## Pre-deploy context

Before starting, gather context silently:

```bash
# What's shipping?
git log heroku/main..HEAD --oneline

# Is the working tree clean?
git status --short
```

If `git status` shows modified or untracked files, **⏸ warn the user** and ask whether to continue or stash/commit first.

---

## Step 1 — What's shipping

Show the user the list of commits that will be deployed (`git log heroku/main..HEAD --oneline`).

If there are 0 commits ahead of `heroku/main`, tell the user there is nothing new to deploy and stop.

---

## Step 2 — Check for pending migrations

```bash
heroku run "cd server && node node_modules/.bin/typeorm migration:show -d dist/data-source.js" --app simple-family-calendar-8282627220c3
```

Parse the output. If any migrations show as `[X]` (pending):
- List them for the user
- **⏸ Ask: "There are pending DB migrations. Run them post-deploy? (yes/no)"**
- Store the answer as `RUN_MIGRATIONS` for Step 4

If the command fails (e.g. build not yet pushed), note it and continue — migrations can be checked again after deploy.

---

## Step 3 — Deploy

Run the deploy script, which handles push + dyno wait + health check:

```bash
bash scripts/deploy.sh --skip-checks --no-smoke
```

(`--skip-checks` because we're running post-verify; `--no-smoke` because we handle that in Step 6.)

Stream the output to the user. If this step fails, **stop and report the error**. Do not proceed to migrations or smoke tests.

---

## Step 4 — Run migrations (conditional)

Only if `RUN_MIGRATIONS=yes` from Step 2:

```bash
heroku run "cd server && node node_modules/.bin/typeorm migration:run -d dist/data-source.js" --app simple-family-calendar-8282627220c3
```

Show the output. If migrations fail, alert the user immediately — this may require a rollback.

---

## Step 5 — Health check

```bash
curl -s https://famcal.ai/api/health
```

Expect `{"status":"ok"}`. If not, report the failure and ask the user whether to continue to smoke tests.

---

## Step 6 — Smoke tests

```bash
npm run test:smoke
```

This runs 5 lightweight checks against production:
1. Health endpoint returns 200
2. Login page loads
3. Login with smoke credentials succeeds
4. Calendar view renders
5. NLP input field is present

If smoke tests fail, report which tests failed and their error messages.

---

## Step 7 — Summary report

Print a concise deployment summary:

```
━━ Deploy Summary ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Commit:      <git SHA>
App:         simple-family-calendar-8282627220c3
URL:         https://famcal.ai

Steps:
  [✓] Pre-deploy checks
  [✓] git push heroku main
  [✓] Dyno up
  [✓] Migrations run (or skipped)
  [✓] Health check
  [✓] Smoke tests (5/5 passed)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Replace `[✓]` with `[✗]` for any failed step.

---

## Notes

- **Never force-push** to heroku/main or any remote.
- If any step after "Deploy" fails, do not attempt a rollback automatically — alert the user and let them decide.
- The smoke test cleanup (`teardownSmokeUsers`) runs automatically in the Jest `afterAll` hook and removes smoke accounts from the DB. You don't need to run it separately.
- Heroku app name: `simple-family-calendar-8282627220c3` (from CORS config in `server/src/app.ts`).
- Migration data-source path: `server/dist/data-source.js` (compiled from `server/src/data-source.ts`).
