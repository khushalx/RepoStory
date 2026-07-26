export const runtime = "edge";

type Article = {
  title: string;
  subtitle: string;
  body: string;
  tags: string[];
  socialDescription: string;
};

type Repository = {
  name: string;
  fullName: string;
  description: string;
  readme: string;
  languages: string[];
  stars: number;
  forks: number;
  createdAt: string;
  updatedAt: string;
  topics: string[];
  tree: string[];
  dependencies: Record<string, string[]>;
  recentCommits: Array<{ message: string; date: string; author: string }>;
  developmentThemes: string[];
};

type RequestBody = {
  instruction?: string;
  section?: string;
  repository?: Repository;
  summary?: {
    description?: string;
    features?: string[];
    stage?: string;
  };
  answers?: {
    motivation?: string;
    challenge?: string;
    next?: string;
  };
  format?: string;
  tone?: string;
  article?: Article | null;
};

const formatGuidance: Record<string, string> = {
  "Build Log":
    "Focus on concrete recent progress, iterations, decisions, and lessons. Make the timeline of development easy to follow.",
  "Project Story":
    "Create a narrative arc around the problem, motivation, product, building journey, and the direction ahead.",
  "Launch Post":
    "Introduce the project confidently and clearly. Explain who it is for and what it enables without marketing exaggeration.",
  "Technical Deep Dive":
    "Prioritize architecture, implementation, dependencies, technical decisions, tradeoffs, and practical lessons.",
};

const instructionGuidance: Record<string, string> = {
  generate: "Write a fresh article from the supplied context.",
  regenerate:
    "Write a distinctly fresh version of the full article while preserving all factual constraints.",
  shorter:
    "Rewrite the full article approximately 25 percent shorter. Preserve the strongest ideas and all essential facts.",
  longer:
    "Rewrite the full article approximately 30 percent longer by adding useful detail grounded only in the supplied repository context.",
  "more-casual":
    "Rewrite the full article in a warmer, more conversational voice without becoming flippant.",
  "more-technical":
    "Rewrite the full article with more technical specificity, architecture detail, and implementation context grounded in the repository.",
  "improve-opening":
    "Keep the article structure and facts, but replace the opening with a sharper, more specific hook and improve the transition into the first section.",
  "improve-conclusion":
    "Keep the article structure and facts, but rewrite the conclusion so it feels earned, specific, and forward-looking.",
  "regenerate-section":
    "Rewrite only the named section inside the full article. Preserve every other section verbatim and return the complete article.",
};

const systemPrompt = `You are the editor of an independent technology magazine for developers who build in public.

Write like a real developer telling the story of something they built—not like generated documentation.

Non-negotiable editorial rules:
- Write naturally, with varied sentence structure and specific transitions.
- Avoid generic AI phrases, empty enthusiasm, and exaggerated claims.
- Never invent a feature, motivation, metric, user, technical choice, or outcome.
- If first-person context was supplied by the builder, use it naturally. Otherwise avoid pretending to know their private motivations.
- Preserve technical accuracy while explaining the project clearly to developers and non-developers.
- Create a compelling, concrete opening.
- Use useful Markdown section headings beginning with ##.
- Avoid repetitive section openings and template-like phrasing.
- End with a specific "what comes next" conclusion grounded in the context.
- Do not sound like documentation or a press release unless the selected format is Launch Post.
- Do not mention that you are an AI or that source context was supplied.
- Do not include the title as a heading inside the body.

Return one valid JSON object with exactly these keys:
{
  "title": "article title",
  "subtitle": "one concise sentence",
  "body": "complete Markdown article body",
  "tags": ["3", "to", "6", "short", "tags"],
  "socialDescription": "one compelling social-sharing description under 180 characters"
}`;

function cleanContext(body: RequestBody) {
  const repository = body.repository;
  if (!repository) throw new Error("Repository context is missing.");

  return {
    repository: {
      name: repository.name,
      fullName: repository.fullName,
      description: repository.description,
      readme: repository.readme?.slice(0, 18000),
      languages: repository.languages,
      stars: repository.stars,
      forks: repository.forks,
      createdAt: repository.createdAt,
      updatedAt: repository.updatedAt,
      topics: repository.topics,
      tree: repository.tree?.slice(0, 150),
      dependencies: repository.dependencies,
      recentCommits: repository.recentCommits?.slice(0, 8),
      developmentThemes: repository.developmentThemes,
    },
    editedProjectBrief: body.summary,
    builderNotes: body.answers,
    selectedFormat: body.format ?? "Project Story",
    selectedTone: body.tone ?? "Personal",
  };
}

