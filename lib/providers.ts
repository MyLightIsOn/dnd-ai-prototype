// lib/runtime/providers.ts
import { EnvConfig, NodeOutput } from "@/types";

// --- OpenAI (Chat Completions) ---
export async function callOpenAIChat({
  apiKey,
  model,
  prompt,
  signal,
}: {
  apiKey: string;
  model: string; // e.g. "gpt-4o-mini"
  prompt: string;
  signal?: AbortSignal;
}): Promise<NodeOutput> {
  // Using the classic Chat Completions API for wide compatibility.
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`OpenAI error ${res.status}: ${errText || res.statusText}`);
  }

  const json = await res.json();
  const text =
    json?.choices?.[0]?.message?.content ?? json?.choices?.[0]?.text ?? "";

  return { text, meta: { provider: "openai", model } };
}

// --- Ollama (local) ---
export async function callOllama({
  baseUrl = "http://localhost:11434",
  model,
  prompt,
  signal,
}: {
  baseUrl?: string;
  model: string; // e.g. "llama3"
  prompt: string;
  signal?: AbortSignal;
}): Promise<NodeOutput> {
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/api/generate`, {
    method: "POST",
    signal,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, prompt, stream: false }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Ollama error ${res.status}: ${errText || res.statusText}`);
  }

  const json = await res.json();
  const text = json?.response ?? "";
  return { text, meta: { provider: "ollama", model } };
}

// --- Route to the right provider based on model string ---
export async function callLLM({
  env,
  model,
  input,
  signal,
}: {
  env: EnvConfig;
  model: string;
  input: string;
  signal?: AbortSignal;
}): Promise<NodeOutput> {
  // convention: "ollama:<modelName>" uses Ollama, otherwise OpenAI
  if (model?.startsWith("ollama:")) {
    const name = model.split(":", 2)[1] || "llama3";
    return callOllama({
      baseUrl: env.OLLAMA_BASE_URL || "http://localhost:11434",
      model: name,
      prompt: input,
      signal,
    });
  }

  if (!env.OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY for OpenAI model call.");
  }

  return callOpenAIChat({
    apiKey: env.OPENAI_API_KEY,
    model,
    prompt: input,
    signal,
  });
}
