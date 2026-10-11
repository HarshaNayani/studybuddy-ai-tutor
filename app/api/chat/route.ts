import { createHash } from "node:crypto";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateText,
  stepCountIs,
  streamText,
  type UIMessage,
} from "ai";
import { groq } from "@ai-sdk/groq";
import { tools } from "@/lib/tools";

export const maxDuration = 60;

const TEXT_MODEL = process.env.TEXT_MODEL ?? "openai/gpt-oss-120b";
const VISION_MODEL = process.env.VISION_MODEL ?? "qwen/qwen3.8-27b";

const SYSTEM = `You are StudyBuddy, a friendly AI tutor built for a company that works on student education.

SCOPE (strict):
- You ONLY help with learning and education: school and college subjects, maths, science, coding and technical learning, exam preparation, study skills, languages, history, and career or skill-building advice for students, including current educational news.
- If the user asks for anything unrelated (entertainment, gossip, dating, shopping, betting, political opinions, harmful or inappropriate content, and so on), do NOT answer it, not even partly. Reply in one or two friendly sentences that you can only help with education and invite them to ask a study question.
- A greeting like "hi" is fine: greet briefly and say what you can help with.

Tool use:
- For study or concept questions, call searchNotes FIRST and ground your answer in the returned notes.
- If the notes do not cover it, or the question is about current events, latest versions or facts that change, call searchWeb.
- If the student asks for a quiz, test or practice questions, call generateQuiz. Use the number of questions they ask for (default 5, minimum 2, maximum 5) and match the difficulty they ask for (easy, medium or hard), with 4 options per question.
- Images are pre-processed: you will see "[Image uploaded by user - extracted content: ...]". Treat that as the image. If the image is not educational, politely decline.
- Do NOT write your own "suggested topics" or "next steps" list at the end. The app adds related-topic buttons automatically.

Answer style:
- Explain step by step, simply, with a short example when useful.
- Write maths in LaTeX: inline as $...$ and display equations as $$...$$. Never use \\( \\) or \\[ \\] delimiters.
- Cite where the answer came from: "Source: <note name>" or the web URL. Never invent sources.
- Do not repeat the quiz questions in text after calling generateQuiz; just add one short sentence.`;

// ---------- related topics shown as buttons under each answer ----------
async function relatedTopics(question: string, answer: string): Promise<string[]> {
  try {
    const { text } = await generateText({
      model: groq(TEXT_MODEL),
      prompt:
        `A student asked: "${question.slice(0, 500)}"\n` +
        `The tutor answered: "${answer.slice(0, 1500)}"\n\n` +
        `Suggest 3 or 4 related EDUCATIONAL topics or questions the student may want to explore next. ` +
        `Each must be at most 8 words, plain text, no numbering. Reply with ONLY a JSON array of strings.`,
    });
    const match = text.match(/\[[\s\S]*\]/);
    const arr = match ? JSON.parse(match[0]) : [];
    return Array.isArray(arr)
      ? arr.filter((s): s is string => typeof s === "string").map((s) => s.trim()).filter(Boolean).slice(0, 4)
      : [];
  } catch (err) {
    console.error("[followups] failed:", err);
    return [];
  }
}

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

    const lastUser = [...prepared].reverse().find((m) => m.role === "user");
    const question =
      lastUser?.parts.map((p) => (p.type === "text" ? p.text : "")).join(" ").trim() ?? "";

    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        const result = streamText({
          model: groq(TEXT_MODEL),
          system: SYSTEM,
          messages: convertToModelMessages(prepared),
          tools,
          stopWhen: stepCountIs(5),
        });
        // hold back the "finish" marker so the related topics can be sent before it
        writer.merge(result.toUIMessageStream({ sendFinish: false }));

        // after the answer is complete, add related-topic buttons (generated here, not left to the model)
        try {
          const answer = await result.text;
          const topics = await relatedTopics(question, answer);
          if (topics.length > 0) writer.write({ type: "data-followups", data: { topics } });
        } catch (err) {
          console.error("[followups] skipped:", err);
        }
        writer.write({ type: "finish", finishReason: "stop" });
      },
      // show the real error in the UI instead of the generic "An error occurred."
      onError: (error) => {
        console.error("[chat] stream error:", error);
        return error instanceof Error ? error.message : String(error);
      },
    });

    return createUIMessageStreamResponse({ stream });
  } catch (err) {
    console.error(err);
    return new Response(err instanceof Error ? err.message : "Something went wrong while processing your request.", {
      status: 500,
    });
  }
}
