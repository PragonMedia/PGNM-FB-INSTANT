const axios = require("axios");
const { logError, logInfo } = require("../utils/logger");

const PAGE_ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN || "";
const GRAPH_VERSION = process.env.FACEBOOK_GRAPH_VERSION || "v25.0";
const TIMEOUT_MS = Number(process.env.FACEBOOK_GRAPH_TIMEOUT_MS) || 10000;

async function fetchLead(leadgenId) {
  if (!PAGE_ACCESS_TOKEN) {
    throw new Error("FACEBOOK_PAGE_ACCESS_TOKEN is not configured");
  }

  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${leadgenId}`;
  const fields = [
    "id",
    "created_time",
    "ad_id",
    "form_id",
    "field_data",
    "custom_disclaimer_responses",
  ].join(",");

  logInfo("FACEBOOK_GRAPH_FETCH", { leadgen_id: leadgenId });

  const response = await axios.get(url, {
    params: {
      access_token: PAGE_ACCESS_TOKEN,
      fields,
    },
    timeout: TIMEOUT_MS,
  });

  return response.data;
}

module.exports = {
  fetchLead,
};
