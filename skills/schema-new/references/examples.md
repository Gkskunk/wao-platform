# Worked examples

## 1) Task — web-fetch
- kind: task, owner: nemoclaw → openclaw
- payload: `url` (required), `method` (enum), `timeoutMs` (bounded int)

## 2) Result — web-fetch-result
- kind: result, owner: openclaw → nemoclaw
- payload: `status` (enum ok|error), `httpStatus`, `bodyRef` (object store key),
  `error` (object, optional)

## 3) Event — agent-registered
- kind: event, owner: hermes → *
- payload: `agent` (string), `capabilities` (array of string), `instanceId` (uuid)
