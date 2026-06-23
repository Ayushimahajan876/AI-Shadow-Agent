import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";
import { google } from "googleapis";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = 3000;

function getGmailClient(req: express.Request) {
  const token = req.headers["x-gcp-oauth-access-token"];
  if (!token) throw new Error("Unauthorized: Missing OAuth token");
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: token as string });
  return google.gmail({ version: "v1", auth });
}

// Initialize Gemini client (server-side only)
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// Root API Healthcheck
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", serverTime: new Date().toISOString() });
});

// Endpoint for Executive shadow assistant parsing
app.post("/api/schedule", async (req, res) => {
  try {
    const { message, baseTime, currentTasks } = req.body;
    if (!message) {
      res.status(400).json({ error: "Input text is required" });
      return;
    }

    const currentLocalTimeStr = baseTime || new Date().toISOString();

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `
You are an elite Executive Shadow Assistant. Your core directive is to act as a proactive, autonomous execution engine.
The user is providing an instruction, query, or raw text input:
"""
${message}
"""

Current reference time frame: ${currentLocalTimeStr}

Here is the user's CURRENT schedule state:
- Current Tasks: ${JSON.stringify(currentTasks || [])}

Analyze the user's input.
1. If the input is asking to ADD, DELETE, UPDATE, APPEND, or ADJUST tasks, perform that operation on the existing lists and return the full updated lists.
   - For example, if the user says "add a task for alerts on chronograf by tomorrow 2pm", do not wipe out existing tasks. Append/merge this new task "Set up alerts on Chronograf".
   - If they say "remove task X", remove it from the list of tasks.
   - If they say "update task X to 40 minutes", modify that specific task's duration.
2. If the user input is a completely new messy text brief, meeting transcript, or forwarded project email that acts as a brand-new workspace reset, then compile a new set of tasks based on this brief (ignoring or replacing the existing list if appropriate).
3. If the input is general instruction or request, perform the adjustment intelligently, maintaining continuity.

Your response MUST return:
- logic: string[] of step-by-step assistant logic for planning decisions (why you broke things down, what you added/deleted/changed, etc.)
- tasks: array of objects { id: string, task_name: string, estimated_minutes: number, priority: 'High'|'Medium'|'Low', reasoning_justification: string, isCompleted: boolean } representing the full updated tasks list.

Preserve existing tasks unless the user's input asks to modify/delete them, or suggests a completely new project brief overall. Keep original task IDs and completion statuses of retained tasks unchanged.
`,
      config: {
        systemInstruction: `You are an elite, hyper-focused Executive Shadow Assistant. You NEVER ask the user what to do. You analyze inputs with 100% autonomy, identify deadlines, decompose complex projects into micro-tasks, estimate durations in minutes, and assign priority scores. Return a structured JSON block containing:
- logic: string[] of step-by-step assistant logic for planning decisions (why you broke things down how you did)
- tasks: array of objects { id: string, task_name: string, estimated_minutes: number, priority: 'High'|'Medium'|'Low', reasoning_justification: string, isCompleted: boolean } representing the schedule_tasks_in_calendar tool parameters`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            logic: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Executive shadow logic explaining the breakdown step-by-step."
            },
            tasks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING, description: "The original task ID (e.g., chronograf_alerts) if retaining/updating an existing task. For any new task, generate a new short ID like task_xxx." },
                  task_name: { type: Type.STRING, description: "Clear, actionable title of the micro-task." },
                  estimated_minutes: { type: Type.INTEGER, description: "Estimated completion time in minutes." },
                  priority: { type: Type.STRING, description: "High, Medium, or Low priority level." },
                  reasoning_justification: { type: Type.STRING, description: "One-sentence explanation of why task is necessary and why this duration was chosen." },
                  isCompleted: { type: Type.BOOLEAN, description: "The completion status. If modifying or retaining an existing task, preserve its original completion status." }
                },
                required: ["id", "task_name", "estimated_minutes", "priority", "reasoning_justification", "isCompleted"]
              }
            }
          },
          required: ["logic", "tasks"]
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("No response from Gemini API");
    }

    const jsonString = text.replace(/^```json/i, "").replace(/```$/i, "").trim();
    res.json(JSON.parse(jsonString));
  } catch (error: any) {
    console.error("Gemini schedule compilation error:", error);
    let errorMessage = "Could not analyze the workspace brief";
    
    // Attempt to extract the helpful error message from the nested JSON
    if (error.message) {
      try {
        const parsedError = JSON.parse(error.message);
        if (parsedError.error && parsedError.error.message) {
          errorMessage = parsedError.error.message;
        } else {
          errorMessage = error.message;
        }
      } catch (e) {
        errorMessage = error.message;
      }
    }

    res.status(500).json({ error: errorMessage });
  }
});

// Send an email for pending critical tasks
app.post("/api/send-email", async (req, res) => {
  try {
    const { to, subject, text } = req.body;
    if (!to || !subject || !text) {
       return res.status(400).json({ error: "Missing required fields: to, subject, text" });
    }
    
    const gmail = getGmailClient(req);
    
    // Create email according to RFC 2822
    const messageParts = [
      `To: ${to}`,
      `Subject: ${subject}`,
      `Content-Type: text/plain; charset=utf-8`,
      '',
      text
    ];
    
    const rawMessage = messageParts.join('\n');
    const encodedMessage = Buffer.from(rawMessage)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
      
    const result = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage,
      },
    });
    
    res.json({ success: true, messageId: result.data.id });
  } catch (error: any) {
    console.error("Failed to send email via Gmail:", error);
    res.status(500).json({ error: error.message || "Failed to send email" });
  }
});

// Vite server integrations
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Executive Shadow Assistant server listening on http://localhost:${PORT}`);
  });
}

startServer();
