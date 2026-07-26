"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  Clipboard,
  Code2,
  Download,
  FileText,
  GitBranch,
  LoaderCircle,
  Minus,
  PenLine,
  Plus,
  RefreshCw,
  Rocket,
  Sparkles,
  WandSparkles,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Screen =
  | "landing"
  | "loading"
  | "summary"
  | "format"
  | "generating"
  | "studio";

type RepoData = {
  owner: string;
  name: string;
  fullName: string;
  url: string;
  description: string;
  readme: string;
  languages: string[];
  languageBreakdown: Record<string, number>;
  stars: number;
  forks: number;
  createdAt: string;
  updatedAt: string;
  homepage: string | null;
  license: string | null;
  topics: string[];
  tree: string[];
  dependencies: Record<string, string[]>;
  recentCommits: Array<{ message: string; date: string; author: string }>;
  detectedFeatures: string[];
  developmentStage: string;
  developmentThemes: string[];
};

type ProjectSummary = {
  description: string;
  features: string[];
  stage: string;
};

type Answers = {
  motivation: string;
  challenge: string;
  next: string;
};

type Article = {
  title: string;
  subtitle: string;
  body: string;
  tags: string[];
  socialDescription: string;
};

const formats = [
  {
    id: "Build Log",
    number: "01",
    icon: PenLine,
    title: "Build Log",
    description:
      "A progress-focused account of what changed, what shipped, and what you learned.",
  },
  {
    id: "Project Story",
    number: "02",
    icon: BookOpen,
    title: "Project Story",
    description:
      "A narrative about the problem, the motivation, and the path from idea to product.",
  },
  {
    id: "Launch Post",
    number: "03",
    icon: Rocket,
    title: "Launch Post",
    description:
      "A clear, confident introduction for sharing your project with the world.",
  },
  {
    id: "Technical Deep Dive",
    number: "04",
    icon: Code2,
    title: "Technical Deep Dive",
    description:
      "A closer look at architecture, implementation choices, and technical tradeoffs.",
  },
] as const;

const tones = ["Personal", "Professional", "Casual", "Technical"] as const;

const loadingMessages = [
  "Reading the project overview",
  "Understanding the technology stack",
  "Looking through recent development",
  "Finding the shape of the project",
  "Preparing your project brief",
];

const writingMessages = [
  "Finding the strongest opening",
  "Preparing the story structure",
  "Connecting the technical details",
  "Writing the first draft",
  "Giving the article a final read",
];

const exampleRepos = [
  "https://github.com/shadcn-ui/ui",
  "https://github.com/oven-sh/bun",
  "https://github.com/withastro/astro",
];

const emptySummary: ProjectSummary = {
  description: "",
  features: [],
  stage: "In active development",
};

const emptyAnswers: Answers = { motivation: "", challenge: "", next: "" };

function formatNumber(value: number) {
  return new Intl.NumberFormat("en", { notation: "compact" }).format(value);
}

function readingStats(body: string) {
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  return { words, minutes: Math.max(1, Math.ceil(words / 220)) };
}

function StepMark({
  number,
  label,
  active,
  complete,
}: {
  number: number;
  label: string;
  active: boolean;
  complete: boolean;
}) {
  return (
    <div
      className={`step-mark ${active ? "is-active" : ""} ${
        complete ? "is-complete" : ""
      }`}
    >
      <span>{complete ? <Check size={12} /> : number}</span>
      <em>{label}</em>
    </div>
  );
}

