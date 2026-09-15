#!/usr/bin/env node

/**
 * V7M Platform — DNS for AI Discovery (DNS-AID) Management & Audit Suite
 * 
 * Implements verification, export, and provisioning for DNS-AID records
 * per draft-mozleywilliams-dnsop-dnsaid and RFC 9460 (SVCB/HTTPS RRs).
 * 
 * Usage:
 *   node scripts/manage-dns-aid.mjs --audit [--domain maestri.group]
 *   node scripts/manage-dns-aid.mjs --export [--domain maestri.group]
 *   node scripts/manage-dns-aid.mjs --scan [https://maestri.group]
 *   node scripts/manage-dns-aid.mjs --provision [--token <token>] [--zone-id <zone_id>]
 */

import https from "node:https";

const DEFAULT_DOMAIN = "maestri.group";
const DEFAULT_TARGET = "api.maestri.group";
const CLOUDFLARE_DOH = "https://cloudflare-dns.com/dns-query";
const GOOGLE_DOH = "https://dns.google/resolve";

// Colors for terminal formatting
const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
};

/**
 * Perform a DNS-over-HTTPS (DoH) query.
 * @param {string} name - Domain name to query
 * @param {string} type - RR type (SVCB=64, HTTPS=65, TXT=16, DS=43, SOA=6)
 * @param {string} resolverUrl - DoH endpoint URL
 * @returns {Promise<any>}
 */
export async function queryDoH(name, type, resolverUrl = CLOUDFLARE_DOH) {
  const url = new URL(resolverUrl);
  url.searchParams.set("name", name);
  url.searchParams.set("type", String(type));
  url.searchParams.set("do", "1"); // Request DNSSEC validation (Authenticated Data flag)

  return new Promise((resolve, reject) => {
    const req = https.get(
      url.toString(),
      {
        headers: {
          Accept: "application/dns-json",
          "User-Agent": "v7m-dns-aid-runner/1.0",
        },
        timeout: 10000,
      },
      (res) => {
        let raw = "";
        res.on("data", (chunk) => (raw += chunk));
        res.on("end", () => {
          try {
            const data = JSON.parse(raw);
            resolve(data);
          } catch (e) {
            reject(new Error(`Invalid JSON from DoH (${res.statusCode}): ${raw.slice(0, 100)}`));
          }
        });
      }
    );

    req.on("timeout", () => {
      req.destroy();
      reject(new Error(`Timeout querying DoH for ${name} (${type})`));
    });

    req.on("error", (err) => {
      // Automatic fallback to Google DoH if primary fails
      if (resolverUrl === CLOUDFLARE_DOH) {
        queryDoH(name, type, GOOGLE_DOH).then(resolve).catch(reject);
      } else {
        reject(err);
      }
    });
  });
}

/**
 * Parse an SVCB / HTTPS data string into structured components.
 * Example input: "1 api.maestri.group. mandatory=alpn,port alpn=a2a,h2,h3 port=443"
 */
export function parseSvcbData(dataStr) {
  if (!dataStr || typeof dataStr !== "string") {
    return null;
  }

  const parts = dataStr.trim().split(/\s+/);
  if (parts.length < 2) return null;

  const priority = parseInt(parts[0], 10);
  const target = parts[1].replace(/\.$/, "");
  const params = {};
  const customParams = {};

  for (let i = 2; i < parts.length; i++) {
    const pair = parts[i];
    const eqIdx = pair.indexOf("=");
    if (eqIdx !== -1) {
      const k = pair.substring(0, eqIdx);
      const v = pair.substring(eqIdx + 1).replace(/^"|"$/g, "");
      params[k] = v;
      if (/^key\d+$/.test(k)) {
        customParams[k] = v;
      }
    } else {
      params[pair] = true;
    }
  }

  return {
    priority,
    target,
    isServiceMode: priority > 0,
    isAliasMode: priority === 0,
    alpn: params.alpn ? params.alpn.split(",") : [],
    port: params.port ? parseInt(params.port, 10) : null,
    mandatory: params.mandatory ? params.mandatory.split(",") : [],
    customParams,
    rawParams: params,
  };
}

/**
 * Perform a full DNS-AID compliance audit on a domain.
 * @param {object} options
 * @param {string} options.domain - Target domain
 * @returns {Promise<object>}
 */
