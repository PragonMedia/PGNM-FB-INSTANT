const express = require("express");
const { fetchLead } = require("../services/facebookGraphApi");
const { forwardLead } = require("../services/partnerApi");
const { verifyFacebookSignature } = require("../middleware/verifyFacebookSignature");
const { mapLeadForPartner } = require("../utils/leadMapper");
const { hasProcessed, markProcessed } = require("../utils/processedLeads");
const { logError, logInfo, logWarn } = require("../utils/logger");

const router = express.Router();

const VERIFY_TOKEN = process.env.FACEBOOK_VERIFY_TOKEN || "";

function extractLeadgenEvents(payload) {
  if (!payload || payload.object !== "page" || !Array.isArray(payload.entry)) {
    return [];
  }

  const events = [];

  for (const entry of payload.entry) {
    const pageId = entry.id;
    if (!Array.isArray(entry.changes)) {
      continue;
    }

    for (const change of entry.changes) {
      if (change.field !== "leadgen" || !change.value) {
        continue;
      }

      events.push({
        leadgen_id: change.value.leadgen_id,
        page_id: change.value.page_id || pageId,
        form_id: change.value.form_id || null,
        adgroup_id: change.value.adgroup_id || null,
        ad_id: change.value.ad_id || null,
        created_time: change.value.created_time || null,
      });
    }
  }

  return events;
}

async function processLeadgenEvent(event) {
  const leadgenId = event.leadgen_id;
  if (!leadgenId) {
    logWarn("LEADGEN_EVENT_SKIPPED reason=missing_leadgen_id");
    return;
  }

  if (hasProcessed(leadgenId)) {
    logInfo("LEADGEN_EVENT_DUPLICATE", { leadgen_id: leadgenId });
    return;
  }

  markProcessed(leadgenId);

  try {
    const lead = await fetchLead(leadgenId);
    const mappedLead = mapLeadForPartner(lead, event);

    logInfo("LEAD_RETRIEVED", {
      leadgen_id: leadgenId,
      form_id: mappedLead.form_id,
      ad_id: mappedLead.ad_id,
      email: mappedLead.email,
      phone_number: mappedLead.phone_number,
    });

    const forwardResult = await forwardLead(mappedLead);

    logInfo("LEAD_PROCESSED", {
      leadgen_id: leadgenId,
      forwarded: forwardResult.forwarded,
      forward_reason: forwardResult.reason || null,
    });
  } catch (error) {
    logError("LEAD_PROCESS_FAILED", {
      leadgen_id: leadgenId,
      message: error.message,
      response: error.response?.data || null,
    });
  }
}

router.get("/", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN && challenge) {
    logInfo("FACEBOOK_WEBHOOK_VERIFIED");
    return res.status(200).type("text/plain").send(String(challenge));
  }

  logWarn("FACEBOOK_WEBHOOK_VERIFY_FAILED", {
    mode,
    token_match: token === VERIFY_TOKEN,
  });

  return res.sendStatus(403);
});

router.post("/", verifyFacebookSignature, (req, res) => {
  res.sendStatus(200);

  const events = extractLeadgenEvents(req.body);

  if (events.length === 0) {
    logInfo("FACEBOOK_WEBHOOK_NO_LEADGEN_EVENTS", {
      object: req.body?.object || null,
    });
    return;
  }

  logInfo("FACEBOOK_WEBHOOK_LEADGEN_EVENTS", { count: events.length });

  for (const event of events) {
    processLeadgenEvent(event).catch((error) => {
      logError("LEADGEN_EVENT_UNHANDLED", {
        leadgen_id: event.leadgen_id,
        message: error.message,
      });
    });
  }
});

module.exports = router;
