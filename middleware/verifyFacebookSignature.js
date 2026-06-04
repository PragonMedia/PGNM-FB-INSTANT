const crypto = require("crypto");
const { logWarn } = require("../utils/logger");

const APP_SECRET = process.env.FACEBOOK_APP_SECRET || "";
const SKIP_SIGNATURE = String(process.env.FACEBOOK_SKIP_SIGNATURE || "false").toLowerCase() === "true";

function timingSafeEqual(left, right) {
  const a = Buffer.from(String(left), "utf8");
  const b = Buffer.from(String(right), "utf8");
  if (a.length !== b.length) {
    return false;
  }
  return crypto.timingSafeEqual(a, b);
}

function readSignatureHeader(req) {
  const header = req.headers["x-hub-signature-256"];
  if (!header) {
    return "";
  }
  return Array.isArray(header) ? header[0] : header;
}

function verifyFacebookSignature(req, res, next) {
  if (SKIP_SIGNATURE || !APP_SECRET) {
    return next();
  }

  const provided = readSignatureHeader(req);
  if (!provided) {
    logWarn("FACEBOOK_WEBHOOK_REJECTED reason=missing_signature");
    return res.sendStatus(403);
  }

  const bodyBuffer =
    req.rawBody && Buffer.isBuffer(req.rawBody) && req.rawBody.length > 0
      ? req.rawBody
      : Buffer.from(JSON.stringify(req.body || {}), "utf8");

  const expected = crypto.createHmac("sha256", APP_SECRET).update(bodyBuffer).digest("hex");
  const normalized = String(provided).replace(/^sha256=/i, "");

  if (!timingSafeEqual(normalized, expected)) {
    logWarn("FACEBOOK_WEBHOOK_REJECTED reason=invalid_signature");
    return res.sendStatus(403);
  }

  next();
}

module.exports = {
  verifyFacebookSignature,
};
