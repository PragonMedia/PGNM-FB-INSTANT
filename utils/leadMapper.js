function firstValue(values) {
  if (!Array.isArray(values) || values.length === 0) {
    return null;
  }
  const value = values[0];
  if (value === undefined || value === null) {
    return null;
  }
  const trimmed = String(value).trim();
  return trimmed === "" ? null : trimmed;
}

function mapFieldData(fieldData) {
  const fields = {};
  if (!Array.isArray(fieldData)) {
    return fields;
  }

  for (const item of fieldData) {
    if (!item || !item.name) {
      continue;
    }
    fields[item.name] = firstValue(item.values);
  }

  return fields;
}

function mapLeadForPartner(lead, webhookMeta = {}) {
  const fields = mapFieldData(lead.field_data);

  return {
    leadgen_id: lead.id || webhookMeta.leadgen_id || null,
    created_time: lead.created_time || null,
    ad_id: lead.ad_id || webhookMeta.ad_id || null,
    form_id: lead.form_id || webhookMeta.form_id || null,
    page_id: webhookMeta.page_id || null,
    adgroup_id: webhookMeta.adgroup_id || null,
    full_name: fields.full_name || fields.name || null,
    email: fields.email || null,
    phone_number: fields.phone_number || fields.phone || null,
    fields,
    source: "facebook_lead_ads",
  };
}

module.exports = {
  firstValue,
  mapFieldData,
  mapLeadForPartner,
};
