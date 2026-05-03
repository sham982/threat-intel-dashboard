export interface ScanSourceResult {
  name: string;
  status: "clean" | "malicious" | "suspicious" | "unknown" | "error";
  detections?: number;
  totalEngines?: number;
  details?: string;
  url?: string;
  category?: string;
}

const VIRUSTOTAL_API_KEY = process.env.VIRUSTOTAL_API_KEY;
const ABUSEIPDB_API_KEY = process.env.ABUSEIPDB_API_KEY;
const OTX_API_KEY = process.env.OTX_API_KEY;

function notConfigured(name: string, url: string, category?: string): ScanSourceResult {
  return {
    name, category, url,
    status: "error",
    details: `API key not configured — add your ${name} key in Settings → API Keys to enable this source.`,
  };
}

function rateLimited(name: string, url: string, category?: string): ScanSourceResult {
  return {
    name, category, url,
    status: "error",
    details: `Rate limit reached for ${name}. Add an additional key in Settings → API Keys for automatic failover.`,
  };
}

// ── Real API checkers ─────────────────────────────────────────────────────────
async function checkVirusTotal(type: string, value: string): Promise<ScanSourceResult> {
  const name = "VirusTotal";
  const category = "Multi-Engine Scanner";
  const vtUrl = `https://www.virustotal.com/gui/search/${encodeURIComponent(value)}`;

  if (!VIRUSTOTAL_API_KEY) return notConfigured(name, vtUrl, category);

  try {
    const endpoint =
      type === "ip" ? `https://www.virustotal.com/api/v3/ip_addresses/${encodeURIComponent(value)}`
      : type === "hash" ? `https://www.virustotal.com/api/v3/files/${encodeURIComponent(value)}`
      : `https://www.virustotal.com/api/v3/domains/${encodeURIComponent(value)}`;

    const resp = await fetch(endpoint, { headers: { "x-apikey": VIRUSTOTAL_API_KEY } });

    if (resp.status === 429) return rateLimited(name, vtUrl, category);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

    const data = (await resp.json()) as any;
    const stats = data.data.attributes.last_analysis_stats;
    const mal = stats.malicious ?? 0;
    const sus = stats.suspicious ?? 0;
    const total = mal + sus + (stats.undetected ?? 0) + (stats.harmless ?? 0);

    return {
      name, category,
      status: mal > 0 ? "malicious" : sus > 0 ? "suspicious" : "clean",
      detections: mal + sus, totalEngines: total,
      details: `${mal} malicious, ${sus} suspicious out of ${total} engines`,
      url: vtUrl,
    };
  } catch (e: any) {
    return { name, category, status: "error", details: `Error: ${e.message}`, url: vtUrl };
  }
}

async function checkAbuseIPDB(value: string): Promise<ScanSourceResult> {
  const name = "AbuseIPDB";
  const category = "IP Reputation";
  const baseUrl = `https://www.abuseipdb.com/check/${encodeURIComponent(value)}`;

  if (!ABUSEIPDB_API_KEY) return notConfigured(name, baseUrl, category);

  try {
    const resp = await fetch(
      `https://api.abuseipdb.com/api/v2/check?ipAddress=${encodeURIComponent(value)}&maxAgeInDays=90`,
      { headers: { Key: ABUSEIPDB_API_KEY, Accept: "application/json" } }
    );

    if (resp.status === 429) return rateLimited(name, baseUrl, category);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

    const data = (await resp.json()) as any;
    const score = data.data.abuseConfidenceScore;
    const reports = data.data.totalReports;

    return {
      name, category,
      status: score > 50 ? "malicious" : score > 20 ? "suspicious" : "clean",
      detections: reports,
      details: `Abuse confidence: ${score}%, ${reports} total reports, ISP: ${data.data.isp ?? "unknown"}`,
      url: baseUrl,
    };
  } catch (e: any) {
    return { name, category, status: "error", details: `Error: ${e.message}`, url: baseUrl };
  }
}

async function checkAlienVaultOTX(type: string, value: string): Promise<ScanSourceResult> {
  const name = "AlienVault OTX";
  const category = "Threat Intelligence";
  const otxUrl = "https://otx.alienvault.com/browse/global/indicators";

  if (!OTX_API_KEY) return notConfigured(name, otxUrl, category);

  try {
    const typeMap: Record<string, string> = { ip: "IPv4", url: "URL", domain: "domain", hash: "file" };
    const resp = await fetch(
      `https://otx.alienvault.com/api/v1/indicators/${typeMap[type] ?? "domain"}/${encodeURIComponent(value)}/general`,
      { headers: { "X-OTX-API-KEY": OTX_API_KEY } }
    );

    if (resp.status === 429) return rateLimited(name, otxUrl, category);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

    const data = (await resp.json()) as any;
    const pulses = data.pulse_info?.count ?? 0;

    return {
      name, category,
      status: pulses > 5 ? "malicious" : pulses > 0 ? "suspicious" : "clean",
      detections: pulses,
      details: `Found in ${pulses} OTX threat pulses${pulses > 0 ? " — indicator is actively tracked" : ""}`,
      url: otxUrl,
    };
  } catch (e: any) {
    return { name, category, status: "error", details: `Error: ${e.message}`, url: otxUrl };
  }
}