function AppHeader({
  step = 0,
  onReset,
}: {
  step?: number;
  onReset?: () => void;
}) {
  return (
    <header className="site-header">
      <button className="wordmark" onClick={onReset} aria-label="Draftline home">
        <span className="brand-mark">D</span>
        <span>DRAFTLINE</span>
      </button>
      {step > 0 && step < 5 ? (
        <div className="stepper" aria-label={`Step ${step} of 4`}>
          <StepMark
            number={1}
            label="Repository"
            active={step === 1}
            complete={step > 1}
          />
          <span className="step-line" />
          <StepMark
            number={2}
            label="Project"
            active={step === 2}
            complete={step > 2}
          />
          <span className="step-line" />
          <StepMark
            number={3}
            label="Voice"
            active={step === 3}
            complete={step > 3}
          />
          <span className="step-line" />
          <StepMark
            number={4}
            label="Draft"
            active={step === 4}
            complete={step > 4}
          />
        </div>
      ) : (
        <div className="header-note">
          <span />
          Stories, shaped from source
        </div>
      )}
    </header>
  );
}

function Landing({
  repoUrl,
  setRepoUrl,
  onSubmit,
  error,
}: {
  repoUrl: string;
  setRepoUrl: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
  error: string;
}) {
  return (
    <motion.main
      className="landing"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <AppHeader />
      <section className="hero">
        <div className="hero-kicker">
          <span>01</span>
          <p>Editorial tools for developers who build in public</p>
        </div>
        <div className="hero-grid">
          <div className="hero-copy">
            <h1>
              Your repository
              <br />
              already has <i>a story.</i>
            </h1>
            <p>
              Turn the code, commits, and context behind your project into a
              thoughtful article that sounds like you.
            </p>
          </div>
          <form className="repo-composer" onSubmit={onSubmit}>
            <div className="composer-label">
              <span>Start with a repository</span>
              <GitBranch size={16} />
            </div>
            <label htmlFor="repository-url">Public GitHub repository URL</label>
            <div className="composer-input">
              <GitBranch size={20} aria-hidden="true" />
              <input
                id="repository-url"
                value={repoUrl}
                onChange={(event) => setRepoUrl(event.target.value)}
                placeholder="https://github.com/owner/repository"
                autoComplete="url"
              />
            </div>
            {error && <p className="form-error">{error}</p>}
            <button className="primary-button" type="submit">
              Create article
              <ArrowRight size={18} />
            </button>
            <div className="composer-foot">
              <span>Public repositories only</span>
              <span>No GitHub sign-in required</span>
            </div>
          </form>
        </div>
        <div className="example-row">
          <span>Try an example</span>
          {exampleRepos.map((example) => (
            <button key={example} onClick={() => setRepoUrl(example)}>
              {example.replace("https://github.com/", "")}
              <ChevronRight size={13} />
            </button>
          ))}
        </div>
      </section>

      <section className="preview-section">
        <div className="preview-aside">
          <span>FROM REPOSITORY TO READABLE STORY</span>
          <p>
            Draftline studies what the project does, how it is built, and where
            it is heading—then gives you the final word.
          </p>
        </div>
        <article className="article-sample">
          <div className="sample-meta">
            <span>BUILD NOTE · 07</span>
            <span>6 MIN READ</span>
          </div>
          <h2>Making the complicated part feel obvious</h2>
          <p className="sample-deck">
            The best developer tools often begin as a small answer to a
            stubborn problem. This one started with a question I kept asking.
          </p>
          <div className="sample-rule" />
          <div className="sample-columns">
            <p>
              I wanted the setup to disappear—not by hiding how it worked, but
              by making every choice feel inevitable. That meant revisiting the
              architecture before adding another feature.
            </p>
            <div>
              <span>THE STACK</span>
              <b>TypeScript</b>
              <b>Next.js</b>
              <b>Cloudflare</b>
            </div>
          </div>
        </article>
      </section>

      <footer className="landing-footer">
        <span>Draftline / Phase One</span>
        <span>Read the code. Find the thread. Tell the story.</span>
      </footer>
    </motion.main>
  );
}

