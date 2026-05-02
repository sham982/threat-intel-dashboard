import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, EyeOff, Key, CheckCircle2, Trash2, Save, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getAuthHeaders } from "@/lib/api-client";

const PLATFORMS = [
  {
    id: "virustotal",
    name: "VirusTotal",
    description: "Analyze files, IPs, domains and URLs for malware. Industry standard.",
    docsUrl: "https://www.virustotal.com/gui/my-apikey",
    placeholder: "Enter your VirusTotal API key...",
    color: "text-blue-400",
  },
  {
    id: "abuseipdb",
    name: "AbuseIPDB",
    description: "IP reputation and abuse reporting database.",
    docsUrl: "https://www.abuseipdb.com/account/api",
    placeholder: "Enter your AbuseIPDB API key...",
    color: "text-orange-400",
  },
  {
    id: "alienvault_otx",
    name: "AlienVault OTX",
    description: "Open Threat Exchange — community threat intelligence pulses.",
    docsUrl: "https://otx.alienvault.com/api",
    placeholder: "Enter your OTX API key...",
    color: "text-green-400",
  },
  {
    id: "shodan",
    name: "Shodan",
    description: "Search engine for internet-connected devices.",
    docsUrl: "https://account.shodan.io/",
    placeholder: "Enter your Shodan API key...",
    color: "text-yellow-400",
  },
  {
    id: "censys",
    name: "Censys",
    description: "Internet-wide scan data and certificate transparency.",
    docsUrl: "https://search.censys.io/account",
    placeholder: "Enter your Censys API key...",
    color: "text-purple-400",
  },
];

type KeyState = {
  value: string;
  saved: boolean;
  masked: string;
  visible: boolean;
};

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [keys, setKeys] = useState<Record<string, KeyState>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const fetchSavedKeys = async () => {
    try {
      const res = await fetch("/api/user/api-keys", { headers: getAuthHeaders() });
      if (!res.ok) return;
      const data: Array<{ platform: string; apiKey: string; updatedAt: string }> = await res.json();
      const newKeys: Record<string, KeyState> = {};
      for (const k of data) {
        newKeys[k.platform] = { value: "", saved: true, masked: k.apiKey, visible: false };
      }
      setKeys(newKeys);
    } catch {}
  };

  // Load saved keys on mount
  useState(() => { fetchSavedKeys(); });

  const handleSave = async (platformId: string) => {
    const val = keys[platformId]?.value;
    if (!val?.trim()) {
      toast({ title: "Enter an API key first", variant: "destructive" });
      return;
    }
    setLoading(l => ({ ...l, [platformId]: true }));
    try {
      const res = await fetch("/api/user/api-keys", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ platform: platformId, apiKey: val.trim() }),
      });
      if (!res.ok) throw new Error("Failed");
      toast({ title: "API key saved", description: `${PLATFORMS.find(p=>p.id===platformId)?.name} key saved successfully.` });
      setKeys(k => ({
        ...k,
        [platformId]: { value: "", saved: true, masked: maskKey(val.trim()), visible: false },
      }));
    } catch {
      toast({ title: "Failed to save key", variant: "destructive" });
    } finally {
      setLoading(l => ({ ...l, [platformId]: false }));
    }
  };

  const handleDelete = async (platformId: string) => {
    if (!confirm(`Remove ${PLATFORMS.find(p=>p.id===platformId)?.name} API key?`)) return;
    setLoading(l => ({ ...l, [platformId]: true }));
    try {
      await fetch(`/api/user/api-keys/${platformId}`, { method: "DELETE", headers: getAuthHeaders() });
      setKeys(k => {
        const copy = { ...k };
        delete copy[platformId];
        return copy;
      });
      toast({ title: "API key removed" });
    } catch {
      toast({ title: "Failed to remove key", variant: "destructive" });
    } finally {
      setLoading(l => ({ ...l, [platformId]: false }));
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-3xl">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight uppercase">API Keys</h1>
        <p className="text-sm text-muted-foreground font-mono tracking-widest">
          OPERATOR: <span className="text-primary">{user?.username?.toUpperCase()}</span> — PLATFORM CREDENTIALS
        </p>
      </div>

      <Card className="bg-card/50 border-border/50">
        <CardContent className="p-4 flex items-start gap-3">
          <Key className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium">Your keys are stored securely per-account.</p>
            <p className="text-xs text-muted-foreground mt-1 font-mono">
              Keys are used automatically when you run threat scans. Each key is encrypted and only accessible to you.
              Keys replace the global system defaults for your scans.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {PLATFORMS.map((platform) => {
          const keyState = keys[platform.id];
          const isSaved = !!keyState?.saved;
          const isLoading = loading[platform.id];

          return (
            <Card key={platform.id} className={`bg-card/50 border-border/50 transition-all ${isSaved ? 'border-success/30' : ''}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CardTitle className={`text-base font-mono uppercase tracking-wide ${platform.color}`}>
                      {platform.name}
                    </CardTitle>
                    {isSaved && (
                      <Badge variant="outline" className="bg-success/10 text-success border-success/30 text-[10px] font-mono uppercase">
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Configured
                      </Badge>
                    )}
                  </div>
                  <a
                    href={platform.docsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 font-mono transition-colors"
                  >
                    Get Key <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <CardDescription className="text-xs font-mono text-muted-foreground">
                  {platform.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                {isSaved && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-background/50 rounded-md border border-border/50">
                    <Key className="w-3 h-3 text-muted-foreground" />
                    <span className="font-mono text-xs text-muted-foreground flex-1">
                      {keyState?.visible ? keyState?.value || keyState?.masked : keyState?.masked}
                    </span>
                    <button
                      onClick={() => setKeys(k => ({
                        ...k,
                        [platform.id]: { ...k[platform.id], visible: !k[platform.id]?.visible }
                      }))}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {keyState?.visible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </button>
                  </div>
                )}

                <div className="flex gap-2">
                  <Input
                    type="password"
                    placeholder={isSaved ? "Enter new key to replace..." : platform.placeholder}
                    value={keys[platform.id]?.value || ""}
                    onChange={(e) => setKeys(k => ({
                      ...k,
                      [platform.id]: { ...(k[platform.id] || { saved: false, masked: "", visible: false }), value: e.target.value }
                    }))}
                    className="font-mono bg-background/50 border-border/50 text-sm flex-1"
                  />
                  <Button
                    size="sm"
                    onClick={() => handleSave(platform.id)}
                    disabled={isLoading || !keys[platform.id]?.value?.trim()}
                    className="font-mono text-xs uppercase shrink-0"
                  >
                    <Save className="w-3 h-3 mr-1" />
                    {isLoading ? "Saving..." : "Save"}
                  </Button>
                  {isSaved && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(platform.id)}
                      disabled={isLoading}
                      className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function maskKey(key: string): string {
  if (key.length <= 8) return "•".repeat(key.length);
  return key.slice(0, 4) + "•".repeat(Math.max(8, key.length - 8)) + key.slice(-4);
}
