import { useState } from "react";
import { useListScans, useDeleteScan, ListScansIndicatorType, ListScansRiskLevel } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Trash2, Activity, Download, FileSpreadsheet, FileText } from "lucide-react";
import { format } from "date-fns";
import { useDebounce } from "@/hooks/use-debounce";
import { useQueryClient } from "@tanstack/react-query";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function exportToCSV(scans: any[]) {
  const headers = ["Indicator Value", "Type", "Risk Score", "Risk Level", "Analyst", "Notes", "Timestamp"];
  const rows = scans.map(s => [
    `"${(s.indicatorValue || "").replace(/"/g, '""')}"`,
    s.indicatorType,
    s.riskScore,
    s.riskLevel,
    s.username || "",
    `"${(s.notes || "").replace(/"/g, '""')}"`,
    format(new Date(s.createdAt), "yyyy-MM-dd HH:mm:ss"),
  ]);
  const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
  downloadBlob(csv, "scan-results.csv", "text/csv");
}

async function exportToExcel(scans: any[]) {
  const XLSX = await import("xlsx");
  const ws = XLSX.utils.json_to_sheet(scans.map(s => ({
    "Indicator Value": s.indicatorValue,
    "Type": s.indicatorType,
    "Risk Score": s.riskScore,
    "Risk Level": s.riskLevel,
    "Analyst": s.username || "",
    "Notes": s.notes || "",
    "Timestamp": format(new Date(s.createdAt), "yyyy-MM-dd HH:mm:ss"),
  })));

  const colWidths = [
    { wch: 40 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 40 }, { wch: 22 }
  ];
  ws["!cols"] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Scan Results");
  XLSX.writeFile(wb, "scan-results.xlsx");
}

async function exportToPDF(scans: any[]) {
  const jsPDF = (await import("jspdf")).default;
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(30, 174, 219);
  doc.text("THREAT INTELLIGENCE — SCAN RESULTS", 14, 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 130);
  doc.text(`Exported: ${format(new Date(), "yyyy-MM-dd HH:mm:ss")} UTC  |  Total Records: ${scans.length}`, 14, 25);

  const riskColor = (level: string) => {
    switch (level) {
      case "high": return [220, 53, 53] as [number, number, number];
      case "medium": return [251, 146, 60] as [number, number, number];
      case "low": return [34, 197, 94] as [number, number, number];
      default: return [120, 120, 130] as [number, number, number];
    }
  };

  autoTable(doc, {
    startY: 30,
    head: [["Indicator Value", "Type", "Score", "Risk Level", "Analyst", "Timestamp", "Notes"]],
    body: scans.map(s => [
      s.indicatorValue,
      (s.indicatorType || "").toUpperCase(),
      s.riskScore,
      (s.riskLevel || "").toUpperCase(),
      s.username || "-",
      format(new Date(s.createdAt), "yyyy-MM-dd HH:mm"),
      (s.notes || "").slice(0, 60),
    ]),
    styles: { fontSize: 7.5, cellPadding: 3, font: "helvetica", textColor: [220, 225, 235] },
    headStyles: { fillColor: [20, 25, 40], textColor: [100, 180, 220], fontStyle: "bold", fontSize: 7 },
    alternateRowStyles: { fillColor: [22, 27, 45] },
    bodyStyles: { fillColor: [15, 20, 35] },
    columnStyles: {
      0: { cellWidth: 55 },
      1: { cellWidth: 18 },
      2: { cellWidth: 15, halign: "center" },
      3: { cellWidth: 22, halign: "center" },
      4: { cellWidth: 22 },
      5: { cellWidth: 32 },
      6: { cellWidth: 60 },
    },
    didDrawCell: (data: any) => {
      if (data.section === "body" && data.column.index === 3) {
        const val = (scans[data.row.index]?.riskLevel || "").toLowerCase();
        const color = riskColor(val);
        doc.setTextColor(...color);
        doc.setFont("helvetica", "bold");
        doc.text((data.cell.raw as string), data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2 + 0.5, { align: "center" });
        doc.setFont("helvetica", "normal");
        doc.setTextColor(220, 225, 235);
      }
    },
    margin: { left: 14, right: 14 },
  });

  doc.save("scan-results.pdf");
}

