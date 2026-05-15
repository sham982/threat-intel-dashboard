import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Eye, EyeOff, Key, CheckCircle2, Trash2, Save, ExternalLink,
  Plus, ChevronUp, ChevronDown, Server, Globe, Shield, BookOpen, Search, X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getAuthHeaders } from "@/lib/api-client";

// Complete SOC Cheatsheet Data organized by category - CLEAN VERSION (18 platforms)
const PLATFORMS_BY_CATEGORY: Record<string, Array<{ id: string; name: string; description: string; url: string; color: string; hasApi: boolean }>> = {
  ip_check: [
    // Core Security Platforms
    { id: "virustotal", name: "VirusTotal", description: "Multi-engine antivirus and threat intelligence platform", url: "https://www.virustotal.com", color: "text-blue-400", hasApi: true },
    { id: "abuseipdb", name: "AbuseIPDB", description: "IP reputation and abuse reporting database", url: "https://www.abuseipdb.com/", color: "text-orange-400", hasApi: true },
    { id: "alienvault_otx", name: "AlienVault OTX", description: "Open Threat Exchange - community threat intelligence", url: "https://otx.alienvault.com/browse/global/indicators", color: "text-green-400", hasApi: true },
    { id: "threatfox", name: "ThreatFox", description: "IOC sharing platform for malware indicators", url: "https://threatfox.abuse.ch/browse/", color: "text-amber-400", hasApi: true },
    { id: "greynoise", name: "GreyNoise", description: "Classify IPs scanning the internet", url: "https://viz.greynoise.io", color: "text-cyan-400", hasApi: false },
    { id: "shodan", name: "Shodan", description: "Search engine for internet-connected devices", url: "https://www.shodan.io/", color: "text-yellow-400", hasApi: false },
    { id: "censys", name: "Censys", description: "Internet-wide scan data", url: "https://censys.io/ipv4", color: "text-purple-400", hasApi: false },
    { id: "ipinfo", name: "IPinfo", description: "IP geolocation, ASN, carrier data", url: "https://ipinfo.io/", color: "text-emerald-400", hasApi: false },
    { id: "vpn_detection", name: "VPN Proxy Detection", description: "VPN and proxy detection API", url: "https://vpn-proxy-detection.ipify.org/", color: "text-gray-400", hasApi: false },
    { id: "vpnapi", name: "VPNAPI.io", description: "VPN detection API", url: "https://vpnapi.io/", color: "text-gray-400", hasApi: false },
    
    // IP Geolocation APIs
    { id: "ipapi", name: "IP-API", description: "IP geolocation, ISP, and ASN data", url: "http://ip-api.com/", color: "text-blue-300", hasApi: false },
    { id: "ipwho", name: "IPWho", description: "IP geolocation, ASN, and timezone", url: "https://ipwho.is/", color: "text-green-300", hasApi: false },
    { id: "geojs", name: "GeoJS", description: "Simple IP geolocation API", url: "https://get.geojs.io/", color: "text-purple-300", hasApi: false },
    { id: "ipapi_co", name: "ipapi.co", description: "IP geolocation and ASN data", url: "https://ipapi.co/", color: "text-teal-300", hasApi: false },
    { id: "freeipapi", name: "FreeIPAPI", description: "Free IP geolocation API", url: "https://free.freeipapi.com/", color: "text-indigo-300", hasApi: false },
    { id: "ip2location", name: "IP2Location", description: "IP geolocation with API key", url: "https://www.ip2location.io/", color: "text-amber-300", hasApi: true },
    { id: "ipgeolocation", name: "ipgeolocation.io", description: "IP geolocation with timezone", url: "https://ipgeolocation.io/", color: "text-cyan-300", hasApi: true },
    { id: "ipstack", name: "ipstack", description: "IP geolocation API", url: "https://ipstack.com/", color: "text-orange-300", hasApi: true },
  ],
  url_check: [
    { id: "virustotal_url", name: "VirusTotal", description: "Multi-engine URL scanner", url: "https://www.virustotal.com", color: "text-blue-400", hasApi: true },
    { id: "alienvault_otx_url", name: "AlienVault OTX", description: "URL reputation and threat data", url: "https://otx.alienvault.com/browse/global/indicators", color: "text-green-400", hasApi: true },
    { id: "securitytrails", name: "SecurityTrails", description: "Historical DNS, WHOIS, IP and subdomain intelligence", url: "https://securitytrails.com/", color: "text-sky-400", hasApi: false },
    { id: "urlhaus", name: "URLHaus", description: "Malware distribution URL database and live feed", url: "https://urlhaus.abuse.ch/browse/", color: "text-lime-400", hasApi: false },
    { id: "urlscan", name: "URLScan.io", description: "Sandbox-style URL scanner with screenshot and DOM analysis", url: "https://urlscan.io/", color: "text-pink-400", hasApi: false },
    { id: "sucuri", name: "Sucuri SiteCheck", description: "Remote website malware scanner and blocklist checker", url: "https://sitecheck.sucuri.net/", color: "text-green-300", hasApi: false },
    { id: "threatfox_url", name: "ThreatFox", description: "URL indicators for malware", url: "https://threatfox.abuse.ch/browse/", color: "text-amber-400", hasApi: true },
    { id: "wheregoes", name: "WhereGoes", description: "URL redirect tracer", url: "https://wheregoes.com/", color: "text-gray-400", hasApi: false },
    { id: "redirectdetective", name: "RedirectDetective", description: "URL redirect analysis tool", url: "https://redirectdetective.com/", color: "text-gray-400", hasApi: false },
    { id: "redirecttracker", name: "RedirectTracker", description: "Track URL redirect chains", url: "https://www.redirecttracker.com/", color: "text-gray-400", hasApi: false },
    { id: "bulkblacklist", name: "BulkBlacklist", description: "Bulk blacklist check for domains", url: "https://www.bulkblacklist.com/", color: "text-gray-400", hasApi: false },
    { id: "docguard", name: "DocGuard", description: "Document security and URL scanner", url: "https://app.docguard.io/", color: "text-gray-400", hasApi: false },
  ],
  malware_check: [
    { id: "virustotal_malware", name: "VirusTotal", description: "Multi-engine malware scanner", url: "https://www.virustotal.com", color: "text-blue-400", hasApi: true },
    { id: "alienvault_otx_malware", name: "AlienVault OTX", description: "Malware intelligence pulses", url: "https://otx.alienvault.com/browse/global/indicators", color: "text-green-400", hasApi: true },
    { id: "threatfox_malware", name: "ThreatFox", description: "Malware IOC sharing platform", url: "https://threatfox.abuse.ch/browse/", color: "text-amber-400", hasApi: true },
    { id: "malwarebazaar", name: "Malware Bazaar", description: "Malware sample sharing database", url: "https://bazaar.abuse.ch/browse/", color: "text-orange-300", hasApi: false },
    { id: "hybridanalysis", name: "Hybrid Analysis", description: "Free malware sandbox with Threat Score", url: "https://www.hybrid-analysis.com/", color: "text-fuchsia-400", hasApi: false },
    { id: "anyrun", name: "Any.run", description: "Interactive malware sandbox with live task analysis", url: "https://app.any.run/", color: "text-violet-400", hasApi: false },
    { id: "joesandbox", name: "Joe Sandbox", description: "Deep malware analysis with multiple OS support", url: "https://www.joesandbox.com/#windows", color: "text-amber-300", hasApi: false },
    { id: "intezer", name: "Intezer", description: "Code DNA analysis for malware reuse detection", url: "https://analyze.intezer.com/scan", color: "text-blue-300", hasApi: false },
    { id: "triage", name: "Triage", description: "Malware analysis platform", url: "https://tria.ge/reports/public", color: "text-gray-400", hasApi: false },
    { id: "cape", name: "CAPE Sandbox", description: "Malware sandbox", url: "https://capesandbox.com/", color: "text-gray-400", hasApi: false },
  ],
  cyber_threat_intelligence: [
    { id: "vuldb", name: "VulDB", description: "Vulnerability database", url: "https://vuldb.com/", color: "text-red-400", hasApi: false },
    { id: "alienvault_cti", name: "AlienVault OTX", description: "Open Threat Exchange", url: "https://otx.alienvault.com/browse/global/indicators", color: "text-green-400", hasApi: true },
    { id: "ibm_xforce", name: "IBM X-Force Exchange", description: "Threat intelligence exchange", url: "https://exchange.xforce.ibmcloud.com/", color: "text-slate-400", hasApi: false },
    { id: "feedly", name: "Feedly", description: "Threat intelligence feed reader", url: "https://feedly.com/", color: "text-gray-400", hasApi: false },
    { id: "inoreader", name: "Inoreader", description: "RSS feed reader", url: "https://www.inoreader.com/", color: "text-gray-400", hasApi: false },
    { id: "malpedia", name: "Malpedia", description: "Malware reference library", url: "https://malpedia.caad.fkie.fraunhofer.de/", color: "text-purple-300", hasApi: false },
    { id: "intelx", name: "IntelX", description: "OSINT search engine", url: "https://intelx.io/tools?tab=general", color: "text-cyan-300", hasApi: false },
    { id: "sans", name: "SANS ISC", description: "Internet Storm Center", url: "https://isc.sans.edu/", color: "text-gray-400", hasApi: false },
    { id: "mandiant", name: "Mandiant", description: "Enterprise threat intelligence", url: "https://www.mandiant.com/advantage/threat-intelligence/free-version", color: "text-red-500", hasApi: false },
    { id: "crowdstrike", name: "CrowdStrike", description: "Adversary intelligence", url: "https://www.crowdstrike.com/adversaries/", color: "text-orange-500", hasApi: false },
    { id: "mitre", name: "MITRE ATT&CK", description: "Adversarial tactics and techniques knowledge base", url: "https://attack.mitre.org/", color: "text-red-400", hasApi: false },
  ],
};

