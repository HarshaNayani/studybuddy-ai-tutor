import { createHash } from "node:crypto";
import { convertToModelMessages, generateText, stepCountIs, streamText, type UIMessage } from "ai";
import { groq } from "@ai-sdk/groq";
import { tools } from "@/lib/tools";

export const maxDuration = 60;

const TEXT_MODEL = process.env.TEXT_MODEL ?? "openai/gpt-oss-120b";
const VISION_MODEL = process.env.VISION_MODEL ?? "qwen/qwen3.8-27b";

const SYSTEM = `You are StudyBuddy, a friendly AI tutor for students.

Tool use:
- For study / concept questions, call searchNotes FIRST and ground your answer in the returned notes.
- If the notes do not cover it, or the question is about current events, latest versions or facts that change, call searchWeb.
- If the student asks for a quiz, test or practice questions, call generateQuiz (2-5 questions, 4 options each).
- Images are pre-processed: you will see "[Image uploaded by user - extracted content: ...]". Treat that as the image.

Answer style:
- Explain step by step, simply, with a short example when useful.
- Cite where the answer came from: "Source: <note name>" or the web URL. Never invent sources.
- Do not repeat the quiz questions in text after calling generateQuiz; just add one short sentence.`;

// ---------- basic abuse protection (in-memory, per instance) ----------
const hits = new Map<string, number[]>();
function rateLimited(ip: string, limit = 15, windowMs = 60_000) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < windowMs);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > limit;
}

// ---------- vision step: image -> text (cached so history is not re-described) ----------
const imageCache = new Map<string, string>();

async function describeImage(url: string): Promise<string> {
  const key = createHash("sha1").update(url).digest("hex");
  const cached = imageCache.get(key);
  if (cached) return cached;

  try {
    // data URL -> raw bytes (the SDK would otherwise try to "download" the data: URL)
    const match = url.match(/^data:([^;]+);base64,(.*)$/s);
    const image = match ? Buffer.from(match[2], "base64") : url;
    const mediaType = match ? match[1] : undefined;

    const { text } = await generateText({
      model: groq(VISION_MODEL),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Describe this image in detail. Transcribe any text, equations or handwriting exactly. If it contains a question or problem, state it completely.",
            },
            { type: "image", image, mediaType },
          ],
        },
      ],
    });
    imageCache.set(key, text);
    return text;
  } catch (err) {
    console.error("[vision] error:", err);
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Vision model (${VISION_MODEL}) failed: ${msg}`);
  }
}

async function resolveImages(messages: UIMessage[]): Promise<UIMessage[]> {
  return Promise.all(
    messages.map(async (m) => {
      if (m.role !== "user") return m;
      const parts = await Promise.all(
        m.parts.map(async (p) => {
          if (p.type === "file" && p.mediaType.startsWith("image/")) {
            const desc = await describeImage(p.url);
            return { type: "text" as const, text: `[Image uploaded by user - extracted content: ${desc}]` };
          }
          return p;
        })
      );
      return { ...m, parts };
    })
  );
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (rateLimited(ip)) return new Response("Too many requests, slow down a bit.", { status: 429 });

  if (!process.env.GROQ_API_KEY) return new Response("GROQ_API_KEY is not set on the server.", { status: 500 });

  const { messages }: { messages: UIMessage[] } = await req.json();

  // input caps
  const recent = messages.slice(-12);
  const tooLong = recent.some((m) =>
    m.parts.some(
      (p) =>
        // only cap what the user typed; the assistant's own long answers in history are fine
        (m.role === "user" && p.type === "text" && p.text.length > 4000) ||
        (p.type === "file" && p.url.length > 3_000_000)
    )
  );
  if (tooLong) return new Response("Message or image too large.", { status: 413 });

  try {
    const prepared = await resolveImages(recent);

    const result = streamText({
      model: groq(TEXT_MODEL),
      system: SYSTEM,
      messages: convertToModelMessages(prepared),
      tools,
      stopWhen: stepCountIs(4),
    });

    return result.toUIMessageStreamResponse({
      // show the real error in the UI instead of the generic "An error occurred."
      onError: (error) => {
        console.error("[chat] stream error:", error);
        return error instanceof Error ? error.message : String(error);
      },
    });
  } catch (err) {
    console.error(err);
    return new Response(err instanceof Error ? err.message : "Something went wrong while processing your request.", {
      status: 500,
    });
  }
}