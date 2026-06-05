const express = require("express");
const { verifyApiKey } = require("../middleware/verifyApiKey");
const { processLead } = require("../services/leadProcessor");
const { normalizeLeadPayload, parseChannel } = require("../utils/leadNormalizer");
const { hasProcessed, markProcessed } = require("../utils/processedLeads");
const { logError, logInfo, logWarn } = require("../utils/logger");

const router = express.Router();

async function handleLead(req, res) {
  const payload = req.body;

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    logWarn("LEAD_REJECTED reason=invalid_payload");
    return res.status(400).json({
      accepted: false,
      reason: "invalid_payload",
    });
  }

  const channelParam = parseChannel(req.query.channel);
  if (channelParam && channelParam.invalid) {
    logWarn("LEAD_REJECTED reason=invalid_channel", { channel: req.query.channel });
    return res.status(400).json({
      accepted: false,
      reason: "invalid_channel",
    });
  }

  const lead = normalizeLeadPayload(payload, { channel: req.query.channel });

  if (hasProcessed(lead)) {
    logInfo("LEAD_DUPLICATE", {
      channel: lead.channel,
      lead_id: lead.lead_id,
      form_id: lead.form_id,
      email: lead.email,
    });

    return res.status(200).json({
      accepted: true,
      duplicate: true,
      channel: lead.channel,
    });
  }

  markProcessed(lead);

  logInfo("LEAD_RECEIVED", {
    channel: lead.channel,
    lead_id: lead.lead_id,
    form_id: lead.form_id,
    form_name: lead.form_name,
    page_id: lead.page_id,
    page_name: lead.page_name,
    ad_id: lead.ad_id,
    email: lead.email,
    phone_number: lead.phone_number,
    source: lead.source,
  });

  try {
    const result = await processLead(lead);

    return res.status(200).json({
      accepted: true,
      duplicate: false,
      channel: lead.channel,
      lead_id: lead.lead_id,
      processing: result,
    });
  } catch (error) {
    logError("LEAD_PROCESS_FAILED", {
      lead_id: lead.lead_id,
      message: error.message,
    });

    return res.status(200).json({
      accepted: true,
      duplicate: false,
      channel: lead.channel,
      lead_id: lead.lead_id,
      processing: {
        processed: false,
        reason: "processing_error",
      },
    });
  }
}

router.post("/", verifyApiKey, handleLead);

module.exports = router;
