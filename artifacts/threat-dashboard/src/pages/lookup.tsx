import { useState } from "react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useCreateScan, ScanIndicatorType, Scan } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Search, ShieldAlert, ShieldCheck, ShieldQuestion, Activity, ExternalLink,
  ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, HelpCircle,
  Download, FileText, FileSpreadsheet, AlertCircle, Settings,
} from "lucide-react";
import { Link } from "wouter";

interface SourceResult {
  name: string;
  status: "clean" | "malicious" | "suspicious" | "unknown" | "error";
  detections?: number;
  totalEngines?: number;
  details?: string;
  url?: string;
  category?: string;
}

const STATUS_CONFIG: Record<string, { label: string; badge: string; icon: React.ReactNode }> = {
  malicious:  { label: "MALICIOUS",  badge: "bg-destructive/15 text-destructive border-destructive/40",  icon: <ShieldAlert className="w-3.5 h-3.5" /> },
  suspicious: { label: "SUSPICIOUS", badge: "bg-warning/15 text-warning border-warning/40",              icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  clean:      { label: "CLEAN",      badge: "bg-success/15 text-success border-success/40",              icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  unknown:    { label: "UNKNOWN",    badge: "bg-muted/50 text-muted-foreground border-border/50",         icon: <HelpCircle className="w-3.5 h-3.5" /> },
  error:      { label: "NOT CONFIGURED", badge: "bg-muted/30 text-muted-foreground/60 border-border/30", icon: <AlertCircle className="w-3.5 h-3.5" /> },
};

function getRiskColor(level: string) {
  return { high: "text-destructive", medium: "text-warning", low: "text-success" }[level] ?? "text-muted-foreground";
}
function getRiskBg(level: string) {
  return {
    high: "border-destructive/30",
    medium: "border-warning/30",
    low: "border-success/30",
  }[level] ?? "border-border";
}

function slugify(value: string) {
  return value.replace(/[^a-z0-9]/gi, "_").slice(0, 40);
}

// ── Export helpers ────────────────────────────────────────────────────────────
function exportCSV(scan: Scan, sources: SourceResult[]) {
  const escape = (v: string) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows: string[][] = [
    ["Threat Intelligence Report"],
    ["Indicator", scan.indicatorValue],
    ["Type", scan.indicatorType],
    ["Risk Level", scan.riskLevel.toUpperCase()],
    ["Risk Score", String(scan.riskScore)],
    ["Scanned At", new Date(scan.createdAt as string).toLocaleString()],
    [],
    ["Source", "Category", "Status", "Detections", "Total Engines", "Details"],
    ...sources.map(s => [
      s.name, s.category ?? "", s.status.toUpperCase(),
      String(s.detections ?? ""), String(s.totalEngines ?? ""), s.details ?? "",
    ]),
  ];
  const csv = rows.map(r => r.map(escape).join(",")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = `threat-scan-${slugify(scan.indicatorValue)}.csv`;
  a.click();
}

function exportExcel(scan: Scan, sources: SourceResult[]) {
  const wb = XLSX.utils.book_new();

  const summaryRows = [
    ["Field", "Value"],
    ["Indicator", scan.indicatorValue],
    ["Type", scan.indicatorType],
    ["Risk Level", scan.riskLevel.toUpperCase()],
    ["Risk Score", scan.riskScore],
    ["Scanned At", new Date(scan.createdAt as string).toLocaleString()],
    [],
    ["Metric", "Count"],
    ["Total Sources", sources.length],
    ["Malicious", sources.filter(s => s.status === "malicious").length],
    ["Suspicious", sources.filter(s => s.status === "suspicious").length],
    ["Clean", sources.filter(s => s.status === "clean").length],
    ["Not Configured", sources.filter(s => s.status === "error").length],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryRows), "Summary");

  const srcRows = [
    ["Source", "Category", "Status", "Detections", "Total Engines", "Details", "Link"],
    ...sources.map(s => [
      s.name, s.category ?? "", s.status.toUpperCase(),
      s.detections ?? "", s.totalEngines ?? "", s.details ?? "", s.url ?? "",
    ]),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(srcRows), "Source Results");

  XLSX.writeFile(wb, `threat-scan-${slugify(scan.indicatorValue)}.xlsx`);
}

function exportPDF(scan: Scan, sources: SourceResult[]) {
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Threat Intelligence Report", 14, 18);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const meta = [
    `Indicator: ${scan.indicatorValue}`,
    `Type: ${scan.indicatorType.toUpperCase()}   Risk Level: ${scan.riskLevel.toUpperCase()}   Risk Score: ${scan.riskScore}/100`,
    `Scanned: ${new Date(scan.createdAt as string).toLocaleString()}`,
  ];
  meta.forEach((line, i) => doc.text(line, 14, 28 + i * 6));

  const configured = sources.filter(s => s.status !== "error");
  const errors = sources.filter(s => s.status === "error");

  autoTable(doc, {
    head: [["Source", "Category", "Status", "Detections", "Details"]],
    body: configured.map(s => [
      s.name,
      s.category ?? "",
      s.status.toUpperCase(),
      s.detections !== undefined ? `${s.detections}${s.totalEngines ? `/${s.totalEngines}` : ""}` : "—",
      (s.details ?? "").replace(" (simulated — add API key in settings)", ""),
    ]),
    startY: 48,
    styles: { fontSize: 7.5, cellPadding: 2 },
    headStyles: { fillColor: [15, 23, 42], textColor: [148, 163, 184] },
    alternateRowStyles: { fillColor: [22, 33, 55] },
  });

  if (errors.length > 0) {
    const finalY = (doc as any).lastAutoTable?.finalY ?? 100;
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(`${errors.length} sources not configured (no API key):`, 14, finalY + 10);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    errors.forEach((s, i) => doc.text(`• ${s.name} (${s.category})`, 16, finalY + 17 + i * 5));
  }

  doc.save(`threat-scan-${slugify(scan.indicatorValue)}.pdf`);
}

// ── Source row ────────────────────────────────────────────────────────────────
function SourceRow({ source }: { source: SourceResult }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = STATUS_CONFIG[source.status] ?? STATUS_CONFIG.unknown;
  const isError = source.status === "error";

  return (
    <>
      <tr className={`border-b border-border/30 transition-colors group ${isError ? "opacity-50 hover:opacity-70" : "hover:bg-muted/20"}`}>
        <td className="px-4 py-2.5">
          <div className="flex flex-col gap-0.5">
            <span className={`font-mono font-semibold text-sm ${isError ? "text-muted-foreground" : ""}`}>{source.name}</span>
            {source.category && (
              <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wide">{source.category}</span>
            )}
          </div>
        </td>
        <td className="px-4 py-2.5">
          <Badge variant="outline" className={`font-mono text-[10px] flex items-center gap-1 w-fit ${cfg.badge}`}>
            {cfg.icon} {cfg.label}
          </Badge>
        </td>
        <td className="px-4 py-2.5 font-mono text-sm">
          {!isError && source.detections !== undefined && source.totalEngines !== undefined ? (
            <span className={source.detections > 0 ? "text-destructive font-semibold" : "text-muted-foreground"}>
              {source.detections} / {source.totalEngines}
            </span>
          ) : <span className="text-muted-foreground/40">—</span>}
        </td>
        <td className="px-4 py-2.5">
          <div className="flex items-center gap-2 justify-end">
            {!isError && source.url && (
              <a href={source.url} target="_blank" rel="noreferrer"
                className="text-primary hover:text-primary/80 transition-colors inline-flex items-center gap-1 text-xs font-mono">
                View <ExternalLink className="w-3 h-3" />
              </a>
            )}
            {source.details && !isError && (
              <button onClick={() => setExpanded(e => !e)}
                className="text-muted-foreground hover:text-foreground transition-colors p-0.5"
                title={expanded ? "Hide details" : "Show details"}>
                {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
        </td>
      </tr>
      {expanded && !isError && source.details && (
        <tr className="border-b border-border/20 bg-muted/10">
          <td colSpan={4} className="px-4 py-2.5">
            <p className="text-xs font-mono text-muted-foreground leading-relaxed">{source.details}</p>
          </td>
        </tr>
      )}
    </>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
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
    setScanResult(null);
    createScan.mutate({ data: { indicatorType, indicatorValue: indicatorValue.trim() } });
  };

  const sources: SourceResult[] = (scanResult?.sources as SourceResult[] | undefined) ?? [];
  const activeSources  = sources.filter(s => s.status !== "error");
  const errorSources   = sources.filter(s => s.status === "error");
  const maliciousCount = activeSources.filter(s => s.status === "malicious").length;
  const suspiciousCount = activeSources.filter(s => s.status === "suspicious").length;
  const cleanCount     = activeSources.filter(s => s.status === "clean").length;

  // Group active sources by category for display
  const byCategory = activeSources.reduce<Record<string, SourceResult[]>>((acc, s) => {
    const cat = s.category ?? "Other";
    (acc[cat] ??= []).push(s);
    return acc;
  }, {});

  // Add unconfigured sources as a collapsed group
  const byUnconfigured = errorSources.reduce<Record<string, SourceResult[]>>((acc, s) => {
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
                <SelectTrigger className="font-mono bg-background/50"><SelectValue /></SelectTrigger>
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
                onChange={e => setIndicatorValue(e.target.value)}
                className="font-mono bg-background/50"
              />
            </div>
            <Button type="submit" disabled={createScan.isPending || !indicatorValue.trim()} className="w-36 uppercase tracking-widest text-xs font-bold">
              {createScan.isPending
                ? <><Activity className="w-4 h-4 mr-2 animate-spin" /> SCANNING</>
                : <><Search className="w-4 h-4 mr-2" /> ANALYZE</>}
            </Button>
          </form>
        </CardContent>
      </Card>

      {scanResult && (
        <div className="space-y-5 animate-in slide-in-from-bottom-4 duration-500">
          {/* Risk gauge + stats row */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card className={`md:col-span-1 bg-card/50 backdrop-blur-sm border ${getRiskBg(scanResult.riskLevel)}`}>
              <CardContent className="flex flex-col items-center justify-center py-6 gap-3">
                <div className="relative flex items-center justify-center w-28 h-28">
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
                   scanResult.riskLevel === "low"  ? <ShieldCheck  className={`w-5 h-5 mx-auto mb-1 ${getRiskColor(scanResult.riskLevel)}`} /> :
                   <ShieldQuestion className={`w-5 h-5 mx-auto mb-1 ${getRiskColor(scanResult.riskLevel)}`} />}
                  <h3 className={`text-lg font-bold uppercase tracking-widest ${getRiskColor(scanResult.riskLevel)}`}>
                    {scanResult.riskLevel} RISK
                  </h3>
                  <p className="text-[10px] font-mono text-muted-foreground mt-1 break-all px-2">{scanResult.indicatorValue}</p>
                </div>
              </CardContent>
            </Card>

            <div className="md:col-span-3 grid grid-cols-3 gap-3">
              <Card className="bg-destructive/10 border-destructive/30">
                <CardContent className="flex flex-col items-center justify-center h-full py-5">
                  <span className="text-4xl font-bold font-mono text-destructive">{maliciousCount}</span>
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1 font-mono">Malicious</span>
                </CardContent>
              </Card>
              <Card className="bg-warning/10 border-warning/30">
                <CardContent className="flex flex-col items-center justify-center h-full py-5">
                  <span className="text-4xl font-bold font-mono text-warning">{suspiciousCount}</span>
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1 font-mono">Suspicious</span>
                </CardContent>
              </Card>
              <Card className="bg-success/10 border-success/30">
                <CardContent className="flex flex-col items-center justify-center h-full py-5">
                  <span className="text-4xl font-bold font-mono text-success">{cleanCount}</span>
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1 font-mono">Clean</span>
                </CardContent>
              </Card>

              {/* Consensus bar + export buttons */}
              <Card className="col-span-3 bg-card/50 border-border/50">
                <CardContent className="py-3 px-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Detection Consensus ({activeSources.length} active sources)</p>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono text-muted-foreground mr-1">Export:</span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 px-2 font-mono text-[10px] uppercase border-border/50 gap-1"
                        onClick={() => exportCSV(scanResult, sources)}
                      >
                        <FileText className="w-3 h-3" /> CSV
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 px-2 font-mono text-[10px] uppercase border-border/50 gap-1"
                        onClick={() => exportExcel(scanResult, sources)}
                      >
                        <FileSpreadsheet className="w-3 h-3" /> Excel
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 px-2 font-mono text-[10px] uppercase border-border/50 gap-1"
                        onClick={() => exportPDF(scanResult, sources)}
                      >
                        <Download className="w-3 h-3" /> PDF
                      </Button>
                    </div>
                  </div>
                  {activeSources.length > 0 ? (
                    <div className="flex h-2.5 rounded-full overflow-hidden bg-muted/30 gap-px">
                      {maliciousCount > 0 && (
                        <div className="bg-destructive transition-all duration-700" style={{ width: `${(maliciousCount / activeSources.length) * 100}%` }} />
                      )}
                      {suspiciousCount > 0 && (
                        <div className="bg-warning transition-all duration-700" style={{ width: `${(suspiciousCount / activeSources.length) * 100}%` }} />
                      )}
                      {cleanCount > 0 && (
                        <div className="bg-success transition-all duration-700" style={{ width: `${(cleanCount / activeSources.length) * 100}%` }} />
                      )}
                    </div>
                  ) : (
                    <div className="h-2.5 rounded-full bg-muted/30" />
                  )}
                  <div className="flex gap-4 mt-1.5">
                    <span className="text-[10px] font-mono text-destructive">{maliciousCount} malicious</span>
                    <span className="text-[10px] font-mono text-warning">{suspiciousCount} suspicious</span>
                    <span className="text-[10px] font-mono text-success">{cleanCount} clean</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Not-configured alert banner */}
          {errorSources.length > 0 && (
            <Card className="bg-muted/20 border-border/30">
              <CardContent className="p-3 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-start gap-2 flex-1">
                  <AlertCircle className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                  <p className="text-xs font-mono text-muted-foreground leading-relaxed">
                    <span className="font-semibold text-foreground">{errorSources.length} sources not active</span>
                    {" — "}
                    {errorSources.map(s => s.name).slice(0, 5).join(", ")}
                    {errorSources.length > 5 && ` and ${errorSources.length - 5} more`}
                    {" require API keys. Results above are from configured sources only."}
                  </p>
                </div>
                <Link href="/settings">
                  <Button size="sm" variant="outline" className="font-mono text-xs uppercase border-border/50 shrink-0 gap-1.5">
                    <Settings className="w-3.5 h-3.5" /> Configure Keys
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Per-category active source tables */}
          {Object.entries(byCategory).map(([category, catSources]) => (
            <Card key={category} className="bg-card/50 backdrop-blur-sm border-border/50">
              <CardHeader className="pb-2 border-b border-border/30">
                <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary inline-block" />
                  {category}
                  <span className="ml-auto font-mono text-[10px] flex gap-3">
                    {catSources.filter(s => s.status === "malicious").length > 0 && (
                      <span className="text-destructive">{catSources.filter(s => s.status === "malicious").length} malicious</span>
                    )}
                    {catSources.filter(s => s.status === "suspicious").length > 0 && (
                      <span className="text-warning">{catSources.filter(s => s.status === "suspicious").length} suspicious</span>
                    )}
                    {catSources.filter(s => s.status === "clean").length > 0 && (
                      <span className="text-success">{catSources.filter(s => s.status === "clean").length} clean</span>
                    )}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/30 bg-muted/20">
                        <th className="px-4 py-2 text-left font-mono text-[10px] uppercase text-muted-foreground">Engine</th>
                        <th className="px-4 py-2 text-left font-mono text-[10px] uppercase text-muted-foreground">Verdict</th>
                        <th className="px-4 py-2 text-left font-mono text-[10px] uppercase text-muted-foreground">Detections</th>
                        <th className="px-4 py-2 text-right font-mono text-[10px] uppercase text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {catSources.map((source, i) => <SourceRow key={i} source={source} />)}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Unconfigured sources collapsed per category */}
          {Object.keys(byUnconfigured).length > 0 && (
            <Card className="bg-card/20 border-border/20 opacity-60">
              <CardHeader className="pb-2 border-b border-border/20">
                <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground/70 flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Unconfigured Sources ({errorSources.length})
                  <span className="text-[10px] font-normal ml-1">— Add API keys in Settings to activate</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <tbody>
                      {errorSources.map((source, i) => <SourceRow key={i} source={source} />)}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
