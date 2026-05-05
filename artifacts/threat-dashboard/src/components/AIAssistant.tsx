import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { X, Send, Loader2, Minimize2, Maximize2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/contexts/ThemeContext";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface AIAssistantProps {
  indicatorValue?: string;
  indicatorType?: string;
  scanResults?: any;
}

export function AIAssistant({ indicatorValue, indicatorType, scanResults }: AIAssistantProps) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const backgroundImage = theme === 'dark' 
    ? "url('/chat-background-dark.png')" 
    : "url('/chat-background.png')";

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      let welcomeMessage = "";
      if (indicatorValue && scanResults) {
        welcomeMessage = `Hello! I see you are analyzing **${indicatorValue}**. The risk score is **${scanResults.riskScore}/100** (${scanResults.riskLevel?.toUpperCase() || "UNKNOWN"}). Would you like me to explain what this means?`;
      } else {
        welcomeMessage = `Hello! I am your AI security assistant. What would you like to know?`;
      }
      setMessages([{
        id: Date.now().toString(),
        role: "assistant",
        content: welcomeMessage,
        timestamp: new Date(),
      }]);
    }
  }, [isOpen, indicatorValue, scanResults]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: input.trim(),
          indicatorValue: indicatorValue,
          scanResults: scanResults ? {
            riskLevel: scanResults.riskLevel,
            riskScore: scanResults.riskScore,
          } : null,
        }),
      });

      if (!response.ok) throw new Error("API error");

      const data = await response.json();
      
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.reply,
        timestamp: new Date(),
      }]);
    } catch (error) {
      console.error("AI Error:", error);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Connection error. Please check if the backend is running.",
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 p-0 transition-all duration-300 group"
      >
        <img 
          src="/bot-logo.png" 
          alt="AI Assistant" 
          className="w-20 h-20 rounded-full object-cover hover:scale-105 transition-transform duration-200 shadow-lg"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
        <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-[#c6cc3b] rounded-full border-2 border-white animate-pulse" />
      </button>
    );
  }

  return (
    <Card 
      className={`fixed bottom-6 right-6 z-50 w-[480px] shadow-2xl transition-all duration-300 bg-cover bg-center bg-no-repeat border-[#8bc74c]/30 overflow-hidden ${
        isMinimized ? "h-[60px]" : "h-[620px]"
      }`}
      style={{ backgroundImage: backgroundImage }}
    >
      <div className="absolute inset-0 bg-black/30 pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#8bc74c] via-[#1bb7b6] to-[#c6cc3b]" />
      
      <CardHeader className="relative z-10 py-3 px-4 border-b border-white/20 bg-gradient-to-r from-[#8bc74c]/80 to-[#1bb7b6]/80 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center">
              <img 
                src="/bot-logo.png" 
                alt="AI Assistant" 
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
            <div>
              <CardTitle className="text-sm font-mono uppercase tracking-wider text-white">
                AI ASSISTANT
              </CardTitle>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setIsMinimized(!isMinimized)} className="p-1.5 rounded-lg hover:bg-white/20 transition-colors text-white">
              {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
            </button>
            <button onClick={() => setIsOpen(false)} className="p-1.5 rounded-lg hover:bg-white/20 transition-colors text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </CardHeader>

      {!isMinimized && (
        <>
          <CardContent className="relative z-10 p-0 flex-1 flex flex-col h-[calc(100%-60px)]">
            <ScrollArea className="flex-1 px-4 py-3">
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    {msg.role === "assistant" && (
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0">
                        <img 
                          src="/bot-logo.png" 
                          alt="AI" 
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                    <div className={`max-w-[75%] rounded-xl px-4 py-2.5 ${
                      msg.role === "user"
                        ? "bg-gradient-to-r from-[#8bc74c] to-[#1bb7b6] text-white shadow-md"
                        : "bg-white/90 backdrop-blur-sm border border-white/30 text-gray-800"
                    }`}>
                      <div className="text-xs font-mono leading-relaxed whitespace-pre-wrap">
                        {msg.content}
                      </div>
                      <p className="text-[8px] font-mono opacity-60 mt-2">
                        {msg.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                    {msg.role === "user" && (
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-[#8bc74c] to-[#1bb7b6] flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {user?.username?.charAt(0).toUpperCase() || "U"}
                      </div>
                    )}
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 animate-pulse">
                      <img 
                        src="/bot-logo.png" 
                        alt="AI" 
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                    <div className="bg-white/90 backdrop-blur-sm rounded-xl px-4 py-2.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#8bc74c]" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            <div className="p-3 border-t border-white/20 bg-white/10 backdrop-blur-sm">
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask about threat analysis..."
                  className="flex-1 bg-white/20 border-white/30 font-mono text-xs h-9 text-white placeholder:text-white/70"
                  disabled={isLoading}
                />
                <Button
                  size="sm"
                  onClick={sendMessage}
                  disabled={isLoading || !input.trim()}
                  className="h-9 px-4 bg-gradient-to-r from-[#8bc74c] to-[#1bb7b6] text-white"
                >
                  {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                </Button>
              </div>
              {indicatorValue && (
                <div className="flex items-center gap-1.5 mt-2 pt-1">
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    scanResults?.riskLevel === "high" ? "bg-red-500 animate-pulse" :
                    scanResults?.riskLevel === "medium" ? "bg-yellow-500" : "bg-[#8bc74c]"
                  }`} />
                  <p className="text-[9px] font-mono text-white/80">
                    Analyzing: {indicatorValue}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </>
      )}
    </Card>
  );
}


