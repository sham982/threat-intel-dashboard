import { useState } from "react";
import { useListAlerts, useUpdateAlert, ListAlertsStatus, ListAlertsSeverity } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldAlert, AlertTriangle, CheckCircle2, Activity, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";

export default function Alerts() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("open");
  const [severityFilter, setSeverityFilter] = useState<string>("all");

  const queryParams: any = { limit: 50 };
  if (statusFilter !== "all") queryParams.status = statusFilter as ListAlertsStatus;
  if (severityFilter !== "all") queryParams.severity = severityFilter as ListAlertsSeverity;

  const { data, isLoading } = useListAlerts(queryParams);
  const updateAlert = useUpdateAlert();

  const handleToggleStatus = (id: number, currentStatus: string) => {
    const newStatus = currentStatus === "open" ? "resolved" : "open";
    updateAlert.mutate({
      id,
      data: { status: newStatus }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
      }
    });
  };

  const getSeverityBadge = (severity: string) => {
    const styles = {
      critical: "bg-destructive text-destructive-foreground border-transparent animate-pulse",
      high: "bg-destructive/20 text-destructive border-destructive/50",
      medium: "bg-warning/20 text-warning border-warning/50",
      low: "bg-info/20 text-info border-info/50",
    }[severity] || "bg-muted text-muted-foreground border-border";

    return (
      <Badge variant="outline" className={`font-mono uppercase text-[10px] px-2 py-0.5 ${styles}`}>
        {severity}
      </Badge>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight uppercase flex items-center gap-3">
          Active Alerts 
          {statusFilter === "open" && data?.total && data.total > 0 && (
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-destructive text-destructive-foreground text-xs font-bold animate-bounce">
              {data.total}
            </span>
          )}
        </h1>
        <p className="text-sm text-muted-foreground font-mono tracking-widest">INCIDENT RESPONSE QUEUE</p>
      </div>

      <div className="flex gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px] bg-background/50 font-mono">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-[180px] bg-background/50 font-mono">
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severities</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 overflow-auto min-h-0 space-y-4 pb-12">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-48 bg-card/20 rounded-lg border border-border/50 border-dashed">
            <Activity className="w-8 h-8 text-primary animate-spin mb-4" />
            <span className="text-sm font-mono uppercase tracking-widest text-muted-foreground">Loading Alerts...</span>
          </div>
        ) : data?.alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 bg-card/20 rounded-lg border border-border/50 border-dashed">
            <ShieldAlert className="w-8 h-8 text-muted-foreground/50 mb-4" />
            <span className="text-sm font-mono uppercase tracking-widest text-muted-foreground">QUEUE IS CLEAR</span>
          </div>
        ) : (
          data?.alerts.map((alert, i) => (
            <Card 
              key={alert.id} 
              className={`bg-card/60 backdrop-blur-sm border-l-4 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 ${
                alert.status === 'resolved' ? 'border-l-success/50 opacity-60 hover:opacity-100' :
                alert.severity === 'critical' ? 'border-l-destructive shadow-[0_0_15px_rgba(var(--destructive)_/_0.2)]' :
                alert.severity === 'high' ? 'border-l-destructive/70' :
                alert.severity === 'medium' ? 'border-l-warning/70' :
                'border-l-info/70'
              }`}
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <CardContent className="p-5 flex flex-col md:flex-row gap-6 md:items-center">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-3">
                    {getSeverityBadge(alert.severity)}
                    <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground bg-muted px-2 py-0.5 rounded">
                      {alert.indicatorType}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {format(new Date(alert.createdAt), "MMM dd, yyyy HH:mm:ss")}
                    </span>
                  </div>
                  
                  <div>
                    <h3 className="font-bold text-lg font-mono break-all leading-tight">{alert.indicatorValue}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{alert.message}</p>
                  </div>
                  
                  {alert.status === 'resolved' && alert.resolvedBy && (
                    <div className="flex items-center gap-2 text-xs font-mono text-success">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Resolved by {alert.resolvedBy} on {format(new Date(alert.resolvedAt!), "MMM dd HH:mm")}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 shrink-0 border-t md:border-t-0 md:border-l border-border/50 pt-4 md:pt-0 md:pl-6">
                  <div className="flex flex-col items-center justify-center bg-background rounded-md border border-border/50 p-2 min-w-[80px]">
                    <span className="text-2xl font-bold font-mono text-foreground leading-none">{alert.riskScore}</span>
                    <span className="text-[9px] uppercase tracking-widest text-muted-foreground mt-1">Score</span>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <Button 
                      variant={alert.status === 'open' ? 'default' : 'outline'} 
                      size="sm"
                      className="w-28 font-mono text-xs uppercase"
                      onClick={() => handleToggleStatus(alert.id, alert.status)}
                      disabled={updateAlert.isPending}
                    >
                      {alert.status === 'open' ? 'Resolve' : 'Reopen'}
                    </Button>
                    <Link href={`/lookup`} className="w-28">
                      <Button variant="outline" size="sm" className="w-full font-mono text-xs uppercase text-muted-foreground">
                        <ExternalLink className="w-3 h-3 mr-2" /> Context
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
