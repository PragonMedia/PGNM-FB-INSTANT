/**
 * Local test for POST /api/leads
 * Usage: npm run test:leads
 * Optional: INBOUND_API_KEY=secret npm run test:leads
 */

const http = require("http");

const PORT = Number(process.env.PORT) || 3000;
const API_KEY = process.env.INBOUND_API_KEY || "";
const BASE = `http://127.0.0.1:${PORT}`;

function request(method, path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const req = http.request(
      url,
      {
        method,
        headers: options.headers || {},
      },
      (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          resolve({
            status: res.statusCode,
            body: Buffer.concat(chunks).toString("utf8"),
          });
        });
      }
    );

    req.on("error", reject);

    if (options.body) {
      req.write(options.body);
    }

    req.end();
  });
}

async function testHealth() {
  const res = await request("GET", "/health");
  if (res.status !== 200) {
    throw new Error(`Health check failed: ${res.status}`);
  }
  console.log("PASS: GET /health");
}

async function testLeadPost() {
  const payload = {
    lead_id: "test-lead-001",
    form_id: "988565820653945",
    form_name: "Medicaid",
    page_id: "1056272880901086",
    page_name: "Free Meals NYC",
    full_name: "Test User",
    email: "test@example.com",
    phone_number: "+15551234567",
    ad_id: "123456789",
    created_time: new Date().toISOString(),
    source: "zapier",
  };

  const body = JSON.stringify(payload);
  const headers = { "Content-Type": "application/json" };

  if (API_KEY) {
    headers.Authorization = `Bearer ${API_KEY}`;
  }

  const res = await request("POST", "/api/leads?channel=fb", { headers, body });

  if (res.status !== 200) {
    throw new Error(`Lead POST failed: status=${res.status} body=${res.body}`);
  }

  const parsed = JSON.parse(res.body);
  if (!parsed.accepted) {
    throw new Error(`Lead not accepted: ${res.body}`);
  }

  if (parsed.channel !== "fb") {
    throw new Error(`Expected channel=fb in response, got: ${res.body}`);
  }

  console.log("PASS: POST /api/leads?channel=fb accepted");
}

async function testInvalidChannel() {
  const body = JSON.stringify({ lead_id: "bad-channel-test", email: "a@b.com" });
  const headers = { "Content-Type": "application/json" };
  if (API_KEY) {
    headers.Authorization = `Bearer ${API_KEY}`;
  }

  const res = await request("POST", "/api/leads?channel=INVALID!!", { headers, body });
  if (res.status !== 400) {
    throw new Error(`Expected 400 for invalid channel, got ${res.status}`);
  }

  console.log("PASS: invalid channel rejected");
}

async function testDuplicate() {
  const payload = {
    lead_id: "test-lead-001",
    email: "test@example.com",
    form_id: "988565820653945",
  };

  const body = JSON.stringify(payload);
  const headers = { "Content-Type": "application/json" };

  if (API_KEY) {
    headers.Authorization = `Bearer ${API_KEY}`;
  }

  const res = await request("POST", "/api/leads?channel=fb", { headers, body });
  const parsed = JSON.parse(res.body);

  if (res.status !== 200 || !parsed.duplicate) {
    throw new Error(`Expected duplicate=true on second POST, got: ${res.body}`);
  }

  console.log("PASS: duplicate lead detected");
}

async function main() {
  console.log(`Testing lead intake API at ${BASE}`);
  await testHealth();
  await testLeadPost();
  await testInvalidChannel();
  await testDuplicate();
  console.log("");
  console.log("All lead intake tests passed.");
}

main().catch((error) => {
  console.error("TEST FAILED:", error.message);
  process.exit(1);
});
