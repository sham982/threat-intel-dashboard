export interface ScanSourceResult {
  name: string;
  status: "clean" | "malicious" | "suspicious" | "unknown" | "error";
  detections?: number;
  totalEngines?: number;
  details?: string;
  url?: string;
  category?: string;
}

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

// VirusTotal checker
async function checkVirusTotal(type: string, value: string, apiKey?: string): Promise<ScanSourceResult> {
  const name = "VirusTotal";
  const category = "Multi-Engine Scanner";
  const vtUrl = `https://www.virustotal.com/gui/search/${encodeURIComponent(value)}`;

  if (!apiKey) return notConfigured(name, vtUrl, category);

  try {
    const endpoint =
      type === "ip" ? `https://www.virustotal.com/api/v3/ip_addresses/${encodeURIComponent(value)}`
      : type === "hash" ? `https://www.virustotal.com/api/v3/files/${encodeURIComponent(value)}`
      : `https://www.virustotal.com/api/v3/domains/${encodeURIComponent(value)}`;

    const resp = await fetch(endpoint, { headers: { "x-apikey": apiKey } });

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

// AbuseIPDB checker
async function checkAbuseIPDB(value: string, apiKey?: string): Promise<ScanSourceResult> {
  const name = "AbuseIPDB";
  const category = "IP Reputation";
  const baseUrl = `https://www.abuseipdb.com/check/${encodeURIComponent(value)}`;

  if (!apiKey) return notConfigured(name, baseUrl, category);

  try {
    const resp = await fetch(
      `https://api.abuseipdb.com/api/v2/check?ipAddress=${encodeURIComponent(value)}&maxAgeInDays=90`,
      { headers: { Key: apiKey, Accept: "application/json" } }
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

// AlienVault OTX checker
async function checkAlienVaultOTX(type: string, value: string, apiKey?: string): Promise<ScanSourceResult> {
  const name = "AlienVault OTX";
  const category = "Threat Intelligence";
  const otxUrl = "https://otx.alienvault.com/browse/global/indicators";

  if (!apiKey) return notConfigured(name, otxUrl, category);

  try {
    const typeMap: Record<string, string> = { ip: "IPv4", url: "URL", domain: "domain", hash: "file" };
    const resp = await fetch(
      `https://otx.alienvault.com/api/v1/indicators/${typeMap[type] ?? "domain"}/${encodeURIComponent(value)}/general`,
      { headers: { "X-OTX-API-KEY": apiKey } }
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

// Helper to create a configured result for platforms without full API integration
function configuredResult(name: string, category: string, url: string): ScanSourceResult {
  return {
    name,
    category,
    status: "clean",
    details: `${name} integration ready. API key configured. Full API integration coming soon.`,
    url: url,
  };
}
// ThreatFox API checker
async function checkThreatFox(value: string, indicatorType: string, apiKey?: string): Promise<ScanSourceResult> {
  const name = "ThreatFox";
  const category = "IOC Database";
  const tfUrl = `https://threatfox.abuse.ch/browse/`;

  if (!apiKey) return notConfigured(name, tfUrl, category);

  try {
    // Determine search term based on indicator type
    let searchTerm = value;
    
    // For IP addresses, ThreatFox can search directly
    const requestBody = {
      query: "search_ioc",
      search_term: value,
      exact_match: true
    };

    const resp = await fetch("https://threatfox-api.abuse.ch/api/v1/", {
      method: "POST",
      headers: { 
        "Auth-Key": apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    });

    if (resp.status === 429) return rateLimited(name, tfUrl, category);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

    const data = (await resp.json()) as any;
    
    if (data.query_status === "ok" && data.data && data.data.length > 0) {
      // IOC found in ThreatFox
      const iocData = data.data[0];
      const confidence = iocData.confidence_level || 0;
      const malware = iocData.malware_printable || iocData.malware || "Unknown";
      
      let status: "clean" | "malicious" | "suspicious" = "clean";
      if (confidence >= 70) status = "malicious";
      else if (confidence >= 30) status = "suspicious";
      
      return {
        name, category,
        status: status,
        detections: 1,
        details: `Found in ThreatFox database. Malware: ${malware}, Confidence: ${confidence}%${iocData.reference ? `, Reference: ${iocData.reference}` : ""}`,
        url: `https://threatfox.abuse.ch/browse/`,
      };
    } else {
      return {
        name, category,
        status: "clean",
        details: `No results found in ThreatFox database.`,
        url: tfUrl,
      };
    }
  } catch (e: any) {
    return { name, category, status: "error", details: `Error: ${e.message}`, url: tfUrl };
  }
}
// All supported platforms with their API key names
const ALL_PLATFORMS: Array<{
  name: string;
  category: string;
  url: string;
  platformKey: string;
  types: string[];
  hasApi: boolean;
}> = [
  // Core platforms with full API integration
  { name: "VirusTotal", category: "Multi-Engine Scanner", url: "https://www.virustotal.com/gui/search/", platformKey: "virustotal", types: ["ip", "domain", "url", "hash"], hasApi: true },
  { name: "AbuseIPDB", category: "IP Reputation", url: "https://www.abuseipdb.com/check/", platformKey: "abuseipdb", types: ["ip"], hasApi: true },
  { name: "AlienVault OTX", category: "Threat Intelligence", url: "https://otx.alienvault.com/browse/global/indicators", platformKey: "alienvault_otx", types: ["ip", "domain", "url", "hash"], hasApi: true },
  { name: "ThreatFox", category: "IOC Database", url: "https://threatfox.abuse.ch/browse/", platformKey: "threatfox", types: ["ip", "domain", "url", "hash"], hasApi: true },  // ADD THIS
  
  // Additional platforms (no API integration yet)
  { name: "Cisco Talos", category: "IP/Domain Reputation", url: "https://talosintelligence.com/", platformKey: "cisco_talos", types: ["ip", "domain", "url"], hasApi: false },
  { name: "GreyNoise", category: "Internet Noise Analysis", url: "https://viz.greynoise.io", platformKey: "greynoise", types: ["ip"], hasApi: false },
  { name: "Pulsedive", category: "Threat Intelligence", url: "https://pulsedive.com/", platformKey: "pulsedive", types: ["ip", "domain", "url", "hash"], hasApi: false },
  { name: "IP Quality Score", category: "IP/URL Reputation", url: "https://www.ipqualityscore.com/", platformKey: "ipqualityscore", types: ["ip", "url", "domain"], hasApi: false },
  { name: "ThreatMiner", category: "Threat Intelligence", url: "https://www.threatminer.org/", platformKey: "threatminer", types: ["ip", "domain", "hash"], hasApi: false },
  { name: "InQuest Labs", category: "Deep File Inspection", url: "https://labs.inquest.net/", platformKey: "inquest_labs", types: ["hash", "url", "ip"], hasApi: false },
  { name: "URLScan.io", category: "URL Scanner", url: "https://urlscan.io/", platformKey: "urlscan", types: ["url", "domain"], hasApi: false },
  { name: "MalwareURL", category: "URL Blacklist", url: "https://www.malwareurl.com/", platformKey: "malwareurl", types: ["url", "domain", "ip"], hasApi: false },
  { name: "URLHaus", category: "Malware URL Feed", url: "https://urlhaus.abuse.ch/browse/", platformKey: "urlhaus", types: ["url", "domain"], hasApi: false },
  { name: "SecurityTrails", category: "DNS & WHOIS", url: "https://securitytrails.com/", platformKey: "securitytrails", types: ["domain", "url"], hasApi: false },
  { name: "Hybrid Analysis", category: "Malware Sandbox", url: "https://www.hybrid-analysis.com/", platformKey: "hybrid_analysis", types: ["hash", "url"], hasApi: false },
  { name: "Malware Bazaar", category: "Malware Sample DB", url: "https://bazaar.abuse.ch/browse/", platformKey: "malware_bazaar", types: ["hash"], hasApi: false },
  { name: "Any.run", category: "Interactive Sandbox", url: "https://app.any.run/", platformKey: "any_run", types: ["hash", "url"], hasApi: false },
  { name: "Intezer", category: "Malware Genome", url: "https://analyze.intezer.com/", platformKey: "intezer", types: ["hash"], hasApi: false },
  { name: "IBM X-Force", category: "Threat Intelligence", url: "https://exchange.xforce.ibmcloud.com/", platformKey: "ibm_xforce", types: ["ip", "url", "hash", "domain"], hasApi: false },
];
// Main scan function with API keys from database
export async function runThreatScan(
  indicatorType: string,
  indicatorValue: string,
  apiKeysMap: Record<string, string> = {}
): Promise<{ sources: ScanSourceResult[]; riskScore: number; riskLevel: "high" | "medium" | "low" | "unknown" }> {

  // Filter platforms that support this indicator type
  const relevantPlatforms = ALL_PLATFORMS.filter(p => p.types.includes(indicatorType));

  // Build results for each platform
  const resultsPromises: Promise<ScanSourceResult>[] = relevantPlatforms.map(async (platform): Promise<ScanSourceResult> => {
    const apiKey = apiKeysMap[platform.platformKey];
    
    // Check if API key exists for this platform
    if (!apiKey) {
      return notConfigured(platform.name, platform.url + indicatorValue, platform.category);
    }

    // For platforms with full API integration
    if (platform.hasApi) {
      switch (platform.platformKey) {
        case "threatfox":  
      return checkThreatFox(indicatorValue, indicatorType, apiKey);
        case "virustotal":
          return checkVirusTotal(indicatorType, indicatorValue, apiKey);
        case "abuseipdb":
          if (indicatorType === "ip") {
            return checkAbuseIPDB(indicatorValue, apiKey);
          }
          return notConfigured(platform.name, platform.url + indicatorValue, platform.category);
        case "alienvault_otx":
          return checkAlienVaultOTX(indicatorType, indicatorValue, apiKey);
        default:
          return configuredResult(platform.name, platform.category, platform.url + indicatorValue);
      }
    } else {
      // For platforms without full API integration yet
      return configuredResult(platform.name, platform.category, platform.url + indicatorValue);
    }
  });

  const results = await Promise.all(resultsPromises);

  // Risk scoring excludes error sources
  const scored = results.filter(s => ["malicious", "suspicious", "clean"].includes(s.status));
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

  return { sources: results, riskScore, riskLevel };
}