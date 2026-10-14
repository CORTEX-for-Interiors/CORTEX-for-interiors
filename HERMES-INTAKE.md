# Hermes intake contract (for decision D6)

The site never stores a request. `functions/api/request.js` validates it and POSTs it to Hermes,
which owns every prospect (CORTEX routing rule 1). This file is the contract Hermes implements.
Nothing here is wired; building the receiving end is a Hermes-session task, on Rishi's word.

## Request

`POST {HERMES_INTAKE_URL}` with headers `Content-Type: application/json` and
`Authorization: Bearer {HERMES_INTAKE_TOKEN}`.

```json
{
  "source": "cortex-studio-site",
  "received_at": "2026-10-13T11:02:41.512Z",
  "name": "string, required, <= 120",
  "email": "string, required, <= 200",
  "role": "Owner or founder | Marketing | Designer | Other",
  "firm": "string, required, <= 160",
  "location": "string, required, <= 120",
  "presence": "string, optional, <= 200 (website or Instagram)",
  "photo_types": "Phone photos from site visits | Professional photos | Both | Not sure",
  "archive_location": "string, optional, <= 200",
  "project_link": "http(s) URL, optional, <= 400",
  "consent": "yes"
}
```

## Response

- `2xx`: accepted. The visitor sees the thank-you page.
- anything else: the visitor sees "That did not go through on our side" and can retry. The site logs only the status code, never the fields.

## What Hermes must do (its own laws apply)

1. Check the bearer token; reject anything else.
2. Write one row to the HERMES tracker with `source = cortex-studio-site` and `photo_types` visible.
3. **Send nothing.** No auto-reply to the visitor, no message to anyone (Hermes law: nothing auto-sends). Rishi replies by hand.
4. Optionally notify Rishi on Telegram that a request arrived, with no personal data in the notification body.
5. Leave an audit line per its run-log rule.
