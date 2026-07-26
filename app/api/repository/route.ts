export const runtime = "edge";

type GitHubRepository = {
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  default_branch: string;
  stargazers_count: number;
  forks_count: number;
  created_at: string;
  updated_at: string;
  homepage: string | null;
  license: { spdx_id?: string; name?: string } | null;
  topics?: string[];
  archived?: boolean;
};

type GitHubCommit = {
  commit?: {
    message?: string;
    author?: { name?: string; date?: string };
  };
  author?: { login?: string };
};

type GitHubTree = {
  tree?: Array<{ path?: string; type?: string }>;
};

const apiHeaders: Record<string, string> = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  "User-Agent": "Draftline-Phase-One",
};

if (process.env.GITHUB_TOKEN) {
  apiHeaders.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
}

function parseRepositoryUrl(value: unknown) {
  if (typeof value !== "string") {
    throw new Error("Paste a valid GitHub repository URL.");
  }

  let parsed: URL;
  try {
    parsed = new URL(value.trim());
  } catch {
    throw new Error("Paste a complete GitHub URL, including github.com.");
  }

  if (!["github.com", "www.github.com"].includes(parsed.hostname.toLowerCase())) {
    throw new Error("Draftline currently supports public GitHub repositories.");
  }

  const parts = parsed.pathname
    .replace(/\.git$/, "")
    .split("/")
    .filter(Boolean);

  if (parts.length < 2 || !/^[\w.-]+$/.test(parts[0]) || !/^[\w.-]+$/.test(parts[1])) {
    throw new Error("Use a repository URL like github.com/owner/repository.");
  }

  return { owner: parts[0], repo: parts[1] };
}

async function githubJson<T>(path: string): Promise<T> {
  const response = await fetch(`https://api.github.com${path}`, {
    headers: apiHeaders,
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(
        "That repository could not be found. Make sure it is public and the URL is correct.",
      );
    }
    if (response.status === 403 || response.status === 429) {
      throw new Error(
        "GitHub’s public request limit has been reached. Please try again shortly.",
      );
    }
    throw new Error("GitHub could not return this repository right now.");
  }

  return (await response.json()) as T;
}

async function optionalGitHubJson<T>(path: string, fallback: T): Promise<T> {
  try {
    return await githubJson<T>(path);
  } catch {
    return fallback;
  }
}

function decodeBase64(value: string) {
  const bytes = Uint8Array.from(atob(value.replace(/\n/g, "")), (character) =>
    character.charCodeAt(0),
  );
  return new TextDecoder().decode(bytes);
}

function pathForApi(path: string) {
  return path.split("/").map(encodeURIComponent).join("/");
}