function CalmLoading({
  mode,
  repoName,
}: {
  mode: "reading" | "writing";
  repoName?: string;
}) {
  const messages = mode === "reading" ? loadingMessages : writingMessages;
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(
      () => setIndex((current) => Math.min(current + 1, messages.length - 1)),
      1150,
    );
    return () => window.clearInterval(timer);
  }, [messages.length]);

  return (
    <main className="process-page">
      <AppHeader step={mode === "reading" ? 1 : 4} />
      <section className="process-card">
        <div className="process-orbit" aria-hidden="true">
          <span />
          <FileText size={34} strokeWidth={1.25} />
        </div>
        <p className="eyebrow">
          {mode === "reading" ? "Reading the repository" : "Writing your draft"}
        </p>
        <AnimatePresence mode="wait">
          <motion.h1
            key={messages[index]}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35 }}
          >
            {messages[index]}
          </motion.h1>
        </AnimatePresence>
        <p className="process-sub">
          {mode === "reading"
            ? "We’re gathering the context that makes this project distinct."
            : `Shaping ${repoName ?? "your project"} into a clear, human story.`}
        </p>
        <div className="progress-track">
          <motion.span
            animate={{ width: `${18 + index * 19}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </div>
        <div className="process-count">
          <span>0{index + 1}</span>
          <span>0{messages.length}</span>
        </div>
      </section>
    </main>
  );
}

function SummaryScreen({
  repo,
  summary,
  setSummary,
  answers,
  setAnswers,
  onContinue,
  onBack,
}: {
  repo: RepoData;
  summary: ProjectSummary;
  setSummary: (value: ProjectSummary) => void;
  answers: Answers;
  setAnswers: (value: Answers) => void;
  onContinue: () => void;
  onBack: () => void;
}) {
  const [featureDraft, setFeatureDraft] = useState("");

  function addFeature() {
    const value = featureDraft.trim();
    if (!value || summary.features.includes(value)) return;
    setSummary({ ...summary, features: [...summary.features, value] });
    setFeatureDraft("");
  }

  return (
    <main className="flow-page">
      <AppHeader step={2} />
      <div className="flow-shell">
        <button className="back-button" onClick={onBack}>
          <ArrowLeft size={15} /> Start over
        </button>
        <div className="section-heading">
          <p className="eyebrow">Project brief</p>
          <h1>Let’s make sure we understood it.</h1>
          <p>
            We found the foundation. Add the context that only the builder
            knows.
          </p>
        </div>

        <div className="summary-layout">
          <section className="summary-main">
            <div className="repo-title-row">
              <div className="repo-monogram">
                {repo.name.slice(0, 1).toUpperCase()}
              </div>
              <div>
                <span>{repo.owner} /</span>
                <h2>{repo.name}</h2>
              </div>
              <a href={repo.url} target="_blank" rel="noreferrer">
                <GitBranch size={15} /> View repository
              </a>
            </div>

            <label className="field-group">
              <span>How would you describe it?</span>
              <textarea
                rows={4}
                value={summary.description}
                onChange={(event) =>
                  setSummary({ ...summary, description: event.target.value })
                }
              />
              <small>{summary.description.length} characters</small>
            </label>

            <div className="field-group">
              <span>Main features</span>
              <div className="feature-list">
                {summary.features.map((feature) => (
                  <span key={feature}>
                    {feature}
                    <button
                      aria-label={`Remove ${feature}`}
                      onClick={() =>
                        setSummary({
                          ...summary,
                          features: summary.features.filter(
                            (item) => item !== feature,
                          ),
                        })
                      }
                    >
                      <X size={13} />
                    </button>
                  </span>
                ))}
              </div>
              <div className="add-feature">
                <input
                  value={featureDraft}
                  onChange={(event) => setFeatureDraft(event.target.value)}
                  placeholder="Add another feature"
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addFeature();
                    }
                  }}
                />
                <button onClick={addFeature} aria-label="Add feature">
                  <Plus size={16} />
                </button>
              </div>
            </div>
          </section>

          <aside className="summary-aside">
            <div className="insight-block">
              <span className="mini-label">Detected stack</span>
              <div className="stack-list">
                {repo.languages.slice(0, 6).map((language, index) => (
                  <span key={language}>
                    <i style={{ opacity: 1 - index * 0.1 }} />
                    {language}
                  </span>
                ))}
              </div>
            </div>
            <div className="insight-grid">
              <div>
                <span className="mini-label">Stage</span>
                <select
                  value={summary.stage}
                  onChange={(event) =>
                    setSummary({ ...summary, stage: event.target.value })
                  }
                >
                  <option>Early prototype</option>
                  <option>In active development</option>
                  <option>Stable and maintained</option>
                  <option>Recently launched</option>
                </select>
              </div>
              <div>
                <span className="mini-label">Repository</span>
                <p>
                  {formatNumber(repo.stars)} stars · {formatNumber(repo.forks)}{" "}
                  forks
                </p>
              </div>
            </div>
            <div className="insight-block themes">
              <span className="mini-label">Recent development</span>
              {repo.developmentThemes.slice(0, 4).map((theme) => (
                <p key={theme}>{theme}</p>
              ))}
            </div>
          </aside>
        </div>

        <section className="builder-context">
          <div className="context-heading">
            <p className="eyebrow">Your side of the story</p>
            <h2>Three optional notes</h2>
            <span>Even a sentence can make the article feel more personal.</span>
          </div>
          <div className="question-grid">
            <label>
              <span>01</span>
              <b>Why did you start building this?</b>
              <textarea
                rows={4}
                placeholder="The problem, moment, or frustration that started it…"
                value={answers.motivation}
                onChange={(event) =>
                  setAnswers({ ...answers, motivation: event.target.value })
                }
              />
            </label>
            <label>
              <span>02</span>
              <b>What was the most difficult part?</b>
              <textarea
                rows={4}
                placeholder="A hard technical decision or a lesson learned…"
                value={answers.challenge}
                onChange={(event) =>
                  setAnswers({ ...answers, challenge: event.target.value })
                }
              />
            </label>
            <label>
              <span>03</span>
              <b>What are you planning to build next?</b>
              <textarea
                rows={4}
                placeholder="The next feature, milestone, or open question…"
                value={answers.next}
                onChange={(event) =>
                  setAnswers({ ...answers, next: event.target.value })
                }
              />
            </label>
          </div>
        </section>

        <div className="flow-actions">
          <span>Everything here can still change in the editor.</span>
          <button className="primary-button compact" onClick={onContinue}>
            Choose the article
            <ArrowRight size={17} />
          </button>
        </div>
      </div>
    </main>
  );
}

function FormatScreen({
  format,
  setFormat,
  tone,
  setTone,
  onGenerate,
  onBack,
}: {
  format: string;
  setFormat: (value: string) => void;
  tone: string;
  setTone: (value: string) => void;
  onGenerate: () => void;
  onBack: () => void;
}) {
  return (
    <main className="flow-page">
      <AppHeader step={3} />
      <div className="flow-shell format-shell">
        <button className="back-button" onClick={onBack}>
          <ArrowLeft size={15} /> Project brief
        </button>
        <div className="section-heading">
          <p className="eyebrow">Editorial direction</p>
          <h1>What kind of story are you telling?</h1>
          <p>
            Choose a structure for the article. You can keep shaping the voice
            after the first draft.
          </p>
        </div>

        <section className="format-grid">
          {formats.map((item) => {
            const Icon = item.icon;
            const selected = format === item.id;
            return (
              <button
                key={item.id}
                className={`format-card ${selected ? "is-selected" : ""}`}
                onClick={() => setFormat(item.id)}
                aria-pressed={selected}
              >
                <div className="format-top">
                  <span>{item.number}</span>
                  <Icon size={20} strokeWidth={1.5} />
                </div>
                <h2>{item.title}</h2>
                <p>{item.description}</p>
                <div className="format-select">
                  <span>{selected ? <Check size={13} /> : null}</span>
                  {selected ? "Selected" : "Select format"}
                </div>
              </button>
            );
          })}
        </section>

        <section className="tone-section">
          <div>
            <p className="eyebrow">Tone of voice</p>
            <h2>How should it sound?</h2>
          </div>
          <div className="tone-options">
            {tones.map((item) => (
              <button
                key={item}
                className={tone === item ? "is-selected" : ""}
                onClick={() => setTone(item)}
              >
                <span>{tone === item ? <Check size={12} /> : null}</span>
                {item}
              </button>
            ))}
          </div>
        </section>

        <div className="flow-actions">
          <span>
            {format} · {tone} tone
          </span>
          <button className="primary-button compact" onClick={onGenerate}>
            <WandSparkles size={17} />
            Write the first draft
          </button>
        </div>
      </div>
    </main>
  );
}

function ArticlePreview({
  body,
  busySection,
  onRegenerateSection,
}: {
  body: string;
  busySection: string;
  onRegenerateSection: (section: string) => void;
}) {
  const sections = body.split(/(?=^##\s)/m).filter(Boolean);
  return (
    <div className="markdown-preview">
      {sections.map((section, index) => {
        const heading = section.match(/^##\s+(.+)$/m)?.[1] ?? "Opening";
        return (
          <section className="preview-block" key={`${heading}-${index}`}>
            <button
              className="section-refresh"
              onClick={() => onRegenerateSection(heading)}
              disabled={Boolean(busySection)}
              title={`Regenerate ${heading}`}
            >
              {busySection === heading ? (
                <LoaderCircle className="spin" size={14} />
              ) : (
                <RefreshCw size={14} />
              )}
              Rewrite section
            </button>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {section}
            </ReactMarkdown>
          </section>
        );
      })}
    </div>
  );
}

function Studio({
  repo,
  article,
  setArticle,
  format,
  tone,
  demoMode,
  onRewrite,
  busyAction,
  busySection,
  onReset,
}: {
  repo: RepoData;
  article: Article;
  setArticle: (value: Article) => void;
  format: string;
  tone: string;
  demoMode: boolean;
  onRewrite: (instruction: string, section?: string) => void;
  busyAction: string;
  busySection: string;
  onReset: () => void;
}) {
  const [view, setView] = useState<"write" | "preview">("preview");
  const [copied, setCopied] = useState(false);
  const stats = useMemo(() => readingStats(article.body), [article.body]);

  const markdown = `# ${article.title}\n\n_${article.subtitle}_\n\n${article.body}\n\n${article.tags
    .map((tag) => `#${tag.replace(/\s+/g, "")}`)
    .join(" ")}`;

  async function copyMarkdown() {
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  function downloadMarkdown() {
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${repo.name}-build-story.md`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const editorialActions = [
    { id: "shorter", icon: Minus, label: "Make it shorter" },
    { id: "longer", icon: Plus, label: "Make it longer" },
    { id: "more-casual", icon: Sparkles, label: "More casual" },
    { id: "more-technical", icon: Code2, label: "More technical" },
    { id: "improve-opening", icon: PenLine, label: "Improve opening" },
    { id: "improve-conclusion", icon: BookOpen, label: "Improve conclusion" },
  ];

  return (
    <main className="studio-page">
      <header className="studio-header">
        <button className="wordmark" onClick={onReset}>
          <span className="brand-mark">D</span>
          <span>DRAFTLINE</span>
        </button>
        <div className="studio-document">
          <span className="status-dot" />
          <span>{repo.name}</span>
          <em>Saved in this browser</em>
        </div>
        <div className="studio-export">
          <button onClick={copyMarkdown}>
            {copied ? <Check size={15} /> : <Clipboard size={15} />}
            {copied ? "Copied" : "Copy Markdown"}
          </button>
          <button onClick={downloadMarkdown}>
            <Download size={15} />
            Download
          </button>
        </div>
      </header>

      <div className="studio-layout">
        <article className="editor-paper">
          <div className="paper-toolbar">
            <div className="view-toggle">
              <button
                className={view === "write" ? "is-active" : ""}
                onClick={() => setView("write")}
              >
                Write
              </button>
              <button
                className={view === "preview" ? "is-active" : ""}
                onClick={() => setView("preview")}
              >
                Preview
              </button>
            </div>
            <div className="document-stats">
              <span>{stats.words.toLocaleString()} words</span>
              <span>{stats.minutes} min read</span>
            </div>
          </div>

          <div className="article-meta-line">
            <span>{format}</span>
            <span>{tone} voice</span>
            {demoMode && (
              <span className="demo-pill" title="Add GROQ_API_KEY to enable Groq">
                Preview writing mode
              </span>
            )}
          </div>

          <input
            className="title-editor"
            value={article.title}
            onChange={(event) =>
              setArticle({ ...article, title: event.target.value })
            }
            aria-label="Article title"
          />
          <textarea
            className="subtitle-editor"
            value={article.subtitle}
            onChange={(event) =>
              setArticle({ ...article, subtitle: event.target.value })
            }
            aria-label="Article subtitle"
            rows={2}
          />
          <div className="title-rule" />

          {view === "write" ? (
            <textarea
              className="body-editor"
              value={article.body}
              onChange={(event) =>
                setArticle({ ...article, body: event.target.value })
              }
              aria-label="Article body in Markdown"
              spellCheck
            />
          ) : (
            <ArticlePreview
              body={article.body}
              busySection={busySection}
              onRegenerateSection={(section) =>
                onRewrite("regenerate-section", section)
              }
            />
          )}

          <div className="article-tags">
            {article.tags.map((tag) => (
              <span key={tag}>#{tag.replace(/\s+/g, "")}</span>
            ))}
          </div>
        </article>

        <aside className="studio-sidebar">
          <div className="sidebar-heading">
            <span>Editorial tools</span>
            <p>Shape the draft without losing the project context.</p>
          </div>
          <button
            className="regenerate-all"
            onClick={() => onRewrite("regenerate")}
            disabled={Boolean(busyAction)}
          >
            {busyAction === "regenerate" ? (
              <LoaderCircle className="spin" size={16} />
            ) : (
              <RefreshCw size={16} />
            )}
            Regenerate full article
          </button>
          <div className="sidebar-rule" />
          <span className="mini-label">Adjust the draft</span>
          <div className="rewrite-actions">
            {editorialActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  onClick={() => onRewrite(action.id)}
                  disabled={Boolean(busyAction)}
                >
                  {busyAction === action.id ? (
                    <LoaderCircle className="spin" size={15} />
                  ) : (
                    <Icon size={15} />
                  )}
                  {action.label}
                  <ChevronRight size={14} />
                </button>
              );
            })}
          </div>
          <div className="sidebar-rule" />
          <div className="share-copy">
            <span className="mini-label">Social description</span>
            <p>{article.socialDescription}</p>
            <button
              onClick={() =>
                navigator.clipboard.writeText(article.socialDescription)
              }
            >
              <Clipboard size={13} /> Copy description
            </button>
          </div>
          <div className="source-note">
            <GitBranch size={16} />
            <div>
              <span>Source context</span>
              <p>{repo.fullName}</p>
            </div>
            <Check size={15} />
          </div>
        </aside>
      </div>
    </main>
  );
}

