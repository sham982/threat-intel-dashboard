import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Eye, EyeOff, Key, CheckCircle2, Trash2, Save, ExternalLink,
  Plus, ChevronUp, ChevronDown, AlertCircle, Settings2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getAuthHeaders } from "@/lib/api-client";

// ── Known platform catalogue ──────────────────────────────────────────────────
const KNOWN_PLATFORMS: Record<string, {
  name: string; description: string; docsUrl: string; color: string; category: string;
}> = {
  virustotal: {
    name: "VirusTotal", color: "text-blue-400", category: "Malware & File Analysis",
    description: "Analyze files, IPs, domains and URLs for malware. Industry standard.",
    docsUrl: "https://www.virustotal.com/gui/my-apikey",
  },
  abuseipdb: {
    name: "AbuseIPDB", color: "text-orange-400", category: "IP Reputation",
    description: "IP reputation and abuse reporting database.",
    docsUrl: "https://www.abuseipdb.com/account/api",
  },
  alienvault_otx: {
    name: "AlienVault OTX", color: "text-green-400", category: "Threat Intelligence",
    description: "Open Threat Exchange — community threat intelligence pulses.",
    docsUrl: "https://otx.alienvault.com/api",
  },
  shodan: {
    name: "Shodan", color: "text-yellow-400", category: "Asset Discovery",
    description: "Search engine for internet-connected devices and services.",
    docsUrl: "https://account.shodan.io/",
  },
  censys: {
    name: "Censys", color: "text-purple-400", category: "Asset Discovery",
    description: "Internet-wide scan data and certificate transparency logs.",
    docsUrl: "https://search.censys.io/account",
  },
  greynoise: {
    name: "GreyNoise", color: "text-cyan-400", category: "IP Reputation",
    description: "Distinguish targeted attacks from internet background noise.",
    docsUrl: "https://viz.greynoise.io/account/",
  },
  urlscan: {
    name: "URLScan.io", color: "text-pink-400", category: "URL Analysis",
    description: "Sandbox-style URL scanner with screenshot and DOM analysis.",
    docsUrl: "https://urlscan.io/user/profile/",
  },
  hybrid_analysis: {
    name: "Hybrid Analysis", color: "text-red-400", category: "Malware & File Analysis",
    description: "Free malware analysis service powered by Falcon Sandbox.",
    docsUrl: "https://www.hybrid-analysis.com/my-account?tab=%23api-key-tab",
  },
  threatfox: {
    name: "ThreatFox", color: "text-amber-400", category: "Threat Intelligence",
    description: "IOC sharing platform by abuse.ch — malware, C2 indicators.",
    docsUrl: "https://threatfox.abuse.ch/api/",
  },
  securitytrails: {
    name: "SecurityTrails", color: "text-indigo-400", category: "DNS & WHOIS",
    description: "Historical DNS, WHOIS, and IP data for investigations.",
    docsUrl: "https://securitytrails.com/app/account/credentials",
  },
  pulsedive: {
    name: "Pulsedive", color: "text-teal-400", category: "Threat Intelligence",
    description: "Community threat intelligence enrichment platform.",
    docsUrl: "https://pulsedive.com/account/",
  },
  ipinfo: {
    name: "IPInfo", color: "text-lime-400", category: "IP Reputation",
    description: "Accurate IP geolocation, ASN, and carrier data.",
    docsUrl: "https://ipinfo.io/account/home",
  },
};

// ── Types ─────────────────────────────────────────────────────────────────────
type SavedKey = {
  id: number;
  platform: string;
  label: string | null;
  priority: number;
  updatedAt: string;
  apiKey: string;
  _visible?: boolean;
};

type AddFormState = {
  apiKey: string;
  label: string;
  saving: boolean;
};

function normalizePlatform(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, "_");
}

