const axios = require("axios");
const { logError, logInfo, logWarn } = require("../utils/logger");

const PARTNER_API_URL = process.env.PARTNER_API_URL || "";
const PARTNER_API_KEY = process.env.PARTNER_API_KEY || "";
const TIMEOUT_MS = Number(process.env.PARTNER_API_TIMEOUT_MS) || 10000;
const MAX_RETRIES = Number(process.env.PARTNER_API_MAX_RETRIES) || 2;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableError(error) {
  if (!error.response) {
    return true;
  }
  const status = error.response.status;
  return status >= 500 || status === 429;
}

async function forwardLead(payload) {
  if (!PARTNER_API_URL) {
    logWarn("PARTNER_FORWARD_SKIPPED reason=missing_partner_api_url", {
      leadgen_id: payload.leadgen_id,
    });
    return {
      forwarded: false,
      reason: "missing_partner_api_url",
    };
  }

  const headers = {
    "Content-Type": "application/json",
  };

  if (PARTNER_API_KEY) {
    headers.Authorization = `Bearer ${PARTNER_API_KEY}`;
  }

  let lastError = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      logInfo("PARTNER_FORWARD_ATTEMPT", {
        leadgen_id: payload.leadgen_id,
        attempt: attempt + 1,
        url: PARTNER_API_URL,
      });

      const response = await axios.post(PARTNER_API_URL, payload, {
        headers,
        timeout: TIMEOUT_MS,
      });

      logInfo("PARTNER_FORWARD_SUCCESS", {
        leadgen_id: payload.leadgen_id,
        status: response.status,
      });

      return {
        forwarded: true,
        status: response.status,
        data: response.data,
      };
    } catch (error) {
      lastError = error;
      const retryable = isRetryableError(error);

      logError("PARTNER_FORWARD_FAILED", {
        leadgen_id: payload.leadgen_id,
        attempt: attempt + 1,
        retryable,
        message: error.message,
        status: error.response?.status || null,
      });

      if (!retryable || attempt >= MAX_RETRIES) {
        break;
      }

      await sleep(500 * (attempt + 1));
    }
  }

  return {
    forwarded: false,
    reason: "partner_api_error",
    message: lastError?.message || "unknown_error",
    status: lastError?.response?.status || null,
  };
}

module.exports = {
  forwardLead,
};
