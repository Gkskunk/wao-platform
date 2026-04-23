# Envelope binding

Payload schemas do not redefine the envelope. The envelope references payloads via
`$ref` keyed by `to.capability` + `kind`.

## Rule
- Your new schema describes ONLY the `payload` object.
- Register the schema in the envelope's capability map (see `/schemas/envelope.schema.json`
  and `/protocols/capability-map.md`).
- The envelope supplies: `id`, `ts`, `from`, `to`, `kind`, `corrId`, `sig`.

## Example payload shape
```json
{
  "$id": "https://wao.dev/schemas/web-fetch/v1.json",
  "title": "Web Fetch Task Payload",
  "type": "object",
  "additionalProperties": false,
  "required": ["url"],
  "properties": {
    "url": { "type": "string", "format": "uri" },
    "method": { "type": "string", "enum": ["GET", "POST"], "default": "GET" },
    "timeoutMs": { "type": "integer", "minimum": 100, "maximum": 60000 }
  }
}
```
