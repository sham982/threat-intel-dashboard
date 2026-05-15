import { useState, useEffect } from "react";
import { useListScans, useDeleteScan, ListScansIndicatorType, ListScansRiskLevel } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Trash2, Activity, Download, FileSpreadsheet, FileText, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { useDebounce } from "@/hooks/use-debounce";
import { useQueryClient } from "@tanstack/react-query";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ITEMS_PER_PAGE = 20;

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

  doc.setFillColor(139, 199, 76);
  doc.rect(0, 0, doc.internal.pageSize.width, 35, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.text("TSEDEY BANK", 14, 18);
  doc.setFontSize(10);
  doc.text("Threat Intelligence - Scan History Report", 14, 28);
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);
  doc.text(`Exported: ${format(new Date(), "yyyy-MM-dd HH:mm:ss")}`, 14, 48);
  doc.text(`Total Records: ${scans.length}`, 14, 55);

  const riskColor = (level: string) => {
    switch (level) {
      case "high": return [220, 53, 53];
      case "medium": return [251, 146, 60];
      case "low": return [34, 197, 94];
      default: return [120, 120, 130];
    }
  };

  autoTable(doc, {
    startY: 68,
    head: [["Indicator", "Type", "Score", "Risk", "Analyst", "Timestamp", "Notes"]],
    body: scans.map(s => [
      s.indicatorValue,
      (s.indicatorType || "").toUpperCase(),
      s.riskScore,
      (s.riskLevel || "").toUpperCase(),
      s.username || "-",
      format(new Date(s.createdAt), "yyyy-MM-dd HH:mm"),
      (s.notes || "").slice(0, 50),
    ]),
    styles: { fontSize: 7, cellPadding: 2, font: "helvetica" },
    headStyles: { fillColor: [139, 199, 76], textColor: [255, 255, 255], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [240, 248, 240] },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { cellWidth: 16 },
      2: { cellWidth: 14, halign: "center" },
      3: { cellWidth: 20, halign: "center" },
      4: { cellWidth: 20 },
      5: { cellWidth: 30 },
      6: { cellWidth: 55 },
    },
    didDrawCell: (data: any) => {
      if (data.section === "body" && data.column.index === 3) {
        const val = (scans[data.row.index]?.riskLevel || "").toLowerCase();
        const color = riskColor(val);
        doc.setTextColor(color[0], color[1], color[2]);
        doc.setFont("helvetica", "bold");
        doc.text((data.cell.raw as string), data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2 + 0.5, { align: "center" });
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0);
      }
    },
    margin: { left: 10, right: 10 },
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
  const [currentPage, setCurrentPage] = useState(1);

  const queryParams: any = { limit: 1000 };
  if (debouncedSearch) queryParams.search = debouncedSearch;
  if (typeFilter !== "all") queryParams.indicatorType = typeFilter as ListScansIndicatorType;
  if (riskFilter !== "all") queryParams.riskLevel = riskFilter as ListScansRiskLevel;

  const { data, isLoading } = useListScans(queryParams);
  const deleteScan = useDeleteScan();

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, typeFilter, riskFilter]);

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
      high: "bg-red-500/15 text-red-500 border-red-500/30",
      medium: "bg-yellow-500/15 text-yellow-500 border-yellow-500/30",
      low: "bg-[#8bc74c]/15 text-[#8bc74c] border-[#8bc74c]/30",
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

  // Pagination calculations
  const allScans = data?.scans || [];
  const totalPages = Math.ceil(allScans.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedScans = allScans.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Generate page numbers
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= maxVisible; i++) pages.push(i);
      } else if (currentPage >= totalPages - 2) {
        for (let i = totalPages - maxVisible + 1; i <= totalPages; i++) pages.push(i);
      } else {
        for (let i = currentPage - 2; i <= currentPage + 2; i++) pages.push(i);
      }
    }
    return pages;
  };

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col">
      {/* Header with Tsedey branding */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div className="w-1 h-8 bg-gradient-to-b from-[#8bc74c] to-[#1bb7b6] rounded-full" />
            <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-[#8bc74c] to-[#1bb7b6] bg-clip-text text-transparent">
              Scan History
              {data && <span className="ml-2 text-sm text-[#8bc74c]">[{data.total} RECORDS]</span>}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground font-mono tracking-widest ml-3">HISTORICAL THREAT INTELLIGENCE</p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="font-mono text-xs uppercase tracking-wider border-[#8bc74c]/30 hover:bg-[#8bc74c]/10 hover:text-[#8bc74c]"
              disabled={!hasData || !!exporting}
            >
              <Download className="w-4 h-4 mr-2" />
              {exporting ? `Exporting ${exporting.toUpperCase()}...` : "Export"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-card border-border">
            <DropdownMenuItem className="font-mono text-xs cursor-pointer gap-2" onClick={() => handleExport("csv")}>
              <FileText className="w-4 h-4 text-[#8bc74c]" />
              Download CSV
            </DropdownMenuItem>
            <DropdownMenuItem className="font-mono text-xs cursor-pointer gap-2" onClick={() => handleExport("xlsx")}>
              <FileSpreadsheet className="w-4 h-4 text-[#1bb7b6]" />
              Download Excel (.xlsx)
            </DropdownMenuItem>
            <DropdownMenuItem className="font-mono text-xs cursor-pointer gap-2" onClick={() => handleExport("pdf")}>
              <FileText className="w-4 h-4 text-red-500" />
              Download PDF Report
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Filters */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50 shrink-0">
        <CardContent className="p-3 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#8bc74c]" />
            <Input
              placeholder="Search indicators or notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs bg-background/50 font-mono"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[130px] h-8 text-xs bg-background/50 font-mono">
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
            <SelectTrigger className="w-[130px] h-8 text-xs bg-background/50 font-mono">
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

      {/* Compact Table */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50 flex-1 flex flex-col min-h-0">
        <div className="flex-1 overflow-auto rounded-md">
          <Table>
            <TableHeader className="bg-muted/50 sticky top-0 z-10 backdrop-blur-sm">
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead className="font-mono text-[10px] uppercase py-2 px-3 w-[280px]">Indicator</TableHead>
                <TableHead className="font-mono text-[10px] uppercase py-2 px-3">Type</TableHead>
                <TableHead className="font-mono text-[10px] uppercase py-2 px-3 text-center">Score</TableHead>
                <TableHead className="font-mono text-[10px] uppercase py-2 px-3">Risk</TableHead>
                <TableHead className="font-mono text-[10px] uppercase py-2 px-3">Analyst</TableHead>
                <TableHead className="font-mono text-[10px] uppercase py-2 px-3">Timestamp</TableHead>
                {canDelete && <TableHead className="font-mono text-[10px] uppercase py-2 px-3 text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={canDelete ? 7 : 6} className="h-48 text-center">
                    <Activity className="w-6 h-6 text-[#8bc74c] animate-spin mx-auto mb-2" />
                    <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Retrieving Records...</span>
                  </TableCell>
                </TableRow>
              ) : paginatedScans.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canDelete ? 7 : 6} className="h-48 text-center text-muted-foreground font-mono text-sm">
                    NO RECORDS FOUND
                  </TableCell>
                </TableRow>
              ) : (
                paginatedScans.map((scan, i) => (
                  <TableRow key={scan.id} className="border-border/30 hover:bg-muted/20 group">
                    <TableCell className="font-mono text-xs py-2 px-3 max-w-[280px] truncate" title={scan.indicatorValue}>
                      {scan.indicatorValue}
                    </TableCell>
                    <TableCell className="font-mono text-[10px] uppercase text-muted-foreground py-2 px-3">{scan.indicatorType}</TableCell>
                    <TableCell className="text-center py-2 px-3">
                      <span className={`font-mono text-xs font-bold ${
                        scan.riskScore >= 70 ? "text-red-500" : scan.riskScore >= 40 ? "text-yellow-500" : "text-[#8bc74c]"
                      }`}>{scan.riskScore}</span>
                    </TableCell>
                    <TableCell className="py-2 px-3">{getRiskBadge(scan.riskLevel)}</TableCell>
                    <TableCell className="font-mono text-[10px] uppercase text-muted-foreground py-2 px-3">{scan.username}</TableCell>
                    <TableCell className="font-mono text-[10px] text-muted-foreground py-2 px-3">
                      {format(new Date(scan.createdAt), "MMM dd, HH:mm")}
                    </TableCell>
                    {canDelete && (
                      <TableCell className="text-right py-2 px-3">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleDelete(scan.id)}
                          disabled={deleteScan.isPending}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-3 py-2 border-t border-border/50">
            <div className="text-[10px] font-mono text-muted-foreground">
              Showing {startIndex + 1} to {Math.min(startIndex + ITEMS_PER_PAGE, allScans.length)} of {allScans.length} entries
            </div>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-7 w-7 p-0"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              {getPageNumbers().map(pageNum => (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(pageNum)}
                  className="h-7 min-w-[28px] px-2 text-[10px] font-mono"
                >
                  {pageNum}
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="h-7 w-7 p-0"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
