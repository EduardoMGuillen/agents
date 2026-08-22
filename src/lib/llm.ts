import OpenAI from "openai";

export function isLlmConfigured() {
  return Boolean(process.env.OPENAI_API_KEY);
}

function client() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY no configurada");
  return new OpenAI({ apiKey: key });
}

export async function chatJson<T>(params: {
  system: string;
  user: string;
  model?: string;
}): Promise<T> {
  if (!isLlmConfigured()) {
    throw new Error("NO_LLM");
  }

  const completion = await client().chat.completions.create({
    model: params.model ?? process.env.OPENAI_MODEL ?? "gpt-4o-mini",
    temperature: 0.4,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: params.system },
      { role: "user", content: params.user },
    ],
  });

  const text = completion.choices[0]?.message?.content ?? "{}";
  return JSON.parse(text) as T;
}

export async function chatText(params: {
  system: string;
  user: string;
  model?: string;
}): Promise<string> {
  if (!isLlmConfigured()) {
    throw new Error("NO_LLM");
  }

  const completion = await client().chat.completions.create({
    model: params.model ?? process.env.OPENAI_MODEL ?? "gpt-4o-mini",
    temperature: 0.5,
    messages: [
      { role: "system", content: params.system },
      { role: "user", content: params.user },
    ],
  });

  return completion.choices[0]?.message?.content?.trim() ?? "";
}
