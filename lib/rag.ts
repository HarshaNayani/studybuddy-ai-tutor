import fs from "node:fs";
import path from "node:path";

/**
 * Tiny dependency-free RAG: notes are split into chunks and ranked with BM25.
 * No vector DB or embedding API needed, so setup is zero-config.
 * To upgrade to semantic search, swap `searchNotes` for an embeddings lookup.
 */

export type Chunk = { source: string; heading: string; text: string; tokens: string[] };
export type NoteHit = { source: string; heading: string; text: string; score: number };

const NOTES_DIR = path.join(process.cwd(), "data", "notes");
const STOP = new Set(
  "a an the and or of to in on for with is are was were be by it this that as at from how what why when which do does".split(" ")
);

const tokenize = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t && !STOP.has(t));

let index: { chunks: Chunk[]; df: Map<string, number>; avgLen: number } | null = null;

function build() {
  const chunks: Chunk[] = [];
  const files = fs.existsSync(NOTES_DIR) ? fs.readdirSync(NOTES_DIR).filter((f) => f.endsWith(".md")) : [];

  for (const file of files) {
    const raw = fs.readFileSync(path.join(NOTES_DIR, file), "utf8");
    const source = file.replace(/\.md$/, "");
    // split on markdown headings, keep heading with its section
    const sections = raw.split(/\n(?=#{1,3} )/);
    for (const sec of sections) {
      const text = sec.trim();
      if (!text) continue;
      const heading = (text.match(/^#{1,3} (.+)/)?.[1] ?? source).trim();
      chunks.push({ source, heading, text, tokens: tokenize(`${source} ${heading} ${text}`) });
    }
  }

  const df = new Map<string, number>();
  for (const c of chunks) for (const t of new Set(c.tokens)) df.set(t, (df.get(t) ?? 0) + 1);
  const avgLen = chunks.reduce((s, c) => s + c.tokens.length, 0) / Math.max(chunks.length, 1);
  return { chunks, df, avgLen };
}

export function searchNotes(query: string, k = 3): NoteHit[] {
  index ??= build();
  const { chunks, df, avgLen } = index;
  const q = tokenize(query);
  const N = chunks.length;
  const k1 = 1.5;
  const b = 0.75;

  const scored = chunks.map((c) => {
    const tf = new Map<string, number>();
    for (const t of c.tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
    let score = 0;
    for (const t of q) {
      const f = tf.get(t);
      if (!f) continue;
      const idf = Math.log(1 + (N - (df.get(t) ?? 0) + 0.5) / ((df.get(t) ?? 0) + 0.5));
      score += (idf * f * (k1 + 1)) / (f + k1 * (1 - b + (b * c.tokens.length) / avgLen));
    }
    return { source: c.source, heading: c.heading, text: c.text, score };
  });

  return scored
    .filter((h) => h.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}
