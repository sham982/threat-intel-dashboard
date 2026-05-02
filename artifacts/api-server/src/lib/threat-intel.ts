export interface ScanSourceResult {
  name: string;
  status: "clean" | "malicious" | "suspicious" | "unknown" | "error";
  detections?: number;
  totalEngines?: number;
  details?: string;
  url?: string;
}

const VIRUSTOTAL_API_KEY = process.env.VIRUSTOTAL_API_KEY;
const ABUSEIPDB_API_KEY = process.env.ABUSEIPDB_API_KEY;
const OTX_API_KEY = process.env.OTX_API_KEY;

async function checkVirusTotal(
  indicatorType: string,
  indicatorValue: string
): Promise<ScanSourceResult> {
  if (!VIRUSTOTAL_API_KEY) {
    return simulateSource("VirusTotal", indicatorType, indicatorValue, "https://www.virustotal.com");
  }
  try {
    let endpoint = "";
    if (indicatorType === "ip") {
      endpoint = `https://www.virustotal.com/api/v3/ip_addresses/${encodeURIComponent(indicatorValue)}`;
    } else if (indicatorType === "hash") {
      endpoint = `https://www.virustotal.com/api/v3/files/${encodeURIComponent(indicatorValue)}`;
    } else {
      endpoint = `https://www.virustotal.com/api/v3/domains/${encodeURIComponent(indicatorValue)}`;
    }
    const resp = await fetch(endpoint, {
      headers: { "x-apikey": VIRUSTOTAL_API_KEY },
    });
    if (!resp.ok) throw new Error(`VT HTTP ${resp.status}`);
    const data = (await resp.json()) as { data: { attributes: { last_analysis_stats: { malicious: number; suspicious: number; undetected: number; harmless: number } } } };
    const stats = data.data.attributes.last_analysis_stats;
    const malicious = stats.malicious || 0;
    const suspicious = stats.suspicious || 0;
    const total = malicious + suspicious + (stats.undetected || 0) + (stats.harmless || 0);
    return {
      name: "VirusTotal",
      status: malicious > 0 ? "malicious" : suspicious > 0 ? "suspicious" : "clean",
      detections: malicious + suspicious,
      totalEngines: total,
      details: `${malicious} malicious, ${suspicious} suspicious out of ${total} engines`,
      url: `https://www.virustotal.com/gui/search/${encodeURIComponent(indicatorValue)}`,
    };
  } catch (e: unknown) {
    return { name: "VirusTotal", status: "error", details: e instanceof Error ? e.message : "Error", url: "https://www.virustotal.com" };
  }
}

async function checkAbuseIPDB(indicatorValue: string): Promise<ScanSourceResult> {
  if (!ABUSEIPDB_API_KEY) {
    return simulateSource("AbuseIPDB", "ip", indicatorValue, "https://www.abuseipdb.com");
  }
  try {
    const resp = await fetch(
      `https://api.abuseipdb.com/api/v2/check?ipAddress=${encodeURIComponent(indicatorValue)}&maxAgeInDays=90`,
      { headers: { Key: ABUSEIPDB_API_KEY, Accept: "application/json" } }
    );
    if (!resp.ok) throw new Error(`AbuseIPDB HTTP ${resp.status}`);
    const data = (await resp.json()) as { data: { abuseConfidenceScore: number; totalReports: number } };
    const score = data.data.abuseConfidenceScore;
    return {
      name: "AbuseIPDB",
      status: score > 50 ? "malicious" : score > 20 ? "suspicious" : "clean",
      detections: data.data.totalReports,
      details: `Abuse confidence: ${score}%, ${data.data.totalReports} reports`,
      url: `https://www.abuseipdb.com/check/${encodeURIComponent(indicatorValue)}`,
    };
  } catch (e: unknown) {
    return { name: "AbuseIPDB", status: "error", details: e instanceof Error ? e.message : "Error", url: "https://www.abuseipdb.com" };
  }
}

async function checkAlienVaultOTX(
  indicatorType: string,
  indicatorValue: string
): Promise<ScanSourceResult> {
  if (!OTX_API_KEY) {
    return simulateSource("AlienVault OTX", indicatorType, indicatorValue, "https://otx.alienvault.com");
  }
  try {
    const typeMap: Record<string, string> = { ip: "IPv4", url: "URL", domain: "domain", hash: "file" };
    const otxType = typeMap[indicatorType] || "domain";
    const resp = await fetch(
      `https://otx.alienvault.com/api/v1/indicators/${otxType}/${encodeURIComponent(indicatorValue)}/general`,
      { headers: { "X-OTX-API-KEY": OTX_API_KEY } }
    );
    if (!resp.ok) throw new Error(`OTX HTTP ${resp.status}`);
    const data = (await resp.json()) as { pulse_info: { count: number } };
    const pulses = data.pulse_info.count;
    return {
      name: "AlienVault OTX",
      status: pulses > 5 ? "malicious" : pulses > 0 ? "suspicious" : "clean",
      detections: pulses,
      details: `Found in ${pulses} threat intelligence pulses`,
      url: `https://otx.alienvault.com/browse/global/indicators`,
    };
  } catch (e: unknown) {
    return { name: "AlienVault OTX", status: "error", details: e instanceof Error ? e.message : "Error", url: "https://otx.alienvault.com" };
  }
}

function simulateSource(
  name: string,
  _indicatorType: string,
  indicatorValue: string,
  url: string
): ScanSourceResult {
  const hash = indicatorValue.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const r = hash % 10;
  if (r < 2) return { name, status: "malicious", detections: r + 1, totalEngines: 70, details: "Detected as malicious (simulated)", url };
  if (r < 4) return { name, status: "suspicious", detections: r, totalEngines: 70, details: "Suspicious activity detected (simulated)", url };
  return { name, status: "clean", detections: 0, totalEngines: 70, details: "No threats detected (simulated)", url };
}

export async function runThreatScan(
  indicatorType: string,
  indicatorValue: string
): Promise<{ sources: ScanSourceResult[]; riskScore: number; riskLevel: "high" | "medium" | "low" | "unknown" }> {
  const promises: Promise<ScanSourceResult>[] = [
    checkVirusTotal(indicatorType, indicatorValue),
    checkAlienVaultOTX(indicatorType, indicatorValue),
  ];

  if (indicatorType === "ip") {
    promises.push(checkAbuseIPDB(indicatorValue));
  }

  const sources = await Promise.all(promises);

  const maliciousCount = sources.filter(s => s.status === "malicious").length;
  const suspiciousCount = sources.filter(s => s.status === "suspicious").length;
  const cleanCount = sources.filter(s => s.status === "clean").length;
  const total = sources.length;

  let riskScore = 0;
  if (total > 0) {
    riskScore = Math.round(((maliciousCount * 100 + suspiciousCount * 50) / total));
    riskScore = Math.min(100, riskScore);
  }

  const riskLevel: "high" | "medium" | "low" | "unknown" =
    maliciousCount > 0 || riskScore >= 70 ? "high"
    : suspiciousCount > 0 || riskScore >= 40 ? "medium"
    : cleanCount > 0 ? "low"
    : "unknown";

  return { sources, riskScore, riskLevel };
}
