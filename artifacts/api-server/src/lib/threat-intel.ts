import fs from "fs";
import path from "path";

const SCAN_LOG_FILE = path.join(process.cwd(), "scan-results-log.json");

function logToConsole(platformName: string, requestData: any, responseData: any, error?: any) {
  console.log("\n" + "=".repeat(80));
  console.log(`🔍 ${platformName} - ${new Date().toISOString()}`);
  console.log("=".repeat(80));
  if (requestData) {
    console.log("📤 REQUEST:");
    console.log(JSON.stringify(requestData, null, 2));
  }
  if (error) {
    console.log("❌ ERROR:");
    console.log(JSON.stringify({ message: error.message, stack: error.stack }, null, 2));
  } else if (responseData) {
    console.log("📥 RESPONSE (FULL JSON):");
    console.log(JSON.stringify(responseData, null, 2));
  }
  console.log("=".repeat(80) + "\n");
}

function appendToScanLog(indicatorType: string, indicatorValue: string, platformName: string, result: any) {
  try {
    let existingLogs: any[] = [];
    if (fs.existsSync(SCAN_LOG_FILE)) {
      existingLogs = JSON.parse(fs.readFileSync(SCAN_LOG_FILE, "utf-8"));
    }
    existingLogs.push({
      timestamp: new Date().toISOString(),
      indicatorType,
      indicatorValue,
      platform: platformName,
      result
    });
    fs.writeFileSync(SCAN_LOG_FILE, JSON.stringify(existingLogs, null, 2));
  } catch (err) {
    console.error("Failed to write to scan log:", err);
  }
}

