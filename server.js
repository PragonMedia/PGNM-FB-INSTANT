const express = require("express");
const dotenv = require("dotenv");

dotenv.config();

const requestLogger = require("./middleware/logger");
const leadsRoutes = require("./routes/leads");
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
    inbound_auth_enabled: Boolean(process.env.INBOUND_API_KEY),
    lead_endpoint: "/api/leads",
  });
});

app.use("/api/leads", leadsRoutes);

app.use((err, req, res, next) => {
  logError("UNHANDLED_ERROR", {
    message: err.message,
    stack: err.stack,
  });
  res.status(500).json({
    accepted: false,
    reason: "internal_error",
  });
});

app.listen(port, () => {
  logInfo("Lead intake server started", {
    port,
    endpoint: "/api/leads",
    auth_enabled: Boolean(process.env.INBOUND_API_KEY),
  });
});