export async function runDnsAidAudit({ domain = DEFAULT_DOMAIN } = {}) {
  const checkResults = [];
  let overallDnssec = false;

  // 1. Check DNSSEC at Zone Apex
  try {
    const soaResp = await queryDoH(domain, "SOA");
    const dnssecValid = Boolean(soaResp && soaResp.AD);
    overallDnssec = dnssecValid;

    checkResults.push({
      name: `DNSSEC Validation (AD=true at apex ${domain})`,
      passed: dnssecValid,
      detail: dnssecValid
        ? "Authenticated Data flag received"
        : "AD flag false — Zone DNSSEC not signed or DS delegation missing at registrar",
    });
  } catch (err) {
    checkResults.push({
      name: `DNSSEC Validation at apex ${domain}`,
      passed: false,
      detail: err.message,
    });
  }

  // 2. Check Discovery Endpoints
  const endpoints = [
    {
      label: "A2A Agent Endpoint",
      rrName: `_a2a._agents.${domain}`,
      expectedAlpn: "a2a",
    },
    {
      label: "MCP Discovery Endpoint",
      rrName: `_mcp._agents.${domain}`,
      expectedAlpn: "mcp",
    },
    {
      label: "Organizational Index Endpoint",
      rrName: `_index._agents.${domain}`,
      expectedAlpn: "h2",
    },
  ];

  for (const ep of endpoints) {
    let recordFound = false;
    let parsedData = null;
    let rrTypeUsed = "";
    let recordDnssec = false;

    // Check SVCB (type 64)
    try {
      const svcbResp = await queryDoH(ep.rrName, 64);
      if (svcbResp && svcbResp.Answer && svcbResp.Answer.length > 0) {
        const ans = svcbResp.Answer.find((a) => a.type === 64);
        if (ans) {
          recordFound = true;
          rrTypeUsed = "SVCB";
          parsedData = parseSvcbData(ans.data);
          recordDnssec = Boolean(svcbResp.AD);
        }
      }
    } catch {
      // Continue to HTTPS fallback
    }

    // Check HTTPS (type 65) if not found on SVCB
    if (!recordFound) {
      try {
        const httpsResp = await queryDoH(ep.rrName, 65);
        if (httpsResp && httpsResp.Answer && httpsResp.Answer.length > 0) {
          const ans = httpsResp.Answer.find((a) => a.type === 65);
          if (ans) {
            recordFound = true;
            rrTypeUsed = "HTTPS";
            parsedData = parseSvcbData(ans.data);
            recordDnssec = Boolean(httpsResp.AD);
          }
        }
      } catch {
        // Ignored
      }
    }

    if (!recordFound) {
      checkResults.push({
        name: `${ep.label} (${ep.rrName})`,
        passed: false,
        detail: `Record missing. Publish SVCB/HTTPS at ${ep.rrName}`,
        recordFound: false,
      });
    } else {
      const validService = parsedData && parsedData.isServiceMode;
      const hasAlpn = parsedData && parsedData.alpn.length > 0;
      const hasPort = parsedData && parsedData.port === 443;

      const issues = [];
      if (!validService) issues.push("Priority must be > 0 for ServiceMode");
      if (!hasAlpn) issues.push("alpn parameter missing");
      if (!hasPort) issues.push("port=443 missing");
      if (!recordDnssec) issues.push("DNSSEC AD=true not returned for this record");

      const passed = issues.length === 0;
      checkResults.push({
        name: `${ep.label} (${ep.rrName})`,
        passed,
        detail: passed
          ? `Valid ServiceMode ${rrTypeUsed} (target: ${parsedData.target}, alpn: ${parsedData.alpn.join(",")}, port: ${parsedData.port})`
          : issues.join("; "),
        recordFound: true,
        rrTypeUsed,
        parsedData,
        dnssecValidated: recordDnssec,
      });
    }
  }

  // 3. Optional TXT Index Verification
  try {
    const txtResp = await queryDoH(`_index._agents.${domain}`, 16);
    if (txtResp && txtResp.Answer && txtResp.Answer.length > 0) {
      const ans = txtResp.Answer.find((a) => a.type === 16);
      checkResults.push({
        name: `Index TXT Record (_index._agents.${domain})`,
        passed: true,
        detail: `Found TXT index entry: ${ans.data}`,
      });
    }
  } catch {
    // Optional check
  }

  const passedCount = checkResults.filter((r) => r.passed).length;
  const allPassed = passedCount === checkResults.length;

  return {
    domain,
    timestamp: new Date().toISOString(),
    overallStatus: allPassed ? "PASS" : "FAIL",
    dnssecValidated: overallDnssec,
    tests: checkResults,
  };
}

