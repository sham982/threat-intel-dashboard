import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Brain, ChevronDown, ChevronUp, Sparkles } from "lucide-react";

interface AIEnhancedResultsProps {
  scanResult: any;
  indicatorValue: string;
  indicatorType: string;
}

export function AIEnhancedResults({ scanResult, indicatorValue, indicatorType }: AIEnhancedResultsProps) {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSummary = async () => {
      if (!scanResult) return;
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: `Provide a brief threat intelligence summary for: ${indicatorValue}. Risk level is ${scanResult?.riskLevel} with score ${scanResult?.riskScore}/100. Include risk assessment and one actionable recommendation. Keep under 150 words.`,
            indicatorValue: indicatorValue,
            scanResults: {
              riskLevel: scanResult?.riskLevel,
              riskScore: scanResult?.riskScore,
            },
          }),
        });
        if (response.ok) {
          const data = await response.json();
          setSummary(data.reply);
        } else {
          setError("AI service unavailable");
        }
      } catch (err) {
        setError("Failed to get AI analysis");
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
  }, [scanResult, indicatorValue]);

  if (!scanResult) return null;

  const riskColor = scanResult?.riskLevel === "high" ? "text-red-500" : 
                    scanResult?.riskLevel === "medium" ? "text-yellow-500" : "text-[#8bc74c]";

  return (
    <Card className="bg-gradient-to-r from-[#8bc74c]/5 to-[#1bb7b6]/5 border-[#8bc74c]/30 shadow-sm overflow-hidden">
      <div className="absolute top-0 right-0 w-20 h-20 bg-[#8bc74c]/5 rounded-full blur-2xl -mr-10 -mt-10" />
      <CardHeader className="py-3 border-b border-border/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded bg-[#8bc74c]/10">
              <Brain className="w-4 h-4 text-[#8bc74c]" />
            </div>
            <CardTitle className="text-sm font-mono uppercase tracking-wider">
              AI Threat Intelligence Summary
            </CardTitle>
            <Badge variant="outline" className="bg-[#8bc74c]/10 text-[#8bc74c] border-[#8bc74c]/30 text-[9px]">
              <Sparkles className="w-2.5 h-2.5 mr-1" />
              Groq Llama 3.3
            </Badge>
          </div>
          <button 
            onClick={() => setExpanded(!expanded)} 
            className="p-1 rounded hover:bg-muted/20 transition-colors"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="pt-3 pb-3">
          {loading ? (
            <div className="flex items-center gap-2 py-2">
              <Loader2 className="w-4 h-4 animate-spin text-[#8bc74c]" />
              <span className="text-xs text-muted-foreground font-mono">AI analyzing threat intelligence...</span>
            </div>
          ) : error ? (
            <p className="text-xs text-muted-foreground italic">{error} - Configure GROQ_API_KEY in .env</p>
          ) : summary ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-mono uppercase text-[10px] text-muted-foreground">Risk Score:</span>
                <span className={`font-mono font-bold ${riskColor}`}>{scanResult?.riskScore}/100</span>
                <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded ${riskColor.replace("text", "bg")}/10`}>
                  {scanResult?.riskLevel} RISK
                </span>
              </div>
              <p className="text-xs leading-relaxed">{summary}</p>
            </div>
          ) : null}
        </CardContent>
      )}
    </Card>
  );
}
