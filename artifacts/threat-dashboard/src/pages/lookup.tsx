import { useState } from "react";
import { useCreateScan, ScanIndicatorType, Scan } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Search, ShieldAlert, ShieldCheck, ShieldQuestion, Activity, ExternalLink,
  ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, HelpCircle,
} from "lucide-react";

interface SourceResult {
  name: string;
  status: "clean" | "malicious" | "suspicious" | "unknown" | "error";
  detections?: number;
  totalEngines?: number;
  details?: string;
  url?: string;
  category?: string;
}

const STATUS_CONFIG = {
  malicious: {
    label: "MALICIOUS",
    badge: "bg-destructive/15 text-destructive border-destructive/40",
    icon: <ShieldAlert className="w-3.5 h-3.5" />,
  },
  suspicious: {
    label: "SUSPICIOUS",
    badge: "bg-warning/15 text-warning border-warning/40",
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
  },
  clean: {
    label: "CLEAN",
    badge: "bg-success/15 text-success border-success/40",
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
  unknown: {
    label: "UNKNOWN",
    badge: "bg-muted/50 text-muted-foreground border-border/50",
    icon: <HelpCircle className="w-3.5 h-3.5" />,
  },
  error: {
    label: "ERROR",
    badge: "bg-muted/50 text-muted-foreground border-border/50",
    icon: <HelpCircle className="w-3.5 h-3.5" />,
  },
};

function getRiskColor(level: string) {
  return { high: "text-destructive", medium: "text-warning", low: "text-success" }[level] ?? "text-muted-foreground";
}

function getRiskBg(level: string) {
  return {
    high: "bg-destructive/10 border-destructive/30",
    medium: "bg-warning/10 border-warning/30",
    low: "bg-success/10 border-success/30",
  }[level] ?? "bg-muted border-border";
}

function SourceRow({ source }: { source: SourceResult }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = STATUS_CONFIG[source.status] ?? STATUS_CONFIG.unknown;

  return (
    <>
      <tr className="border-b border-border/40 hover:bg-muted/20 transition-colors group">
        <td className="px-4 py-3">
          <div className="flex flex-col gap-0.5">
            <span className="font-mono font-semibold text-sm">{source.name}</span>
            {source.category && (
              <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wide">{source.category}</span>
            )}
          </div>
        </td>
        <td className="px-4 py-3">
          <Badge variant="outline" className={`font-mono text-[10px] flex items-center gap-1 w-fit ${cfg.badge}`}>
            {cfg.icon}
            {cfg.label}
          </Badge>
        </td>
        <td className="px-4 py-3 font-mono text-sm">
          {source.detections !== undefined && source.totalEngines !== undefined
            ? <span className={source.detections > 0 ? "text-destructive font-semibold" : "text-muted-foreground"}>
                {source.detections} / {source.totalEngines}
              </span>
            : <span className="text-muted-foreground">—</span>}
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2 justify-end">
            {source.url && (
              <a href={source.url} target="_blank" rel="noreferrer"
                className="text-primary hover:text-primary/80 transition-colors inline-flex items-center gap-1 text-xs font-mono">
                View <ExternalLink className="w-3 h-3" />
              </a>
            )}
            {source.details && (
              <button
                onClick={() => setExpanded(e => !e)}
                className="text-muted-foreground hover:text-foreground transition-colors p-0.5"
                title={expanded ? "Hide details" : "Show details"}
              >
                {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
        </td>
      </tr>
      {expanded && source.details && (
        <tr className="border-b border-border/30 bg-muted/10">
          <td colSpan={4} className="px-4 py-2.5">
            <p className="text-xs font-mono text-muted-foreground leading-relaxed">{source.details}</p>
          </td>
        </tr>
      )}
    </>
  );
}

export default function Lookup() {
  const [indicatorType, setIndicatorType] = useState<ScanIndicatorType>("ip");
  const [indicatorValue, setIndicatorValue] = useState("");
  const [scanResult, setScanResult] = useState<Scan | null>(null);

  const createScan = useCreateScan({
    mutation: { onSuccess: (data) => setScanResult(data) }
  });

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!indicatorValue.trim()) return;
    createScan.mutate({ data: { indicatorType, indicatorValue: indicatorValue.trim() } });
  };

  const sources: SourceResult[] = (scanResult?.sources as SourceResult[] | undefined) ?? [];
  const maliciousCount = sources.filter(s => s.status === "malicious").length;
  const suspiciousCount = sources.filter(s => s.status === "suspicious").length;
  const cleanCount = sources.filter(s => s.status === "clean").length;

  // Group sources by category
  const byCategory = sources.reduce<Record<string, SourceResult[]>>((acc, s) => {
    const cat = s.category ?? "Other";
    (acc[cat] ??= []).push(s);
    return acc;
  }, {});

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight uppercase">Indicator Lookup</h1>
        <p className="text-sm text-muted-foreground font-mono tracking-widest">THREAT INTELLIGENCE AGGREGATOR — MULTI-SOURCE ANALYSIS</p>
      </div>

      {/* Search bar */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm uppercase tracking-widest text-muted-foreground">New Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLookup} className="flex gap-3 items-end flex-wrap">
            <div className="space-y-1.5 w-44">
              <label className="text-xs font-mono uppercase text-muted-foreground">Type</label>
              <Select value={indicatorType} onValueChange={(v: ScanIndicatorType) => setIndicatorType(v)}>
                <SelectTrigger className="font-mono bg-background/50">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ip" className="font-mono">IP Address</SelectItem>
                  <SelectItem value="url" className="font-mono">URL</SelectItem>
                  <SelectItem value="domain" className="font-mono">Domain</SelectItem>
                  <SelectItem value="hash" className="font-mono">File Hash</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 flex-1 min-w-48">
              <label className="text-xs font-mono uppercase text-muted-foreground">Indicator Value</label>
              <Input
                placeholder="Enter IP, URL, Domain, or Hash..."
                value={indicatorValue}
                onChange={(e) => setIndicatorValue(e.target.value)}
                className="font-mono bg-background/50"
              />
            </div>
            <Button
              type="submit"
              disabled={createScan.isPending || !indicatorValue.trim()}
              className="w-36 uppercase tracking-widest text-xs font-bold"
            >
              {createScan.isPending
                ? <><Activity className="w-4 h-4 mr-2 animate-spin" /> SCANNING</>
                : <><Search className="w-4 h-4 mr-2" /> ANALYZE</>}
            </Button>
          </form>
        </CardContent>
      </Card>

      {scanResult && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
          {/* Risk Assessment + summary row */}
          <div className="grid gap-4 md:grid-cols-4">
            {/* Score gauge */}
            <Card className={`md:col-span-1 bg-card/50 backdrop-blur-sm border ${getRiskBg(scanResult.riskLevel)}`}>
              <CardContent className="flex flex-col items-center justify-center py-6 gap-3">
                <div className="relative flex items-center justify-center w-32 h-32">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="12" className="text-muted opacity-20" />
                    <circle
                      cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="12"
                      strokeDasharray={`${scanResult.riskScore * 2.638} 263.8`}
                      className={`${getRiskColor(scanResult.riskLevel)} transition-all duration-1000 ease-out`}
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className={`text-3xl font-bold font-mono ${getRiskColor(scanResult.riskLevel)}`}>{scanResult.riskScore}</span>
                    <span className="text-[9px] text-muted-foreground uppercase tracking-widest">SCORE</span>
                  </div>
                </div>
                <div className="text-center">
                  {scanResult.riskLevel === "high" ? <ShieldAlert className={`w-5 h-5 mx-auto mb-1 ${getRiskColor(scanResult.riskLevel)}`} /> :
                   scanResult.riskLevel === "low" ? <ShieldCheck className={`w-5 h-5 mx-auto mb-1 ${getRiskColor(scanResult.riskLevel)}`} /> :
                   <ShieldQuestion className={`w-5 h-5 mx-auto mb-1 ${getRiskColor(scanResult.riskLevel)}`} />}
                  <h3 className={`text-lg font-bold uppercase tracking-widest ${getRiskColor(scanResult.riskLevel)}`}>
                    {scanResult.riskLevel} RISK
                  </h3>
                  <p className="text-[11px] font-mono text-muted-foreground mt-1 break-all">{scanResult.indicatorValue}</p>
                </div>
              </CardContent>
            </Card>

            {/* Stat cards */}
            <div className="md:col-span-3 grid grid-cols-3 gap-4">
              <Card className="bg-destructive/10 border-destructive/30">
                <CardContent className="flex flex-col items-center justify-center h-full py-6">
                  <span className="text-4xl font-bold font-mono text-destructive">{maliciousCount}</span>
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1 font-mono">Malicious</span>
                </CardContent>
              </Card>
              <Card className="bg-warning/10 border-warning/30">
                <CardContent className="flex flex-col items-center justify-center h-full py-6">
                  <span className="text-4xl font-bold font-mono text-warning">{suspiciousCount}</span>
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1 font-mono">Suspicious</span>
                </CardContent>
              </Card>
              <Card className="bg-success/10 border-success/30">
                <CardContent className="flex flex-col items-center justify-center h-full py-6">
                  <span className="text-4xl font-bold font-mono text-success">{cleanCount}</span>
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1 font-mono">Clean</span>
                </CardContent>
              </Card>

              {/* Risk breakdown bar */}
              <Card className="col-span-3 bg-card/50 border-border/50">
                <CardContent className="py-4 px-5">
                  <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-2">Detection Consensus</p>
                  <div className="flex h-3 rounded-full overflow-hidden bg-muted/40 gap-px">
                    {maliciousCount > 0 && (
                      <div
                        className="bg-destructive transition-all duration-700"
                        style={{ width: `${(maliciousCount / sources.length) * 100}%` }}
                        title={`${maliciousCount} malicious`}
                      />
                    )}
                    {suspiciousCount > 0 && (
                      <div
                        className="bg-warning transition-all duration-700"
                        style={{ width: `${(suspiciousCount / sources.length) * 100}%` }}
                        title={`${suspiciousCount} suspicious`}
                      />
                    )}
                    {cleanCount > 0 && (
                      <div
                        className="bg-success transition-all duration-700"
                        style={{ width: `${(cleanCount / sources.length) * 100}%` }}
                        title={`${cleanCount} clean`}
                      />
                    )}
                  </div>
                  <div className="flex gap-4 mt-2">
                    <span className="text-[10px] font-mono text-muted-foreground">{sources.length} sources queried</span>
                    <span className="text-[10px] font-mono text-destructive">{maliciousCount} malicious</span>
                    <span className="text-[10px] font-mono text-warning">{suspiciousCount} suspicious</span>
                    <span className="text-[10px] font-mono text-success">{cleanCount} clean</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Per-category source breakdown */}
          {Object.entries(byCategory).map(([category, catSources]) => (
            <Card key={category} className="bg-card/50 backdrop-blur-sm border-border/50">
              <CardHeader className="pb-2 border-b border-border/30">
                <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary inline-block" />
                  {category}
                  <span className="ml-auto font-mono text-[10px]">
                    {catSources.filter(s => s.status === "malicious").length > 0 && (
                      <span className="text-destructive mr-2">
                        {catSources.filter(s => s.status === "malicious").length} malicious
                      </span>
                    )}
                    {catSources.filter(s => s.status === "suspicious").length > 0 && (
                      <span className="text-warning mr-2">
                        {catSources.filter(s => s.status === "suspicious").length} suspicious
                      </span>
                    )}
                    {catSources.filter(s => s.status === "clean").length > 0 && (
                      <span className="text-success">
                        {catSources.filter(s => s.status === "clean").length} clean
                      </span>
                    )}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/30 bg-muted/20">
                        <th className="px-4 py-2.5 text-left font-mono text-[10px] uppercase text-muted-foreground">Engine</th>
                        <th className="px-4 py-2.5 text-left font-mono text-[10px] uppercase text-muted-foreground">Verdict</th>
                        <th className="px-4 py-2.5 text-left font-mono text-[10px] uppercase text-muted-foreground">Detections</th>
                        <th className="px-4 py-2.5 text-right font-mono text-[10px] uppercase text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {catSources.map((source, i) => (
                        <SourceRow key={i} source={source} />
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
