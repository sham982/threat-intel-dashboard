import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Shield, ShieldOff, Activity, Plus, Trash2, Server, Hash, Globe, Link2,
  User, Clock, AlertTriangle, Search, Download, FileText, FileSpreadsheet,
  CheckCircle2, Printer, ChevronLeft, ChevronRight, Loader2, Calendar, X,
} from "lucide-react";
import { format, startOfWeek, endOfWeek, subDays, subMonths, subYears } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { getAuthHeaders } from "@/lib/api-client";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type BlocklistEntry = {
  id: number;
  type: string;
  sourceIp: string | null;
  destinationIp: string | null;
  deviceReported: string | null;
  assignedTo: string | null;
  action: string;
  reason: string | null;
  blockedByUsername: string;
  blockedAt: string;
};

const DEVICES = ["FortiSIEM", "FortiMAIL", "Checkpoint", "Kaspersky", "Other"];
const TEAMS = ["Infrastructure Team", "Security Team", "Other"];
const ACTIONS = ["blocked", "open", "other"];

type DateRange = "all" | "today" | "week" | "month" | "year";

// IP validation function
const isValidIp = (ip: string): boolean => {
  if (!ip) return true; // Empty is allowed
  const ipv4Pattern = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  return ipv4Pattern.test(ip);
};

