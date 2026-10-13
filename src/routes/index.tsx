import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Offertverktyget" },
      { name: "description", content: "Gör om mötesanteckningar till skräddarsydda kundförslag." },
      { property: "og:title", content: "Offertverktyget" },
      { property: "og:description", content: "Gör om mötesanteckningar till skräddarsydda kundförslag." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ to: "/forslag" });
  },
});
