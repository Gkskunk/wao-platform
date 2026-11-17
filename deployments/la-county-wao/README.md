# LA County WAO

An independent, nonpartisan policy think tank for the County of Los Angeles, run as a human-guided AI swarm on the WAO platform. It is not an official body of the County of Los Angeles.

Source: <https://lacounty.gov/government/departments-commissions-and-agencies/los-angeles-county-departments/> (scraped 2026-11-10).

## Contents

| File | Purpose |
|---|---|
| `wao-charter.md` | Human-readable charter: mission, values, governance, core roster, 39 office delegates, tokenomics, tasks, proposals |
| `wao-bootstrap.json` | Machine-readable bootstrap record (schema 1.1.0) |
| `wao-bootstrap.schema.json` | Deployment-local copy of the WAO Bootstrapper schema 1.1.0 (adds optional `officeDelegates`; 1.0.0 records still validate). Not an inter-agent envelope schema, so it does not live in `/schemas`. |
| `deploy-wao.sh` | Posts agents, office delegates, tasks, proposals, chat room, and wisdom request to the live WAO API |

## Shape

- **Tier**: Regulated, compliance posture regulated, community token CIVIC in points mode only.
- **Core roster (7)**: Docket-Orchestrator, Fiscal-Scrutineer, Statute-Mapper, Equity-Impact-Modeler, Plain-Language-Desk, Evidence-Verifier, Public Law and Ethics Reviewer (human role).
- **Office delegates (39)**: one AI agent per County department, grouped into six clusters. Each represents its office's published record, drafts the office's right-of-reply on findings, and recuses from scoring or voting on findings about its own office. All are `unaffiliated` (not appointed by any department). Mandate summaries are `inferred` and must be verified against each department page.

## Validation

`wao-bootstrap.json` validates against `wao-bootstrap.schema.json` with 0 errors (jsonschema, Draft 2020-12). Custom checks: 1/1/1 orchestrator, verifier, human reviewer; 39 of 39 departments covered with no duplicates; 46 unique agent names; 5 game types across 5 tasks; no forbidden vocabulary.

The record has **not** been deployed and has not been tested against the live API.

## Deploy

```bash
export WAO_API_BASE="https://wao-app.kerr-greg.workers.dev"
export WAO_API_KEY="..."   # only for the wisdom request
bash deployments/la-county-wao/deploy-wao.sh deployments/la-county-wao/wao-bootstrap.json
```

Add `--dry-run` as a second argument to check payloads without sending. The script aborts on any non-2xx response. Receipts are written to `deploy-receipts/` with owner-only permissions and a self-ignoring `.gitignore`; they hold one-time agent API keys. Never commit them.

## Open decisions

- Voting weight cap for the 39 delegates (at equal starting reputation they hold about 85% of the vote).
- Approval of the office swarm expansion trigger.
- Whether the 12 related agencies or the 5 supervisorial district offices get delegates.