// ── Single key row ────────────────────────────────────────────────────────────
function KeyRow({
  k, total, onDelete, onMove, onToggleVisible,
}: {
  k: SavedKey; total: number;
  onDelete: (id: number) => void;
  onMove: (id: number, dir: "up" | "down") => void;
  onToggleVisible: (id: number) => void;
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-background/60 rounded border border-border/40 group">
      <Badge
        variant="outline"
        className="shrink-0 font-mono text-[9px] uppercase border-border/50 text-muted-foreground min-w-[44px] justify-center"
      >
        #{k.priority + 1}
      </Badge>

      <Key className="w-3 h-3 text-muted-foreground shrink-0" />
      <span className="font-mono text-xs text-muted-foreground flex-1 truncate">
        {k._visible ? k.apiKey.replace(/•+/, "[hidden]") : k.apiKey}
      </span>

      {k.label && (
        <span className="font-mono text-[10px] text-muted-foreground/60 truncate max-w-[90px] hidden sm:block">
          {k.label}
        </span>
      )}

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onToggleVisible(k.id)}
          className="text-muted-foreground hover:text-foreground transition-colors p-0.5"
          title={k._visible ? "Hide key" : "Reveal key"}
        >
          {k._visible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
        </button>
        <button
          onClick={() => onMove(k.id, "up")}
          disabled={k.priority === 0}
          className="text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors p-0.5"
          title="Higher priority"
        >
          <ChevronUp className="w-3 h-3" />
        </button>
        <button
          onClick={() => onMove(k.id, "down")}
          disabled={k.priority === total - 1}
          className="text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors p-0.5"
          title="Lower priority"
        >
          <ChevronDown className="w-3 h-3" />
        </button>
        <button
          onClick={() => onDelete(k.id)}
          className="text-muted-foreground hover:text-destructive transition-colors p-0.5"
          title="Remove key"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

// ── Platform card ─────────────────────────────────────────────────────────────
function PlatformCard({
  platformId, keys, onDelete, onMove, onAdd, onToggleVisible,
}: {
  platformId: string;
  keys: SavedKey[];
  onDelete: (id: number) => void;
  onMove: (id: number, dir: "up" | "down") => void;
  onAdd: (platformId: string, apiKey: string, label: string) => Promise<void>;
  onToggleVisible: (id: number) => void;
}) {
  const meta = KNOWN_PLATFORMS[platformId];
  const [form, setForm] = useState<AddFormState>({ apiKey: "", label: "", saving: false });
  const [showForm, setShowForm] = useState(keys.length === 0);

  const handleAdd = async () => {
    if (!form.apiKey.trim()) return;
    setForm(f => ({ ...f, saving: true }));
    await onAdd(platformId, form.apiKey.trim(), form.label.trim());
    setForm({ apiKey: "", label: "", saving: false });
    setShowForm(false);
  };

  return (
    <Card className={`bg-card/50 border-border/50 transition-all ${keys.length > 0 ? "border-success/20" : ""}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <CardTitle className={`text-sm font-mono uppercase tracking-wide ${meta?.color ?? "text-foreground"}`}>
              {meta?.name ?? platformId.replace(/_/g, " ")}
            </CardTitle>
            {keys.length > 0 && (
              <Badge variant="outline" className="bg-success/10 text-success border-success/30 text-[10px] font-mono uppercase">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                {keys.length} key{keys.length > 1 ? "s" : ""}
              </Badge>
            )}
            {meta?.category && (
              <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground border-border/40">
                {meta.category}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {meta?.docsUrl && (
              <a
                href={meta.docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-muted-foreground hover:text-primary flex items-center gap-1 font-mono transition-colors"
              >
                Get Key <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
        {meta?.description && (
          <CardDescription className="text-xs font-mono text-muted-foreground">
            {meta.description}
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="pt-0 space-y-2">
        {/* Existing keys */}
        {keys.map(k => (
          <KeyRow
            key={k.id}
            k={k}
            total={keys.length}
            onDelete={onDelete}
            onMove={onMove}
            onToggleVisible={onToggleVisible}
          />
        ))}

        {/* Priority hint */}
        {keys.length > 1 && (
          <p className="text-[10px] font-mono text-muted-foreground/60 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            Keys are tried in order. #1 is used first; fallback to #2 when rate-limited.
          </p>
        )}

        {/* Add key form */}
        {showForm ? (
          <div className="space-y-2 pt-1 border-t border-border/30">
            <div className="flex gap-2">
              <Input
                type="password"
                placeholder="Paste API key..."
                value={form.apiKey}
                onChange={e => setForm(f => ({ ...f, apiKey: e.target.value }))}
                className="font-mono bg-background/50 border-border/50 text-xs flex-1"
                onKeyDown={e => e.key === "Enter" && handleAdd()}
              />
              <Input
                type="text"
                placeholder="Label (optional)"
                value={form.label}
                onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                className="font-mono bg-background/50 border-border/50 text-xs w-32 hidden sm:block"
                onKeyDown={e => e.key === "Enter" && handleAdd()}
              />
              <Button
                size="sm"
                onClick={handleAdd}
                disabled={form.saving || !form.apiKey.trim()}
                className="font-mono text-xs uppercase shrink-0"
              >
                <Save className="w-3 h-3 mr-1" />
                {form.saving ? "Saving..." : "Save"}
              </Button>
              {keys.length > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowForm(false)}
                  className="shrink-0 text-muted-foreground"
                >
                  Cancel
                </Button>
              )}
            </div>
          </div>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowForm(true)}
            className="w-full font-mono text-xs text-muted-foreground border-dashed border-border/50 hover:border-primary/50 hover:text-primary"
          >
            <Plus className="w-3 h-3 mr-1" /> Add Key
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [savedKeys, setSavedKeys] = useState<SavedKey[]>([]);
  const [customPlatformName, setCustomPlatformName] = useState("");
  const [addingCustom, setAddingCustom] = useState(false);

  const fetchKeys = useCallback(async () => {
    try {
      const res = await fetch("/api/user/api-keys", { headers: getAuthHeaders() });
      if (!res.ok) return;
      const data: SavedKey[] = await res.json();
      setSavedKeys(data);
    } catch {}
  }, []);

  useEffect(() => { fetchKeys(); }, [fetchKeys]);

  // All active platform IDs: union of known platforms + any custom ones already saved
  const activePlatformIds = Array.from(new Set([
    ...Object.keys(KNOWN_PLATFORMS),
    ...savedKeys.map(k => k.platform),
  ]));

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
      toast({ title: "Key added", description: `Key saved for ${KNOWN_PLATFORMS[platformId]?.name ?? platformId}` });
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

  const handleToggleVisible = (id: number) => {
    setSavedKeys(keys =>
      keys.map(k => k.id === id ? { ...k, _visible: !k._visible } : k)
    );
  };

  const handleAddCustomPlatform = () => {
    const norm = normalizePlatform(customPlatformName);
    if (!norm) return;
    if (activePlatformIds.includes(norm)) {
      toast({ title: "Platform already exists", variant: "destructive" });
      return;
    }
    // Optimistically show the new platform card (it has no keys yet, so add-form opens by default)
    setSavedKeys(k => k); // trigger re-render — the platform card will appear because we track all active IDs
    setCustomPlatformName("");
    setAddingCustom(false);
    // We create a temporary entry to force the platform to appear in activePlatformIds
    setSavedKeys(prev => [
      ...prev,
      // sentinel — will be removed after real add
    ]);
    // Actually just store the name to force the card to appear
    setForcedPlatforms(fp => [...fp, norm]);
  };

  const [forcedPlatforms, setForcedPlatforms] = useState<string[]>([]);

  const allPlatformIds = Array.from(new Set([
    ...Object.keys(KNOWN_PLATFORMS),
    ...savedKeys.map(k => k.platform),
    ...forcedPlatforms,
  ]));

  const totalConfigured = savedKeys.length;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-3xl">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight uppercase">API Keys</h1>
        <p className="text-sm text-muted-foreground font-mono tracking-widest">
          OPERATOR: <span className="text-primary">{user?.username?.toUpperCase()}</span>
          {" — "}
          <span className="text-success">{totalConfigured}</span> KEY{totalConfigured !== 1 ? "S" : ""} CONFIGURED
        </p>
      </div>

      {/* Info banner */}
      <Card className="bg-card/50 border-border/50">
        <CardContent className="p-4 flex items-start gap-3">
          <Key className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p className="text-sm font-medium">Per-platform key rotation</p>
            <p className="text-xs text-muted-foreground font-mono leading-relaxed">
              Add multiple keys per platform. Keys are tried in priority order — if Key #1 hits its rate limit the system automatically falls back to Key #2, and so on. Use the arrows to adjust priority order. Keys are stored securely and only accessible to your account.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Platform cards */}
      <div className="space-y-4">
        {allPlatformIds.map(platformId => (
          <PlatformCard
            key={platformId}
            platformId={platformId}
            keys={keysByPlatform(platformId)}
            onDelete={handleDelete}
            onMove={handleMove}
            onAdd={handleAdd}
            onToggleVisible={handleToggleVisible}
          />
        ))}
      </div>

      {/* Add custom platform */}
      <Card className="bg-card/30 border-dashed border-border/40">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-muted-foreground" />
            <CardTitle className="text-sm font-mono uppercase tracking-wide text-muted-foreground">
              Custom Platform
            </CardTitle>
          </div>
          <CardDescription className="text-xs font-mono">
            Add API keys for any tool not listed above — MISP, OpenCTI, ThreatConnect, etc.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {addingCustom ? (
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Platform name (e.g. MISP, OpenCTI, ...)"
                value={customPlatformName}
                onChange={e => setCustomPlatformName(e.target.value)}
                className="font-mono bg-background/50 border-border/50 text-xs flex-1"
                onKeyDown={e => {
                  if (e.key === "Enter") handleAddCustomPlatform();
                  if (e.key === "Escape") { setAddingCustom(false); setCustomPlatformName(""); }
                }}
                autoFocus
              />
              <Button
                size="sm"
                onClick={handleAddCustomPlatform}
                disabled={!customPlatformName.trim()}
                className="font-mono text-xs uppercase shrink-0"
              >
                <Plus className="w-3 h-3 mr-1" /> Add
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => { setAddingCustom(false); setCustomPlatformName(""); }}
                className="shrink-0 text-muted-foreground"
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setAddingCustom(true)}
              className="w-full font-mono text-xs text-muted-foreground border-dashed border-border/40 hover:border-primary/50 hover:text-primary"
            >
              <Plus className="w-3 h-3 mr-1" /> Add Custom Platform
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