function extractFeatures(readme: string, tree: string[], topics: string[]) {
  const ignored =
    /^(install|installation|usage|getting started|documentation|contributing|license|roadmap|examples?|setup|development|credits|support|table of contents|api reference)$/i;
  const headings = Array.from(
    readme.matchAll(/^#{2,3}\s+(.{3,80})$/gm),
    (match) => match[1].replace(/[*_`[\]]/g, "").trim(),
  ).filter((heading) => !ignored.test(heading));

  const structuralSignals: Array<[RegExp, string]> = [
    [/(^|\/)(components?|ui)(\/|$)/i, "Reusable interface components"],
    [/(^|\/)(api|routes?)(\/|$)/i, "Application API"],
    [/(^|\/)(cli|bin)(\/|$)/i, "Command-line workflow"],
    [/(^|\/)(tests?|specs?)(\/|$)/i, "Automated test coverage"],
    [/(^|\/)(plugins?|extensions?)(\/|$)/i, "Extensible plugin system"],
    [/(^|\/)(docs?|guides?)(\/|$)/i, "Project documentation"],
  ];

  const signals = structuralSignals
    .filter(([pattern]) => tree.some((path) => pattern.test(path)))
    .map(([, label]) => label);

  return Array.from(
    new Set([
      ...headings.slice(0, 5),
      ...signals,
      ...topics.slice(0, 4).map((topic) => topic.replace(/-/g, " ")),
    ]),
  ).slice(0, 7);
}

function detectThemes(commits: GitHubCommit[]) {
  const themes: string[] = [];
  const labels: Array<[RegExp, string]> = [
    [/^(feat|add)(\(.+\))?[!:]/i, "New feature development"],
    [/^(fix|bug)(\(.+\))?[!:]/i, "Reliability and bug fixes"],
    [/^docs?(\(.+\))?[!:]/i, "Documentation improvements"],
    [/^(refactor|perf)(\(.+\))?[!:]/i, "Architecture and performance"],
    [/^test(\(.+\))?[!:]/i, "Testing and quality"],
    [/^(chore|build|ci)(\(.+\))?[!:]/i, "Build and maintenance"],
  ];

  for (const item of commits) {
    const message = item.commit?.message?.split("\n")[0]?.trim() ?? "";
    const category = labels.find(([pattern]) => pattern.test(message))?.[1];
    if (category && !themes.includes(category)) themes.push(category);
  }

  if (themes.length < 3) {
    for (const item of commits) {
      const message = item.commit?.message?.split("\n")[0]?.trim() ?? "";
      if (message && message.length < 85 && !themes.includes(message)) {
        themes.push(message);
      }
      if (themes.length >= 4) break;
    }
  }

  return themes.slice(0, 4);
}

function extractDependencies(path: string, content: string) {
  try {
    if (path.endsWith("package.json")) {
      const parsed = JSON.parse(content) as {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      };
      return Object.keys({
        ...(parsed.dependencies ?? {}),
        ...(parsed.devDependencies ?? {}),
      }).slice(0, 40);
    }
  } catch {
    return [];
  }

  if (path.endsWith("requirements.txt")) {
    return content
      .split("\n")
      .map((line) => line.split(/[=<>~![]/)[0].trim())
      .filter((line) => line && !line.startsWith("#"))
      .slice(0, 40);
  }

  if (path.endsWith("go.mod")) {
    return Array.from(content.matchAll(/^\s*([\w.-]+\/[\w./-]+)\s+v/mg), (match) => match[1]).slice(0, 40);
  }

  if (path.endsWith("pyproject.toml") || path.endsWith("Cargo.toml")) {
    return Array.from(
      content.matchAll(/^([A-Za-z0-9_.-]+)\s*=\s*(?:["'{[])/gm),
      (match) => match[1],
    )
      .filter((name) => !["name", "version", "description", "authors"].includes(name))
      .slice(0, 40);
  }

  return [];
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { url?: unknown };
    const { owner, repo } = parseRepositoryUrl(body.url);
    const base = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
    const repository = await githubJson<GitHubRepository>(base);

    const [languages, commits, tree, readmeData] = await Promise.all([
      optionalGitHubJson<Record<string, number>>(`${base}/languages`, {}),
      optionalGitHubJson<GitHubCommit[]>(`${base}/commits?per_page=8`, []),
      optionalGitHubJson<GitHubTree>(
        `${base}/git/trees/${encodeURIComponent(repository.default_branch)}?recursive=1`,
        { tree: [] },
      ),
      optionalGitHubJson<{ content?: string; encoding?: string }>(
        `${base}/readme`,
        {},
      ),
    ]);

    const readme =
      readmeData.content && readmeData.encoding === "base64"
        ? decodeBase64(readmeData.content).slice(0, 20000)
        : "";

    const allPaths = (tree.tree ?? [])
      .filter((item) => item.type === "blob" && item.path)
      .map((item) => item.path as string);
    const treeSummary = allPaths.slice(0, 180);
    const dependencyNames = [
      "package.json",
      "requirements.txt",
      "pyproject.toml",
      "Cargo.toml",
      "go.mod",
      "Gemfile",
    ];
    const dependencyPaths = allPaths
      .filter((path) => dependencyNames.includes(path.split("/").at(-1) ?? ""))
      .sort((a, b) => a.split("/").length - b.split("/").length)
      .slice(0, 5);

    const dependencyEntries = await Promise.all(
      dependencyPaths.map(async (path) => {
        try {
          const file = await githubJson<{ content?: string; encoding?: string }>(
            `${base}/contents/${pathForApi(path)}`,
          );
          const content =
            file.content && file.encoding === "base64"
              ? decodeBase64(file.content).slice(0, 15000)
              : "";
          return [path, extractDependencies(path, content)] as const;
        } catch {
          return [path, []] as const;
        }
      }),
    );

    const updatedAt = new Date(repository.updated_at);
    const createdAt = new Date(repository.created_at);
    const daysSinceUpdate =
      (Date.now() - updatedAt.getTime()) / (1000 * 60 * 60 * 24);
    const projectAge =
      (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
    const developmentStage = repository.archived
      ? "Stable and maintained"
      : projectAge < 120
        ? "Early prototype"
        : daysSinceUpdate < 75
          ? "In active development"
          : "Stable and maintained";

    const topics = repository.topics ?? [];
    const detectedFeatures = extractFeatures(readme, allPaths, topics);

    return Response.json({
      owner,
      name: repository.name,
      fullName: repository.full_name,
      url: repository.html_url,
      description: repository.description ?? "",
      readme,
      languages: Object.keys(languages),
      languageBreakdown: languages,
      stars: repository.stargazers_count,
      forks: repository.forks_count,
      createdAt: repository.created_at,
      updatedAt: repository.updated_at,
      homepage: repository.homepage,
      license:
        repository.license?.spdx_id ?? repository.license?.name ?? null,
      topics,
      tree: treeSummary,
      dependencies: Object.fromEntries(dependencyEntries),
      recentCommits: commits.map((item) => ({
        message: item.commit?.message?.split("\n")[0] ?? "Repository update",
        date: item.commit?.author?.date ?? "",
        author:
          item.author?.login ?? item.commit?.author?.name ?? "Contributor",
      })),
      detectedFeatures:
        detectedFeatures.length > 0
          ? detectedFeatures
          : ["Open-source project", "Public source code"],
      developmentStage,
      developmentThemes: detectThemes(commits),
    });
  } catch (cause) {
    return Response.json(
      {
        error:
          cause instanceof Error
            ? cause.message
            : "The repository could not be read.",
      },
      { status: 400 },
    );
  }
}