function AddEntryDialog({ onAdded }: { onAdded: () => void }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [customDevice, setCustomDevice] = useState("");
  const [customTeam, setCustomTeam] = useState("");
  const [customAction, setCustomAction] = useState("");
  const [form, setForm] = useState({
    type: "ip",
    sourceIp: "",
    destinationIp: "",
    deviceReported: "",
    assignedTo: "",
    action: "blocked",
    reason: "",
  });

  const validateForm = (): boolean => {
    // Validate IP format if provided
    if (form.sourceIp && !isValidIp(form.sourceIp)) {
      toast({ title: "Validation Error", description: "Source IP is not in valid format", variant: "destructive" });
      return false;
    }
    if (form.destinationIp && !isValidIp(form.destinationIp)) {
      toast({ title: "Validation Error", description: "Destination IP is not in valid format", variant: "destructive" });
      return false;
    }
    if (!form.sourceIp && !form.destinationIp) {
      toast({ title: "Validation Error", description: "Please enter at least Source IP or Destination IP", variant: "destructive" });
      return false;
    }
    return true;
  };

  const getSelectedDevice = () => {
    if (form.deviceReported === "Other" && customDevice) return customDevice;
    return form.deviceReported;
  };

  const getSelectedTeam = () => {
    if (form.assignedTo === "Other" && customTeam) return customTeam;
    return form.assignedTo;
  };

  const getSelectedAction = () => {
    if (form.action === "other" && customAction) return customAction;
    return form.action;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/blocklist", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({
          type: form.type,
          sourceIp: form.sourceIp,
          destinationIp: form.destinationIp,
          deviceReported: getSelectedDevice(),
          assignedTo: getSelectedTeam(),
          action: getSelectedAction(),
          reason: form.reason,
          value: form.sourceIp || form.destinationIp,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      toast({ title: "Entry added", description: `${form.sourceIp || form.destinationIp} has been added` });
      setForm({ type: "ip", sourceIp: "", destinationIp: "", deviceReported: "", assignedTo: "", action: "blocked", reason: "" });
      setCustomDevice("");
      setCustomTeam("");
      setCustomAction("");
      setOpen(false);
      onAdded();
    } catch (e: any) {
      toast({ title: "Failed to add", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-[#8bc74c] to-[#1bb7b6] text-white font-mono text-xs uppercase">
          <Plus className="w-4 h-4 mr-2" /> Add Entry
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-mono text-lg flex items-center gap-2">
            <ShieldOff className="w-5 h-5 text-[#8bc74c]" /> Add Block Entry
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-mono">Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ip">IP Address</SelectItem>
                  <SelectItem value="hash">File Hash</SelectItem>
                  <SelectItem value="domain">Domain</SelectItem>
                  <SelectItem value="url">URL</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-mono">Source IP</Label>
              <Input placeholder="e.g. 192.168.1.1" value={form.sourceIp} onChange={e => setForm(f => ({ ...f, sourceIp: e.target.value }))} className="h-9 font-mono" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-mono">Destination IP</Label>
              <Input placeholder="e.g. 8.8.8.8" value={form.destinationIp} onChange={e => setForm(f => ({ ...f, destinationIp: e.target.value }))} className="h-9 font-mono" />
            </div>
            <div>
              <Label className="text-xs font-mono">Device Reported</Label>
              <Select value={form.deviceReported} onValueChange={(v) => setForm(f => ({ ...f, deviceReported: v }))}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Select device" /></SelectTrigger>
                <SelectContent>
                  {DEVICES.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
              {form.deviceReported === "Other" && (
                <Input placeholder="Enter custom device" value={customDevice} onChange={e => setCustomDevice(e.target.value)} className="h-9 mt-2" />
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-mono">Assigned To</Label>
              <Select value={form.assignedTo} onValueChange={(v) => setForm(f => ({ ...f, assignedTo: v }))}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Select team" /></SelectTrigger>
                <SelectContent>
                  {TEAMS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
              {form.assignedTo === "Other" && (
                <Input placeholder="Enter custom team" value={customTeam} onChange={e => setCustomTeam(e.target.value)} className="h-9 mt-2" />
              )}
            </div>
            <div>
              <Label className="text-xs font-mono">Action</Label>
              <Select value={form.action} onValueChange={(v) => setForm(f => ({ ...f, action: v }))}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="blocked">Blocked</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              {form.action === "other" && (
                <Input placeholder="Enter custom action" value={customAction} onChange={e => setCustomAction(e.target.value)} className="h-9 mt-2" />
              )}
            </div>
          </div>
          <div>
            <Label className="text-xs font-mono">Reason</Label>
            <Input placeholder="Reason for action" value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} className="h-9" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-[#8bc74c] hover:bg-[#7ab33d]">Add Entry</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function getDateRange(range: DateRange): { start: Date; end: Date } | null {
  const now = new Date();
  switch (range) {
    case "today":
      return { start: new Date(now.setHours(0, 0, 0, 0)), end: new Date(now.setHours(23, 59, 59, 999)) };
    case "week":
      return { start: subDays(now, 7), end: now };
    case "month":
      return { start: subMonths(now, 1), end: now };
    case "year":
      return { start: subYears(now, 1), end: now };
    default:
      return null;
  }
}

function exportToCSV(entries: BlocklistEntry[], dateRangeLabel: string) {
  const headers = ["Type", "Source IP", "Destination IP", "Device Reported", "Assigned To", "Action", "Reason", "Reported By", "Blocked At"];
  const rows = entries.map(e => [
    e.type.toUpperCase(),
    e.sourceIp || "",
    e.destinationIp || "",
    e.deviceReported || "",
    e.assignedTo || "",
    e.action,
    e.reason || "",
    e.blockedByUsername,
    format(new Date(e.blockedAt), "yyyy-MM-dd HH:mm:ss"),
  ]);
  const csv = [
    "=".repeat(80),
    "TSEDEY BANK - BLOCKLIST REPORT",
    "=".repeat(80),
    `Period: ${dateRangeLabel}`,
    `Generated: ${format(new Date(), "yyyy-MM-dd HH:mm:ss")}`,
    "=".repeat(80),
    headers.join(","),
    ...rows.map(r => r.join(",")),
    "=".repeat(80),
    `Total Records: ${entries.length}`,
  ].join("\n");
  downloadBlob(csv, `tsedey-blocklist-${format(new Date(), "yyyy-MM-dd")}.csv`, "text/csv");
}

async function exportToExcel(entries: BlocklistEntry[], dateRangeLabel: string) {
  const ws = XLSX.utils.json_to_sheet(entries.map(e => ({
    "Type": e.type.toUpperCase(),
    "Source IP": e.sourceIp || "",
    "Destination IP": e.destinationIp || "",
    "Device Reported": e.deviceReported || "",
    "Assigned To": e.assignedTo || "",
    "Action": e.action,
    "Reason": e.reason || "",
    "Reported By": e.blockedByUsername,
    "Blocked At": format(new Date(e.blockedAt), "yyyy-MM-dd HH:mm:ss"),
  })));
  ws["!cols"] = [{ wch: 10 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 12 }, { wch: 30 }, { wch: 15 }, { wch: 20 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `Blocklist ${dateRangeLabel}`);
  XLSX.writeFile(wb, `tsedey-blocklist-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
}

async function exportToPDF(entries: BlocklistEntry[], dateRangeLabel: string) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  doc.setFillColor(139, 199, 76);
  doc.rect(0, 0, doc.internal.pageSize.width, 35, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.text("TSEDEY BANK", 14, 18);
  doc.setFontSize(10);
  doc.text(`Blocklist Report - ${dateRangeLabel}`, 14, 28);
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);
  doc.text(`Generated: ${format(new Date(), "yyyy-MM-dd HH:mm:ss")}`, 14, 48);
  doc.text(`Total Records: ${entries.length}`, 14, 55);
  autoTable(doc, {
    startY: 68,
    head: [["Type", "Source IP", "Dest IP", "Device", "Assigned To", "Action", "Reason"]],
    body: entries.slice(0, 500).map(e => [
      e.type.toUpperCase(),
      e.sourceIp || "-",
      e.destinationIp || "-",
      e.deviceReported || "-",
      e.assignedTo || "-",
      e.action.toUpperCase(),
      e.reason || "-",
    ]),
    styles: { fontSize: 7, cellPadding: 2 },
    headStyles: { fillColor: [139, 199, 76], textColor: [255, 255, 255] },
  });
  doc.save(`tsedey-blocklist-${format(new Date(), "yyyy-MM-dd")}.pdf`);
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

export default function Alerts() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [entries, setEntries] = useState<BlocklistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [exporting, setExporting] = useState<string | null>(null);
  const itemsPerPage = 20;

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/blocklist?limit=1000`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setEntries(data.entries ?? []);
    } catch (error) {
      toast({ title: "Failed to load", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEntries(); }, []);

  const handleDelete = async (id: number) => {
    if (!confirm("Remove this entry?")) return;
    try {
      await fetch(`/api/blocklist/${id}`, { method: "DELETE", headers: getAuthHeaders() });
      toast({ title: "Entry removed" });
      fetchEntries();
    } catch {
      toast({ title: "Failed to remove", variant: "destructive" });
    }
  };

  const handleExport = async (type: "csv" | "xlsx" | "pdf") => {
    if (!filteredEntries.length) return;
    setExporting(type);
    const rangeLabel = dateRange === "all" ? "All Time" : dateRange;
    try {
      if (type === "csv") exportToCSV(filteredEntries, rangeLabel);
      else if (type === "xlsx") await exportToExcel(filteredEntries, rangeLabel);
      else await exportToPDF(filteredEntries, rangeLabel);
    } finally {
      setExporting(null);
    }
  };

  // Apply filters
  let filteredEntries = [...entries];
  
  // Date filter
  const dateFilter = getDateRange(dateRange);
  if (dateFilter) {
    filteredEntries = filteredEntries.filter(e => {
      const blockDate = new Date(e.blockedAt);
      return blockDate >= dateFilter.start && blockDate <= dateFilter.end;
    });
  }
  
  // Search filter
  if (search) {
    filteredEntries = filteredEntries.filter(e =>
      (e.sourceIp && e.sourceIp.toLowerCase().includes(search.toLowerCase())) ||
      (e.destinationIp && e.destinationIp.toLowerCase().includes(search.toLowerCase())) ||
      (e.reason && e.reason.toLowerCase().includes(search.toLowerCase()))
    );
  }
  
  // Type filter
  if (typeFilter !== "all") {
    filteredEntries = filteredEntries.filter(e => e.type === typeFilter);
  }

  // Pagination calculations
  const totalPages = Math.ceil(filteredEntries.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedEntries = filteredEntries.slice(startIndex, startIndex + itemsPerPage);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, typeFilter, dateRange]);

  const counts = { 
    total: entries.length, 
    blocked: entries.filter(e => e.action === "blocked").length, 
    open: entries.filter(e => e.action === "open").length,
    other: entries.filter(e => e.action !== "blocked" && e.action !== "open").length,
  };
  
  const isAdminOrAnalyst = user?.role === "admin" || user?.role === "analyst";

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
    <div className="space-y-5 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div className="w-1 h-8 bg-gradient-to-b from-[#8bc74c] to-[#1bb7b6] rounded-full" />
            <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-[#8bc74c] to-[#1bb7b6] bg-clip-text text-transparent">
              Blocklist Management
              <span className="ml-2 text-sm text-[#8bc74c]">[{counts.total}]</span>
            </h1>
          </div>
          <p className="text-sm text-muted-foreground font-mono tracking-widest ml-3">THREAT INTELLIGENCE BLOCKLIST</p>
        </div>
        <AddEntryDialog onAdded={fetchEntries} />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-3">
        <Card className="bg-gradient-to-r from-[#8bc74c]/10 to-[#8bc74c]/5 border-[#8bc74c]/30">
          <CardContent className="p-3 text-center"><p className="text-2xl font-bold text-[#8bc74c]">{counts.total}</p><p className="text-[10px] font-mono">Total Entries</p></CardContent>
        </Card>
        <Card className="bg-red-500/10 border-red-500/30">
          <CardContent className="p-3 text-center"><p className="text-2xl font-bold text-red-500">{counts.blocked}</p><p className="text-[10px] font-mono">Blocked</p></CardContent>
        </Card>
        <Card className="bg-yellow-500/10 border-yellow-500/30">
          <CardContent className="p-3 text-center"><p className="text-2xl font-bold text-yellow-500">{counts.open}</p><p className="text-[10px] font-mono">Open</p></CardContent>
        </Card>
        <Card className="bg-blue-500/10 border-blue-500/30">
          <CardContent className="p-3 text-center"><p className="text-2xl font-bold text-blue-500">{counts.other}</p><p className="text-[10px] font-mono">Other</p></CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by Source IP, Destination IP, or Reason..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-background/50 font-mono" />
        </div>
        
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[130px] bg-background/50 font-mono">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="ip">IP Address</SelectItem>
            <SelectItem value="hash">File Hash</SelectItem>
            <SelectItem value="domain">Domain</SelectItem>
            <SelectItem value="url">URL</SelectItem>
          </SelectContent>
        </Select>

        <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
          <SelectTrigger className="w-[140px] bg-background/50 font-mono">
            <Calendar className="w-3.5 h-3.5 mr-2" />
            <SelectValue placeholder="Timeframe" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">Last 7 Days</SelectItem>
            <SelectItem value="month">Last 30 Days</SelectItem>
            <SelectItem value="year">Last Year</SelectItem>
          </SelectContent>
        </Select>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="font-mono text-xs" disabled={!filteredEntries.length || !!exporting}>
              <Download className="w-4 h-4 mr-2" />
              {exporting ? "Exporting..." : "Export"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => handleExport("csv")}><FileText className="w-4 h-4 mr-2" /> CSV</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport("xlsx")}><FileSpreadsheet className="w-4 h-4 mr-2" /> Excel</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport("pdf")}><FileText className="w-4 h-4 mr-2" /> PDF</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Table */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50 flex-1 flex flex-col min-h-0">
        <div className="flex-1 overflow-auto rounded-md">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 sticky top-0 z-10">
              <tr className="border-b border-border/50">
                <th className="p-3 text-left font-mono text-xs uppercase">Type</th>
                <th className="p-3 text-left font-mono text-xs uppercase">Source IP</th>
                <th className="p-3 text-left font-mono text-xs uppercase">Destination IP</th>
                <th className="p-3 text-left font-mono text-xs uppercase">Device</th>
                <th className="p-3 text-left font-mono text-xs uppercase">Assigned To</th>
                <th className="p-3 text-left font-mono text-xs uppercase">Action</th>
                <th className="p-3 text-left font-mono text-xs uppercase">Reason</th>
                <th className="p-3 text-left font-mono text-xs uppercase">Reported By</th>
                <th className="p-3 text-left font-mono text-xs uppercase">Date</th>
                {isAdminOrAnalyst && <th className="p-3 text-right font-mono text-xs uppercase">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={isAdminOrAnalyst ? 10 : 9} className="h-64 text-center"><Loader2 className="w-8 h-8 text-[#8bc74c] animate-spin mx-auto mb-3" /><span className="text-xs font-mono text-muted-foreground">Loading...</span></td></tr>
              ) : paginatedEntries.length === 0 ? (
                <tr><td colSpan={isAdminOrAnalyst ? 10 : 9} className="h-64 text-center"><Shield className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-30" /><span className="text-sm font-mono text-muted-foreground">NO ENTRIES FOUND</span></td></tr>
              ) : (
                paginatedEntries.map((entry) => (
                  <tr key={entry.id} className="border-b border-border/50 hover:bg-muted/20">
                    <td className="p-3 font-mono text-xs"><Badge variant="outline" className="text-[10px]">{entry.type.toUpperCase()}</Badge></td>
                    <td className="p-3 font-mono text-sm font-semibold">{entry.sourceIp || "-"}</td>
                    <td className="p-3 font-mono text-sm">{entry.destinationIp || "-"}</td>
                    <td className="p-3 text-xs">{entry.deviceReported || "-"}</td>
                    <td className="p-3 text-xs">{entry.assignedTo || "-"}</td>
                    <td className="p-3"><Badge className={entry.action === "blocked" ? "bg-red-500/20 text-red-500" : entry.action === "open" ? "bg-yellow-500/20 text-yellow-500" : "bg-gray-500/20 text-gray-500"}>{entry.action.toUpperCase()}</Badge></td>
                    <td className="p-3 text-xs">{entry.reason || "-"}</td>
                    <td className="p-3 text-xs">{entry.blockedByUsername}</td>
                    <td className="p-3 text-xs">{format(new Date(entry.blockedAt), "MMM dd, HH:mm")}</td>
                    {isAdminOrAnalyst && (
                      <td className="p-3 text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(entry.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border/50">
            <div className="text-xs text-muted-foreground">
              Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredEntries.length)} of {filteredEntries.length} entries
            </div>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="h-8 w-8 p-0">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              {getPageNumbers().map(pageNum => (
                <Button key={pageNum} variant={currentPage === pageNum ? "default" : "outline"} size="sm" onClick={() => setCurrentPage(pageNum)} className="h-8 w-8 p-0 text-xs">
                  {pageNum}
                </Button>
              ))}
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="h-8 w-8 p-0">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
