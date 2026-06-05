const { logWarn } = require("../utils/logger");

const API_KEY = process.env.INBOUND_API_KEY || "";

function readApiKey(req) {
  const auth = req.headers.authorization || "";
  if (auth.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim();
  }

  const headerKey =
    req.headers["x-api-key"] ||
    req.headers["x-inbound-api-key"] ||
    req.headers["api-key"];

  if (!headerKey) {
    return "";
  }

  return Array.isArray(headerKey) ? headerKey[0] : String(headerKey).trim();
}

function verifyApiKey(req, res, next) {
  if (!API_KEY) {
    return next();
  }

  const provided = readApiKey(req);
  if (!provided || provided !== API_KEY) {
    logWarn("LEAD_REJECTED reason=invalid_api_key", { path: req.originalUrl });
    return res.status(401).json({
      accepted: false,
      reason: "invalid_api_key",
    });
  }

  next();
}

module.exports = {
  verifyApiKey,
};
