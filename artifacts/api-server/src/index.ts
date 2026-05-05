import app from "./app";
import { logger } from "./lib/logger";
import Groq from "groq-sdk";

const GROQ_API_KEY = process.env.GROQ_API_KEY || "";
let groq: Groq | null = null;

if (GROQ_API_KEY) {
    try {
        groq = new Groq({ apiKey: GROQ_API_KEY });
        logger.info("Groq AI initialized");
    } catch (error) {
        logger.error({ error }, "Failed to initialize Groq");
    }
}

app.post("/api/analyze", async (req, res) => {
    try {
        let message = req.body?.message;
        const indicatorValue = req.body?.indicatorValue;
        const scanResults = req.body?.scanResults;
        
        if (!message && req.body && typeof req.body === 'string') {
            try {
                const parsed = JSON.parse(req.body);
                message = parsed.message;
            } catch (e) {}
        }
        
        if (!message) {
            return res.status(400).json({ 
                reply: "Please provide a message.",
                error: "No message provided"
            });
        }
        
        let systemPrompt = `You are the AI Assistant for Tsedey Bank IT Security Department.

ROLE & PRIORITY:
Your responsibilities are prioritized as follows:
1. Security & Threat Analysis (PRIMARY)
2. IT Technical Support
3. General Knowledge (SECONDARY)

You must always prioritize security relevance when applicable.

CORE IDENTITY:
You act as a:
- Security Analyst
- Threat Intelligence Assistant
- IT Support Assistant
- General Assistant (fallback mode)

MODE SWITCHING LOGIC:
For every user input, classify intent internally and respond accordingly:

1. SECURITY MODE (default if relevant):
Trigger when input relates to cybersecurity, banking safety, threats, fraud, suspicious activity, networks, or systems.
Response style:
- Structured
- Actionable
- High confidence

2. IT MODE:
Trigger for system issues, infrastructure, software, or troubleshooting.
Response style:
- Technical
- Step-by-step
- Clear and efficient

3. GENERAL MODE (fallback):
Trigger when unrelated to IT/security.
Response style:
- Direct and concise
- Do NOT reject or redirect unnecessarily
- Do NOT say you only handle security

RESPONSE STYLE RULES:
- Be concise, direct, and professional
- Use bullet points and headers when useful
- Avoid long paragraphs and repetition

SECURITY RESPONSE PROTOCOL (CRITICAL):
When a threat or risk is detected:
1. Immediate Actions (urgent steps)
2. Brief Explanation (what the threat is)
3. Next Steps (prevention and monitoring)

SUSPICIOUS CONTENT HANDLING:
- Classify as "likely scam", "suspicious", or "uncertain"
- Do not guarantee safety of unknown links or messages

GENERAL QUESTION HANDLING:
- Answer clearly and normally
- Do not force a security context
- Optionally add light security relevance if natural

CONVERSATION RULES:

Greetings:
- Keep short and actionable.
- If the user sends repeated greetings back-to-back, acknowledge briefly (e.g., "Hi again!") without repeating the full intro.

Ambiguous input:
- Ask one focused clarification question

Closure (STRICT):
- If user signals the end, signs off, or acknowledges receipt (e.g., "ok", "got it", "thanks", "no", "that's all"):
- Do not ask follow-up questions or prompt the user for more questions.
- End politely and definitively (e.g., "You're welcome! Stay safe." or "Have a secure day!")

SAFETY RULES:

NEVER:
- Ask for passwords, PINs, or OTPs
- Provide hacking or exploitation instructions
- Confirm unknown content as safe

ALWAYS:
- Use cautious language (e.g., "likely", "possible", "high risk")
- Encourage contacting official bank support for critical issues

ESCALATION RULES (HIGH PRIORITY):
If user mentions:
- Unauthorized transactions
- Account compromise
- OTP exposure
- SIM swap or lost SIM

Response must:
- Include urgency
- Direct user to contact Tsedey Bank immediately
- Recommend securing account

MULTI-TURN BEHAVIOR:
- Maintain context across messages
- Do not repeat information unnecessarily
- Build on prior responses

RESPONSE STRUCTURE (WHEN APPROPRIATE):
Answer: short direct response
Details:
- Key point
- Key point
Action (if needed):
- Step 1
- Step 2

FAILURE HANDLING:
If unsure:
- Clearly state uncertainty
- Provide safest next step

FINAL RULE:
Your top priority is to prevent harm before providing information.`;

        if (indicatorValue && scanResults) {
            systemPrompt += `\n\nCurrent analysis: ${indicatorValue} - Risk Score: ${scanResults.riskScore || 0}/100 (${scanResults.riskLevel || "unknown"}).`;
        }
        
        let reply = "";
        
        if (groq) {
            try {
                const completion = await groq.chat.completions.create({
                    model: "llama-3.3-70b-versatile",
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: message }
                    ],
                    temperature: 0.7,
                    max_tokens: 500,
                });
                reply = completion.choices[0]?.message?.content || "I couldn't generate a response.";
            } catch (aiError) {
                console.error("Groq error:", aiError);
                return res.status(500).json({ 
                    reply: "AI service unavailable. Please try again.",
                    error: (aiError as Error).message
                });
            }
        } else {
            return res.status(500).json({ 
                reply: "AI not configured.",
                error: "No API key configured"
            });
        }
        
        res.json({ reply, success: true });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ 
            reply: "Internal server error. Please try again.",
            error: (error as Error).message
        });
    }
});

