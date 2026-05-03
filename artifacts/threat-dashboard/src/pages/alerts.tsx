import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Shield, ShieldOff, Activity, Plus, Trash2, Server, Hash, Globe, Link2,
  User, Clock, AlertTriangle, Search,
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { getAuthHeaders } from "@/lib/api-client";

type BlocklistType = "ip" | "hash" | "domain" | "url";

type BlocklistEntry = {
  id: number;
  type: BlocklistType;
  value: string;
  blockedByUsername: string;
  reason: string | null;
  notes: string | null;
  blockedAt: string;
};

const TYPE_CONFIG: Record<BlocklistType, { label: string; icon: React.ReactNode; color: string; bg: string; border: string }> = {
  ip:     { label: "Blocked IP",     icon: <Server className="w-3.5 h-3.5" />, color: "text-destructive",  bg: "bg-destructive/10",  border: "border-destructive/30" },
  hash:   { label: "Deleted Hash",   icon: <Hash className="w-3.5 h-3.5" />,   color: "text-orange-400",   bg: "bg-orange-400/10",   border: "border-orange-400/30" },
  domain: { label: "Blocked Domain", icon: <Globe className="w-3.5 h-3.5" />,  color: "text-warning",      bg: "bg-warning/10",      border: "border-warning/30" },
  url:    { label: "Blocked URL",    icon: <Link2 className="w-3.5 h-3.5" />,  color: "text-purple-400",   bg: "bg-purple-400/10",   border: "border-purple-400/30" },
};

const LEFT_BORDER_COLOR: Record<BlocklistType, string> = {
  ip:     "hsl(var(--destructive))",
  hash:   "#fb923c",
  domain: "hsl(var(--warning))",
  url:    "#a78bfa",
};

function TypeBadge({ type }: { type: BlocklistType }) {
  const cfg = TYPE_CONFIG[type];
  return (
    <Badge variant="outline" className={`font-mono text-[10px] uppercase flex items-center gap-1 ${cfg.bg} ${cfg.color} ${cfg.border} border`}>
      {cfg.icon} {cfg.label}
    </Badge>
  );
}

