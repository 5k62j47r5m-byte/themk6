import { createFileRoute } from "@tanstack/react-router";
// @ts-expect-error - JSX file without types
import MkApp from "@/components/MkApp.jsx";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "The Mk7" },
      { name: "description", content: "The Mk7 — daily training, sleep, tasks, and metrics." },
      { property: "og:title", content: "The Mk7" },
      { property: "og:description", content: "The Mk7 — daily training, sleep, tasks, and metrics." },
    ],
  }),
  component: MkApp,
});
