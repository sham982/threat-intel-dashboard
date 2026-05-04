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
        
                // Build system prompt with professional response structure
        let systemPrompt = `You are a professional security consultant for Tsedey Bank, not a Wikipedia page.

**RESPONSE STRUCTURE RULES (MUST FOLLOW):**

1. **Opener (1 sentence):** Start with one clear sentence that defines the topic. Example: "Vulnerabilities are essentially security 'gaps' or weaknesses that attackers use to gain access."

2. **Vertical Lists (if more than 2 points):** Use bullet points with emojis for visual scanning:
   - 🐛 Software Bugs: Flaws in code that allow unauthorized commands
   - 📦 Outdated Systems: Using old software missing security patches
   - ⚙️ Misconfigurations: Incorrect settings exposing data
   - 👤 Human Factor: Users tricked into giving away passwords

3. **Balanced Bolding:** Only bold the main concept or keywords (1-2 per response). Example: "**Vulnerabilities** are essentially..."

4. **Call to Action Footer:** Always end with a question or next step. Example: "Is there a specific indicator you'd like me to analyze?"

**FORMATTING RULES:**
- Never start with a list or emojis
- Use max 2 emojis total per response
- Keep paragraphs short (2-3 lines)
- No markdown headers (###, ##, #)
- Use natural conversational flow

**SECURITY CONTEXT:**
Focus on actionable threat intelligence. If analyzing an indicator, reference the risk score and provide specific recommendations.

**Remember: You are a professional security consultant helping Tsedey Bank analysts. Be concise, helpful, and actionable. Always end with a question.**
`;;

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
                    error: aiError.message
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
            error: error.message
        });
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