function parseArticle(content: string): Article {
  const normalized = content
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/\s*```$/, "");
  const parsed = JSON.parse(normalized) as Partial<Article>;

  if (
    typeof parsed.title !== "string" ||
    typeof parsed.subtitle !== "string" ||
    typeof parsed.body !== "string" ||
    !Array.isArray(parsed.tags) ||
    typeof parsed.socialDescription !== "string"
  ) {
    throw new Error("The writing response was incomplete.");
  }

  return {
    title: parsed.title.trim(),
    subtitle: parsed.subtitle.trim(),
    body: parsed.body.trim(),
    tags: parsed.tags.map(String).slice(0, 6),
    socialDescription: parsed.socialDescription.trim().slice(0, 180),
  };
}

function fallbackArticle(body: RequestBody): Article {
  const repo = body.repository as Repository;
  const summary = body.summary ?? {};
  const answers = body.answers ?? {};
  const features = summary.features?.filter(Boolean) ?? [];
  const languages = repo.languages?.slice(0, 5) ?? [];
  const themes = repo.developmentThemes?.slice(0, 3) ?? [];
  const motivation = answers.motivation?.trim();
  const challenge = answers.challenge?.trim();
  const next = answers.next?.trim();
  const description =
    summary.description?.trim() ||
    repo.description ||
    `${repo.name} is an open-source software project.`;
  const format = body.format ?? "Project Story";

  const titleByFormat: Record<string, string> = {
    "Build Log": `What changed in ${repo.name}—and why it matters`,
    "Project Story": `Building ${repo.name}: from repository to real project`,
    "Launch Post": `Introducing ${repo.name}`,
    "Technical Deep Dive": `Inside the architecture of ${repo.name}`,
  };

  const featureSentence =
    features.length > 0
      ? `The clearest signals in the project are ${features
          .slice(0, 4)
          .map((feature) => feature.toLowerCase())
          .join(", ")}.`
      : "The repository keeps its intent close to the implementation, letting the project structure explain much of the product.";
  const languageSentence =
    languages.length > 0
      ? `The main implementation spans ${languages.join(", ")}.`
      : "The implementation is organized around a focused set of source files and project conventions.";
  const themeSentence =
    themes.length > 0
      ? `Recent work has centered on ${themes
          .map((theme) => theme.toLowerCase())
          .join(", ")}.`
      : "The recent commit history shows the project continuing to evolve in small, deliberate steps.";

  const opening = motivation
    ? motivation
    : `A public repository usually shows what was built. The more interesting story is why its pieces fit together the way they do. ${repo.name} is a useful example of that difference.`;

  const bodyMarkdown = `${opening}

${description}

## Starting with the problem

${motivation || `The project begins with a focused premise: ${description} Rather than treating that premise as a line of copy, the repository carries it through the shape of the implementation.`}

That focus matters. A project becomes easier to understand when the product idea and the technical structure point in the same direction. ${featureSentence}

## Shaping the implementation

${languageSentence} The stack is only part of the story, though. What stands out is how the repository divides the work into pieces that can be read, changed, and extended without losing sight of the core project.

${challenge ? `${challenge}\n\nThat difficulty became a design constraint rather than a footnote. It influenced how the surrounding work was organized and where complexity was allowed to live.` : `The difficult part of this kind of work is rarely adding one isolated capability. It is deciding where that capability belongs, what it should depend on, and how much complexity the rest of the project should have to absorb.`}

## What the project can do today

${features.length > 0 ? features.map((feature) => `- ${feature}`).join("\n") : `- Present its purpose clearly through the repository\n- Keep the implementation organized around the project’s core idea`}

These capabilities are connected by a single goal: making the project useful without making it hard to understand. That is what turns a collection of files into a product with a point of view.

## The recent direction

${themeSentence} That rhythm suggests a project being refined through use rather than assembled all at once.

The repository currently has ${repo.stars.toLocaleString()} stars and ${repo.forks.toLocaleString()} forks. Those numbers provide useful context, but the stronger signal is the continuity of the work itself: the project has a visible history and a direction that can be followed.

## What comes next

${next || `The next chapter for ${repo.name} is to keep strengthening the path it has already established: deepen the useful parts, simplify the rough edges, and let real use determine which ideas deserve to become permanent.`}

That is the part of building in public I find most valuable. The repository records the code, but it also leaves a trail of decisions—and those decisions are where the real project story lives.`;

  let article: Article = {
    title: titleByFormat[format] ?? titleByFormat["Project Story"],
    subtitle: `${description.replace(/\s+/g, " ").slice(0, 145)}${
      description.length > 145 ? "…" : ""
    }`,
    body: bodyMarkdown,
    tags: Array.from(
      new Set([
        repo.name,
        ...languages.slice(0, 3),
        "BuildInPublic",
        "OpenSource",
      ]),
    ).slice(0, 6),
    socialDescription: `The story behind ${repo.name}: what it does, how the project is taking shape, and where it goes next.`.slice(
      0,
      180,
    ),
  };

  const current = body.article;
  const instruction = body.instruction ?? "generate";
  if (!current || instruction === "generate" || instruction === "regenerate") {
    return article;
  }

  article = { ...current };
  if (instruction === "shorter") {
    article.body = current.body
      .split("\n\n")
      .map((paragraph) => {
        if (paragraph.startsWith("##") || paragraph.startsWith("-")) return paragraph;
        const words = paragraph.split(/\s+/);
        return words.length > 65 ? `${words.slice(0, 52).join(" ")}…` : paragraph;
      })
      .join("\n\n");
  } else if (instruction === "longer" || instruction === "more-technical") {
    const detail = `## A closer look at the foundation

${languageSentence} The repository structure shows ${repo.tree.slice(0, 8).join(", ") || "a deliberate separation of project concerns"}. ${
      Object.keys(repo.dependencies ?? {}).length
        ? `Dependency manifests include ${Object.keys(repo.dependencies).join(", ")}, which provides another concrete view of how the project is assembled.`
        : "The project keeps its core implementation visible without relying on a large amount of supporting machinery."
    }

The important architectural choice is not the number of technologies involved. It is whether each one has a clear job. In ${repo.name}, the observable structure gives contributors a practical map from the project idea to the code that delivers it.`;
    article.body = current.body.replace(/\n## What comes next/, `\n${detail}\n\n## What comes next`);
  } else if (instruction === "more-casual") {
    article.body = current.body
      .replaceAll("The project", "The project")
      .replaceAll("It is", "It’s")
      .replaceAll("That is", "That’s")
      .replaceAll("does not", "doesn’t");
  } else if (instruction === "improve-opening") {
    const firstHeading = current.body.indexOf("\n## ");
    const rest = firstHeading >= 0 ? current.body.slice(firstHeading) : "";
    article.body = `The first thing ${repo.name} makes clear is that a useful project does not need to hide the choices that shaped it. Its repository does more than store the implementation—it shows the direction of the work.\n\n${description}${rest}`;
  } else if (instruction === "improve-conclusion") {
    article.body = current.body.replace(
      /## What comes next[\s\S]*$/,
      `## What comes next\n\n${next || `For ${repo.name}, the next useful step is not growth for its own sake. It is to keep the project legible as it becomes more capable, and to let new work sharpen the original idea rather than blur it.`}\n\nThe code will keep changing. The more lasting achievement is a project whose purpose becomes clearer with every change.`,
    );
  } else if (instruction === "regenerate-section" && body.section) {
    const escaped = body.section.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const sectionPattern = new RegExp(
      `(## ${escaped}\\n)[\\s\\S]*?(?=\\n## |$)`,
    );
    const replacement = `$1\n${featureSentence} ${languageSentence}\n\nThis section of the project is best understood through the choices visible in the repository itself. ${themeSentence}\n`;
    article.body = sectionPattern.test(current.body)
      ? current.body.replace(sectionPattern, replacement)
      : current.body;
  }

  return article;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;
    const context = cleanContext(body);
    const instruction = body.instruction ?? "generate";

    if (!process.env.GROQ_API_KEY) {
      return Response.json({
        article: fallbackArticle(body),
        demoMode: true,
      });
    }

    const selectedFormat = context.selectedFormat;
    const userPrompt = `Editorial assignment:
${instructionGuidance[instruction] ?? instructionGuidance.generate}
${body.section ? `Target section: "${body.section}"` : ""}

Format guidance:
${formatGuidance[selectedFormat] ?? formatGuidance["Project Story"]}

Tone:
Write in a ${context.selectedTone.toLowerCase()} tone.

Verified project context:
${JSON.stringify(context, null, 2)}

${body.article ? `Current article to revise:\n${JSON.stringify(body.article, null, 2)}` : ""}

Return JSON only.`;

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          response_format: { type: "json_object" },
          temperature: instruction === "regenerate" ? 0.82 : 0.68,
          max_tokens: 5600,
        }),
      },
    );

    if (!response.ok) {
      const errorBody = (await response.json().catch(() => ({}))) as {
        error?: { message?: string };
      };
      throw new Error(
        errorBody.error?.message ||
          "Groq could not complete this draft right now.",
      );
    }

    const completion = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = completion.choices?.[0]?.message?.content;
    if (!content) throw new Error("Groq returned an empty draft.");

    return Response.json({ article: parseArticle(content), demoMode: false });
  } catch (cause) {
    return Response.json(
      {
        error:
          cause instanceof Error
            ? cause.message
            : "The article could not be written.",
      },
      { status: 500 },
    );
  }
}
