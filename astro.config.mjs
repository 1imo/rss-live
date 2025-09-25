import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import sitemap from "@astrojs/sitemap";
import node from "@astrojs/node";

export default defineConfig({
  site: process.env.SITE_URL || "http://localhost:4321",
  integrations: [tailwind(), sitemap()],
  output: "server",
  adapter: node({
    mode: "standalone"
  }),
});
