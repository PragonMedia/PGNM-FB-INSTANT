const express = require("express");
const dotenv = require("dotenv");

dotenv.config();

const requestLogger = require("./middleware/logger");
const facebookWebhookRoutes = require("./routes/facebookWebhook");
const { logError, logInfo } = require("./utils/logger");

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(
  express.json({
    verify: (req, res, buffer) => {
      req.rawBody = buffer;
    },
  })
);
app.use(requestLogger);

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    facebook_configured: Boolean(
      process.env.FACEBOOK_VERIFY_TOKEN && process.env.FACEBOOK_PAGE_ACCESS_TOKEN
    ),
    partner_configured: Boolean(process.env.PARTNER_API_URL),
  });
});

app.use("/webhook/facebook", facebookWebhookRoutes);

app.use((err, req, res, next) => {
  logError("UNHANDLED_ERROR", {
    message: err.message,
    stack: err.stack,
  });
  res.sendStatus(500);
});

app.listen(port, () => {
  logInfo("Facebook Lead Webhook server started", {
    port,
    graph_version: process.env.FACEBOOK_GRAPH_VERSION || "v25.0",
    signature_verification: Boolean(process.env.FACEBOOK_APP_SECRET) &&
      String(process.env.FACEBOOK_SKIP_SIGNATURE || "false").toLowerCase() !== "true",
  });
});