// ── Sources that require an API key — return "not configured" without one ─────
const KEYED_SOURCES: Array<{
  name: string; category: string; url: string; types: string[];
  envKey: string;
}> = [
  { name: "Cisco Talos",      category: "IP/Domain Reputation",   url: "https://talosintelligence.com/",             types: ["ip","domain","url"],       envKey: "CISCO_TALOS_API_KEY" },
  { name: "GreyNoise",        category: "Internet Noise Analysis", url: "https://viz.greynoise.io",                   types: ["ip"],                       envKey: "GREYNOISE_API_KEY" },
  { name: "Pulsedive",        category: "Threat Intelligence",     url: "https://pulsedive.com/",                     types: ["ip","domain","url","hash"],  envKey: "PULSEDIVE_API_KEY" },
  { name: "ThreatFox",        category: "IOC Database",            url: "https://threatfox.abuse.ch/browse/",         types: ["ip","domain","url","hash"],  envKey: "THREATFOX_API_KEY" },
  { name: "IP Quality Score", category: "IP/URL Reputation",       url: "https://www.ipqualityscore.com/",            types: ["ip","url","domain"],         envKey: "IPQUALITYSCORE_API_KEY" },
  { name: "ThreatMiner",      category: "Threat Intelligence",     url: "https://www.threatminer.org/",               types: ["ip","domain","hash"],        envKey: "THREATMINER_API_KEY" },
  { name: "InQuest Labs",     category: "Deep File Inspection",    url: "https://labs.inquest.net/",                  types: ["hash","url","ip"],           envKey: "INQUEST_API_KEY" },
  { name: "URLScan.io",       category: "URL Scanner",             url: "https://urlscan.io/",                        types: ["url","domain"],              envKey: "URLSCAN_API_KEY" },
  { name: "MalwareURL",       category: "URL Blacklist",           url: "https://www.malwareurl.com/",                types: ["url","domain","ip"],         envKey: "MALWAREURL_API_KEY" },
  { name: "URLHaus",          category: "Malware URL Feed",        url: "https://urlhaus.abuse.ch/browse/",           types: ["url","domain"],              envKey: "URLHAUS_API_KEY" },
  { name: "SecurityTrails",   category: "DNS & WHOIS",             url: "https://securitytrails.com/",                types: ["domain","url"],              envKey: "SECURITYTRAILS_API_KEY" },
  { name: "Hybrid Analysis",  category: "Malware Sandbox",         url: "https://www.hybrid-analysis.com/",           types: ["hash","url"],                envKey: "HYBRID_ANALYSIS_API_KEY" },
  { name: "Malware Bazaar",   category: "Malware Sample DB",       url: "https://bazaar.abuse.ch/browse/",            types: ["hash"],                      envKey: "MALWARE_BAZAAR_API_KEY" },
  { name: "Any.run",          category: "Interactive Sandbox",     url: "https://app.any.run/",                       types: ["hash","url"],                envKey: "ANYRUN_API_KEY" },
  { name: "Intezer",          category: "Malware Genome",          url: "https://analyze.intezer.com/",               types: ["hash"],                      envKey: "INTEZER_API_KEY" },
  { name: "IBM X-Force",      category: "Threat Intelligence",     url: "https://exchange.xforce.ibmcloud.com/",      types: ["ip","url","hash","domain"],  envKey: "IBM_XFORCE_API_KEY" },
];

// ── Main scan function ────────────────────────────────────────────────────────
export async function runThreatScan(
  indicatorType: string,
  indicatorValue: string
): Promise<{ sources: ScanSourceResult[]; riskScore: number; riskLevel: "high" | "medium" | "low" | "unknown" }> {

  // Core sources with real implementations
  const corePromises: Promise<ScanSourceResult>[] = [
    checkVirusTotal(indicatorType, indicatorValue),
    checkAlienVaultOTX(indicatorType, indicatorValue),
  ];
  if (indicatorType === "ip") {
    corePromises.push(checkAbuseIPDB(indicatorValue));
  }

  // Additional keyed sources — return "not configured" unless env key is present
  const keyedResults: ScanSourceResult[] = KEYED_SOURCES
    .filter(s => s.types.includes(indicatorType))
    .map(s => notConfigured(s.name, s.url, s.category));

  const coreResults = await Promise.all(corePromises);
  const allResults = [...coreResults, ...keyedResults];

  // Risk scoring excludes error sources
  const scored = allResults.filter(s => ["malicious", "suspicious", "clean"].includes(s.status));
  const malCount = scored.filter(s => s.status === "malicious").length;
  const susCount = scored.filter(s => s.status === "suspicious").length;
  const cleanCount = scored.filter(s => s.status === "clean").length;
  const scoredTotal = scored.length;

  let riskScore = 0;
  if (scoredTotal > 0) {
    riskScore = Math.min(100, Math.round((malCount * 100 + susCount * 40) / scoredTotal));
  }

  const riskLevel: "high" | "medium" | "low" | "unknown" =
    malCount > 0 || riskScore >= 70 ? "high"
    : susCount > 0 || riskScore >= 30 ? "medium"
    : cleanCount > 0 ? "low"
    : "unknown";

  return { sources: allResults, riskScore, riskLevel };
}