/**
 * Scan a URL against isitagentready.com.
 * @param {string} urlStr - URL to scan
 * @returns {Promise<any>}
 */
export async function scanAgentReady(urlStr) {
  const postData = JSON.stringify({ url: urlStr });

  return new Promise((resolve, reject) => {
    const req = https.request(
      "https://isitagentready.com/api/scan",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(postData),
          "User-Agent": "v7m-dns-aid-runner/1.0",
        },
        timeout: 30000,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            const json = JSON.parse(data);
            resolve(json);
          } catch (e) {
            reject(new Error(`Failed to parse scan response (${res.statusCode}): ${data.slice(0, 150)}`));
          }
        });
      }
    );

    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Timeout calling isitagentready.com API"));
    });

    req.write(postData);
    req.end();
  });
}

/**
 * Generate standard BIND zone format and Cloudflare REST API payloads.
 * @param {string} domain
 * @param {string} target
 */
export function generateZoneRecords(domain = DEFAULT_DOMAIN, target = DEFAULT_TARGET) {
  const records = [
    {
      name: `_a2a._agents.${domain}`,
      type: "SVCB",
      priority: 1,
      target: `${target}.`,
      value: "alpn=a2a,h2,h3 port=443 mandatory=alpn,port",
      purpose: "A2A (Agent-to-Agent) direct endpoint",
    },
    {
      name: `_mcp._agents.${domain}`,
      type: "SVCB",
      priority: 1,
      target: `${target}.`,
      value: "alpn=mcp,h2,h3 port=443 mandatory=alpn,port",
      purpose: "Model Context Protocol (MCP) streamable endpoint",
    },
    {
      name: `_index._agents.${domain}`,
      type: "SVCB",
      priority: 1,
      target: `${target}.`,
      value: "alpn=h2,h3 port=443 mandatory=alpn,port",
      purpose: "Organizational Agent Discovery Index",
    },
    {
      name: `_index._agents.${domain}`,
      type: "TXT",
      target: null,
      value: `\"v=dnsaid1 a2a=_a2a._agents.${domain} mcp=_mcp._agents.${domain}\"`,
      purpose: "Fallback TXT discovery catalog",
    },
  ];

  return records;
}

