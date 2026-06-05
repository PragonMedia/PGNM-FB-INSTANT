const { normalizePhone10 } = require("./phoneNormalizer");

function splitFullName(fullName) {
  if (!fullName) {
    return { first_name: null, last_name: null };
  }

  const parts = String(fullName).trim().split(/\s+/);
  if (parts.length === 0) {
    return { first_name: null, last_name: null };
  }

  if (parts.length === 1) {
    return { first_name: parts[0], last_name: null };
  }

  return {
    first_name: parts[0],
    last_name: parts.slice(1).join(" "),
  };
}

function buildBuyerPayload(lead) {
  let firstName = lead.first_name || null;
  let lastName = lead.last_name || null;

  if (!firstName && !lastName && lead.full_name) {
    const split = splitFullName(lead.full_name);
    firstName = split.first_name;
    lastName = split.last_name;
  }

  return {
    first_name: firstName,
    last_name: lastName,
    phone_number: normalizePhone10(lead.phone_number),
  };
}

function getMissingBuyerFields(payload) {
  const missing = [];

  if (!payload.first_name) {
    missing.push("first_name");
  }

  if (!payload.last_name) {
    missing.push("last_name");
  }

  if (!payload.phone_number) {
    missing.push("phone_number");
  }

  return missing;
}

function isVicidialSuccess(responseText) {
  return /SUCCESS/i.test(responseText) && /LEAD HAS BEEN ADDED/i.test(responseText);
}

module.exports = {
  buildBuyerPayload,
  getMissingBuyerFields,
  isVicidialSuccess,
  splitFullName,
};
