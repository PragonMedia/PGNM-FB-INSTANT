const { getListIdForChannel } = require("../utils/channelListMap");
const {
  buildBuyerPayload,
  getMissingBuyerFields,
  isVicidialSuccess,
} = require("../utils/buyerPayload");
const { logError, logInfo, logWarn } = require("../utils/logger");

function getBuyerConfig() {
  return {
    apiUrl:
      process.env.BUYER_API_URL ||
      "https://api.pitchperfect.smartcarrier.io/vicidial/non_agent_api.php",
    user: process.env.BUYER_API_USER || "",
    pass: process.env.BUYER_API_PASS || "",
    campaignId: process.env.BUYER_CAMPAIGN_ID || "MealsINB",
    source: process.env.BUYER_SOURCE || "KR",
    enabled: process.env.BUYER_ENABLED !== "false",
  };
}

function isBuyerConfigured() {
  const config = getBuyerConfig();
  return config.enabled && Boolean(config.user) && Boolean(config.pass);
}

function buildVicidialFormBody(leadFields, listId) {
  const config = getBuyerConfig();
  const params = new URLSearchParams({
    function: "add_lead",
    user: config.user,
    pass: config.pass,
    source: config.source,
    campaign_id: config.campaignId,
    list_id: listId,
    phone_number: leadFields.phone_number,
    first_name: leadFields.first_name,
    last_name: leadFields.last_name,
    hopper_priority: "99",
    add_to_hopper: "Y",
    hopper_local_call_time_check: "Y",
    dnc_check: "Y",
  });

  return params.toString();
}

function redactFormBody(formBody) {
  return formBody.replace(/pass=[^&]*/i, "pass=***");
}

async function forwardToBuyer(lead) {
  if (!isBuyerConfigured()) {
    return {
      forwarded: false,
      reason: "buyer_not_configured",
    };
  }

  const listId = getListIdForChannel(lead.channel);
  if (!listId) {
    logError("BUYER_FORWARD_SKIPPED reason=unmapped_channel", {
      lead_id: lead.lead_id,
      channel: lead.channel,
    });

    return {
      forwarded: false,
      reason: "unmapped_channel",
      channel: lead.channel,
    };
  }

  const leadFields = buildBuyerPayload(lead);
  const missing = getMissingBuyerFields(leadFields);

  if (missing.length > 0) {
    logError("BUYER_FORWARD_SKIPPED reason=missing_fields", {
      lead_id: lead.lead_id,
      channel: lead.channel,
      list_id: listId,
      missing,
      raw_phone: lead.phone_number,
    });

    return {
      forwarded: false,
      reason: "missing_buyer_fields",
      missing,
    };
  }

  const formBody = buildVicidialFormBody(leadFields, listId);
  const { apiUrl } = getBuyerConfig();

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formBody,
    });

    const responseText = await response.text();

    if (!response.ok || !isVicidialSuccess(responseText)) {
      logError("BUYER_FORWARD_FAILED", {
        lead_id: lead.lead_id,
        channel: lead.channel,
        list_id: listId,
        status: response.status,
        request: redactFormBody(formBody),
        response: responseText,
      });

      return {
        forwarded: false,
        reason: "buyer_api_error",
        status: response.status,
        buyer_response: responseText,
      };
    }

    logInfo("BUYER_FORWARD_SUCCESS", {
      lead_id: lead.lead_id,
      channel: lead.channel,
      list_id: listId,
      phone_number: leadFields.phone_number,
      status: response.status,
      response: responseText,
    });

    return {
      forwarded: true,
      status: response.status,
      list_id: listId,
      buyer_response: responseText,
    };
  } catch (error) {
    logError("BUYER_FORWARD_FAILED", {
      lead_id: lead.lead_id,
      channel: lead.channel,
      list_id: listId,
      message: error.message,
      request: redactFormBody(formBody),
    });

    return {
      forwarded: false,
      reason: "buyer_request_failed",
      message: error.message,
    };
  }
}

module.exports = {
  forwardToBuyer,
  isBuyerConfigured,
  buildVicidialFormBody,
};
