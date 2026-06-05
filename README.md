# PGNM Lead Intake API

Express API that receives Facebook Lead Ads data forwarded from **Zapier** and prepares it for downstream buyer delivery.

## Flow

```text
Facebook Instant Form
        ↓
Zapier (Facebook Lead Ads → New Lead)
        ↓
POST https://your-domain.com/api/leads
        ↓
This server (normalize, log, process)
        ↓
VICIdial buyer (add_lead)
```

## Quick start

```bash
cp .env.example .env
npm install
npm start
```

Health check:

```text
GET http://localhost:3000/health
```

Lead intake endpoint:

```text
POST http://localhost:3000/api/leads?channel=fb
```

## Channel tracking (`?channel=`)

Hardcode a different URL per Zap (Page / source). The `channel` query param is stored on every lead and passed through to buyer forwarding.

| Source | Zapier webhook URL |
|--------|-------------------|
| Facebook | `https://your-domain.com/api/leads?channel=fb` |
| Google | `https://your-domain.com/api/leads?channel=gg` |
| Other | `https://your-domain.com/api/leads?channel=your_code` |

Rules: lowercase letters, numbers, `_` and `-` only (max 32 chars). Invalid values return `400`.

The normalized lead object includes `channel` alongside `form_id`, `page_id`, etc.

## Zapier setup

1. **Trigger:** Facebook Lead Ads → New Lead
2. **Page:** pick your Page
3. **Form:** All Forms (recommended)
4. **Action:** Webhooks by Zapier → POST
5. **URL:** `https://your-domain.com/api/leads?channel=fb` (change per Zap/source)
6. **Payload type:** JSON
7. **Data:** map fields, for example:

| JSON key | Zapier field |
|----------|--------------|
| `lead_id` | Lead ID (if available) |
| `first_name` | First Name (if separate) |
| `last_name` | Last Name (if separate) |
| `full_name` | Full Name (split into first/last if names not separate) |
| `phone_number` | Phone Number |
| `page_id` | Page ID |
| `page_name` | Page Name |
| `form_id` | Form ID |
| `form_name` | Form Name |
| `ad_id` | Ad ID |
| `ad_name` | Ad Name |
| `created_time` | Created Time |
| `source` | typed value `zapier` |

8. **Auth (optional):** if `INBOUND_API_KEY` is set in `.env`, add header:
   - `Authorization: Bearer YOUR_KEY`, or
   - `X-API-Key: YOUR_KEY`

Duplicate one Zap per Facebook Page, all posting to the same `/api/leads` URL.

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Server port (default `3000`) |
| `INBOUND_API_KEY` | No | Protect `/api/leads` with API key auth |
| `BUYER_ENABLED` | No | Set `false` to disable forwarding (default `true`) |
| `BUYER_API_URL` | No | VICIdial endpoint (has sensible default) |
| `BUYER_API_USER` | Yes* | VICIdial API user (`user` param) |
| `BUYER_API_PASS` | Yes* | VICIdial API password (`pass` param) |
| `BUYER_CAMPAIGN_ID` | No | Campaign (default `MealsINB`) |
| `BUYER_SOURCE` | No | Lead source tag (default `KR`) |

\* Required for buyer forwarding to run.

## Buyer forwarding (VICIdial)

When `BUYER_API_USER` and `BUYER_API_PASS` are set, each lead is POSTed as **form-urlencoded** to VICIdial `add_lead`:

| Field | Value |
|-------|-------|
| `function` | `add_lead` |
| `user` / `pass` | from `.env` |
| `source` | `BUYER_SOURCE` (default `KR`) |
| `campaign_id` | `BUYER_CAMPAIGN_ID` |
| `list_id` | from `?channel=` — `fb`→`222`, `gg`→`223` |
| `phone_number` | 10-digit US (normalized from FB) |
| `first_name` / `last_name` | from FB name (split if needed) |
| `add_to_hopper`, `dnc_check`, etc. | fixed dialer flags |

No `state`, `postal_code`, or `email` sent.

- Invalid/missing lead data → logged, **not** sent to buyer.
- Unmapped `channel` → logged, not sent.
- VICIdial errors → logged in PM2 (`BUYER_FORWARD_FAILED`).

## API response

Success:

```json
{
  "accepted": true,
  "duplicate": false,
  "channel": "fb",
  "lead_id": "123",
  "processing": {
    "processed": true,
    "forwarded": false,
    "reason": "buyer_not_configured"
  }
}
```

Duplicate:

```json
{
  "accepted": true,
  "duplicate": true
}
```

## Test locally

```bash
npm start
npm run test:leads
npm run test:buyer
```

With API key:

```bash
INBOUND_API_KEY=secret npm run test:leads
```

## Project structure

```text
server.js
routes/leads.js              # POST /api/leads
middleware/
  logger.js
  verifyApiKey.js
services/
  leadProcessor.js
  buyerApi.js                # VICIdial add_lead POST
utils/
  leadNormalizer.js
  buyerPayload.js
  channelListMap.js          # channel → list_id
  phoneNormalizer.js         # 10-digit phone
  processedLeads.js
  logger.js
```

## Next steps (planned)

- Persistent storage / queue
- Additional channel → list_id mappings as needed
