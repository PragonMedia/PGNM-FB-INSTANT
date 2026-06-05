const { normalizeLeadPayload } = require("../utils/leadNormalizer");
const { buildBuyerPayload, getMissingBuyerFields } = require("../utils/buyerPayload");
const { getListIdForChannel } = require("../utils/channelListMap");
const { normalizePhone10 } = require("../utils/phoneNormalizer");
const { buildVicidialFormBody } = require("../services/buyerApi");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function testSplitFromFullName() {
  const lead = normalizeLeadPayload(
    {
      full_name: "Jane Doe",
      phone_number: "+18048521464",
    },
    { channel: "fb" }
  );

  const payload = buildBuyerPayload(lead);
  assert(payload.first_name === "Jane", "expected first_name Jane");
  assert(payload.last_name === "Doe", "expected last_name Doe");
  assert(payload.phone_number === "8048521464", "expected 10-digit phone");
  assert(getMissingBuyerFields(payload).length === 0, "expected no missing fields");
  console.log("PASS: split full_name into buyer payload");
}

function testExplicitNames() {
  const lead = normalizeLeadPayload(
    {
      first_name: "John",
      last_name: "Smith",
      phone_number: "(727) 555-1111",
    },
    { channel: "gg" }
  );

  const payload = buildBuyerPayload(lead);
  assert(payload.first_name === "John", "expected John");
  assert(payload.last_name === "Smith", "expected Smith");
  assert(payload.phone_number === "7275551111", "expected normalized phone");
  assert(getMissingBuyerFields(payload).length === 0, "expected no missing fields");
  console.log("PASS: explicit first/last names");
}

function testMissingPhone() {
  const lead = normalizeLeadPayload({
    first_name: "A",
    last_name: "B",
  });

  const payload = buildBuyerPayload(lead);
  const missing = getMissingBuyerFields(payload);
  assert(missing.includes("phone_number"), "expected missing phone_number");
  console.log("PASS: missing phone detected");
}

function testPhoneNormalizer() {
  assert(normalizePhone10("+1 (804) 852-1464") === "8048521464", "E.164 + formatting");
  assert(normalizePhone10("8048521464") === "8048521464", "plain 10 digits");
  assert(normalizePhone10("12345") === null, "too short");
  console.log("PASS: phone normalization");
}

function testChannelListMap() {
  assert(getListIdForChannel("fb") === "222", "fb -> 222");
  assert(getListIdForChannel("gg") === "223", "gg -> 223");
  assert(getListIdForChannel("unknown") === null, "unknown channel");
  console.log("PASS: channel list mapping");
}

function testVicidialFormBody() {
  process.env.BUYER_API_USER = "APIusermeals";
  process.env.BUYER_API_PASS = "secret";
  process.env.BUYER_CAMPAIGN_ID = "MealsINB";
  process.env.BUYER_SOURCE = "KR";

  const body = buildVicidialFormBody(
    {
      phone_number: "7275551111",
      first_name: "Bob",
      last_name: "Wilson",
    },
    "222"
  );

  assert(body.includes("function=add_lead"), "function param");
  assert(body.includes("user=APIusermeals"), "user param");
  assert(body.includes("pass=secret"), "pass param");
  assert(body.includes("source=KR"), "source param");
  assert(body.includes("campaign_id=MealsINB"), "campaign param");
  assert(body.includes("list_id=222"), "list_id param");
  assert(body.includes("phone_number=7275551111"), "phone param");
  assert(body.includes("first_name=Bob"), "first_name param");
  assert(body.includes("last_name=Wilson"), "last_name param");
  assert(body.includes("add_to_hopper=Y"), "hopper param");
  assert(!body.includes("state="), "no state");
  assert(!body.includes("postal_code="), "no postal_code");
  console.log("PASS: VICIdial form body");
}

function main() {
  testSplitFromFullName();
  testExplicitNames();
  testMissingPhone();
  testPhoneNormalizer();
  testChannelListMap();
  testVicidialFormBody();
  console.log("");
  console.log("All buyer payload tests passed.");
}

main();
