import { useState } from "react";
import { useCreateScan, ScanIndicatorType, Scan } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, ShieldAlert, ShieldCheck, ShieldQuestion, Activity, ExternalLink } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function Lookup() {
  const [indicatorType, setIndicatorType] = useState<ScanIndicatorType>("ip");
  const [indicatorValue, setIndicatorValue] = useState("");
  const [scanResult, setScanResult] = useState<Scan | null>(null);

  const createScan = useCreateScan({
    mutation: {
      onSuccess: (data) => {
        setScanResult(data);
      }
    }
  });

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!indicatorValue.trim()) return;
    
    createScan.mutate({
      data: {
        indicatorType,
        indicatorValue: indicatorValue.trim(),
      }
    });
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-destructive';
      case 'medium': return 'text-warning';
      case 'low': return 'text-success';
      default: return 'text-muted-foreground';
    }
  };

  const getRiskBg = (level: string) => {
    switch (level) {
      case 'high': return 'bg-destructive/10 border-destructive/30';
      case 'medium': return 'bg-warning/10 border-warning/30';
      case 'low': return 'bg-success/10 border-success/30';
      default: return 'bg-muted border-border';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight uppercase">Indicator Lookup</h1>
        <p className="text-sm text-muted-foreground font-mono tracking-widest">THREAT INTELLIGENCE AGGREGATOR</p>
      </div>

      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-widest text-muted-foreground">New Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLookup} className="flex gap-4 items-end">
            <div className="space-y-2 w-48">
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
            
            <div className="space-y-2 flex-1">
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
              className="w-32 uppercase tracking-widest text-xs font-bold"
            >
              {createScan.isPending ? (
                <><Activity className="w-4 h-4 mr-2 animate-spin" /> SCANNING</>
              ) : (
                <><Search className="w-4 h-4 mr-2" /> ANALYZE</>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {scanResult && (
        <div className="grid gap-6 md:grid-cols-3 animate-in slide-in-from-bottom-4 duration-500">
          <Card className={`col-span-1 bg-card/50 backdrop-blur-sm border ${getRiskBg(scanResult.riskLevel)}`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm uppercase tracking-widest text-muted-foreground flex justify-between items-center">
                Risk Assessment
                {scanResult.riskLevel === 'high' ? <ShieldAlert className={getRiskColor(scanResult.riskLevel)} /> :
                 scanResult.riskLevel === 'low' ? <ShieldCheck className={getRiskColor(scanResult.riskLevel)} /> :
                 <ShieldQuestion className={getRiskColor(scanResult.riskLevel)} />}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-6">
              <div className="relative flex items-center justify-center w-40 h-40">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="10" className="text-muted opacity-20" />
                  <circle 
                    cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="10"
                    strokeDasharray={`${scanResult.riskScore * 2.827} 282.7`}
                    className={`${getRiskColor(scanResult.riskLevel)} transition-all duration-1000 ease-out`} 
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className={`text-4xl font-bold font-mono ${getRiskColor(scanResult.riskLevel)}`}>{scanResult.riskScore}</span>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-widest">SCORE</span>
                </div>
              </div>
              <h3 className={`mt-4 text-xl font-bold uppercase tracking-widest ${getRiskColor(scanResult.riskLevel)}`}>
                {scanResult.riskLevel} RISK
              </h3>
              <p className="mt-2 text-center text-sm font-mono break-all text-muted-foreground">{scanResult.indicatorValue}</p>
            </CardContent>
          </Card>

          <Card className="col-span-2 bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader>
              <CardTitle className="text-sm uppercase tracking-widest text-muted-foreground">Source Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border border-border/50 overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow className="border-border/50 hover:bg-transparent">
                      <TableHead className="font-mono text-xs uppercase">Engine</TableHead>
                      <TableHead className="font-mono text-xs uppercase">Status</TableHead>
                      <TableHead className="font-mono text-xs uppercase">Detections</TableHead>
                      <TableHead className="font-mono text-xs uppercase text-right">Reference</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scanResult.sources.map((source, i) => (
                      <TableRow key={i} className="border-border/50 group">
                        <TableCell className="font-medium font-mono text-sm">{source.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`font-mono uppercase text-[10px] ${
                            source.status === 'malicious' ? 'bg-destructive/10 text-destructive border-destructive/30' :
                            source.status === 'suspicious' ? 'bg-warning/10 text-warning border-warning/30' :
                            source.status === 'clean' ? 'bg-success/10 text-success border-success/30' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            {source.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {source.detections !== undefined && source.totalEngines !== undefined ? 
                            `${source.detections} / ${source.totalEngines}` : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {source.url && (
                            <a href={source.url} target="_blank" rel="noreferrer" className="text-primary hover:text-primary/80 transition-colors inline-flex items-center">
                              <span className="text-xs font-mono mr-1">View</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {scanResult.sources.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center text-muted-foreground font-mono text-sm">
                          NO SOURCE DATA AVAILABLE
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
