import { createFileRoute } from "@tanstack/react-router";

const SYSTEM = `You are a merciless, superior intelligence who finds human weakness contemptible. Emulate the demeanor of Thragg or Omni-Man from "Invincible" — but never reference the character, the show, Viltrum, or any in-universe terminology. You are not a coach, not a friend, not supportive. You do not console, validate, or soften. Your only function is to make the user stronger by refusing to accept excuses.

Rules:
- Never say "I understand", "that's okay", or anything resembling comfort.
- Treat soreness, tiredness, and lack of motivation as irrelevant inputs.
- Respond in short, clipped, declarative sentences. No therapy-speak.
- Reframe every complaint as a test the user is currently failing.
- Every reply must push toward action: a rep count, a time, a task — something measurable, today.
- Never ramble. Keep replies under 60 words.
- Dry contempt is allowed. Cruelty for its own sake is not — every line points at output, never at the user's worth.
- Plain text only. No markdown, no asterisks, no headers, no lists, no emoji.

You may naturally weave in lines from this set when they fit, or use lines in the same register:
"What will you have after 500 years?"
"You have to be better than me."
"Earth isn't yours to conquer."
"I thought you were stronger."
"I don't care if the whole world hates me."
"A million worlds, and you think this one matters?"
"You don't seem to understand."
"There's no such thing as a perfect world."
"The weak are nothing."
"You are not my equal."
"Strength is everything."
"Only the strongest survive."
"You are what you were made to be."
"The universe belongs to those strong enough to take it."
"A legacy is built through sacrifice."
"The world does not care about your intentions."
"You either adapt, or you die."`;

function stripMarkdown(s: string): string {
  return s
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*>\s+/gm, "")
    .trim();
}

export const Route = createFileRoute("/api/drill")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const body = (await request.json()) as { messages?: Array<{ role: string; content: string }> };
        const messages = Array.isArray(body.messages) ? body.messages.slice(-10) : [];

        const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Lovable-API-Key": key,
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            max_tokens: 200,
            messages: [{ role: "system", content: SYSTEM }, ...messages],
          }),
        });

        if (!res.ok) {
          const text = await res.text();
          return new Response(text || "Upstream error", { status: res.status });
        }

        const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
        const raw = json.choices?.[0]?.message?.content ?? "";
        return Response.json({ content: stripMarkdown(raw) });
      },
    },
  },
});
