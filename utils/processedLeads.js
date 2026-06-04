const processedLeadIds = new Set();
const MAX_TRACKED = 10000;

function hasProcessed(leadgenId) {
  return processedLeadIds.has(String(leadgenId));
}

function markProcessed(leadgenId) {
  const key = String(leadgenId);
  if (processedLeadIds.size >= MAX_TRACKED) {
    const first = processedLeadIds.values().next().value;
    processedLeadIds.delete(first);
  }
  processedLeadIds.add(key);
}

module.exports = {
  hasProcessed,
  markProcessed,
};
