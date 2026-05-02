import { useState } from "react";
import { useListScans, useDeleteScan, ListScansIndicatorType, ListScansRiskLevel } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Trash2, Activity } from "lucide-react";
import { format } from "date-fns";
import { useDebounce } from "@/hooks/use-debounce";
import { useQueryClient } from "@tanstack/react-query";

export default function Scans() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [riskFilter, setRiskFilter] = useState<string>("all");

  const queryParams: any = { limit: 50 };
  if (debouncedSearch) queryParams.search = debouncedSearch;
  if (typeFilter !== "all") queryParams.indicatorType = typeFilter as ListScansIndicatorType;
  if (riskFilter !== "all") queryParams.riskLevel = riskFilter as ListScansRiskLevel;

  const { data, isLoading } = useListScans(queryParams);
  const deleteScan = useDeleteScan();

  const handleDelete = (id: number) => {
    if (confirm("Delete this scan record?")) {
      deleteScan.mutate({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/scans"] });
        }
      });
    }
  };

  const getRiskBadge = (level: string) => {
    const styles = {
      high: "bg-destructive/10 text-destructive border-destructive/30",
      medium: "bg-warning/10 text-warning border-warning/30",
      low: "bg-success/10 text-success border-success/30",
      unknown: "bg-muted text-muted-foreground border-border",
    }[level] || "bg-muted text-muted-foreground border-border";

    return (
      <Badge variant="outline" className={`font-mono uppercase text-[10px] ${styles}`}>
        {level}
      </Badge>
    );
  };

  const canDelete = user?.role === "admin" || user?.role === "analyst";

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight uppercase">Scan History</h1>
        <p className="text-sm text-muted-foreground font-mono tracking-widest">HISTORICAL THREAT INTELLIGENCE</p>
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
            <SelectTrigger className="w-[180px] bg-background/50 font-mono">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="ip">IP</SelectItem>
              <SelectItem value="url">URL</SelectItem>
              <SelectItem value="domain">Domain</SelectItem>
              <SelectItem value="hash">Hash</SelectItem>
            </SelectContent>
          </Select>
          <Select value={riskFilter} onValueChange={setRiskFilter}>
            <SelectTrigger className="w-[180px] bg-background/50 font-mono">
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
                  <TableRow key={scan.id} className="border-border/50 group animate-in fade-in" style={{ animationDelay: `${i * 30}ms` }}>
                    <TableCell className="font-mono text-sm max-w-[300px] truncate" title={scan.indicatorValue}>
                      {scan.indicatorValue}
                    </TableCell>
                    <TableCell className="font-mono text-xs uppercase">{scan.indicatorType}</TableCell>
                    <TableCell className="font-mono text-sm font-bold">{scan.riskScore}</TableCell>
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
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
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