// ── Full-type add dialog (all users) ─────────────────────────────────────────
function AddEntryDialog({ onAdded, defaultType = "ip" }: { onAdded: () => void; defaultType?: BlocklistType }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ type: defaultType, value: "", reason: "", notes: "" });

  const PLACEHOLDERS: Record<BlocklistType, string> = {
    ip: "e.g. 185.220.101.47",
    hash: "e.g. d41d8cd98f00b204e9800998ecf8427e",
    domain: "e.g. malicious-domain.com",
    url: "e.g. http://evil.com/payload",
  };

  const handleSave = async () => {
    if (!form.value.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/blocklist", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ type: form.type, value: form.value.trim(), reason: form.reason.trim() || undefined, notes: form.notes.trim() || undefined }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      toast({ title: "Entry added to blocklist" });
      setOpen(false);
      setForm({ type: defaultType, value: "", reason: "", notes: "" });
      onAdded();
    } catch (e: any) {
      toast({ title: "Failed to add entry", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="font-mono text-xs uppercase tracking-wider border-dashed shrink-0">
          <Plus className="w-3.5 h-3.5 mr-1.5" /> Other Type
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="font-mono uppercase tracking-widest text-base flex items-center gap-2">
            <ShieldOff className="w-4 h-4 text-destructive" /> Block Indicator
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <label className="text-xs uppercase font-mono text-muted-foreground">Type</label>
            <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as BlocklistType }))}>
              <SelectTrigger className="font-mono bg-background/50"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ip" className="font-mono">IP Address</SelectItem>
                <SelectItem value="hash" className="font-mono">File Hash (MD5/SHA256)</SelectItem>
                <SelectItem value="domain" className="font-mono">Domain</SelectItem>
                <SelectItem value="url" className="font-mono">URL</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs uppercase font-mono text-muted-foreground">Value</label>
            <Input className="font-mono bg-background/50" placeholder={PLACEHOLDERS[form.type]} value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs uppercase font-mono text-muted-foreground">Reason (optional)</label>
            <Input className="font-mono bg-background/50" placeholder="e.g. C2 server, phishing domain..." value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs uppercase font-mono text-muted-foreground">Notes (optional)</label>
            <Input className="font-mono bg-background/50" placeholder="Incident reference or additional context" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => setOpen(false)} className="font-mono text-xs uppercase">Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.value.trim()} className="font-mono text-xs uppercase bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              {saving ? "Blocking..." : "Block Indicator"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Alerts() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [entries, setEntries] = useState<BlocklistEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  // Quick IP add form — visible to all users
  const [quickIp, setQuickIp] = useState("");
  const [quickReason, setQuickReason] = useState("");
  const [quickSaving, setQuickSaving] = useState(false);

  const isAdminOrAnalyst = user?.role === "admin" || user?.role === "analyst";

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "200" });
      if (typeFilter !== "all") params.set("type", typeFilter);
      const res = await fetch(`/api/blocklist?${params}`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setEntries(data.entries ?? []);
      setTotal(data.total ?? 0);
    } catch {
      toast({ title: "Failed to load blocklist", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [typeFilter]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const handleQuickBlock = async () => {
    const ip = quickIp.trim();
    if (!ip) return;
    setQuickSaving(true);
    try {
      const res = await fetch("/api/blocklist", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ type: "ip", value: ip, reason: quickReason.trim() || undefined }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      toast({ title: "IP blocked", description: ip });
      setQuickIp("");
      setQuickReason("");
      fetchEntries();
    } catch (e: any) {
      toast({ title: "Failed to block IP", description: e.message, variant: "destructive" });
    } finally {
      setQuickSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Remove this entry from the blocklist?")) return;
    try {
      const res = await fetch(`/api/blocklist/${id}`, { method: "DELETE", headers: getAuthHeaders() });
      if (!res.ok) throw new Error("Failed");
      toast({ title: "Entry removed" });
      fetchEntries();
    } catch {
      toast({ title: "Failed to remove entry", variant: "destructive" });
    }
  };

  const filtered = entries.filter(e =>
    !search || e.value.toLowerCase().includes(search.toLowerCase()) ||
    (e.reason ?? "").toLowerCase().includes(search.toLowerCase()) ||
    e.blockedByUsername.toLowerCase().includes(search.toLowerCase())
  );

  const counts = {
    all: entries.length,
    ip: entries.filter(e => e.type === "ip").length,
    hash: entries.filter(e => e.type === "hash").length,
    domain: entries.filter(e => e.type === "domain").length,
    url: entries.filter(e => e.type === "url").length,
  };

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col h-full">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight uppercase flex items-center gap-3">
          <ShieldOff className="w-6 h-6 text-destructive" />
          Blocklist
          {total > 0 && (
            <span className="flex items-center justify-center min-w-[1.5rem] h-6 px-2 rounded-full bg-destructive/20 border border-destructive/40 text-destructive text-xs font-bold">
              {total}
            </span>
          )}
        </h1>
        <p className="text-sm text-muted-foreground font-mono tracking-widest">NETWORK SECURITY BLOCKLIST — ALL AUTHENTICATED USERS CAN ADD</p>
      </div>

      {/* ── Quick IP block form — available to every user ───────────────────── */}
      <Card className="bg-card/70 border-destructive/20 border backdrop-blur-sm">
        <CardContent className="p-4">
          <p className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
            <Server className="w-3.5 h-3.5 text-destructive" /> Quick Block IP
          </p>
          <div className="flex flex-wrap gap-2 items-end">
            <div className="flex-1 min-w-44 space-y-1">
              <label className="text-[10px] font-mono text-muted-foreground uppercase">IP Address *</label>
              <Input
                placeholder="e.g. 185.220.101.47"
                value={quickIp}
                onChange={e => setQuickIp(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleQuickBlock()}
                className="font-mono bg-background/60 border-border/60 text-sm"
              />
            </div>
            <div className="flex-1 min-w-44 space-y-1">
              <label className="text-[10px] font-mono text-muted-foreground uppercase">Reason (optional)</label>
              <Input
                placeholder="e.g. C2 server, brute force, scanner..."
                value={quickReason}
                onChange={e => setQuickReason(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleQuickBlock()}
                className="font-mono bg-background/60 border-border/60 text-sm"
              />
            </div>
            <Button
              onClick={handleQuickBlock}
              disabled={quickSaving || !quickIp.trim()}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-mono text-xs uppercase tracking-wider shrink-0"
            >
              {quickSaving ? (
                <><Activity className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Blocking...</>
              ) : (
                <><ShieldOff className="w-3.5 h-3.5 mr-1.5" /> Block IP</>
              )}
            </Button>
            <AddEntryDialog onAdded={fetchEntries} />
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Tabs value={typeFilter} onValueChange={setTypeFilter} className="w-full sm:w-auto">
          <TabsList className="bg-card/50 border border-border/50 h-10 p-1 font-mono text-xs">
            {(["all", "ip", "hash", "domain", "url"] as const).map(t => (
              <TabsTrigger
                key={t}
                value={t}
                className="font-mono text-[11px] uppercase data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-3"
              >
                {t === "all" ? "All" : TYPE_CONFIG[t].label.split(" ")[1]}
                <span className="ml-1.5 text-[10px] opacity-60">{counts[t]}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search value, reason or analyst..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="font-mono bg-background/50 border-border/50 text-sm pl-8"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 min-h-0 space-y-2.5 overflow-auto pb-12">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-48 bg-card/20 rounded-lg border border-dashed border-border/50">
            <Activity className="w-8 h-8 text-primary animate-spin mb-3" />
            <span className="text-sm font-mono uppercase tracking-widest text-muted-foreground">Loading blocklist...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 bg-card/20 rounded-lg border border-dashed border-border/50 gap-3">
            <Shield className="w-8 h-8 text-muted-foreground/40" />
            <span className="text-sm font-mono uppercase tracking-widest text-muted-foreground">
              {search ? "No matching entries" : "Blocklist is empty"}
            </span>
            {!search && <p className="text-xs text-muted-foreground font-mono">Use the Quick Block IP form above to add your first entry</p>}
          </div>
        ) : (
          filtered.map((entry, i) => {
            const cfg = TYPE_CONFIG[entry.type];
            return (
              <Card
                key={entry.id}
                className="bg-card/60 backdrop-blur-sm border-l-4 transition-all hover:bg-card/80 animate-in fade-in slide-in-from-bottom-2"
                style={{ borderLeftColor: LEFT_BORDER_COLOR[entry.type], animationDelay: `${i * 25}ms` }}
              >
                <CardContent className="p-4 flex flex-col md:flex-row md:items-center gap-4">
                  {/* Left: value + badges */}
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <TypeBadge type={entry.type} />
                      {entry.reason && (
                        <Badge variant="outline" className="font-mono text-[10px] border-border/40 text-muted-foreground">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          {entry.reason}
                        </Badge>
                      )}
                    </div>
                    <p className={`font-mono font-bold text-base break-all leading-tight ${cfg.color}`}>
                      {entry.value}
                    </p>
                    {entry.notes && (
                      <p className="text-xs font-mono text-muted-foreground">{entry.notes}</p>
                    )}
                  </div>

                  {/* Right: meta + delete */}
                  <div className="flex items-center gap-4 shrink-0 border-t md:border-t-0 md:border-l border-border/40 pt-3 md:pt-0 md:pl-4">
                    <div className="space-y-1.5 text-xs font-mono text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3 h-3 shrink-0" />
                        <span className="text-foreground font-medium">{entry.blockedByUsername}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3 shrink-0" />
                        <span>{format(new Date(entry.blockedAt), "MMM dd, yyyy HH:mm")}</span>
                      </div>
                    </div>
                    {isAdminOrAnalyst && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                        onClick={() => handleDelete(entry.id)}
                        title="Remove from blocklist"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
