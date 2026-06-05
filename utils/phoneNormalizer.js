/**
 * Normalize to 10-digit US phone for VICIdial (no country code).
 */
function normalizePhone10(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const digits = String(value).replace(/\D/g, "");
  if (digits.length === 0) {
    return null;
  }

  let normalized = digits;
  if (normalized.length === 11 && normalized.startsWith("1")) {
    normalized = normalized.slice(1);
  }

  if (normalized.length !== 10) {
    return null;
  }

  return normalized;
}

module.exports = {
  normalizePhone10,
};
