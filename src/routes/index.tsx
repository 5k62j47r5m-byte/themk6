import { createFileRoute } from "@tanstack/react-router";
import MkApp from "@/components/MkApp.jsx";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "The Mk4" },
      { name: "description", content: "The Mk4 — daily training, sleep, tasks, and metrics." },
      { property: "og:title", content: "The Mk4" },
      { property: "og:description", content: "The Mk4 — daily training, sleep, tasks, and metrics." },
    ],
  }),
  component: MkApp,
});
