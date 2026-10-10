export type Category = { icon: string; title: string; prompts: string[] };

/** Starter ideas shown on an empty chat. All education focused. */
export const CATEGORIES: Category[] = [
  {
    icon: "\u{1F52C}",
    title: "Science",
    prompts: ["Explain photosynthesis simply", "State Newton's three laws with examples"],
  },
  {
    icon: "\u{1F9EE}",
    title: "Maths",
    prompts: ["Solve 2x^2 - 7x + 3 = 0 step by step", "When does a quadratic have no real roots?"],
  },
  {
    icon: "\u{1F4BB}",
    title: "Coding",
    prompts: ["What is recursion? Give a Python example", "Explain Big-O notation with examples"],
  },
  {
    icon: "\u{1F4DD}",
    title: "Exam prep",
    prompts: ["Quiz me on Newton's laws", "Make a 5-day revision plan for physics"],
  },
  {
    icon: "\u{1F30D}",
    title: "History & world",
    prompts: ["Summarise the causes of World War I", "Explain how the monsoon forms"],
  },
  {
    icon: "\u{1F680}",
    title: "Learning & careers",
    prompts: ["How do I learn programming effectively?", "What are the latest developments in AI education?"],
  },
];
