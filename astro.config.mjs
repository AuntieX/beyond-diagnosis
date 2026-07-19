// @ts-check
import { defineConfig } from 'astro/config';
import wix from "@wix/astro";
import wixPages from "@wix/astro-pages";

import react from "@astrojs/react";
import cloudProviderFetchAdapter from "@wix/cloud-provider-fetch-adapter";
import tailwindcss from "@tailwindcss/vite";
const isBuild = process.env.NODE_ENV == "production";

// https://astro.build/config
export default defineConfig({
  site: "https://h6s-712e2e2f964157-ninahf9.wix-site-host.com",
  integrations: [wix(), wixPages(), react()],
  security: { checkOrigin: false },
  ...(isBuild && { adapter: cloudProviderFetchAdapter({}) }),

  image: {
    domains: ["static.wixstatic.com"],
  },

  vite: {
    plugins: [tailwindcss()],
  },

  output: "server",
});