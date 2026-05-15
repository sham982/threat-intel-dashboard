import React, { useState, useCallback, useEffect } from "react";
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
  Download, FileText, FileSpreadsheet, AlertCircle, Settings, Bot, Loader2,
  MapPin, Globe, Server, Building2, Network, Fingerprint, Shield,
} from "lucide-react";
import { Link } from "wouter";
import { AIAssistant } from "@/components/AIAssistant";

const TSEDEY_GREEN = "#8bc74c";
const TSEDEY_TEAL = "#1bb7b6";

interface SourceResult {
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
  pulseCount?: number;
  pulseDetails?: any[];
  relatedTags?: string[];
  countryCode?: string;
  asnOwner?: string;
  reverseDns?: string;
}

const STATUS_CONFIG: Record<string, { label: string; badge: string; icon: React.ReactNode }> = {
  malicious:  { label: "MALICIOUS",  badge: "bg-red-500/15 text-red-500 border-red-500/30",  icon: <ShieldAlert className="w-3.5 h-3.5" /> },
  suspicious: { label: "SUSPICIOUS", badge: "bg-yellow-500/15 text-yellow-500 border-yellow-500/30", icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  clean:      { label: "CLEAN",      badge: "bg-[#8bc74c]/15 text-[#8bc74c] border-[#8bc74c]/30", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  unknown:    { label: "UNKNOWN",    badge: "bg-muted/50 text-muted-foreground border-border/50", icon: <HelpCircle className="w-3.5 h-3.5" /> },
  error:      { label: "NOT CONFIGURED", badge: "bg-muted/30 text-muted-foreground/60 border-border/30", icon: <AlertCircle className="w-3.5 h-3.5" /> },
};

function getRiskColor(level: string) {
  return { high: "text-red-500", medium: "text-yellow-500", low: "text-[#8bc74c]" }[level] ?? "text-muted-foreground";
}
function getRiskBg(level: string) {
  return { high: "border-red-500/30", medium: "border-yellow-500/30", low: "border-[#8bc74c]/30" }[level] ?? "border-border";
}

function slugify(value: string) {
  return value.replace(/[^a-z0-9]/gi, "_").slice(0, 40);
}

function exportCSV(scan: Scan, sources: SourceResult[]) {
  const escape = (v: string) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows: string[][] = [
    ["Tsedey Bank - Threat Intelligence Report"],
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
  a.download = `tsedey-threat-scan-${slugify(scan.indicatorValue)}.csv`;
  a.click();
}

function exportExcel(scan: Scan, sources: SourceResult[]) {
  const wb = XLSX.utils.book_new();
  
  const summaryRows = [
    ["=".repeat(50)],
    ["TSEDEY BANK - THREAT INTELLIGENCE REPORT"],
    ["=".repeat(50)],
    ["Report Generated:", new Date().toLocaleString()],
    ["=".repeat(50)],
    ["SCAN INFORMATION"],
    ["Indicator:", scan.indicatorValue],
    ["Type:", scan.indicatorType.toUpperCase()],
    ["Risk Level:", scan.riskLevel.toUpperCase()],
    ["Risk Score:", `${scan.riskScore}/100`],
    ["Scanned At:", new Date(scan.createdAt as string).toLocaleString()],
    ["=".repeat(50)],
    ["THREAT SUMMARY"],
    ["Total Sources:", sources.length],
    ["Malicious:", sources.filter(s => s.status === "malicious").length],
    ["Suspicious:", sources.filter(s => s.status === "suspicious").length],
    ["Clean:", sources.filter(s => s.status === "clean").length],
    ["Not Configured:", sources.filter(s => s.status === "error").length],
  ];
  
  const ws1 = XLSX.utils.aoa_to_sheet(summaryRows);
  if (ws1['!merges']) ws1['!merges'] = [];
  ws1['!merges'] = [{ s: { r: 1, c: 0 }, e: { r: 1, c: 1 } }];
  ws1["!cols"] = [{ wch: 25 }, { wch: 50 }];
  XLSX.utils.book_append_sheet(wb, ws1, "Tsedey Summary");
  
  const srcRows = [
    ["TSEDEY BANK SOURCE DETAILS"],
    ["=".repeat(60)],
    ["SOURCE", "CATEGORY", "STATUS", "DETECTIONS", "TOTAL ENGINES", "DETAILS", "URL"],
    ...sources.map(s => [
      s.name, s.category ?? "", s.status.toUpperCase(),
      s.detections !== undefined ? `${s.detections}${s.totalEngines ? `/${s.totalEngines}` : ""}` : "-",
      s.totalEngines ?? "-",
      s.details ?? "",
      s.url ?? "",
    ]),
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(srcRows);
  ws2["!cols"] = [{ wch: 25 }, { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 50 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, ws2, "Source Results");
  
  XLSX.writeFile(wb, `tsedey-threat-scan-${slugify(scan.indicatorValue)}-${Date.now()}.xlsx`);
}

function exportPDF(scan: Scan, sources: SourceResult[]) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  
  doc.setFillColor(139, 199, 76);
  doc.rect(0, 0, doc.internal.pageSize.width, 35, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("TSEDEY BANK", 14, 18);
  doc.setFontSize(10);
  doc.text("Threat Intelligence Report", 14, 28);
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);
  
  const meta = [
    `Indicator: ${scan.indicatorValue}`,
    `Type: ${scan.indicatorType.toUpperCase()}   Risk Level: ${scan.riskLevel.toUpperCase()}   Risk Score: ${scan.riskScore}/100`,
    `Scanned: ${new Date(scan.createdAt as string).toLocaleString()}`,
  ];
  meta.forEach((line, i) => doc.text(line, 14, 48 + i * 6));
  
  const configured = sources.filter(s => s.status !== "error");
  const errors = sources.filter(s => s.status === "error");
  
  (autoTable as any)(doc, {
    head: [["Source", "Category", "Status", "Detections", "Details"]],
    body: configured.map(s => [
      s.name,
      s.category ?? "",
      s.status.toUpperCase(),
      s.detections !== undefined ? `${s.detections}${s.totalEngines ? `/${s.totalEngines}` : ""}` : "-",
      (s.details ?? "").substring(0, 100),
    ]),
    startY: 68,
    styles: { fontSize: 7, cellPadding: 2, overflow: "linebreak" },
    headStyles: { fillColor: [139, 199, 76], textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [240, 248, 240] },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 30 },
      2: { cellWidth: 20 },
      3: { cellWidth: 20 },
      4: { cellWidth: "auto" },
    },
    margin: { left: 10, right: 10 },
  });
  
  if (errors.length > 0) {
    const finalY = (doc as any).lastAutoTable?.finalY ?? 120;
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(139, 199, 76);
    doc.text(`${errors.length} source(s) not configured:`, 14, finalY + 8);
    doc.setTextColor(100, 100, 100);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    errors.forEach((s, i) => {
      if (i < 10) {
        doc.text(`- ${s.name}`, 16, finalY + 15 + i * 4);
      }
    });
  }
  
  doc.save(`tsedey-threat-scan-${slugify(scan.indicatorValue)}.pdf`);
}

function SourceRow({ source }: { source: SourceResult }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = STATUS_CONFIG[source.status] ?? STATUS_CONFIG.unknown;
  const isError = source.status === "error";
  const isVirusTotal = source.name === "VirusTotal";
  const isAbuseIPDB = source.name === "AbuseIPDB";
  const isAlienVault = source.name === "AlienVault OTX";
  
  const maliciousEngines = source.maliciousEngines || [];
  const suspiciousEngines = source.suspiciousEngines || [];
  
  let vtDetails: any = null;
  if (isVirusTotal && source.details) {
    const match = source.details.match(/(\d+) malicious, (\d+) suspicious out of (\d+) engines/);
    if (match) {
      vtDetails = {
        malicious: parseInt(match[1]),
        suspicious: parseInt(match[2]),
        total: parseInt(match[3]),
        clean: parseInt(match[3]) - parseInt(match[1]) - parseInt(match[2])
      };
    }
  }

  // Always show expand button for all platforms (except errors)
  const showExpandButton = !isError && (source.details || isVirusTotal || maliciousEngines.length > 0 || isAbuseIPDB || isAlienVault);

  return (
    <React.Fragment key={source.name}>
      <tr className={`border-b border-border/30 transition-all duration-300 ${isError ? "opacity-40" : "hover:bg-muted/20"}`}>
        <td className="px-4 py-3">
          <div className="flex flex-col gap-0.5">
            <span className={`font-mono font-semibold text-sm ${isError ? "text-muted-foreground" : "text-foreground"}`}>{source.name}</span>
            {source.category && <span className="text-[10px] font-mono text-[#1bb7b6] uppercase tracking-wide">{source.category}</span>}
          </div>
        </td>
        <td className="px-4 py-3">
          <Badge variant="outline" className={`font-mono text-[10px] flex items-center gap-1 w-fit ${cfg.badge}`}>
            {cfg.icon} {cfg.label}
          </Badge>
        </td>
        <td className="px-4 py-3 font-mono text-sm">
          {!isError && source.detections !== undefined && source.totalEngines !== undefined ? (
            <span className={source.detections > 0 ? "text-red-500 font-semibold" : "text-[#8bc74c]"}>
              {source.detections} / {source.totalEngines}
            </span>
          ) : !isError && source.reports !== undefined ? (
            <span className={source.reports > 0 ? "text-red-500 font-semibold" : "text-[#8bc74c]"}>
              {source.reports.toLocaleString()} reports
            </span>
          ) : (
            <span className="text-muted-foreground/40">-</span>
          )}
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2 justify-end">
            {!isError && source.url && (
              <a href={source.url} target="_blank" rel="noreferrer" className="text-[#1bb7b6] hover:text-[#8bc74c] transition-colors inline-flex items-center gap-1 text-xs font-mono">
                View <ExternalLink className="w-3 h-3" />
              </a>
            )}
            {showExpandButton && (
              <button onClick={() => setExpanded(e => !e)} className="text-muted-foreground hover:text-[#8bc74c] transition-colors p-0.5">
                {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
        </td>
      </tr>
      {expanded && !isError && (
        <tr className="border-b border-border/20 bg-muted/10">
          <td colSpan={4} className="px-4 py-3">
            <div className="space-y-3">
              {/* VirusTotal Detailed View */}
              {isVirusTotal && vtDetails && (
                <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-4 border border-red-200 dark:border-red-800">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-xs font-mono font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">
                      VirusTotal Detection Breakdown
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 mb-4">
                    <div className="text-center p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                      <div className="text-2xl font-bold text-red-600 dark:text-red-400">{vtDetails.malicious}</div>
                      <div className="text-[10px] font-mono text-red-500/70">MALICIOUS</div>
                    </div>
                    <div className="text-center p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                      <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{vtDetails.suspicious}</div>
                      <div className="text-[10px] font-mono text-yellow-500/70">SUSPICIOUS</div>
                    </div>
                    <div className="text-center p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">{vtDetails.clean}</div>
                      <div className="text-[10px] font-mono text-green-500/70">CLEAN</div>
                    </div>
                    <div className="text-center p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                      <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">{vtDetails.total}</div>
                      <div className="text-[10px] font-mono text-gray-500/70">TOTAL</div>
                    </div>
                  </div>
                  {maliciousEngines.length > 0 && (
                    <div className="mb-3">
                      <div className="flex items-center gap-2 mb-2">
                        <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
                        <span className="text-[10px] font-mono font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">
                          Detected by ({maliciousEngines.length} engines)
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {maliciousEngines.slice(0, 15).map((engine: string, idx: number) => (
                          <Badge key={idx} variant="outline" className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700 text-[9px]">
                            {engine}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* AbuseIPDB Detailed View */}
              {isAbuseIPDB && (
                <div className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30 rounded-xl p-5 border border-orange-200 dark:border-orange-800 shadow-lg">
                  <div className="flex items-center gap-3 mb-4 pb-2 border-b border-orange-200 dark:border-orange-800">
                    <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                    <Shield className="w-4 h-4 text-orange-500" />
                    <span className="text-xs font-mono font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider">
                      AbuseIPDB Intelligence Report
                    </span>
                    <Badge className={`ml-auto ${source.status === "malicious" ? "bg-red-500/20 text-red-500 border-red-500/30" : "bg-orange-500/20 text-orange-500 border-orange-500/30"}`}>
                      {source.status === "malicious" ? "Malicious" : source.status === "suspicious" ? "Suspicious" : "Clean"}
                    </Badge>
                  </div>
                  
                  <div className="mb-5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Abuse Confidence Score</span>
                      <span className="text-xl font-bold font-mono text-orange-600 dark:text-orange-400">{source.confidence || source.detections || 0}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-orange-400 to-red-500 rounded-full transition-all duration-500" style={{ width: `${source.confidence || source.detections || 0}%` }} />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    <div className="bg-white/50 dark:bg-black/20 rounded-lg p-2 text-center border border-orange-100 dark:border-orange-800/50">
                      <ShieldAlert className="w-4 h-4 text-red-500 mx-auto mb-1" />
                      <div className="text-xl font-bold text-red-600 dark:text-red-400">{source.reports?.toLocaleString() || 0}</div>
                      <div className="text-[9px] font-mono text-muted-foreground">Total Reports</div>
                    </div>
                    <div className="bg-white/50 dark:bg-black/20 rounded-lg p-2 text-center border border-orange-100 dark:border-orange-800/50">
                      <Building2 className="w-4 h-4 text-blue-500 mx-auto mb-1" />
                      <div className="text-xs font-mono text-foreground truncate">{source.usageType || "N/A"}</div>
                      <div className="text-[9px] font-mono text-muted-foreground">Usage Type</div>
                    </div>
                    <div className="bg-white/50 dark:bg-black/20 rounded-lg p-2 text-center border border-orange-100 dark:border-orange-800/50">
                      <Server className="w-4 h-4 text-green-500 mx-auto mb-1" />
                      <div className="text-xs font-mono text-foreground truncate">{source.isp || "N/A"}</div>
                      <div className="text-[9px] font-mono text-muted-foreground">ISP</div>
                    </div>
                    <div className="bg-white/50 dark:bg-black/20 rounded-lg p-2 text-center border border-orange-100 dark:border-orange-800/50">
                      <Network className="w-4 h-4 text-purple-500 mx-auto mb-1" />
                      <div className="text-xs font-mono text-foreground truncate">{source.asn || "N/A"}</div>
                      <div className="text-[9px] font-mono text-muted-foreground">ASN</div>
                    </div>
                  </div>
                  
                  {(source.country || source.city || source.location) && (
                    <div className="mb-3 p-3 bg-white/50 dark:bg-black/20 rounded-lg border border-orange-100 dark:border-orange-800/50">
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="w-3.5 h-3.5 text-orange-500" />
                        <span className="text-[10px] font-mono font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider">Location Details</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div><span className="text-muted-foreground">Country:</span> <span className="font-mono">{source.country || "N/A"}</span></div>
                        <div><span className="text-muted-foreground">City:</span> <span className="font-mono">{source.city || "N/A"}</span></div>
                      </div>
                    </div>
                  )}
                  
                  {(source.hostname || source.domain) && (
                    <div className="mb-3 p-3 bg-white/50 dark:bg-black/20 rounded-lg border border-orange-100 dark:border-orange-800/50">
                      <div className="flex items-center gap-2 mb-2">
                        <Globe className="w-3.5 h-3显示 text-blue-500" />
                        <span className="text-[10px] font-mono font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider">Network Details</span>
                      </div>
                      {source.hostname && <div className="text-xs mb-1"><span className="text-muted-foreground">Hostname:</span> <span className="font-mono">{source.hostname}</span></div>}
                      {source.domain && <div className="text-xs"><span className="text-muted-foreground">Domain:</span> <span className="font-mono">{source.domain}</span></div>}
                    </div>
                  )}
                  
                  <div className="text-xs font-mono text-gray-600 dark:text-gray-400 leading-relaxed bg-black/5 dark:bg-white/5 p-3 rounded-lg">
                    {source.details}
                  </div>
                </div>
              )}
              
              {/* AlienVault OTX Detailed View */}
              {isAlienVault && source.pulseDetails && source.pulseDetails.length > 0 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-purple-50 dark:bg-purple-950/30 rounded-lg p-3 text-center border border-purple-200 dark:border-purple-800">
                      <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{source.detections || 0}</div>
                      <div className="text-[9px] font-mono text-muted-foreground">Total Pulses</div>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 text-center border border-blue-200 dark:border-blue-800">
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{source.relatedTags?.length || 0}</div>
                      <div className="text-[9px] font-mono text-muted-foreground">Related Tags</div>
                    </div>
                    <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3 text-center border border-green-200 dark:border-green-800">
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">{source.pulseDetails?.length || 0}</div>
                      <div className="text-[9px] font-mono text-muted-foreground">Recent Pulses</div>
                    </div>
                    <div className="bg-cyan-50 dark:bg-cyan-950/30 rounded-lg p-3 text-center border border-cyan-200 dark:border-cyan-800">
                      <div className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">{source.pulseCount || 0}</div>
                      <div className="text-[9px] font-mono text-muted-foreground">Active Pulses</div>
                    </div>
                  </div>
                  
                  {(source.countryCode || source.asn || source.reverseDns) && (
                    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-2 mb-2">
                        <Globe className="w-3.5 h-3.5 text-blue-500" />
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider">Location & Network</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {source.countryCode && <div><span className="text-muted-foreground">Country:</span> {source.countryCode}</div>}
                        {source.asn && <div><span className="text-muted-foreground">ASN:</span> {source.asn}</div>}
                        {source.asnOwner && <div className="col-span-2"><span className="text-muted-foreground">AS Owner:</span> {source.asnOwner}</div>}
                        {source.reverseDns && <div className="col-span-2"><span className="text-muted-foreground">Reverse DNS:</span> <span className="font-mono text-[10px]">{source.reverseDns}</span></div>}
                      </div>
                    </div>
                  )}
                  
                  {source.relatedTags && source.relatedTags.length > 0 && (
                    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider">Related Tags</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {source.relatedTags.slice(0, 20).map((tag: string, idx: number) => (
                          <Badge key={idx} variant="outline" className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700 text-[9px]">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {source.pulseDetails && source.pulseDetails.length > 0 && (
                    <div className="space-y-2">
                      <details className="group">
                        <summary className="cursor-pointer text-[10px] font-mono font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                          📡 Recent Pulses ({source.pulseDetails.length} of {source.detections})
                        </summary>
                        <div className="mt-3 space-y-2 max-h-64 overflow-y-auto">
                          {source.pulseDetails.map((pulse: any, idx: number) => (
                            <div key={idx} className="bg-purple-50 dark:bg-purple-950/20 rounded-lg p-3 border border-purple-200 dark:border-purple-800">
                              <div className="flex items-start justify-between gap-2 flex-wrap mb-1">
                                <span className="text-xs font-mono font-bold text-purple-700 dark:text-purple-300">{pulse.name}</span>
                                <Badge variant="outline" className="text-[8px]">{pulse.tlp || "Green"}</Badge>
                              </div>
                              <div className="text-[10px] text-muted-foreground mb-1">Author: {pulse.author}</div>
                              {pulse.description && (
                                <div className="text-[10px] text-muted-foreground mb-2 line-clamp-2">{pulse.description}</div>
                              )}
                              {pulse.tags && pulse.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {pulse.tags.slice(0, 5).map((tag: string, tidx: number) => (
                                    <Badge key={tidx} variant="outline" className="text-[8px] bg-purple-100 dark:bg-purple-900/30">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </details>
                    </div>
                  )}
                </div>
              )}
              
              {/* Generic Details for other sources */}
              {!isVirusTotal && !isAbuseIPDB && !isAlienVault && source.details && (
                <div className="text-xs font-mono text-gray-600 dark:text-gray-400 leading-relaxed bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg">
                  {source.details}
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </React.Fragment>
  );
}

export default function Lookup() {
  const [indicatorType, setIndicatorType] = useState<ScanIndicatorType>("ip");
  const [indicatorValue, setIndicatorValue] = useState("");
  const [scanResult, setScanResult] = useState<Scan | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  
  const createScan = useCreateScan({ 
    mutation: { 
      onSuccess: (data) => {
        console.log("✅ SCAN COMPLETE - Full Response from Backend:");
        console.log("📊 RISK INFO:", {
          riskScore: data.riskScore,
          riskLevel: data.riskLevel,
          indicatorValue: data.indicatorValue,
          indicatorType: data.indicatorType
        });
        console.log("🔍 ALL PLATFORM RESULTS (JSON):");
        console.log(JSON.stringify(data.sources, null, 2));
        setScanResult(data);
      },
      onError: (error) => {
        console.error("❌ Scan failed:", error);
      }
    } 
  });

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!indicatorValue.trim()) return;
    console.log(`🔍 Starting threat lookup for: ${indicatorValue} (${indicatorType})`);
    setScanResult(null);
    setAiAnalysis(null);
    createScan.mutate({ data: { indicatorType, indicatorValue: indicatorValue.trim() } });
  };

  const sources: SourceResult[] = (scanResult?.sources as SourceResult[] | undefined) ?? [];
  // Show ALL sources - don't filter anything
  const allSources = sources;
  const errorSources = allSources.filter(s => s.status === "error");
  const maliciousCount = allSources.filter(s => s.status === "malicious").length;
  const suspiciousCount = allSources.filter(s => s.status === "suspicious").length;
  const cleanCount = allSources.filter(s => s.status === "clean").length;

  // Group ALL sources by category (including errors)
  const byCategory = allSources.reduce<Record<string, SourceResult[]>>((acc, s) => {
    const cat = s.category ?? "Other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(s);
    return acc;
  }, {});

  const getAiAnalysis = useCallback(async (scanResultData: Scan, sourcesList: SourceResult[]) => {
    console.log("🔍 AI Analysis started for:", scanResultData.indicatorValue);
    setIsAiAnalyzing(true);
    try {
      const malCount = sourcesList.filter(s => s.status === "malicious").length;
      const suspCount = sourcesList.filter(s => s.status === "suspicious").length;
      const clnCount = sourcesList.filter(s => s.status === "clean").length;
      
      const response = await fetch("/api/analyze-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          indicatorValue: scanResultData.indicatorValue,
          indicatorType: scanResultData.indicatorType,
          riskScore: scanResultData.riskScore,
          riskLevel: scanResultData.riskLevel,
          sources: sourcesList.map(s => ({ name: s.name, status: s.status })),
          summary: { maliciousCount: malCount, suspiciousCount: suspCount, cleanCount: clnCount, totalSources: sourcesList.length }
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setAiAnalysis(data.analysis);
      } else {
        setAiAnalysis("Analysis temporarily unavailable.");
      }
    } catch (error) {
      console.error("AI analysis error:", error);
      setAiAnalysis("Unable to fetch analysis.");
    } finally {
      setIsAiAnalyzing(false);
    }
  }, []);

  useEffect(() => {
    if (scanResult && sources.length > 0 && !isAiAnalyzing) {
      getAiAnalysis(scanResult, sources);
    }
  }, [scanResult, sources]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <div className="w-1 h-8 bg-gradient-to-b from-[#8bc74c] to-[#1bb7b6] rounded-full" />
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-[#8bc74c] to-[#1bb7b6] bg-clip-text text-transparent">Threat Intelligence Lookup</h1>
        </div>
        <p className="text-sm text-muted-foreground font-mono tracking-widest ml-3">MULTI-SOURCE THREAT ANALYSIS — REAL-TIME INTELLIGENCE</p>
      </div>

      {/* Search form */}
      <Card className="bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm border-none shadow-lg">
        <CardHeader className="pb-3"><CardTitle className="text-sm uppercase tracking-widest text-muted-foreground">New Analysis</CardTitle></CardHeader>
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
              <Input placeholder="Enter IP, URL, Domain, or Hash..." value={indicatorValue} onChange={e => setIndicatorValue(e.target.value)} className="font-mono bg-background/50" />
            </div>
            <Button type="submit" disabled={createScan.isPending || !indicatorValue.trim()} className="w-36 uppercase tracking-widest text-xs font-bold bg-gradient-to-r from-[#8bc74c] to-[#1bb7b6]">
              {createScan.isPending ? <><Activity className="w-4 h-4 mr-2 animate-spin" /> SCANNING</> : <><Search className="w-4 h-4 mr-2" /> ANALYZE</>}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Main Results */}
      {scanResult && (
        <div className="space-y-5 animate-in slide-in-from-bottom-4 duration-500">
          {/* Risk gauge + stats row */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card className={`md:col-span-1 bg-gradient-to-br from-card/80 to-card/40 border ${getRiskBg(scanResult.riskLevel)}`}>
              <CardContent className="flex flex-col items-center justify-center py-6 gap-3">
                <div className="relative flex items-center justify-center w-28 h-28">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="10" className="text-muted opacity-20" />
                    <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="10" strokeDasharray={`${scanResult.riskScore * 2.638} 263.8`} className={`${getRiskColor(scanResult.riskLevel)} transition-all duration-1000`} strokeLinecap="round" />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className={`text-3xl font-bold font-mono ${getRiskColor(scanResult.riskLevel)}`}>{scanResult.riskScore}</span>
                    <span className="text-[9px] text-muted-foreground uppercase tracking-widest">SCORE</span>
                  </div>
                </div>
                <div className="text-center">
                  <h3 className={`text-lg font-bold uppercase tracking-widest ${getRiskColor(scanResult.riskLevel)}`}>{scanResult.riskLevel} RISK</h3>
                  <p className="text-[10px] font-mono text-muted-foreground mt-1 break-all px-2">{scanResult.indicatorValue}</p>
                </div>
              </CardContent>
            </Card>

            <div className="md:col-span-3 grid grid-cols-3 gap-3">
              <Card className="bg-red-500/10 border-red-500/30"><CardContent className="flex flex-col items-center justify-center h-full py-5"><span className="text-4xl font-bold font-mono text-red-500">{maliciousCount}</span><span className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">Malicious</span></CardContent></Card>
              <Card className="bg-yellow-500/10 border-yellow-500/30"><CardContent className="flex flex-col items-center justify-center h-full py-5"><span className="text-4xl font-bold font-mono text-yellow-500">{suspiciousCount}</span><span className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">Suspicious</span></CardContent></Card>
              <Card className="bg-[#8bc74c]/10 border-[#8bc74c]/30"><CardContent className="flex flex-col items-center justify-center h-full py-5"><span className="text-4xl font-bold font-mono text-[#8bc74c]">{cleanCount}</span><span className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">Clean</span></CardContent></Card>

              <Card className="col-span-3 bg-gradient-to-br from-card/80 to-card/40">
                <CardContent className="py-3 px-4">
                  <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                    <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                      Detection Consensus ({allSources.length} total sources)
                      {isAiAnalyzing && <Loader2 className="w-3 h-3 inline ml-2 animate-spin text-[#8bc74c]" />}
                    </p>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono text-muted-foreground">Export:</span>
                      <Button size="sm" variant="outline" className="h-6 px-2 text-[10px]" onClick={() => exportCSV(scanResult, sources)}><FileText className="w-3 h-3 mr-1" /> CSV</Button>
                      <Button size="sm" variant="outline" className="h-6 px-2 text-[10px]" onClick={() => exportExcel(scanResult, sources)}><FileSpreadsheet className="w-3 h-3 mr-1" /> Excel</Button>
                      <Button size="sm" variant="outline" className="h-6 px-2 text-[10px]" onClick={() => exportPDF(scanResult, sources)}><Download className="w-3 h-3 mr-1" /> PDF</Button>
                    </div>
                  </div>
                  
                  {/* AI Summary Analysis */}
                  {aiAnalysis && !isAiAnalyzing && (
                    <div className="mb-3 p-3 rounded-lg bg-gradient-to-r from-[#8bc74c]/10 to-[#1bb7b6]/10 border border-[#8bc74c]/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Bot className="w-3.5 h-3.5 text-[#8bc74c]" />
                        <span className="text-[10px] font-mono font-bold text-[#8bc74c] uppercase tracking-wider">AI THREAT SUMMARY</span>
                      </div>
                      <p className="text-xs font-mono leading-relaxed text-foreground/90 whitespace-pre-wrap">{aiAnalysis}</p>
                    </div>
                  )}
                  
                  {allSources.length > 0 ? (
                    <div className="flex h-3 rounded-full overflow-hidden gap-px">
                      {maliciousCount > 0 && <div className="bg-red-500 transition-all" style={{ width: `${(maliciousCount / allSources.length) * 100}%` }} />}
                      {suspiciousCount > 0 && <div className="bg-yellow-500 transition-all" style={{ width: `${(suspiciousCount / allSources.length) * 100}%` }} />}
                      {cleanCount > 0 && <div className="bg-[#8bc74c] transition-all" style={{ width: `${(cleanCount / allSources.length) * 100}%` }} />}
                    </div>
                  ) : <div className="h-3 rounded-full bg-muted/30" />}
                  <div className="flex gap-4 mt-2">
                    <span className="text-[10px] font-mono text-red-500">● {maliciousCount} malicious</span>
                    <span className="text-[10px] font-mono text-yellow-500">● {suspiciousCount} suspicious</span>
                    <span className="text-[10px] font-mono text-[#8bc74c]">● {cleanCount} clean</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Not-configured alert */}
          {errorSources.length > 0 && (
            <Card className="bg-muted/20 border-border/30">
              <CardContent className="p-3 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-start gap-2 flex-1"><AlertCircle className="w-4 h-4 text-[#c6cc3b] shrink-0 mt-0.5" /><p className="text-xs font-mono text-muted-foreground"><span className="font-semibold text-[#c6cc3b]">{errorSources.length} sources not active</span> - {errorSources.map(s => s.name).slice(0, 3).join(", ")}{errorSources.length > 3 && ` and ${errorSources.length - 3} more`} require API keys.</p></div>
                <Link href="/settings"><Button size="sm" variant="outline" className="font-mono text-xs uppercase">Configure Keys</Button></Link>
              </CardContent>
            </Card>
          )}

          {/* Active source tables by category - NOW SHOWING ALL SOURCES */}
          {Object.entries(byCategory).map(([category, catSources]) => (
            <Card key={category} className="bg-gradient-to-br from-card/80 to-card/40 border-none shadow-lg overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-[#8bc74c] via-[#1bb7b6] to-[#c6cc3b]" />
              <CardHeader className="pb-2 border-b border-border/30">
                <CardTitle className="text-xs uppercase tracking-widest">{category}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/30 bg-muted/20">
                        <th className="px-4 py-2 text-left font-mono text-[10px] uppercase">Engine</th>
                        <th className="px-4 py-2 text-left font-mono text-[10px] uppercase">Verdict</th>
                        <th className="px-4 py-2 text-left font-mono text-[10px] uppercase">Detections</th>
                        <th className="px-4 py-2 text-right font-mono text-[10px] uppercase">Actions</th>
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
        </div>
      )}

      <AIAssistant indicatorValue={indicatorValue} indicatorType={indicatorType} scanResults={scanResult} />
    </div>
  );
}
