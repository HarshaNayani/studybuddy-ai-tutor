import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StudyBuddy - AI tutor",
  description: "Multimodal RAG study assistant with web search and quizzes",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
