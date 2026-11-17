pyenv: cannot rehash: /Users/gregkerr/.pyenv/shims isn't writable
# WAO Platform team room

The team room is a separate release target for the WAO Platform repository. It uses an advanced-mode Cloudflare Pages Function and the `TEAM_DB` D1 binding. The existing Express and SQLite platform has its own build and deployment.

## Build and configure

Run `npm ci` and `npm run build:team` from the WAO Platform checkout using Node.js 22. The frontend is built to `dist/team`; the bundled Function is `dist/team-worker.mjs`. Apply `team/schema.sql` to an isolated D1 database. Bind it as `TEAM_DB`. In a Direct Upload deployment, upload the frontend assets and supply the worker bundle as `_worker.js`.

Bootstrap one owner row with an individual, randomly generated 32-byte lowercase hex access key. Store its SHA-256 hex digest in `team_members.key_hash` and deliver the original key privately. A member's key authenticates them, and the server issues a separate expiring session cookie. The owner can issue and revoke each teammate's access from Team access.

The conversation is imported into `team_archive` and read by authenticated members. Keep source conversation exports and access keys outside the frontend build output and version control.

## Engagement and new WAOs

- The focus site identifies the organization or perspective a mission is for. A member from another site may claim open work, and a member other than the proposer or contributor reviews the submitted revision.
- A request for changes opens the next submission. The contributor can submit revised evidence, and the reviewer must decide on the current revision. Acceptance grants one proposer credit, three contributor credits, and two reviewer credits.
- An accepted new-WAO proposal appears in the directory as a team profile with its charter, evidence, review, and downloadable blueprint. The profile can be a focus site for future missions or a home site for new members.
- Credits are internal recognition. A team WAO profile and blueprint provide a handoff for implementation or hosting. External sites remain linked at their existing deployment level.

## Public participation

Apply `team/participation.sql` after the base schema. The public connection page is `/#/connect`. Agents can add `/mcp` as a remote Streamable HTTP MCP server or read `/wao-cli.json` for direct HTTP endpoints. The public directory covers built-in sites and explicitly published WAO listings. Descriptions link to a website where one is available and route suggestions through the common intake.

Anyone can submit a bounded contribution or a new-WAO idea without a team account. Anonymous intake is rate-limited and returns a receipt that exposes only the status. Only the owner can promote a contribution into a private mission or decline it. Promoted work follows the existing independent-review workflow. The public receipt reflects the mission status, and the submission keeps its original byline in the private mission.

A new WAO’s profile is team-only by default. From the accepted profile the owner can publish or remove a public listing with a description, contribution opportunity, and optional HTTPS website. The charter, evidence, review, and private conversation stay within the team room.