// ── CLI Dispatcher ───────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  let domain = DEFAULT_DOMAIN;
  let target = DEFAULT_TARGET;

  const domainIdx = args.indexOf("--domain");
  if (domainIdx !== -1 && args[domainIdx + 1]) {
    domain = args[domainIdx + 1];
  }

  const targetIdx = args.indexOf("--target");
  if (targetIdx !== -1 && args[targetIdx + 1]) {
    target = args[targetIdx + 1];
  }

  console.log(`\n${colors.cyan}${colors.bold}🌐 V7M — DNS for AI Discovery (DNS-AID) Manager & Auditor${colors.reset}`);
  console.log(`${colors.gray}RFC 9460 & draft-mozleywilliams-dnsop-dnsaid — Target Domain: ${domain}${colors.reset}\n`);

  if (args.includes("--export")) {
    const records = generateZoneRecords(domain, target);
    console.log(`${colors.bold}── 1. BIND / Standard Zone File Format ──────────────────────────────────${colors.reset}`);
    for (const r of records) {
      if (r.type === "TXT") {
        console.log(`${r.name.padEnd(35)} 3600 IN TXT  ${r.value}`);
      } else {
        console.log(`${r.name.padEnd(35)} 3600 IN ${r.type} ${r.priority} ${r.target} ${r.value}`);
      }
    }

    console.log(`\n${colors.bold}── 2. Cloudflare Dashboard Entry Guide ───────────────────────────────────${colors.reset}`);
    console.log(`Open Cloudflare Dashboard -> Zone (${domain}) -> DNS -> Records -> Add Record:`);
    console.log(`  • Record 1: Type: SVCB | Name: _a2a._agents | Priority: 1 | Target: ${target} | Value: alpn="a2a,h2,h3" port=443 mandatory=alpn,port`);
    console.log(`  • Record 2: Type: SVCB | Name: _mcp._agents | Priority: 1 | Target: ${target} | Value: alpn="mcp,h2,h3" port=443 mandatory=alpn,port`);
    console.log(`  • Record 3: Type: SVCB | Name: _index._agents | Priority: 1 | Target: ${target} | Value: alpn="h2,h3" port=443 mandatory=alpn,port`);
    console.log(`  • Record 4: Type: TXT  | Name: _index._agents | TTL: Auto | Content: v=dnsaid1 a2a=_a2a._agents.${domain} mcp=_mcp._agents.${domain}`);

    console.log(`\n${colors.bold}── 3. DNSSEC Delegation Instructions (Required for AD=true) ──────────────${colors.reset}`);
    console.log(`  1. In Cloudflare: Go to Zone -> DNS -> Settings -> DNSSEC -> Click 'Enable DNSSEC'.`);
    console.log(`  2. Cloudflare displays the DS record (Key Tag, Algorithm 13, SHA-256 Digest).`);
    console.log(`  3. In Domain Registrar (e.g. Sav.com for ${domain}):`);
    console.log(`     Navigate to Domain Management -> DNSSEC / Manage DS Records.`);
    console.log(`     Add the DS record provided by Cloudflare.`);
    console.log(`  4. Wait ~15 minutes for parent zone propagation.`);
    return;
  }

  if (args.includes("--scan")) {
    const targetUrl = args[args.indexOf("--scan") + 1] || `https://${domain}`;
    console.log(`📡 Requesting audit from isitagentready.com for ${targetUrl}...`);
    try {
      const scanRes = await scanAgentReady(targetUrl);
      const dnsAid = scanRes.checks?.discoverability?.dnsAid;

      if (!dnsAid) {
        console.log(`${colors.yellow}⚠ No dnsAid check found in scanner response.${colors.reset}`);
        return;
      }

      const statusColor = dnsAid.status === "pass" ? colors.green : colors.red;
      console.log(`\n${colors.bold}Scanner Status:${colors.reset} ${statusColor}${dnsAid.status.toUpperCase()}${colors.reset}`);
      console.log(`${colors.bold}Message:${colors.reset} ${dnsAid.message}`);
      console.log(`${colors.bold}DNSSEC Validated:${colors.reset} ${dnsAid.details?.dnssecValidated ? "Yes" : "No"}`);
      console.log(`${colors.bold}Service Records:${colors.reset} ${dnsAid.details?.serviceRecordCount || 0}`);

      if (dnsAid.evidence && dnsAid.evidence.length > 0) {
        console.log(`\n${colors.bold}Evidence Summary:${colors.reset}`);
        for (const ev of dnsAid.evidence) {
          const outcomeColor = ev.finding?.outcome === "positive" ? colors.green : ev.finding?.outcome === "negative" ? colors.red : colors.gray;
          console.log(`  • [${ev.label}] -> ${outcomeColor}${ev.finding?.summary || "N/A"}${colors.reset}`);
        }
      }

      if (dnsAid.status !== "pass") {
        console.log(`\n${colors.yellow}Run 'node scripts/manage-dns-aid.mjs --export' to view the required DNS records and DNSSEC steps.${colors.reset}`);
      }
    } catch (err) {
      console.error(`${colors.red}✖ Scan failed:${colors.reset} ${err.message}`);
    }
    return;
  }

  // Default: Audit mode
  console.log(`🔍 Auditing DNS-AID records and DNSSEC via DoH (${CLOUDFLARE_DOH})...\n`);
  const audit = await runDnsAidAudit({ domain });

  for (const t of audit.tests) {
    if (t.passed) {
      console.log(`  ${colors.green}✔ PASS${colors.reset} ${t.name} ${colors.gray}(${t.detail})${colors.reset}`);
    } else {
      console.log(`  ${colors.red}✖ FAIL${colors.reset} ${t.name} ${colors.red}-> ${t.detail}${colors.reset}`);
    }
  }

  console.log(`\n${colors.bold}Summary:${colors.reset} Overall DNS-AID Status: ${audit.overallStatus === "PASS" ? colors.green + "PASS" : colors.red + "FAIL"}${colors.reset}`);
  console.log(`DNSSEC Authenticated Data: ${audit.dnssecValidated ? colors.green + "Valid" : colors.yellow + "Missing / Incomplete"}${colors.reset}`);

  if (audit.overallStatus !== "PASS") {
    console.log(`\n${colors.yellow}ℹ To export record configurations, run:${colors.reset}`);
    console.log(`  node scripts/manage-dns-aid.mjs --export`);
  }
}

// Auto-run if executed directly via CLI
if (process.argv[1] && process.argv[1].includes("manage-dns-aid.mjs")) {
  main().catch((err) => {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  });
}
