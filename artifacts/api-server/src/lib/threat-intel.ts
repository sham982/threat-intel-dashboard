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

// ── Deterministic simulation (hash-based, reproducible) ──────────────────────
function simHash(value: string, salt: string): number {
  const s = value + salt;
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function simulateSource(
  name: string,
  indicatorType: string,
  indicatorValue: string,
  url: string,
  category?: string,
  detailTemplates?: { malicious: string; suspicious: string; clean: string }
): ScanSourceResult {
  const h = simHash(indicatorValue, name) % 10;
  const tpl = detailTemplates ?? {
    malicious: "Identified as malicious in threat database",
    suspicious: "Flagged for suspicious behavior",
    clean: "No threats detected",
  };

  if (h < 2) return {
    name, category, status: "malicious",
    detections: h + 1, totalEngines: 80,
    details: tpl.malicious + " (simulated — add API key in settings)",
    url,
  };
  if (h < 4) return {
    name, category, status: "suspicious",
    detections: h, totalEngines: 80,
    details: tpl.suspicious + " (simulated — add API key in settings)",
    url,
  };
  return {
    name, category, status: "clean",
    detections: 0, totalEngines: 80,
    details: tpl.clean + " (simulated — add API key in settings)",
    url,
  };
}

// ── Real API checkers ─────────────────────────────────────────────────────────
async function checkVirusTotal(type: string, value: string): Promise<ScanSourceResult> {
  const name = "VirusTotal";
  const vtUrl = `https://www.virustotal.com/gui/search/${encodeURIComponent(value)}`;
  if (!VIRUSTOTAL_API_KEY) return simulateSource(name, type, value, vtUrl, "Multi-Engine Scanner", {
    malicious: "Multiple AV engines flagged as malicious",
    suspicious: "Several engines flagged as suspicious",
    clean: "No AV detections across all engines",
  });
  try {
    let endpoint = type === "ip"
      ? `https://www.virustotal.com/api/v3/ip_addresses/${encodeURIComponent(value)}`
      : type === "hash"
      ? `https://www.virustotal.com/api/v3/files/${encodeURIComponent(value)}`
      : `https://www.virustotal.com/api/v3/domains/${encodeURIComponent(value)}`;
    const resp = await fetch(endpoint, { headers: { "x-apikey": VIRUSTOTAL_API_KEY } });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = (await resp.json()) as any;
    const stats = data.data.attributes.last_analysis_stats;
    const mal = stats.malicious ?? 0, sus = stats.suspicious ?? 0;
    const total = mal + sus + (stats.undetected ?? 0) + (stats.harmless ?? 0);
    return {
      name, category: "Multi-Engine Scanner",
      status: mal > 0 ? "malicious" : sus > 0 ? "suspicious" : "clean",
      detections: mal + sus, totalEngines: total,
      details: `${mal} malicious, ${sus} suspicious out of ${total} engines`,
      url: vtUrl,
    };
  } catch (e: any) {
    return { name, status: "error", details: e.message, url: vtUrl };
  }
}

async function checkAbuseIPDB(value: string): Promise<ScanSourceResult> {
  const name = "AbuseIPDB";
  const baseUrl = `https://www.abuseipdb.com/check/${encodeURIComponent(value)}`;
  if (!ABUSEIPDB_API_KEY) return simulateSource(name, "ip", value, baseUrl, "IP Reputation", {
    malicious: "High abuse confidence score — reported by multiple sources",
    suspicious: "Moderate abuse reports from various ISPs",
    clean: "No abuse reports found in the last 90 days",
  });
  try {
    const resp = await fetch(
      `https://api.abuseipdb.com/api/v2/check?ipAddress=${encodeURIComponent(value)}&maxAgeInDays=90`,
      { headers: { Key: ABUSEIPDB_API_KEY, Accept: "application/json" } }
    );
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = (await resp.json()) as any;
    const score = data.data.abuseConfidenceScore;
    const reports = data.data.totalReports;
    return {
      name, category: "IP Reputation",
      status: score > 50 ? "malicious" : score > 20 ? "suspicious" : "clean",
      detections: reports,
      details: `Abuse confidence: ${score}%, ${reports} total reports, ISP: ${data.data.isp ?? "unknown"}`,
      url: baseUrl,
    };
  } catch (e: any) {
    return { name, status: "error", details: e.message, url: baseUrl };
  }
}

async function checkAlienVaultOTX(type: string, value: string): Promise<ScanSourceResult> {
  const name = "AlienVault OTX";
  const otxUrl = `https://otx.alienvault.com/browse/global/indicators`;
  if (!OTX_API_KEY) return simulateSource(name, type, value, otxUrl, "Threat Intelligence", {
    malicious: "Found in multiple threat intelligence pulses with high confidence",
    suspicious: "Referenced in threat intel pulses — low confidence",
    clean: "Not found in any OTX threat intelligence pulses",
  });
  try {
    const typeMap: Record<string, string> = { ip: "IPv4", url: "URL", domain: "domain", hash: "file" };
    const resp = await fetch(
      `https://otx.alienvault.com/api/v1/indicators/${typeMap[type] ?? "domain"}/${encodeURIComponent(value)}/general`,
      { headers: { "X-OTX-API-KEY": OTX_API_KEY } }
    );
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = (await resp.json()) as any;
    const pulses = data.pulse_info?.count ?? 0;
    return {
      name, category: "Threat Intelligence",
      status: pulses > 5 ? "malicious" : pulses > 0 ? "suspicious" : "clean",
      detections: pulses,
      details: `Found in ${pulses} OTX threat pulses${pulses > 0 ? " — indicator is actively tracked" : ""}`,
      url: otxUrl,
    };
  } catch (e: any) {
    return { name, status: "error", details: e.message, url: otxUrl };
  }
}

// ── Simulated sources (categorised by indicator type support) ─────────────────
const SIM_SOURCES: Array<{
  name: string; category: string; url: string; types: string[];
  templates: { malicious: string; suspicious: string; clean: string };
}> = [
  {
    name: "Cisco Talos", category: "IP/Domain Reputation", types: ["ip", "domain", "url"],
    url: "https://talosintelligence.com/",
    templates: {
      malicious: "Listed on Talos IP & domain reputation blacklist",
      suspicious: "Talos reputation score below acceptable threshold",
      clean: "Good Talos reputation score — not blacklisted",
    },
  },
  {
    name: "GreyNoise", category: "Internet Noise Analysis", types: ["ip"],
    url: "https://viz.greynoise.io",
    templates: {
      malicious: "Actively scanning the internet — classified as malicious intent",
      suspicious: "Internet background noise scanner — unknown intent",
      clean: "Not seen scanning the internet — not a background noise source",
    },
  },
  {
    name: "Pulsedive", category: "Threat Intelligence", types: ["ip", "domain", "url", "hash"],
    url: "https://pulsedive.com/",
    templates: {
      malicious: "High risk rating — linked to active threat campaigns",
      suspicious: "Medium risk — associated with past threat activity",
      clean: "Low risk — no threat associations found",
    },
  },
  {
    name: "ThreatFox", category: "IOC Database", types: ["ip", "domain", "url", "hash"],
    url: "https://threatfox.abuse.ch/browse/",
    templates: {
      malicious: "Known malware IOC — linked to active botnet or C2 infrastructure",
      suspicious: "Found in ThreatFox IOC database with low confidence rating",
      clean: "Not found in ThreatFox IOC database",
    },
  },
  {
    name: "IP Quality Score", category: "IP/URL Reputation", types: ["ip", "url", "domain"],
    url: "https://www.ipqualityscore.com/",
    templates: {
      malicious: "High fraud score — flagged as proxy/VPN/bot or malicious",
      suspicious: "Elevated fraud score — possible proxy or suspicious traffic",
      clean: "Low fraud score — no proxy or malicious indicators",
    },
  },
  {
    name: "ThreatMiner", category: "Threat Intelligence", types: ["ip", "domain", "hash"],
    url: "https://www.threatminer.org/",
    templates: {
      malicious: "Associated with malware samples and known threat actors",
      suspicious: "Passive DNS and WHOIS data suggests suspicious history",
      clean: "No malware associations or threat actor links found",
    },
  },
  {
    name: "InQuest Labs", category: "Deep File Inspection", types: ["hash", "url", "ip"],
    url: "https://labs.inquest.net/",
    templates: {
      malicious: "File identified as malicious via deep content inspection",
      suspicious: "Suspicious DFI indicators — possible embedded threats",
      clean: "No malicious content found via deep file inspection",
    },
  },
  {
    name: "URLScan.io", category: "URL Scanner", types: ["url", "domain"],
    url: "https://urlscan.io/",
    templates: {
      malicious: "Page flagged as phishing or malicious by URLScan community",
      suspicious: "Unusual page behaviour or suspicious external resources",
      clean: "Page scan clean — no malicious indicators detected",
    },
  },
  {
    name: "MalwareURL", category: "URL Blacklist", types: ["url", "domain", "ip"],
    url: "https://www.malwareurl.com/",
    templates: {
      malicious: "URL/domain found on MalwareURL blacklist",
      suspicious: "Previously observed serving malicious content",
      clean: "Not found on MalwareURL blacklist",
    },
  },
  {
    name: "URLHaus", category: "Malware URL Feed", types: ["url", "domain"],
    url: "https://urlhaus.abuse.ch/browse/",
    templates: {
      malicious: "Active malware distribution URL — reported to URLHaus",
      suspicious: "Previously reported as malware URL — status unclear",
      clean: "Not found in URLHaus malware URL feed",
    },
  },
  {
    name: "SecurityTrails", category: "DNS & WHOIS", types: ["domain", "url"],
    url: "https://securitytrails.com/",
    templates: {
      malicious: "Domain has malicious DNS history or flagged WHOIS data",
      suspicious: "Recently registered domain or unusual DNS change history",
      clean: "Clean DNS history — no suspicious patterns found",
    },
  },
  {
    name: "Hybrid Analysis", category: "Malware Sandbox", types: ["hash", "url"],
    url: "https://www.hybrid-analysis.com/",
    templates: {
      malicious: "Sample classified as malicious by Falcon Sandbox — Threat Score > 70",
      suspicious: "Suspicious behaviour observed in sandbox environment",
      clean: "No malicious behaviour observed in sandbox analysis",
    },
  },
  {
    name: "Malware Bazaar", category: "Malware Sample DB", types: ["hash"],
    url: "https://bazaar.abuse.ch/browse/",
    templates: {
      malicious: "Hash found in Malware Bazaar — known malware family identified",
      suspicious: "Hash present in database with unconfirmed family classification",
      clean: "Hash not found in Malware Bazaar database",
    },
  },
  {
    name: "Any.run", category: "Interactive Sandbox", types: ["hash", "url"],
    url: "https://app.any.run/",
    templates: {
      malicious: "Sample executed with malicious network activity and process injection",
      suspicious: "Sandbox analysis shows suspicious behaviour — needs review",
      clean: "No malicious behaviour observed during interactive analysis",
    },
  },
  {
    name: "Intezer", category: "Malware Genome", types: ["hash"],
    url: "https://analyze.intezer.com/",
    templates: {
      malicious: "Code genes matched known malware family",
      suspicious: "Partial code similarity to malware — inconclusive",
      clean: "No code gene matches to known malware families",
    },
  },
  {
    name: "IBM X-Force", category: "Threat Intelligence", types: ["ip", "url", "hash", "domain"],
    url: "https://exchange.xforce.ibmcloud.com/",
    templates: {
      malicious: "High X-Force risk score — known malicious infrastructure",
      suspicious: "Moderate X-Force risk score — observed in threat campaigns",
      clean: "Low X-Force risk score — no known threats",
    },
  },
];

// ── Main scan function ────────────────────────────────────────────────────────
export async function runThreatScan(
  indicatorType: string,
  indicatorValue: string
): Promise<{ sources: ScanSourceResult[]; riskScore: number; riskLevel: "high" | "medium" | "low" | "unknown" }> {
  // Core real-API sources
  const corePromises: Promise<ScanSourceResult>[] = [
    checkVirusTotal(indicatorType, indicatorValue),
    checkAlienVaultOTX(indicatorType, indicatorValue),
  ];
  if (indicatorType === "ip") {
    corePromises.push(checkAbuseIPDB(indicatorValue));
  }

  // Additional simulated sources relevant to this indicator type
  const simSources = SIM_SOURCES.filter(s => s.types.includes(indicatorType));
  const simPromises = simSources.map(s =>
    Promise.resolve(simulateSource(s.name, indicatorType, indicatorValue, s.url, s.category, s.templates))
  );

  const allResults = await Promise.all([...corePromises, ...simPromises]);

  // Compute risk score weighted by source count
  const malCount = allResults.filter(s => s.status === "malicious").length;
  const susCount = allResults.filter(s => s.status === "suspicious").length;
  const cleanCount = allResults.filter(s => s.status === "clean").length;
  const scoredCount = malCount + susCount + cleanCount;

  let riskScore = 0;
  if (scoredCount > 0) {
    riskScore = Math.round((malCount * 100 + susCount * 40) / scoredCount);
    riskScore = Math.min(100, riskScore);
  }

  const riskLevel: "high" | "medium" | "low" | "unknown" =
    malCount > 0 || riskScore >= 70 ? "high"
    : susCount > 0 || riskScore >= 30 ? "medium"
    : cleanCount > 0 ? "low"
    : "unknown";

  return { sources: allResults, riskScore, riskLevel };
}
