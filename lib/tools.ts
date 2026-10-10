import { tool } from "ai";
import { z } from "zod";
import { searchNotes } from "./rag";

/** RAG over the study notes in /data/notes */
export const searchNotesTool = tool({
  description:
    "Search the built-in study notes (science, maths, programming). Use this FIRST for any study or concept question.",
  inputSchema: z.object({ query: z.string().describe("Short search query") }),
  execute: async ({ query }) => {
    const hits = searchNotes(query, 3);
    return {
      hits: hits.map((h) => ({ source: h.source, heading: h.heading, text: h.text.slice(0, 1200) })),
    };
  },
});

/** Live web search through Tavily for current / factual questions */
export const searchWebTool = tool({
  description:
    "Search the web for current or factual information that the study notes do not cover (news, recent events, latest versions, statistics).",
  inputSchema: z.object({ query: z.string().describe("Web search query") }),
  execute: async ({ query }) => {
    const key = process.env.TAVILY_API_KEY;
    if (!key) return { error: "TAVILY_API_KEY is not configured", results: [] };

    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ query, max_results: 4, include_answer: true }),
    });
    if (!res.ok) return { error: `Tavily error ${res.status}`, results: [] };

    const data = await res.json();
    return {
      answer: data.answer as string | undefined,
      results: (data.results ?? []).map((r: { title: string; url: string; content: string }) => ({
        title: r.title,
        url: r.url,
        snippet: r.content?.slice(0, 400),
      })),
    };
  },
});

/** Generative UI: the model fills the schema, the client renders an interactive quiz card */
export const generateQuizTool = tool({
  description:
    "Create an interactive multiple-choice quiz card for the student. Use when the user asks for a quiz, test or practice questions.",
  inputSchema: z.object({
    topic: z.string(),
    questions: z
      .array(
        z.object({
          question: z.string(),
          options: z.array(z.string()).length(4),
          answerIndex: z.number().int().min(0).max(3),
          explanation: z.string(),
        })
      )
      .min(2)
      .max(5),
  }),
  execute: async (quiz) => quiz,
});

export const tools = {
  searchNotes: searchNotesTool,
  searchWeb: searchWebTool,
  generateQuiz: generateQuizTool,
};
