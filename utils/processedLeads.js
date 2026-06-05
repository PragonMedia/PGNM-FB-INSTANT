const processedLeadIds = new Set();
const MAX_TRACKED = 10000;

function buildDedupKey(lead) {
  if (lead.lead_id) {
    return `id:${lead.lead_id}`;
  }

  const parts = [lead.form_id, lead.email, lead.phone_number, lead.created_time]
    .filter(Boolean)
    .join("|");

  return parts ? `fallback:${parts}` : null;
}

function hasProcessed(lead) {
  const key = buildDedupKey(lead);
  if (!key) {
    return false;
  }
  return processedLeadIds.has(key);
}

function markProcessed(lead) {
  const key = buildDedupKey(lead);
  if (!key) {
    return;
  }

  if (processedLeadIds.size >= MAX_TRACKED) {
    const first = processedLeadIds.values().next().value;
    processedLeadIds.delete(first);
  }

  processedLeadIds.add(key);
}

module.exports = {
  buildDedupKey,
  hasProcessed,
  markProcessed,
};