function downloadBlob(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Scans() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [riskFilter, setRiskFilter] = useState<string>("all");
  const [exporting, setExporting] = useState<string | null>(null);

  const queryParams: any = { limit: 200 };
  if (debouncedSearch) queryParams.search = debouncedSearch;
  if (typeFilter !== "all") queryParams.indicatorType = typeFilter as ListScansIndicatorType;
  if (riskFilter !== "all") queryParams.riskLevel = riskFilter as ListScansRiskLevel;

  const { data, isLoading } = useListScans(queryParams);
  const deleteScan = useDeleteScan();

  const handleDelete = (id: number) => {
    if (confirm("Delete this scan record?")) {
      deleteScan.mutate({ id }, {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/scans"] }),
      });
    }
  };

  const handleExport = async (type: "csv" | "xlsx" | "pdf") => {
    if (!data?.scans?.length) return;
    setExporting(type);
    try {
      if (type === "csv") exportToCSV(data.scans);
      else if (type === "xlsx") await exportToExcel(data.scans);
      else await exportToPDF(data.scans);
    } finally {
      setExporting(null);
    }
  };

  const getRiskBadge = (level: string) => {
    const styles: Record<string, string> = {
      high: "bg-destructive/10 text-destructive border-destructive/30",
      medium: "bg-warning/10 text-warning border-warning/30",
      low: "bg-success/10 text-success border-success/30",
      unknown: "bg-muted text-muted-foreground border-border",
    };
    return (
      <Badge variant="outline" className={`font-mono uppercase text-[10px] ${styles[level] || styles.unknown}`}>
        {level}
      </Badge>
    );
  };

  const canDelete = user?.role === "admin" || user?.role === "analyst";
  const hasData = (data?.scans?.length ?? 0) > 0;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col">
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight uppercase">Scan History</h1>
          <p className="text-sm text-muted-foreground font-mono tracking-widest">
            HISTORICAL THREAT INTELLIGENCE
            {data && <span className="ml-2 text-primary">[{data.total} RECORDS]</span>}
          </p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="font-mono text-xs uppercase tracking-wider border-border/50"
              disabled={!hasData || !!exporting}
            >
              <Download className="w-4 h-4 mr-2" />
              {exporting ? `Exporting ${exporting.toUpperCase()}...` : "Export"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-card border-border">
            <DropdownMenuItem
              className="font-mono text-xs cursor-pointer gap-2"
              onClick={() => handleExport("csv")}
            >
              <FileText className="w-4 h-4 text-muted-foreground" />
              Download CSV
            </DropdownMenuItem>
            <DropdownMenuItem
              className="font-mono text-xs cursor-pointer gap-2"
              onClick={() => handleExport("xlsx")}
            >
              <FileSpreadsheet className="w-4 h-4 text-success" />
              Download Excel (.xlsx)
            </DropdownMenuItem>
            <DropdownMenuItem
              className="font-mono text-xs cursor-pointer gap-2"
              onClick={() => handleExport("pdf")}
            >
              <FileText className="w-4 h-4 text-destructive" />
              Download PDF Report
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Card className="bg-card/50 backdrop-blur-sm border-border/50 shrink-0">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search indicators or notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-background/50 font-mono"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[160px] bg-background/50 font-mono">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="ip">IP Address</SelectItem>
              <SelectItem value="url">URL</SelectItem>
              <SelectItem value="domain">Domain</SelectItem>
              <SelectItem value="hash">File Hash</SelectItem>
            </SelectContent>
          </Select>
          <Select value={riskFilter} onValueChange={setRiskFilter}>
            <SelectTrigger className="w-[160px] bg-background/50 font-mono">
              <SelectValue placeholder="Risk Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Risks</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="unknown">Unknown</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card className="bg-card/50 backdrop-blur-sm border-border/50 flex-1 flex flex-col min-h-0">
        <div className="flex-1 overflow-auto rounded-md">
          <Table>
            <TableHeader className="bg-muted/50 sticky top-0 z-10 backdrop-blur-sm">
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead className="font-mono text-xs uppercase w-[300px]">Indicator</TableHead>
                <TableHead className="font-mono text-xs uppercase">Type</TableHead>
                <TableHead className="font-mono text-xs uppercase">Score</TableHead>
                <TableHead className="font-mono text-xs uppercase">Risk</TableHead>
                <TableHead className="font-mono text-xs uppercase">Analyst</TableHead>
                <TableHead className="font-mono text-xs uppercase">Timestamp</TableHead>
                {canDelete && <TableHead className="font-mono text-xs uppercase text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={canDelete ? 7 : 6} className="h-32 text-center">
                    <Activity className="w-6 h-6 text-primary animate-spin mx-auto mb-2" />
                    <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Retrieving Records...</span>
                  </TableCell>
                </TableRow>
              ) : data?.scans.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canDelete ? 7 : 6} className="h-32 text-center text-muted-foreground font-mono text-sm">
                    NO RECORDS FOUND
                  </TableCell>
                </TableRow>
              ) : (
                data?.scans.map((scan, i) => (
                  <TableRow key={scan.id} className="border-border/50 group animate-in fade-in" style={{ animationDelay: `${i * 20}ms` }}>
                    <TableCell className="font-mono text-sm max-w-[300px] truncate" title={scan.indicatorValue}>
                      {scan.indicatorValue}
                    </TableCell>
                    <TableCell className="font-mono text-xs uppercase text-muted-foreground">{scan.indicatorType}</TableCell>
                    <TableCell>
                      <span className={`font-mono text-sm font-bold ${
                        scan.riskScore >= 70 ? "text-destructive" : scan.riskScore >= 40 ? "text-warning" : "text-success"
                      }`}>{scan.riskScore}</span>
                    </TableCell>
                    <TableCell>{getRiskBadge(scan.riskLevel)}</TableCell>
                    <TableCell className="font-mono text-xs uppercase text-muted-foreground">{scan.username}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {format(new Date(scan.createdAt), "MMM dd, HH:mm")}
                    </TableCell>
                    {canDelete && (
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleDelete(scan.id)}
                          disabled={deleteScan.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
