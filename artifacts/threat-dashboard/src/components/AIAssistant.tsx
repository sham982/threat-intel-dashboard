import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Bot, X, Send, Loader2, Minimize2, Maximize2 } from "lucide-react";
import { useAuth } from "@/lib/auth";

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
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Welcome message on open
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      let welcomeMessage = "";
      if (indicatorValue) {
        welcomeMessage = `I see you are analyzing ${indicatorValue}. The risk score is ${scanResults?.riskScore || 0}/100 (${scanResults?.riskLevel?.toUpperCase() || "UNKNOWN"}). Would you like me to explain this assessment?`;
      } else {
        welcomeMessage = `Hello! I am your AI security assistant. What would you like to know?`;
      }
      setMessages([{
        id: "welcome",
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

  // Simple greeting responses - handle locally without calling API
  const getGreetingResponse = (input: string): string | null => {
    const cleanInput = input.toLowerCase().trim();
    
    // Short greetings
    if (cleanInput === "hi" || cleanInput === "hey") {
      return "Hi there! How can I help with your security analysis today?";
    }
    if (cleanInput === "hello") {
      return "Hello! Ready to assist with threat intelligence. What are we looking at?";
    }
    if (cleanInput === "how are you") {
      return "I'm ready to help! What security question do you have?";
    }
    
    // Help requests
    if (cleanInput.includes("what can you do") || cleanInput === "help") {
      return "I can analyze threat indicators (IPs, domains, URLs, hashes), explain risk scores, and provide security recommendations. Share an indicator or ask a security question.";
    }
    
    return null;
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userInput = input.trim();
    
    // Check for greeting first - handle locally
    const greetingResponse = getGreetingResponse(userInput);
    if (greetingResponse) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: "user",
        content: userInput,
        timestamp: new Date(),
      }]);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: greetingResponse,
        timestamp: new Date(),
      }]);
      setInput("");
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: userInput,
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
          message: userInput,
          indicatorValue: indicatorValue,
          scanResults: scanResults ? {
            riskLevel: scanResults.riskLevel,
            riskScore: scanResults.riskScore,
          } : null,
        }),
      });

      if (!response.ok) throw new Error("AI service error");

      const data = await response.json();
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.reply,
        timestamp: new Date(),
      }]);
    } catch (error) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "I'm having trouble connecting. Please try again.",
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
        className="fixed bottom-6 right-6 z-50 p-4 rounded-full bg-gradient-to-r from-[#8bc74c] to-[#1bb7b6] shadow-lg hover:shadow-xl transition-all duration-300 group"
      >
        <div className="absolute inset-0 rounded-full animate-pulse bg-[#8bc74c]/40 opacity-50 group-hover:opacity-75" />
        <Bot className="w-6 h-6 text-white relative z-10" />
        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-[#c6cc3b] rounded-full border-2 border-white animate-pulse" />
      </button>
    );
  }

  return (
    <Card className={`fixed bottom-6 right-6 z-50 w-[480px] shadow-2xl transition-all duration-300 bg-gradient-to-br from-card/95 to-card/80 backdrop-blur-xl border-[#8bc74c]/30 overflow-hidden ${
      isMinimized ? "h-[60px]" : "h-[620px]"
    }`}>
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#8bc74c] via-[#1bb7b6] to-[#c6cc3b]" />
      
      <CardHeader className="py-3 px-4 border-b border-border/30 bg-gradient-to-r from-[#8bc74c]/5 to-[#1bb7b6]/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-xl bg-gradient-to-br from-[#8bc74c] to-[#1bb7b6] shadow-md">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div>
              <CardTitle className="text-sm font-mono uppercase tracking-wider flex items-center gap-2">
                AI ASSISTANT
                <Badge variant="outline" className="text-[8px] text-[#8bc74c] border-[#8bc74c]/30">READY</Badge>
              </CardTitle>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setIsMinimized(!isMinimized)} className="p-1.5 rounded-lg hover:bg-muted/20">
              {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
            </button>
            <button onClick={() => setIsOpen(false)} className="p-1.5 rounded-lg hover:bg-muted/20">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </CardHeader>

      {!isMinimized && (
        <>
          <CardContent className="p-0 flex-1 flex flex-col h-[calc(100%-60px)]">
            <ScrollArea className="flex-1 px-4 py-3">
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    {msg.role === "assistant" && (
                      <Avatar className="w-7 h-7 rounded-xl bg-gradient-to-br from-[#8bc74c] to-[#1bb7b6]">
                        <AvatarFallback className="text-white"><Bot className="w-3.5 h-3.5" /></AvatarFallback>
                      </Avatar>
                    )}
                    <div className={`max-w-[75%] rounded-xl px-4 py-2.5 ${
                      msg.role === "user"
                        ? "bg-gradient-to-r from-[#8bc74c] to-[#1bb7b6] text-white"
                        : "bg-muted/30 border border-border/30"
                    }`}>
                      <div className="text-xs font-mono leading-relaxed whitespace-pre-wrap">
                        {msg.content}
                      </div>
                      <p className="text-[8px] font-mono opacity-40 mt-2">
                        {msg.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                    {msg.role === "user" && (
                      <Avatar className="w-7 h-7 rounded-xl bg-muted">
                        <AvatarFallback className="text-[10px] font-mono">
                          {user?.username?.charAt(0).toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-3">
                    <Avatar className="w-7 h-7 rounded-xl bg-gradient-to-br from-[#8bc74c] to-[#1bb7b6] animate-pulse">
                      <AvatarFallback><Bot className="w-3.5 h-3.5" /></AvatarFallback>
                    </Avatar>
                    <div className="bg-muted/30 rounded-xl px-4 py-2.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#8bc74c]" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            <div className="p-3 border-t border-border/30">
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask about threat analysis..."
                  className="flex-1 bg-background/50 border-border/40 font-mono text-xs h-9"
                  disabled={isLoading}
                />
                <Button
                  size="sm"
                  onClick={sendMessage}
                  disabled={isLoading || !input.trim()}
                  className="h-9 px-4 bg-gradient-to-r from-[#8bc74c] to-[#1bb7b6]"
                >
                  {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                </Button>
              </div>
            </div>
          </CardContent>
        </>
      )}
    </Card>
  );
}