type SavedKey = {
  id: number;
  platform: string;
  label: string | null;
  priority: number;
  updatedAt: string;
  apiKey: string;
  _visible?: boolean;
};

type AddFormState = { apiKey: string; label: string; saving: boolean };

function KeyRow({ k, total, onDelete, onMove, onToggle }: {
  k: SavedKey; total: number;
  onDelete: (id: number) => void;
  onMove: (id: number, dir: "up" | "down") => void;
  onToggle: (id: number) => void;
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 group">
      <Badge variant="outline" className="shrink-0 font-mono text-[9px] uppercase border-gray-300 text-gray-500 min-w-10.5 justify-center">
        #{k.priority + 1}
      </Badge>
      <Key className="w-3 h-3 text-gray-400 shrink-0" />
      <span className="font-mono text-xs text-gray-600 flex-1 truncate">
        {k._visible ? k.apiKey : "••••••••••••••••"}
      </span>
      {k.label && (
        <span className="font-mono text-[10px] text-gray-400 truncate max-w-20 hidden sm:block">{k.label}</span>
      )}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => onToggle(k.id)} className="text-gray-400 hover:text-gray-600 transition-colors p-0.5">
          {k._visible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
        </button>
        <button onClick={() => onMove(k.id, "up")} disabled={k.priority === 0} className="text-gray-400 hover:text-gray-600 disabled:opacity-25 transition-colors p-0.5">
          <ChevronUp className="w-3 h-3" />
        </button>
        <button onClick={() => onMove(k.id, "down")} disabled={k.priority === total - 1} className="text-gray-400 hover:text-gray-600 disabled:opacity-25 transition-colors p-0.5">
          <ChevronDown className="w-3 h-3" />
        </button>
        <button onClick={() => onDelete(k.id)} className="text-gray-400 hover:text-red-500 transition-colors p-0.5">
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

function PlatformCard({ platform, keys, onDelete, onMove, onAdd, onToggle }: {
  platform: { id: string; name: string; description: string; url: string; color: string; hasApi: boolean };
  keys: SavedKey[];
  onDelete: (id: number) => void;
  onMove: (id: number, dir: "up" | "down") => void;
  onAdd: (platformId: string, apiKey: string, label: string) => Promise<void>;
  onToggle: (id: number) => void;
}) {
  const [form, setForm] = useState<AddFormState>({ apiKey: "", label: "", saving: false });
  const [showForm, setShowForm] = useState(keys.length === 0);

  const handleAdd = async () => {
    if (!form.apiKey.trim()) return;
    setForm(f => ({ ...f, saving: true }));
    await onAdd(platform.id, form.apiKey.trim(), form.label.trim());
    setForm({ apiKey: "", label: "", saving: false });
    setShowForm(false);
  };

  return (
    <Card className={`bg-white border ${keys.length > 0 ? "border-green-200" : "border-gray-200"} shadow-sm hover:shadow-md transition-all`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className={`text-sm font-mono uppercase tracking-wide ${platform.color}`}>
              {platform.name}
            </CardTitle>
            {keys.length > 0 && (
              <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200 text-[10px] font-mono">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                {keys.length} key{keys.length !== 1 ? "s" : ""}
              </Badge>
            )}
            {platform.hasApi && (
              <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200 text-[9px] font-mono">
                API Ready
              </Badge>
            )}
          </div>
          <a href={platform.url} target="_blank" rel="noopener noreferrer"
            className="text-[11px] text-gray-400 hover:text-[#8bc74c] flex items-center gap-1 font-mono transition-colors shrink-0">
            Launch <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        <CardDescription className="text-xs text-gray-500">{platform.description}</CardDescription>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        {keys.map(k => (
          <KeyRow key={k.id} k={k} total={keys.length} onDelete={onDelete} onMove={onMove} onToggle={onToggle} />
        ))}
        {showForm ? (
          <div className="flex gap-2 pt-2 border-t border-gray-100">
            <Input id="api-key-input" name="apiKey" type="password" placeholder="Paste API key..." value={form.apiKey} onChange={e => setForm(f => ({ ...f, apiKey: e.target.value }))} className="font-mono bg-gray-50 border-gray-200 text-xs flex-1" onKeyDown={e => e.key === "Enter" && handleAdd()} />
            <Input id={`api-label-${platform.id}`} name="label" type="text" placeholder="Label (optional)" value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} className="font-mono bg-gray-50 border-gray-200 text-xs w-28 hidden sm:block" />
            <Button size="sm" onClick={handleAdd} disabled={form.saving || !form.apiKey.trim()} className="font-mono text-xs uppercase bg-[#8bc74c] hover:bg-[#7ab33d] shrink-0">
              <Save className="w-3 h-3 mr-1" />
              {form.saving ? "Saving..." : "Save"}
            </Button>
            {keys.length > 0 && (
              <Button size="sm" variant="ghost" onClick={() => setShowForm(false)} className="shrink-0 text-gray-400">
                Cancel
              </Button>
            )}
          </div>
        ) : (
          <Button size="sm" variant="outline" onClick={() => setShowForm(true)}
            className="w-full font-mono text-xs text-gray-500 border-dashed border-gray-300 hover:border-[#8bc74c] hover:text-[#8bc74c]">
            <Plus className="w-3 h-3 mr-1" /> Add API Key
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [savedKeys, setSavedKeys] = useState<SavedKey[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("ip_check");
  const [searchTerm, setSearchTerm] = useState<string>("");

  const handleCategoryChange = (category: string) => {
    setActiveCategory(category);
    setSearchTerm("");
  };

  const clearSearch = () => {
    setSearchTerm("");
  };

  const fetchKeys = useCallback(async () => {
    try {
      const res = await fetch("/api/user/api-keys", { headers: getAuthHeaders() });
      if (!res.ok) return;
      setSavedKeys(await res.json());
    } catch {}
  }, []);

  useEffect(() => { fetchKeys(); }, [fetchKeys]);

  const keysByPlatform = (platformId: string) =>
    savedKeys.filter(k => k.platform === platformId).sort((a, b) => a.priority - b.priority);

  const handleAdd = async (platformId: string, apiKey: string, label: string) => {
    try {
      const res = await fetch("/api/user/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ platform: platformId, apiKey, label }),
      });
      if (!res.ok) throw new Error("Failed");
      toast({ title: "Key added", description: `Saved for ${platformId}` });
      await fetchKeys();
    } catch {
      toast({ title: "Failed to save key", variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Remove this API key?")) return;
    try {
      const res = await fetch(`/api/user/api-keys/${id}`, { method: "DELETE", headers: getAuthHeaders() });
      if (!res.ok) throw new Error("Failed");
      toast({ title: "Key removed" });
      await fetchKeys();
    } catch {
      toast({ title: "Failed to remove key", variant: "destructive" });
    }
  };

  const handleMove = async (id: number, direction: "up" | "down") => {
    try {
      await fetch(`/api/user/api-keys/${id}/priority`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ direction }),
      });
      await fetchKeys();
    } catch {
      toast({ title: "Failed to reorder keys", variant: "destructive" });
    }
  };

  const handleToggle = (id: number) => {
    setSavedKeys(keys => keys.map(k => k.id === id ? { ...k, _visible: !k._visible } : k));
  };

  const categories = [
    { id: "ip_check", name: "IP Tools", icon: Server, count: 18 },
    { id: "url_check", name: "URL & Domain", icon: Globe, count: 11 },
    { id: "malware_check", name: "Malware Analysis", icon: Shield, count: 10 },
    { id: "cyber_threat_intelligence", name: "CTI Sources", icon: BookOpen, count: 11 },
  ];

  const currentPlatforms = PLATFORMS_BY_CATEGORY[activeCategory] || [];
  const filteredPlatforms = currentPlatforms.filter(p =>
    searchTerm === "" || p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalConfigured = savedKeys.length;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-1 h-8 bg-linear-to-b from-[#8bc74c] to-[#1bb7b6] rounded-full" />
            <h1 className="text-2xl font-bold tracking-tight">API Keys Configuration</h1>
          </div>
          <Badge variant="outline" className="font-mono text-[#8bc74c] border-[#8bc74c]/30">
            {totalConfigured} Key{totalConfigured !== 1 ? "s" : ""} Configured
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground font-mono tracking-widest ml-3">
          MANAGE API KEYS FOR THREAT INTELLIGENCE SOURCES
        </p>
      </div>

      <Card className="bg-linear-to-r from-[#8bc74c]/5 to-[#1bb7b6]/5 border-[#8bc74c]/20">
        <CardContent className="p-4 flex items-start gap-3">
          <Key className="w-4 h-4 text-[#8bc74c] mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p className="text-sm font-medium">Threat Intelligence Sources</p>
            <p className="text-xs text-muted-foreground font-mono leading-relaxed">
              Configure API keys for threat intelligence platforms. Keys are encrypted and stored securely.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-2">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => handleCategoryChange(cat.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-sm transition-all ${
                isActive
                  ? "bg-[#8bc74c] text-white shadow-md"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Icon className="w-4 h-4" />
              {cat.name}
              <Badge className={`ml-1 text-[10px] ${isActive ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"}`}>
                {cat.count}
              </Badge>
            </button>
          );
        })}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input id="search-platforms" name="search" placeholder="Search platforms..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 pr-8 font-mono text-sm border-gray-200 focus:border-[#8bc74c]" />
        {searchTerm && (
          <button onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredPlatforms.map(platform => (
          <PlatformCard
            key={platform.id}
            platform={platform}
            keys={keysByPlatform(platform.id)}
            onDelete={handleDelete}
            onMove={handleMove}
            onAdd={handleAdd}
            onToggle={handleToggle}
          />
        ))}
      </div>

      {filteredPlatforms.length === 0 && searchTerm !== "" && (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-gray-500 font-mono">No platforms found matching "{searchTerm}"</p>
        </div>
      )}
    </div>
  );
}
