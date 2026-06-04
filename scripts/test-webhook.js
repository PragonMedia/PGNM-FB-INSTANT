/**
 * Local webhook tests — verification GET and signed POST.
 * Requires server running: npm start (in another terminal)
 *
 * Usage:
 *   FACEBOOK_VERIFY_TOKEN=test-token FACEBOOK_APP_SECRET=test-secret npm run test:webhook
 */

const crypto = require("crypto");
const http = require("http");

const PORT = Number(process.env.PORT) || 3000;
const VERIFY_TOKEN = process.env.FACEBOOK_VERIFY_TOKEN || "test-verify-token";
const APP_SECRET = process.env.FACEBOOK_APP_SECRET || "test-app-secret";
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
            headers: res.headers,
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

function signBody(body) {
  const digest = crypto.createHmac("sha256", APP_SECRET).update(body).digest("hex");
  return `sha256=${digest}`;
}

async function testVerification() {
  const challenge = "1158201444";
  const path = `/webhook/facebook?hub.mode=subscribe&hub.verify_token=${encodeURIComponent(
    VERIFY_TOKEN
  )}&hub.challenge=${challenge}`;

  const res = await request("GET", path);

  if (res.status !== 200 || res.body !== challenge) {
    throw new Error(
      `Verification failed: status=${res.status} body=${JSON.stringify(res.body)}`
    );
  }

  console.log("PASS: GET verification returns plain-text challenge");
}

async function testInvalidVerification() {
  const path =
    "/webhook/facebook?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=123";
  const res = await request("GET", path);

  if (res.status !== 403) {
    throw new Error(`Expected 403 for bad token, got ${res.status}`);
  }

  console.log("PASS: GET verification rejects wrong token");
}

async function testSignedPost() {
  const payload = {
    object: "page",
    entry: [
      {
        id: "999888777",
        time: Math.floor(Date.now() / 1000),
        changes: [
          {
            field: "leadgen",
            value: {
              leadgen_id: "test-lead-001",
              page_id: "999888777",
              form_id: "111222333",
              adgroup_id: "444555666",
              ad_id: "777888999",
              created_time: Math.floor(Date.now() / 1000),
            },
          },
        ],
      },
    ],
  };

  const body = JSON.stringify(payload);
  const res = await request("POST", "/webhook/facebook", {
    headers: {
      "Content-Type": "application/json",
      "X-Hub-Signature-256": signBody(body),
    },
    body,
  });

  if (res.status !== 200) {
    throw new Error(`Signed POST failed: status=${res.status} body=${res.body}`);
  }

  console.log("PASS: POST with valid signature returns 200");
}

async function testInvalidSignature() {
  const body = JSON.stringify({ object: "page", entry: [] });
  const res = await request("POST", "/webhook/facebook", {
    headers: {
      "Content-Type": "application/json",
      "X-Hub-Signature-256": "sha256=invalid",
    },
    body,
  });

  if (res.status !== 403) {
    throw new Error(`Expected 403 for bad signature, got ${res.status}`);
  }

  console.log("PASS: POST with invalid signature returns 403");
}

async function testHealth() {
  const res = await request("GET", "/health");
  if (res.status !== 200) {
    throw new Error(`Health check failed: ${res.status}`);
  }
  console.log("PASS: GET /health returns 200");
}

async function main() {
  console.log(`Testing webhook at ${BASE}`);
  console.log(`Verify token: ${VERIFY_TOKEN}`);
  console.log("");

  await testHealth();
  await testVerification();
  await testInvalidVerification();
  await testSignedPost();
  await testInvalidSignature();

  console.log("");
  console.log("All webhook tests passed.");
}

main().catch((error) => {
  console.error("TEST FAILED:", error.message);
  process.exit(1);
});
