# Facebook Instant Form Lead Webhook

Node.js/Express server that receives Facebook Lead Ads (Instant Form) webhook notifications, fetches full lead data from Meta Graph API, and forwards normalized leads to a partner API.

## Quick start

```bash
cp .env.example .env
# Fill in Facebook credentials (see Meta setup below)
npm install
npm start
```

Health check: `GET http://localhost:3000/health`

Webhook endpoint: `https://your-domain.com/webhook/facebook`

Local testing with ngrok:

```bash
ngrok http 3000
# Use https://xxxx.ngrok.io/webhook/facebook as Callback URL in Meta App Dashboard
```

Run automated webhook tests (verification + signed POST):

```bash
npm run test:webhook
```

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | Server port (default `3000`) |
| `FACEBOOK_APP_ID` | Yes | Meta Developer App ID |
| `FACEBOOK_APP_SECRET` | Yes | Used for webhook signature verification |
| `FACEBOOK_VERIFY_TOKEN` | Yes | Custom string for webhook subscription verification |
| `FACEBOOK_PAGE_ACCESS_TOKEN` | Yes | Long-lived Page token with `leads_retrieval` |
| `FACEBOOK_GRAPH_VERSION` | No | Graph API version (default `v25.0`) |
| `FACEBOOK_SKIP_SIGNATURE` | No | Set `true` for local dev without signature (default `false`) |
| `PARTNER_API_URL` | No | Downstream API URL (leads logged if unset) |
| `PARTNER_API_KEY` | No | Bearer token for partner API |
| `PARTNER_API_TIMEOUT_MS` | No | Partner request timeout (default `10000`) |
| `PARTNER_API_MAX_RETRIES` | No | Retries on 5xx/429/network errors (default `2`) |

---

## Meta setup (from scratch)

Complete these steps **before** expecting real leads.

### 1. Prerequisites

- A **Facebook Page** for your ads
- **Meta Business Manager** with admin access to that Page
- A public **HTTPS** URL for your webhook (ngrok for dev; VPS/Railway/Render for prod)

### 2. Create a Meta Developer App

1. Go to [developers.facebook.com](https://developers.facebook.com) → **Create App** → type **Business**
2. Add products:
   - **Webhooks**
   - **Facebook Login** (required for Lead Ads CRM integration)
3. Copy **App ID** and **App Secret** into `.env`

### 3. Required permissions

Request these when generating tokens:

| Permission | Purpose |
|---|---|
| `leads_retrieval` | Fetch lead field values (required) |
| `pages_manage_metadata` | Subscribe app to Page webhooks |
| `pages_read_engagement` | Page access |
| `pages_show_list` | List/connect Pages |
| `ads_management` | Ad-level metadata |
| `pages_manage_ads` | Full ad-level lead data |

For production with real ad leads from non-admins, submit **App Review** for `leads_retrieval`.

### 4. Generate a long-lived Page Access Token

1. Open [Graph API Explorer](https://developers.facebook.com/tools/explorer)
2. Select your app → **Get User Access Token** with permissions above
3. **Get Token** → select your Page → copy Page access token
4. Extend to long-lived token and save as `FACEBOOK_PAGE_ACCESS_TOKEN`

### 5. Configure webhook in App Dashboard

In **Webhooks**:

- **Callback URL:** `https://your-domain.com/webhook/facebook`
- **Verify Token:** same value as `FACEBOOK_VERIFY_TOKEN` in `.env`
- **Object:** `Page`
- **Field:** `leadgen`

Meta sends a GET verification request. This server responds with plain-text `hub.challenge` (not JSON).

### 6. Install app on your Page

Webhook notifications only fire when the Page has installed your app:

```bash
curl -X POST "https://graph.facebook.com/v25.0/{PAGE_ID}/subscribed_apps?subscribed_fields=leadgen&access_token={PAGE_ACCESS_TOKEN}"
```

Expected: `{"success": true}`

Verify:

```bash
curl "https://graph.facebook.com/v25.0/{PAGE_ID}/subscribed_apps?access_token={PAGE_ACCESS_TOKEN}"
```

### 7. Grant Leads Access (critical)

Meta treats custom webhook apps as CRM integrations. Without Leads Access you may see **Error 103: CRM access has been revoked**.

In **Meta Business Suite → Settings → Integrations → Lead Access**:

- Assign your Developer App as an approved CRM for the Page, **or**
- Click **Restore default access**

### 8. Test with a form preview

1. Open your Instant Form in Ads Manager
2. **Preview form → Create lead**
3. Check server logs for `FACEBOOK_WEBHOOK_LEADGEN_EVENTS` and `LEAD_RETRIEVED`

---

## How it works

1. User submits Instant Form on Facebook
2. Meta POSTs a `leadgen` notification (IDs only, not PII)
3. Server verifies `X-Hub-Signature-256`, responds `200` immediately
4. Server calls `GET /{leadgen_id}` on Graph API for `field_data`
5. Lead is mapped and forwarded to `PARTNER_API_URL` (if configured)

### Webhook notification shape

```json
{
  "object": "page",
  "entry": [{
    "changes": [{
      "field": "leadgen",
      "value": {
        "leadgen_id": 123123123123,
        "page_id": 123123123,
        "form_id": 12312312312,
        "ad_id": 12312312312
      }
    }]
  }]
}
```

### Partner payload shape

```json
{
  "leadgen_id": "123123123123",
  "created_time": "2015-02-28T08:49:14+0000",
  "ad_id": "...",
  "form_id": "...",
  "page_id": "...",
  "full_name": "Joe Example",
  "email": "joe@example.com",
  "phone_number": "+15551234567",
  "fields": { "full_name": "Joe Example", "email": "joe@example.com" },
  "source": "facebook_lead_ads"
}
```

Update `services/partnerApi.js` when partner API docs specify different auth or field mapping.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| Webhook verification fails | Check `FACEBOOK_VERIFY_TOKEN`; ensure plain-text challenge response |
| POST arrives, no lead data | Verify `leads_retrieval` permission and Page token |
| Error 103 | Grant CRM access in Lead Access Manager |
| Signature mismatch | Ensure raw body is used; set `FACEBOOK_APP_SECRET` correctly |
| No webhooks | Run `subscribed_apps` POST to install app on Page |

---

## References

- [Webhooks Getting Started](https://developers.facebook.com/docs/graph-api/webhooks/getting-started)
- [Webhooks for Leadgen](https://developers.facebook.com/docs/graph-api/webhooks/getting-started/webhooks-for-leadgen)
- [Lead Ads CRM Integration](https://developers.facebook.com/docs/marketing-api/guides/lead-ads/quickstart/webhooks-integration/)
- [Retrieving Leads](https://developers.facebook.com/docs/marketing-api/guides/lead-ads/retrieving/)