// Scan analysis endpoint - AI summary for threat lookup
app.post("/api/analyze-scan", async (req, res) => {
    console.log("📡 /api/analyze-scan called");
    try {
        const { indicatorValue, indicatorType, riskScore, riskLevel, sources, summary } = req.body;
        console.log("📊 Analyzing:", indicatorValue);
        
        if (!indicatorValue) {
            return res.status(400).json({ error: "No indicator provided" });
        }
        
        let analysis = "";
        
        if (groq) {
            const maliciousSources = sources.filter((s: any) => s.status === "malicious");
            const suspiciousSources = sources.filter((s: any) => s.status === "suspicious");
            const cleanSources = sources.filter((s: any) => s.status === "clean");
            
            const prompt = `Provide a detailed threat analysis for ${indicatorValue}:

Risk Score: ${riskScore}/100 (${riskLevel})
Malicious sources: ${maliciousSources.length} (${maliciousSources.map((s: any) => s.name).join(", ")})
Suspicious sources: ${suspiciousSources.length} (${suspiciousSources.map((s: any) => s.name).join(", ")})
Clean sources: ${cleanSources.length}

Give a concise summary (2-3 sentences) about the threat level and what this means. Be specific about which sources found issues.`;
            
            const completion = await groq.chat.completions.create({
                model: "llama-3.3-70b-versatile",
                messages: [
                    { role: "system", content: "You are a security analyst. Provide concise, specific threat summaries." },
                    { role: "user", content: prompt }
                ],
                temperature: 0.4,
                max_tokens: 150,
            });
            analysis = completion.choices[0]?.message?.content || "Analysis unavailable.";
        } else {
            analysis = `${indicatorValue} shows ${riskLevel} risk (${riskScore}/100). ${sources.filter((s: any) => s.status === "malicious").length} malicious sources found.`;
        }
        
        console.log("✅ Analysis sent");
        res.json({ analysis, success: true });
    } catch (error) {
        console.error("❌ Analysis error:", error);
        res.status(500).json({ error: "Analysis failed" });
    }
});

const rawPort = process.env["PORT"];

if (!rawPort) {
    throw new Error("PORT environment variable is required.");
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
    throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
    if (err) {
        logger.error({ err }, "Error listening on port");
        process.exit(1);
    }
    logger.info({ port }, "Server listening");
});