export default function Home() {
  const [screen, setScreen] = useState<Screen>("landing");
  const [repoUrl, setRepoUrl] = useState("");
  const [repo, setRepo] = useState<RepoData | null>(null);
  const [summary, setSummary] = useState<ProjectSummary>(emptySummary);
  const [answers, setAnswers] = useState<Answers>(emptyAnswers);
  const [format, setFormat] = useState("Project Story");
  const [tone, setTone] = useState("Personal");
  const [article, setArticle] = useState<Article | null>(null);
  const [error, setError] = useState("");
  const [busyAction, setBusyAction] = useState("");
  const [busySection, setBusySection] = useState("");
  const [demoMode, setDemoMode] = useState(false);

  async function loadRepository(event?: FormEvent) {
    event?.preventDefault();
    setError("");
    if (!repoUrl.trim()) {
      setError("Paste a public GitHub repository URL to begin.");
      return;
    }
    setScreen("loading");

    try {
      const responsePromise = fetch("/api/repository", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: repoUrl.trim() }),
      });
      const [response] = await Promise.all([
        responsePromise,
        new Promise((resolve) => window.setTimeout(resolve, 2600)),
      ]);
      const data = (await response.json()) as RepoData & { error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to read repository.");
      setRepo(data);
      setSummary({
        description:
          data.description || `A software project maintained by ${data.owner}.`,
        features: data.detectedFeatures.slice(0, 6),
        stage: data.developmentStage,
      });
      setScreen("summary");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "We couldn’t read that repository. Check the URL and try again.",
      );
      setScreen("landing");
    }
  }

  async function requestArticle(
    instruction: string,
    section?: string,
  ): Promise<Article | null> {
    if (!repo) return null;
    const response = await fetch("/api/article", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        instruction,
        section,
        repository: repo,
        summary,
        answers,
        format,
        tone,
        article,
      }),
    });
    const data = (await response.json()) as {
      article?: Article;
      error?: string;
      demoMode?: boolean;
    };
    if (!response.ok || !data.article) {
      throw new Error(data.error || "The draft could not be written.");
    }
    setDemoMode(Boolean(data.demoMode));
    return data.article;
  }

  async function generateArticle() {
    setScreen("generating");
    setError("");
    try {
      const [nextArticle] = await Promise.all([
        requestArticle("generate"),
        new Promise((resolve) => window.setTimeout(resolve, 3600)),
      ]);
      if (nextArticle) setArticle(nextArticle);
      setScreen("studio");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Generation failed.");
      setScreen("format");
    }
  }

  async function rewriteArticle(instruction: string, section?: string) {
    if (!article) return;
    if (section) setBusySection(section);
    else setBusyAction(instruction);
    try {
      const nextArticle = await requestArticle(instruction, section);
      if (nextArticle) setArticle(nextArticle);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Rewrite failed.");
    } finally {
      setBusyAction("");
      setBusySection("");
    }
  }

  function reset() {
    setScreen("landing");
    setRepo(null);
    setArticle(null);
    setError("");
    setAnswers(emptyAnswers);
    setSummary(emptySummary);
  }

  return (
    <AnimatePresence mode="wait">
      {screen === "landing" && (
        <Landing
          key="landing"
          repoUrl={repoUrl}
          setRepoUrl={setRepoUrl}
          onSubmit={loadRepository}
          error={error}
        />
      )}
      {screen === "loading" && <CalmLoading key="loading" mode="reading" />}
      {screen === "summary" && repo && (
        <SummaryScreen
          key="summary"
          repo={repo}
          summary={summary}
          setSummary={setSummary}
          answers={answers}
          setAnswers={setAnswers}
          onContinue={() => setScreen("format")}
          onBack={reset}
        />
      )}
      {screen === "format" && (
        <FormatScreen
          key="format"
          format={format}
          setFormat={setFormat}
          tone={tone}
          setTone={setTone}
          onGenerate={generateArticle}
          onBack={() => setScreen("summary")}
        />
      )}
      {screen === "generating" && (
        <CalmLoading
          key="generating"
          mode="writing"
          repoName={repo?.name}
        />
      )}
      {screen === "studio" && repo && article && (
        <Studio
          key="studio"
          repo={repo}
          article={article}
          setArticle={setArticle}
          format={format}
          tone={tone}
          demoMode={demoMode}
          onRewrite={rewriteArticle}
          busyAction={busyAction}
          busySection={busySection}
          onReset={reset}
        />
      )}
    </AnimatePresence>
  );
}
