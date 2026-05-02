import { useState } from "react";
import { useListActivityLogs } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Activity, Terminal } from "lucide-react";
import { format } from "date-fns";

export default function ActivityLogs() {
  const { data, isLoading } = useListActivityLogs({ limit: 100 });

  const getActionColor = (action: string) => {
    if (action.includes("login") || action.includes("create")) return "text-success";
    if (action.includes("delete") || action.includes("failed")) return "text-destructive";
    if (action.includes("update") || action.includes("resolve")) return "text-warning";
    return "text-info";
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight uppercase">System Audit Logs</h1>
        <p className="text-sm text-muted-foreground font-mono tracking-widest">IMMUTABLE ACTIVITY RECORD</p>
      </div>

      <Card className="bg-card/50 backdrop-blur-sm border-border/50 flex-1 flex flex-col min-h-0">
        <div className="flex-1 overflow-auto rounded-md bg-[#0a0a0a]">
          <Table>
            <TableHeader className="bg-muted/50 sticky top-0 z-10 backdrop-blur-md border-b border-border/50">
              <TableRow className="border-none hover:bg-transparent">
                <TableHead className="font-mono text-xs uppercase text-muted-foreground w-[180px]">Timestamp</TableHead>
                <TableHead className="font-mono text-xs uppercase text-muted-foreground w-[150px]">Identity</TableHead>
                <TableHead className="font-mono text-xs uppercase text-muted-foreground w-[180px]">Action</TableHead>
                <TableHead className="font-mono text-xs uppercase text-muted-foreground w-[150px]">Origin IP</TableHead>
                <TableHead className="font-mono text-xs uppercase text-muted-foreground">Payload</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="font-mono text-xs">
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center">
                    <Activity className="w-6 h-6 text-primary animate-spin mx-auto mb-2" />
                    <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Accessing Logs...</span>
                  </TableCell>
                </TableRow>
              ) : data?.logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground font-mono">
                    NO LOGS RECORDED
                  </TableCell>
                </TableRow>
              ) : (
                data?.logs.map((log, i) => (
                  <TableRow key={log.id} className="border-b border-border/20 hover:bg-white/[0.02] group">
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {format(new Date(log.createdAt), "yyyy-MM-dd HH:mm:ss.SSS")}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {log.username || "SYSTEM"}
                    </TableCell>
                    <TableCell className={`${getActionColor(log.action)} font-bold`}>
                      {log.action}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {log.ipAddress || "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-[400px] truncate group-hover:whitespace-normal group-hover:break-all group-hover:bg-[#111] transition-all p-2 rounded">
                      <div className="flex items-start gap-2">
                        <Terminal className="w-3 h-3 mt-0.5 shrink-0 opacity-50" />
                        <span>{log.details || "-"}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <div className="p-2 border-t border-border/50 bg-muted/20 flex justify-between items-center text-[10px] font-mono text-muted-foreground">
          <span>{data?.total || 0} EVENTS RECORDED</span>
          <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-success animate-pulse"></span> LOGGING ACTIVE</span>
        </div>
      </Card>
    </div>
  );
}
