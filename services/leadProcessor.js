const { forwardToBuyer } = require("./buyerApi");
const { logInfo } = require("../utils/logger");

async function processLead(lead) {
  logInfo("LEAD_READY_FOR_PROCESSING", {
    channel: lead.channel,
    lead_id: lead.lead_id,
    form_id: lead.form_id,
    form_name: lead.form_name,
    page_id: lead.page_id,
    page_name: lead.page_name,
    first_name: lead.first_name,
    last_name: lead.last_name,
    phone_number: lead.phone_number,
  });

  const buyerResult = await forwardToBuyer(lead);

  return {
    processed: true,
    ...buyerResult,
  };
}

module.exports = {
  processLead,
};
