
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

import cloudflare from "@astrojs/cloudflare";


export default defineConfig({
	site: "https://rose.jenelenxx111403.workers.dev",
	integrations: [sitemap()],
	adapter: cloudflare({
		platformProxy: {
			enabled: true,
		},
	}),
});