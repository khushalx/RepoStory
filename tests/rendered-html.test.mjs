import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html", host: "localhost" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the Draftline landing page", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Draftline — Turn a repository into a story<\/title>/i);
  assert.match(html, /Your repository/);
  assert.match(html, /already has/);
  assert.match(html, /Create article/);
  assert.match(html, /Public repositories only/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/i);
});

test("keeps integration credentials server-side", async () => {
  const [page, articleRoute, repositoryRoute] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/article/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/repository/route.ts", import.meta.url), "utf8"),
  ]);

  assert.doesNotMatch(page, /process\.env\.(GROQ_API_KEY|GITHUB_TOKEN)/);
  assert.match(articleRoute, /process\.env\.GROQ_API_KEY/);
  assert.match(repositoryRoute, /process\.env\.GITHUB_TOKEN/);
  assert.match(articleRoute, /api\.groq\.com\/openai\/v1\/chat\/completions/);
  assert.match(repositoryRoute, /api\.github\.com/);
});
