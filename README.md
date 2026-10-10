# StudyBuddy - Multimodal RAG Tutor

An Ed-Tech chatbot that answers student questions from **text or images**, grounds answers in **study notes (RAG)**, searches the **live web** for current facts, and generates **interactive quizzes** in the chat.

Built for the igebra.ai AI Intern assignment with the Vercel AI SDK and Groq.

**Live demo:** `<add your Vercel URL here>`

## Features

| Requirement | How it is done |
|---|---|
| Text + image queries | Image is sent to a Groq vision model (Llama 4 Scout) which extracts text / describes it; the result is passed to the main model |
| RAG | Study notes in `data/notes/*.md` are chunked by heading and ranked with BM25 (`lib/rag.ts`). Answers cite the source note |
| Tool calling | `searchNotes` (RAG), `searchWeb` (Tavily), `generateQuiz` (UI) - the model picks the tool; up to 4 steps per request |
| Generative UI | `generateQuiz` returns structured data that renders as an interactive, scored quiz card |
| Streaming chat | Vercel AI SDK `streamText` + `useChat` |

## Architecture

```
Browser (Next.js, useChat)
   |  text + optional image (data URL)
   v
POST /api/chat
   |-- image? -> Groq vision model -> text description
   |-- Groq Llama 3.3 70B (streamText, tools)
   |       |-- searchNotes  -> BM25 over data/notes
   |       |-- searchWeb    -> Tavily API
   |       '-- generateQuiz -> quiz card rendered on client
   v
Streamed answer with sources
```

Why image -> text first? Text models on Groq handle tool calling more reliably than vision models, so the vision model only reads the image and the main model does the reasoning and tool use.

## Setup

```bash
git clone <your-repo-url>
cd studybuddy
npm install
cp .env.example .env.local   # then add your keys
npm run dev                  # http://localhost:3000
```

Environment variables:

| Name | Required | Where to get it |
|---|---|---|
| `GROQ_API_KEY` | yes | https://console.groq.com (free) |
| `TAVILY_API_KEY` | for web search | https://tavily.com (free tier) |
| `TEXT_MODEL` | no | default `llama-3.3-70b-versatile` |
| `VISION_MODEL` | no | default `meta-llama/llama-4-scout-17b-16e-instruct` |

If Groq retires a model, set `TEXT_MODEL` / `VISION_MODEL` to a current one from the Groq models page.

## Deploy to Vercel

1. Push this repo to GitHub.
2. Import it at https://vercel.com/new.
3. Add `GROQ_API_KEY` and `TAVILY_API_KEY` under Project Settings > Environment Variables.
4. Deploy, then paste the URL at the top of this README.

## Demo guide

Try these in order:

1. **RAG:** "Explain photosynthesis simply" - the tool badge shows `searchNotes`, answer cites `photosynthesis`.
2. **Image:** click `+`, upload a photo of a maths problem (e.g. a quadratic equation) and send it.
3. **Web search:** "What are the latest developments in AI this week?" - uses Tavily and lists source links.
4. **Quiz (generative UI):** "Quiz me on Newton's laws" - answer the interactive card and see your score.

## Project structure

```
app/
  api/chat/route.ts   chat endpoint: vision step, tools, streaming, rate limit
  page.tsx            chat UI, image upload, quiz card
lib/
  rag.ts              chunking + BM25 retrieval
  tools.ts            searchNotes, searchWeb, generateQuiz
data/notes/           study notes (add your own .md files)
```

## Design decisions

- **BM25 instead of a vector DB:** zero setup and fast for a small notes set. `searchNotes` can be swapped for an embeddings lookup (Gemini / Hugging Face + pgvector) without touching the rest.
- **No auth:** left out on purpose so reviewers can test instantly. Can be added with Auth.js.
- **Guardrails:** per-IP rate limit, input size caps, API keys only in server env vars.

## Limitations / next steps

- Rate limiter is in-memory per instance (use Upstash for production).
- PDF upload for personal notes.
- Persistent chat history per user.
