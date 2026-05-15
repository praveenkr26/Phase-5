require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: "1mb" }));
app.use(cors());
app.use(express.static(path.join(__dirname, "public")));

const fallbackModels = [
  "gemini-2.0-flash-lite",
  "gemini-2.0-flash-lite-001",
  "gemini-2.0-flash",
  "gemini-2.0-flash-001",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.5-pro"
];

function normalizeModelName(modelName) {
  if (!modelName) {
    return "";
  }
  return modelName.replace(/^models\//, "");
}

function getConfig(modelName, maxOutputTokens) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY in .env");
  }
  const resolvedModel =
    normalizeModelName(modelName) ||
    normalizeModelName(process.env.GEMINI_MODEL) ||
    "gemini-2.0-flash-lite";
  const envMaxTokens = Number(process.env.GEMINI_MAX_TOKENS);
  const resolvedMaxTokens = Number.isFinite(maxOutputTokens)
    ? maxOutputTokens
    : Number.isFinite(envMaxTokens)
      ? envMaxTokens
      : 1000;
  return { apiKey, model: resolvedModel, maxOutputTokens: resolvedMaxTokens };
}

async function generateContent({ prompt, model, maxOutputTokens }) {
  const { apiKey, model: resolvedModel, maxOutputTokens: resolvedMaxTokens } = getConfig(
    model,
    maxOutputTokens
  );

  const url = `https://generativelanguage.googleapis.com/v1/models/${resolvedModel}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: resolvedMaxTokens }
    })
  });

  const data = await response.json();
  if (!response.ok) {
    const message = data?.error?.message || "Gemini API error";
    const status = data?.error?.code || response.status;
    throw new Error(`${status}: ${message}`);
  }

  const answer = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  return answer;
}

async function generateWithFallback({ prompt, model, maxOutputTokens }) {
  const requestedModel = normalizeModelName(model);
  const envModel = normalizeModelName(process.env.GEMINI_MODEL);
  const modelQueue = requestedModel
    ? [requestedModel]
    : [envModel, ...fallbackModels].filter(Boolean);

  let lastError = null;
  for (const modelName of modelQueue) {
    try {
      return await generateContent({ prompt, model: modelName, maxOutputTokens });
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("No Gemini model worked.");
}

async function listModels() {
  const { apiKey } = getConfig();
  const url = `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`;
  const response = await fetch(url);
  const data = await response.json();
  if (!response.ok) {
    const message = data?.error?.message || "Gemini API error";
    const status = data?.error?.code || response.status;
    throw new Error(`${status}: ${message}`);
  }
  return data?.models || [];
}

app.post("/api/ask", async (req, res) => {
  try {
    const prompt = String(req.body?.prompt || "").trim();
    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required." });
    }

    const requestedModel = String(req.body?.model || "").trim();
    const requestedMaxTokens = Number(req.body?.maxOutputTokens);
    const enrichedPrompt = `${prompt}\n\nPlease respond in clean, well-formatted bullet points or short paragraphs. Provide a slightly longer, detailed answer.`;
    const answer = await generateWithFallback({
      prompt: enrichedPrompt,
      model: requestedModel || undefined,
      maxOutputTokens: Number.isFinite(requestedMaxTokens) ? requestedMaxTokens : undefined
    });

    return res.json({ answer });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({ error: message });
  }
});

app.get("/api/models", async (req, res) => {
  try {
    const models = await listModels();
    const modelNames = models.map((model) => model.name);
    return res.json({ models: modelNames });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({ error: message });
  }
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Ask Gemini server running on http://localhost:${port}`);
  });
}

module.exports = app;
