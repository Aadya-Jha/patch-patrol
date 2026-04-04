# Timeline — 8 Weeks

Roles:
A (sans) = AI + Full Stack
B (apoo) = Cybersecurity + Full Stack
C (aadya) = Full Stack

### Notes & Acceptance Criteria

- Weekly: create issues for each major task, assign primary owner + two reviewers.
- Demo checkpoints: Week 4 (AI prototype) and Week 8 (MVP demo).
- Balance: A focuses AI work and contributes full-stack; B leads security/CVE/automation and contributes full-stack; C drives full-stack implementation and dashboards.

## Week 1 — Project setup & scoping (Owners: C lead, B support, A support)

- Repo, branching strategy, `README`, environment notes, CI skeleton.
- High-level architecture, wireframes, token/security spec.
- Deliverable: working repo, issue tracker, basic CI pipeline.

## Week 2 — GitHub access, webhooks & dependency parser (Owners: C lead, B security, A design)

- Webhook receiver, secure token storage, fetch dependency files.
- Basic parser for `package.json`, `requirements.txt`, `pom.xml` and DB model.
- Deliverable: API endpoints + parsed dependency list persisted.

## Week 3 — CVE sources & vulnerability matching (Owners: B lead, C implement, A consult)

- Integrate NVD/Snyk (or vendor feeds), implement matching rules and flagging.
- Deliverable: vulnerability lookup service with sample matches.

## Week 4 — AI risk prototype & context pipeline (Owners: A lead, C integrate, B review)

- Embeddings design, vector DB selection, prompt templates, initial LLM calls.
- Deliverable: AI prototype returning risk explanations for sample dependencies.

## Week 5 — Dashboard & visualization (Owners: C lead, A implement AI displays, B validate security UX)

- Repo scorecards, version-gap charts, dependency graph UI, pages for AI explanations.
- Deliverable: interactive dashboard showing scan results + AI outputs.

## Week 6 — Automation & notifications (Owners: B lead for security flows, C implement integrations, A ensure AI content)

- GitHub issue/PR automation, Slack/Teams notifications, patch-simulation prototype.
- Deliverable: auto-issue creation and notification flow end-to-end for sample repo.

## Week 7 — Testing, transitive analysis & hardening (Owners: B lead, C test infra, A validate heuristics)

- Unit & integration tests, transitive dependency analysis completion, secrets & rate-limit hardening.
- Deliverable: test suite passing and documented security checklist.

## Week 8 — Polish, docs, deploy MVP & demo (Owners: All)

- Final docs, onboarding, production deploy, demo & retrospective.
- Deliverable: deployed MVP, demo script, known limitations and next-phase backlog.
