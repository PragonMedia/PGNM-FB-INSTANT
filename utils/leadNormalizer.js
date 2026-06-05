function parseChannel(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = String(value).trim().toLowerCase();
  if (normalized === "") {
    return null;
  }

  if (!/^[a-z0-9_-]{1,32}$/.test(normalized)) {
    return { invalid: true, value: normalized };
  }

  return { invalid: false, value: normalized };
}

function pickString(...values) {
  for (const value of values) {
    if (value === undefined || value === null) {
      continue;
    }
    const trimmed = String(value).trim();
    if (trimmed !== "") {
      return trimmed;
    }
  }
  return null;
}

function normalizeLeadPayload(payload = {}, options = {}) {
  const channelResult = parseChannel(options.channel);
  const firstName = pickString(
    payload.first_name,
    payload.firstName,
    payload.First_Name,
    payload["First Name"]
  );

  const lastName = pickString(
    payload.last_name,
    payload.lastName,
    payload.Last_Name,
    payload["Last Name"]
  );

  const fullName = pickString(
    payload.full_name,
    payload.fullName,
    payload.name,
    payload.Full_Name,
    payload["Full Name"]
  );

  const email = pickString(payload.email, payload.Email, payload.email_address);
  const phone = pickString(
    payload.phone_number,
    payload.phone,
    payload.phoneNumber,
    payload.Phone_Number,
    payload["Phone Number"]
  );

  const channel =
    channelResult && !channelResult.invalid ? channelResult.value : null;

  return {
    channel,
    lead_id: pickString(payload.lead_id, payload.leadgen_id, payload.id),
    created_time: pickString(payload.created_time, payload.createdTime, payload.timestamp),
    page_id: pickString(payload.page_id, payload.pageId, payload.Page_ID),
    page_name: pickString(payload.page_name, payload.pageName, payload.Page_Name),
    form_id: pickString(payload.form_id, payload.formId, payload.Form_ID),
    form_name: pickString(payload.form_name, payload.formName, payload.Form_Name),
    ad_id: pickString(payload.ad_id, payload.adId, payload.Ad_ID),
    ad_name: pickString(payload.ad_name, payload.adName, payload.Ad_Name),
    first_name: firstName,
    last_name: lastName,
    full_name: fullName,
    email,
    phone_number: phone,
    source: pickString(payload.source) || "zapier",
    raw: payload,
  };
}

module.exports = {
  parseChannel,
  normalizeLeadPayload,
};