export interface ScanSourceResult {
  name: string;
  status: "clean" | "malicious" | "suspicious" | "unknown" | "error";
  detections?: number;
  totalEngines?: number;
  details?: string;
  url?: string;
  category?: string;
  isp?: string;
  asn?: string;
  location?: string;
  reports?: number;
  confidence?: number;
  usageType?: string;
  domain?: string;
  country?: string;
  city?: string;
  hostname?: string;
  maliciousEngines?: string[];
  suspiciousEngines?: string[];
  cleanEngines?: string[];
  unratedEngines?: string[];
  lastAnalysisDate?: string;
  asOwner?: string;
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

function configuredResult(name: string, category: string, url: string): ScanSourceResult {
  return {
    name,
    category,
    status: "clean",
    details: `${name} integration ready. API key configured. Full API integration coming soon.`,
    url: url,
  };
}

// ============================================
// VIRUSTOTAL
// ============================================
async function checkVirusTotal(type: string, value: string, apiKey?: string): Promise<ScanSourceResult> {
  const name = "VirusTotal";
  const category = "Multi-Engine Scanner";
  const vtUrl = `https://www.virustotal.com/gui/search/${encodeURIComponent(value)}`;

  if (!apiKey) {
    const result = notConfigured(name, vtUrl, category);
    logToConsole(name, { type, value, hasApiKey: false }, result);
    return result;
  }

  try {
    const endpoint = type === "ip" ? `https://www.virustotal.com/api/v3/ip_addresses/${encodeURIComponent(value)}`
      : type === "hash" ? `https://www.virustotal.com/api/v3/files/${encodeURIComponent(value)}`
      : `https://www.virustotal.com/api/v3/domains/${encodeURIComponent(value)}`;

    const resp = await fetch(endpoint, { headers: { "x-apikey": apiKey } });

    if (resp.status === 429) {
      const result = rateLimited(name, vtUrl, category);
      logToConsole(name, { endpoint }, { status: 429 });
      return result;
    }
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

    const data: any = await resp.json();
    const stats = data.data.attributes.last_analysis_stats;
    const mal = stats.malicious ?? 0;
    const sus = stats.suspicious ?? 0;
    const total = mal + sus + (stats.undetected ?? 0) + (stats.harmless ?? 0);

    const maliciousEngines: string[] = [];
    const suspiciousEngines: string[] = [];
    
    if (data.data.attributes.last_analysis_results) {
      const results = data.data.attributes.last_analysis_results;
      for (const [engine, info] of Object.entries(results) as any) {
        if (info.category === "malicious") maliciousEngines.push(engine);
        else if (info.category === "suspicious") suspiciousEngines.push(engine);
      }
    }

    const result: ScanSourceResult = {
      name, category,
      status: mal > 0 ? "malicious" : sus > 0 ? "suspicious" : "clean",
      detections: mal + sus, totalEngines: total,
      details: `${mal} malicious, ${sus} suspicious out of ${total} engines`,
      url: vtUrl,
      maliciousEngines: mal > 0 ? maliciousEngines.slice(0, 20) : undefined,
      suspiciousEngines: sus > 0 ? suspiciousEngines.slice(0, 20) : undefined,
    };

    logToConsole(name, { type, value }, { stats });
    appendToScanLog(type, value, name, { status: result.status, mal, sus });
    return result;
  } catch (e: any) {
    const result = { name, category, status: "error" as const, details: `Error: ${e.message}`, url: vtUrl };
    logToConsole(name, { type, value }, null, e);
    return result;
  }
}

// ============================================
// ABUSEIPDB
// ============================================
async function checkAbuseIPDB(value: string, apiKey?: string): Promise<ScanSourceResult> {
  const name = "AbuseIPDB";
  const category = "IP Reputation";
  const baseUrl = `https://www.abuseipdb.com/check/${encodeURIComponent(value)}`;

  if (!apiKey) {
    return notConfigured(name, baseUrl, category);
  }

  try {
    const url = `https://api.abuseipdb.com/api/v2/check?ipAddress=${encodeURIComponent(value)}&maxAgeInDays=365`;
    const resp = await fetch(url, { headers: { Key: apiKey, Accept: "application/json" } });

    if (resp.status === 429) return rateLimited(name, baseUrl, category);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

    const data: any = await resp.json();
    const abuseData = data.data;
    const score = abuseData.abuseConfidenceScore;
    const reports = abuseData.totalReports;
    
    const isp = abuseData.isp || "";
    const asn = abuseData.asn || "";
    const country = abuseData.countryCode || abuseData.countryName || "";
    const city = abuseData.city || "";
    const usageType = abuseData.usageType || "";
    const domain = abuseData.domain || "";
    const hostname = abuseData.hostname || "";
    const countryName = abuseData.countryName || "";
    
    const detailsParts = [
      `Abuse confidence: ${score}%`,
      `${reports} total reports`,
      isp ? `ISP: ${isp}` : "",
      asn ? `ASN: ${asn}` : "",
      usageType ? `Usage: ${usageType}` : "",
      countryName ? `Location: ${countryName}` : "",
      hostname ? `Hostname: ${hostname}` : "",
      domain ? `Domain: ${domain}` : ""
    ].filter(p => p);
    
    const details = detailsParts.join(" | ");
    
    logToConsole(name, { value }, data);

    const result: ScanSourceResult = {
      name, category,
      status: score > 50 ? "malicious" : score > 20 ? "suspicious" : "clean",
      detections: reports,
      reports: reports,
      confidence: score,
      details: details,
      url: baseUrl,
      isp: isp || undefined,
      asn: asn || undefined,
      country: countryName || country || undefined,
      city: city || undefined,
      usageType: usageType || undefined,
      domain: domain || undefined,
      hostname: hostname || undefined,
    };
    
    return result;
  } catch (e: any) {
    return { name, category, status: "error" as const, details: `Error: ${e.message}`, url: baseUrl };
  }
}

// ============================================
// ALIENVAULT OTX
// ============================================
async function checkAlienVaultOTX(type: string, value: string, apiKey?: string): Promise<ScanSourceResult> {
  const name = "AlienVault OTX";
  const category = "Threat Intelligence";
  const otxUrl = "https://otx.alienvault.com/browse/global/indicators";

  if (!apiKey) {
    return notConfigured(name, otxUrl, category);
  }

  try {
    const typeMap: Record<string, string> = { ip: "IPv4", url: "URL", domain: "domain", hash: "file" };
    const generalUrl = `https://otx.alienvault.com/api/v1/indicators/${typeMap[type] ?? "domain"}/${encodeURIComponent(value)}/general`;
    const resp = await fetch(generalUrl, { headers: { "X-OTX-API-KEY": apiKey } });

    if (resp.status === 429) return rateLimited(name, otxUrl, category);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

    const data: any = await resp.json();
    const pulses = data.pulse_info?.count ?? 0;
    const pulseList = data.pulse_info?.pulses?.slice(0, 15) || [];
    
    const pulseDetails = pulseList.map((pulse: any) => ({
      id: pulse.id,
      name: pulse.name,
      description: pulse.description?.substring(0, 300) || "",
      author: pulse.author?.username || pulse.author?.name || "Unknown",
      tags: pulse.tags?.slice(0, 10) || [],
      tlp: pulse.tlp || "Green",
    }));
    
    const allTags = pulseList.flatMap((pulse: any) => pulse.tags || []);
    const uniqueTags = [...new Set(allTags)].slice(0, 20);
    
    const result: any = {
      name, category,
      status: pulses > 5 ? "malicious" : pulses > 0 ? "suspicious" : "clean",
      detections: pulses,
      reports: pulses,
      details: `Found in ${pulses} OTX threat pulses`,
      url: `https://otx.alienvault.com/indicator/${typeMap[type]}/${encodeURIComponent(value)}`,
      pulseCount: pulses,
      pulseDetails: pulseDetails,
      relatedTags: uniqueTags,
    };
    
    return result;
  } catch (e: any) {
    return { name, category, status: "error" as const, details: `Error: ${e.message}`, url: otxUrl };
  }
}

// ============================================
// THREATFOX
// ============================================
async function checkThreatFox(value: string, indicatorType: string, apiKey?: string): Promise<ScanSourceResult> {
  const name = "ThreatFox";
  const category = "IOC Database";
  const tfUrl = `https://threatfox.abuse.ch/browse/`;

  if (!apiKey) {
    return notConfigured(name, tfUrl, category);
  }

  try {
    const resp = await fetch("https://threatfox-api.abuse.ch/api/v1/", {
      method: "POST",
      headers: { "Auth-Key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ query: "search_ioc", search_term: value, exact_match: true })
    });

    if (resp.status === 429) return rateLimited(name, tfUrl, category);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

    const data: any = await resp.json();
    logToConsole(name, { value }, data);

    if (data.query_status === "ok" && data.data && data.data.length > 0) {
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
        details: `Found in ThreatFox database. Malware: ${malware}, Confidence: ${confidence}%`,
        url: tfUrl,
      };
    }
    return { name, category, status: "clean", details: "No results found in ThreatFox database.", url: tfUrl };
  } catch (e: any) {
    return { name, category, status: "error" as const, details: `Error: ${e.message}`, url: tfUrl };
  }
}

// ============================================
// GREYNOISE
// ============================================
async function checkGreyNoise(value: string, apiKey?: string): Promise<ScanSourceResult> {
  const name = "GreyNoise";
  const category = "Internet Noise Analysis";
  const gnUrl = `https://viz.greynoise.io/ip/${encodeURIComponent(value)}`;

  if (!apiKey) {
    return notConfigured(name, gnUrl, category);
  }

  try {
    const resp = await fetch(`https://api.greynoise.io/v3/community/${encodeURIComponent(value)}`, {
      headers: { "key": apiKey }
    });

    if (resp.status === 429) return rateLimited(name, gnUrl, category);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

    const data: any = await resp.json();
    const classification = data.classification || "unknown";
    const noise = data.noise || false;
    
    let status: "clean" | "malicious" | "suspicious" = "clean";
    if (classification === "malicious") status = "malicious";
    else if (classification === "suspicious") status = "suspicious";
    
    logToConsole(name, { value }, data);

    return {
      name, category,
      status: status,
      details: `GreyNoise: ${classification} | Noise: ${noise}${data.name ? ` | Name: ${data.name}` : ""}`,
      url: gnUrl,
    };
  } catch (e: any) {
    return { name, category, status: "error" as const, details: `Error: ${e.message}`, url: gnUrl };
  }
}

// ============================================
// SHODAN
// ============================================
async function checkShodan(value: string, apiKey?: string): Promise<ScanSourceResult> {
  const name = "Shodan";
  const category = "Asset Discovery";
  const shodanUrl = `https://www.shodan.io/host/${encodeURIComponent(value)}`;

  if (!apiKey) {
    return notConfigured(name, shodanUrl, category);
  }

  try {
    const resp = await fetch(`https://api.shodan.io/shodan/host/${encodeURIComponent(value)}?key=${apiKey}`);

    if (resp.status === 429) return rateLimited(name, shodanUrl, category);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

    const data: any = await resp.json();
    const ports = data.ports?.length || 0;
    const vulnerabilities = data.vulns ? Object.keys(data.vulns).length : 0;
    
    logToConsole(name, { value }, data);

    return {
      name, category,
      status: vulnerabilities > 0 ? "suspicious" : "clean",
      detections: vulnerabilities,
      details: `${ports} open ports, ${vulnerabilities} vulnerabilities${data.org ? ` | ISP: ${data.org}` : ""}`,
      url: shodanUrl,
      isp: data.org,
      asn: data.asn,
    };
  } catch (e: any) {
    return { name, category, status: "error" as const, details: `Error: ${e.message}`, url: shodanUrl };
  }
}

// ============================================
// CENSYS
// ============================================
async function checkCensys(value: string, apiKey?: string): Promise<ScanSourceResult> {
  const name = "Censys";
  const category = "Asset Discovery";
  const censysUrl = `https://search.censys.io/hosts/${encodeURIComponent(value)}`;

  if (!apiKey) {
    return notConfigured(name, censysUrl, category);
  }

  try {
    // Censys v2 API requires different auth
    const [uid, secret] = (apiKey || ":").split(":");
    const auth = Buffer.from(`${uid}:${secret}`).toString("base64");
    
    const resp = await fetch(`https://search.censys.io/api/v2/hosts/${encodeURIComponent(value)}`, {
      headers: { "Authorization": `Basic ${auth}` }
    });

    if (resp.status === 429) return rateLimited(name, censysUrl, category);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

    const data: any = await resp.json();
    const protocols = data.result?.services?.length || 0;
    const location = data.result?.location?.country || "";
    
    logToConsole(name, { value }, data);

    return {
      name, category,
      status: "clean",
      details: `${protocols} services found${location ? ` | Location: ${location}` : ""}`,
      url: censysUrl,
      country: location,
    };
  } catch (e: any) {
    return { name, category, status: "error" as const, details: `Error: ${e.message}`, url: censysUrl };
  }
}

// ============================================
// IPINFO
// ============================================
async function checkIpInfo(value: string, apiKey?: string): Promise<ScanSourceResult> {
  const name = "IPinfo";
  const category = "IP Geolocation";
  const ipinfoUrl = `https://ipinfo.io/${encodeURIComponent(value)}`;

  if (!apiKey) {
    return notConfigured(name, ipinfoUrl, category);
  }

  try {
    const resp = await fetch(`https://ipinfo.io/${encodeURIComponent(value)}?token=${apiKey}`);

    if (resp.status === 429) return rateLimited(name, ipinfoUrl, category);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

    const data: any = await resp.json();
    
    logToConsole(name, { value }, data);

    return {
      name, category,
      status: "clean",
      details: `Location: ${data.city}, ${data.country} | ISP: ${data.org}`,
      url: ipinfoUrl,
      location: `${data.city}, ${data.country}`,
      country: data.country,
      city: data.city,
      isp: data.org,
      asn: data.asn,
    };
  } catch (e: any) {
    return { name, category, status: "error" as const, details: `Error: ${e.message}`, url: ipinfoUrl };
  }
}

// ============================================
// VPN PROXY DETECTION
// ============================================
async function checkVpnDetection(value: string): Promise<ScanSourceResult> {
  const name = "VPN Proxy Detection";
  const category = "VPN Detection";
  const url = `https://vpn-proxy-detection.ipify.org/`;

  try {
    const resp = await fetch(`https://vpn-proxy-detection.ipify.org/api/v1?ip=${value}`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

    const data: any = await resp.json();
    
    logToConsole(name, { value }, data);

    return {
      name, category,
      status: data.is_vpn ? "suspicious" : "clean",
      detections: data.is_vpn ? 1 : 0,
      details: `VPN Detected: ${data.is_vpn} | Proxy: ${data.is_proxy} | Tor: ${data.is_tor}`,
      url: url,
    };
  } catch (e: any) {
    return { name, category, status: "error" as const, details: `Error: ${e.message}`, url: url };
  }
}

// ============================================
// VPNAPI.IO
// ============================================
async function checkVpnApi(value: string, apiKey?: string): Promise<ScanSourceResult> {
  const name = "VPNAPI.io";
  const category = "VPN Detection";
  const url = `https://vpnapi.io`;

  if (!apiKey) {
    return notConfigured(name, url, category);
  }

  try {
    const resp = await fetch(`https://vpnapi.io/api/${value}?key=${apiKey}`);

    if (resp.status === 429) return rateLimited(name, url, category);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

    const data: any = await resp.json();
    const isVpn = data.security?.vpn || false;
    
    logToConsole(name, { value }, data);

    return {
      name, category,
      status: isVpn ? "suspicious" : "clean",
      detections: isVpn ? 1 : 0,
      details: `VPN: ${isVpn} | Proxy: ${data.security?.proxy} | Tor: ${data.security?.tor}`,
      url: url,
      location: `${data.location?.city}, ${data.location?.country}`,
      country: data.location?.country,
      city: data.location?.city,
    };
  } catch (e: any) {
    return { name, category, status: "error" as const, details: `Error: ${e.message}`, url: url };
  }
}

// ============================================
// IP2LOCATION
// ============================================
async function checkIp2Location(value: string, apiKey?: string): Promise<ScanSourceResult> {
  const name = "IP2Location";
  const category = "IP Geolocation";
  const url = `https://www.ip2location.io/demo/${value}`;

  if (!apiKey) {
    return notConfigured(name, url, category);
  }

  try {
    const resp = await fetch(`https://api.ip2location.io/?key=${apiKey}&ip=${value}`);

    if (resp.status === 429) return rateLimited(name, url, category);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

    const data: any = await resp.json();
    
    logToConsole(name, { value }, data);

    return {
      name, category,
      status: "clean",
      details: `Location: ${data.city_name}, ${data.country_name} | ISP: ${data.isp} | ASN: ${data.asn}`,
      url: url,
      location: `${data.city_name}, ${data.country_name}`,
      country: data.country_name,
      city: data.city_name,
      isp: data.isp,
      asn: data.asn,
    };
  } catch (e: any) {
    return { name, category, status: "error" as const, details: `Error: ${e.message}`, url: url };
  }
}

// ============================================
// IPGEOLOCATION.IO
// ============================================
async function checkIpGeolocation(value: string, apiKey?: string): Promise<ScanSourceResult> {
  const name = "ipgeolocation.io";
  const category = "IP Geolocation";
  const url = `https://ipgeolocation.io`;

  if (!apiKey) {
    return notConfigured(name, url, category);
  }

  try {
    const resp = await fetch(`https://api.ipgeolocation.io/ipgeo?apiKey=${apiKey}&ip=${value}`);

    if (resp.status === 429) return rateLimited(name, url, category);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

    const data: any = await resp.json();
    
    logToConsole(name, { value }, data);

    return {
      name, category,
      status: "clean",
      details: `Location: ${data.city}, ${data.country_name} | ISP: ${data.isp} | ASN: ${data.asn}`,
      url: url,
      location: `${data.city}, ${data.country_name}`,
      country: data.country_name,
      city: data.city,
      isp: data.isp,
      asn: data.asn,
    };
  } catch (e: any) {
    return { name, category, status: "error" as const, details: `Error: ${e.message}`, url: url };
  }
}

// ============================================
// IPSTACK
// ============================================
async function checkIpStack(value: string, apiKey?: string): Promise<ScanSourceResult> {
  const name = "ipstack";
  const category = "IP Geolocation";
  const url = `https://ipstack.com`;

  if (!apiKey) {
    return notConfigured(name, url, category);
  }

  try {
    const resp = await fetch(`http://api.ipstack.com/${value}?access_key=${apiKey}`);

    if (resp.status === 429) return rateLimited(name, url, category);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

    const data: any = await resp.json();
    
    logToConsole(name, { value }, data);

    return {
      name, category,
      status: "clean",
      details: `Location: ${data.city}, ${data.country_name} | ISP: ${data.connection?.isp}`,
      url: url,
      location: `${data.city}, ${data.country_name}`,
      country: data.country_name,
      city: data.city,
    };
  } catch (e: any) {
    return { name, category, status: "error" as const, details: `Error: ${e.message}`, url: url };
  }
}

// ============================================
// GEOLOCATION APIS (Free - No API Key)
// ============================================
async function checkIpApi(value: string): Promise<ScanSourceResult> {
  const name = "IP-API";
  const category = "IP Geolocation";
  const url = `http://ip-api.com/json/${value}`;
  
  try {
    const resp = await fetch(url);
    const data: any = await resp.json();
    
    if (data.status === "success") {
      return {
        name, category,
        status: "clean",
        details: `Location: ${data.city}, ${data.country} | ISP: ${data.isp} | ASN: ${data.as}`,
        url: `http://ip-api.com/#${value}`,
        location: `${data.city}, ${data.country}`,
        country: data.country,
        city: data.city,
        isp: data.isp,
        asn: data.as,
      };
    }
    return { name, category, status: "error", details: "Location not found", url: `http://ip-api.com/#${value}` };
  } catch (e: any) {
    return { name, category, status: "error", details: `Error: ${e.message}`, url: `http://ip-api.com/#${value}` };
  }
}

async function checkIpWho(value: string): Promise<ScanSourceResult> {
  const name = "IPWho";
  const category = "IP Geolocation";
  const url = `https://ipwho.is/${value}`;
  
  try {
    const resp = await fetch(url);
    const data: any = await resp.json();
    
    if (data && !data.error) {
      return {
        name, category,
        status: "clean",
        details: `Location: ${data.city}, ${data.country} | ISP: ${data.connection?.isp}`,
        url: `https://ipwho.is/${value}`,
        location: `${data.city}, ${data.country}`,
        country: data.country,
        city: data.city,
      };
    }
    return { name, category, status: "error", details: "Location not found", url: `https://ipwho.is/${value}` };
  } catch (e: any) {
    return { name, category, status: "error", details: `Error: ${e.message}`, url: `https://ipwho.is/${value}` };
  }
}

async function checkGeoJs(value: string): Promise<ScanSourceResult> {
  const name = "GeoJS";
  const category = "IP Geolocation";
  const url = `https://get.geojs.io/v1/ip/geo/${value}.json`;
  
  try {
    const resp = await fetch(url);
    const data: any = await resp.json();
    
    return {
      name, category,
      status: "clean",
      details: `Location: ${data.city}, ${data.country}`,
      url: `https://get.geojs.io/`,
      location: `${data.city}, ${data.country}`,
      country: data.country,
      city: data.city,
    };
  } catch (e: any) {
    return { name, category, status: "error", details: `Error: ${e.message}`, url: `https://get.geojs.io/` };
  }
}

async function checkIpapiCo(value: string): Promise<ScanSourceResult> {
  const name = "ipapi.co";
  const category = "IP Geolocation";
  const url = `https://ipapi.co/${value}/json/`;
  
  try {
    const resp = await fetch(url);
    const data: any = await resp.json();
    
    if (data && !data.error) {
      return {
        name, category,
        status: "clean",
        details: `Location: ${data.city}, ${data.country_name} | ISP: ${data.org}`,
        url: `https://ipapi.co/${value}`,
        location: `${data.city}, ${data.country_name}`,
        country: data.country_name,
        city: data.city,
      };
    }
    return { name, category, status: "error", details: "Location not found", url: `https://ipapi.co/${value}` };
  } catch (e: any) {
    return { name, category, status: "error", details: `Error: ${e.message}`, url: `https://ipapi.co/${value}` };
  }
}

async function checkFreeIpApi(value: string): Promise<ScanSourceResult> {
  const name = "FreeIPAPI";
  const category = "IP Geolocation";
  const url = `https://free.freeipapi.com/api/json/${value}`;
  
  try {
    const resp = await fetch(url);
    const data: any = await resp.json();
    
    return {
      name, category,
      status: "clean",
      details: `Location: ${data.cityName}, ${data.countryName}`,
      url: `https://free.freeipapi.com/`,
      location: `${data.cityName}, ${data.countryName}`,
      country: data.countryName,
      city: data.cityName,
    };
  } catch (e: any) {
    return { name, category, status: "error", details: `Error: ${e.message}`, url: `https://free.freeipapi.com/` };
  }
}

// ============================================
// ALL PLATFORMS - 18 TOTAL
// ============================================
const ALL_PLATFORMS: Array<{
  name: string;
  category: string;
  url: string;
  platformKey: string;
  types: string[];
  hasApi: boolean;
}> = [
  // Core Security Platforms
  { name: "VirusTotal", category: "Multi-Engine Scanner", url: "https://www.virustotal.com/gui/search/", platformKey: "virustotal", types: ["ip", "domain", "url", "hash"], hasApi: true },
  { name: "AbuseIPDB", category: "IP Reputation", url: "https://www.abuseipdb.com/check/", platformKey: "abuseipdb", types: ["ip"], hasApi: true },
  { name: "AlienVault OTX", category: "Threat Intelligence", url: "https://otx.alienvault.com/browse/global/indicators", platformKey: "alienvault_otx", types: ["ip", "domain", "url", "hash"], hasApi: true },
  { name: "ThreatFox", category: "IOC Database", url: "https://threatfox.abuse.ch/browse/", platformKey: "threatfox", types: ["ip", "domain", "url", "hash"], hasApi: true },
  { name: "GreyNoise", category: "Internet Noise Analysis", url: "https://viz.greynoise.io/ip/", platformKey: "greynoise", types: ["ip"], hasApi: true },
  { name: "Shodan", category: "Asset Discovery", url: "https://www.shodan.io/host/", platformKey: "shodan", types: ["ip"], hasApi: true },
  { name: "Censys", category: "Asset Discovery", url: "https://search.censys.io/hosts/", platformKey: "censys", types: ["ip"], hasApi: true },
  { name: "IPinfo", category: "IP Geolocation", url: "https://ipinfo.io/", platformKey: "ipinfo", types: ["ip"], hasApi: true },
  { name: "VPN Proxy Detection", category: "VPN Detection", url: "https://vpn-proxy-detection.ipify.org/", platformKey: "vpn_detection", types: ["ip"], hasApi: false },
  { name: "VPNAPI.io", category: "VPN Detection", url: "https://vpnapi.io", platformKey: "vpnapi", types: ["ip"], hasApi: true },
  
  // IP Geolocation APIs
  { name: "IP-API", category: "IP Geolocation", url: "http://ip-api.com/json/", platformKey: "ipapi", types: ["ip"], hasApi: false },
  { name: "IPWho", category: "IP Geolocation", url: "https://ipwho.is/", platformKey: "ipwho", types: ["ip"], hasApi: false },
  { name: "GeoJS", category: "IP Geolocation", url: "https://get.geojs.io/v1/ip/geo/", platformKey: "geojs", types: ["ip"], hasApi: false },
  { name: "ipapi.co", category: "IP Geolocation", url: "https://ipapi.co/", platformKey: "ipapi_co", types: ["ip"], hasApi: false },
  { name: "FreeIPAPI", category: "IP Geolocation", url: "https://free.freeipapi.com/api/json/", platformKey: "freeipapi", types: ["ip"], hasApi: false },
  { name: "IP2Location", category: "IP Geolocation", url: "https://www.ip2location.io/demo/", platformKey: "ip2location", types: ["ip"], hasApi: true },
  { name: "ipgeolocation.io", category: "IP Geolocation", url: "https://ipgeolocation.io", platformKey: "ipgeolocation", types: ["ip"], hasApi: true },
  { name: "ipstack", category: "IP Geolocation", url: "https://ipstack.com", platformKey: "ipstack", types: ["ip"], hasApi: true },
];

// ============================================
// MAIN SCAN FUNCTION
// ============================================
export async function runThreatScan(
  indicatorType: string,
  indicatorValue: string,
  apiKeysMap: Record<string, string>
): Promise<{ sources: ScanSourceResult[]; riskScore: number; riskLevel: "high" | "medium" | "low" | "unknown" }> {

  console.log("\n" + "█".repeat(80));
  console.log(`🚨 NEW THREAT SCAN INITIATED`);
  console.log(`   Type: ${indicatorType}`);
  console.log(`   Value: ${indicatorValue}`);
  console.log(`   Time: ${new Date().toISOString()}`);
  console.log(`   API Keys Configured: ${Object.keys(apiKeysMap).join(", ") || "None"}`);
  console.log("█".repeat(80) + "\n");

  const relevantPlatforms = ALL_PLATFORMS.filter(p => p.types.includes(indicatorType));
  console.log(`📋 Platforms to check (${relevantPlatforms.length}): ${relevantPlatforms.map(p => p.name).join(", ")}\n`);

  const resultsPromises = relevantPlatforms.map(async (platform) => {
    const apiKey = apiKeysMap[platform.platformKey];
    
    if (!apiKey && platform.hasApi) {
      return notConfigured(platform.name, platform.url + indicatorValue, platform.category);
    }

    switch (platform.platformKey) {
      case "virustotal":
        return checkVirusTotal(indicatorType, indicatorValue, apiKey);
      case "abuseipdb":
        if (indicatorType === "ip") return checkAbuseIPDB(indicatorValue, apiKey);
        return notConfigured(platform.name, platform.url + indicatorValue, platform.category);
      case "alienvault_otx":
        return checkAlienVaultOTX(indicatorType, indicatorValue, apiKey);
      case "threatfox":
        return checkThreatFox(indicatorValue, indicatorType, apiKey);
      case "greynoise":
        return checkGreyNoise(indicatorValue, apiKey);
      case "shodan":
        return checkShodan(indicatorValue, apiKey);
      case "censys":
        return checkCensys(indicatorValue, apiKey);
      case "ipinfo":
        return checkIpInfo(indicatorValue, apiKey);
      case "vpn_detection":
        return checkVpnDetection(indicatorValue);
      case "vpnapi":
        return checkVpnApi(indicatorValue, apiKey);
      case "ip2location":
        return checkIp2Location(indicatorValue, apiKey);
      case "ipgeolocation":
        return checkIpGeolocation(indicatorValue, apiKey);
      case "ipstack":
        return checkIpStack(indicatorValue, apiKey);
      case "ipapi":
        return checkIpApi(indicatorValue);
      case "ipwho":
        return checkIpWho(indicatorValue);
      case "geojs":
        return checkGeoJs(indicatorValue);
      case "ipapi_co":
        return checkIpapiCo(indicatorValue);
      case "freeipapi":
        return checkFreeIpApi(indicatorValue);
      default:
        return configuredResult(platform.name, platform.category, platform.url + indicatorValue);
    }
  });

  const results = await Promise.all(resultsPromises);

  console.log("\n" + "📊".repeat(40));
  console.log("FINAL AGGREGATED RESULTS");
  console.log("📊".repeat(40) + "\n");
  
  for (const result of results) {
    console.log(`\n🔸 ${result.name} [${result.category || "No Category"}]`);
    console.log(`   Status: ${result.status}`);
    console.log(`   Details: ${result.details}`);
    if (result.detections) console.log(`   Detections: ${result.detections}`);
    if (result.url) console.log(`   URL: ${result.url}`);
    if (result.location) console.log(`   Location: ${result.location}`);
    if (result.isp) console.log(`   ISP: ${result.isp}`);
    if (result.asn) console.log(`   ASN: ${result.asn}`);
  }

  const scored = results.filter(s => ["malicious", "suspicious", "clean"].includes(s.status));
  const malCount = scored.filter(s => s.status === "malicious").length;
  const susCount = scored.filter(s => s.status === "suspicious").length;
  const cleanCount = scored.filter(s => s.status === "clean").length;
  const scoredTotal = scored.length;

  let riskScore = 0;
  if (scoredTotal > 0) {
    riskScore = Math.min(100, Math.round((malCount * 100 + susCount * 40) / scoredTotal));
  }

  const riskLevel = malCount > 0 || riskScore >= 70 ? "high"
    : susCount > 0 || riskScore >= 30 ? "medium"
    : cleanCount > 0 ? "low"
    : "unknown";

  console.log("\n" + "🎯".repeat(40));
  console.log("RISK CALCULATION SUMMARY");
  console.log("🎯".repeat(40));
  console.log(`   Malicious: ${malCount}`);
  console.log(`   Suspicious: ${susCount}`);
  console.log(`   Clean: ${cleanCount}`);
  console.log(`   Total Scored: ${scoredTotal}`);
  console.log(`   Risk Score: ${riskScore}/100`);
  console.log(`   Risk Level: ${riskLevel.toUpperCase()}`);
  console.log("=".repeat(80) + "\n");

  const fullScanResult = {
    timestamp: new Date().toISOString(),
    indicator: { type: indicatorType, value: indicatorValue },
    summary: { malCount, susCount, cleanCount, scoredTotal, riskScore, riskLevel },
    sources: results
  };
  
  appendToScanLog(indicatorType, indicatorValue, "COMPLETE_SCAN", fullScanResult);

  return { sources: results, riskScore, riskLevel };
}








