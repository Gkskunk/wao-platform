# Schema conventions (WAO)

## Naming
- Schema dir: `schemas/<name>/` where `<name>` is kebab-case, singular.
- Schema file: `<version>.schema.json` (e.g., `v1.schema.json`).
- `$id`: `https://wao.dev/schemas/<name>/<version>.json`.
- `title`: Title Case, e.g., "Web Fetch Task".

## Structure
- Always include: `$schema`, `$id`, `title`, `description`, `type: object`,
  `properties`, `required`, `additionalProperties: false`.
- Prefer enums for finite sets. Prefer `format: uuid` for ids, `format: date-time` for timestamps.
- Numeric fields: include `minimum`/`maximum` when bounds exist. Strings: `minLength`/`maxLength`
  when sensible.

## Kinds
- `task` — something to do. Must include `corrId` at envelope level and a `deadline` if relevant.
- `result` — outcome of a task. Must echo `corrId`. Must include `status: "ok" | "error"`.
- `event` — observation, no response expected.
- `error` — structured failure with `code` (enum) and `message`.

## Versioning
- Additive, backward-compatible changes: stay on current version.
- Any change to `required`, type, or enum set: bump to next `vN+1`; keep the old file.
- Protocol doc must reference the latest version.

## Fixtures
- At least one **valid** fixture and one **invalid** fixture per schema.
- Invalid fixtures must fail for a single, documented reason (note it in the filename).
