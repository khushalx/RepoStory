# Draftline

Draftline turns a public GitHub repository into a polished build article. It
reads the repository’s public metadata, README, project structure, languages,
dependency manifests, and recent commits, then combines that context with a
builder’s optional notes.

## Product flow

1. Paste a public GitHub repository URL.
2. Review and edit the detected project brief.
3. Add optional motivation, challenge, and next-step context.
4. Choose an article format and tone.
5. Generate and edit the article in the Markdown writing studio.

## Local setup

Requires Node.js 22.13 or later.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Add `GROQ_API_KEY` to `.env.local` for Groq-powered writing. `GITHUB_TOKEN` is
optional and raises GitHub’s public API request limit. Without a Groq key, the
app uses a clearly labeled local preview draft so the complete interface remains
testable.

## Commands

```bash
npm run dev
npm run build
npm run build:next
npm run build:sites
npm test
```

`npm run build` selects the native Next.js target on Vercel and the Vinext
target elsewhere. The explicit build commands are available for local
deployment checks.
