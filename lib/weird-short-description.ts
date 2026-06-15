import type { RepositoryWithGrowth, WeirdCategoryId } from "./types";
import { looksLikeGrowthOrTrendText } from "./weird-what-is-this";

export const SHORT_DESC_MIN = 25;
export const SHORT_DESC_TARGET = 90;
export const SHORT_DESC_MAX = 120;

/** Documentation / README voice — reject and regenerate. */
const TECHNICAL_PATTERNS: RegExp[] = [
  /\brepository\b/i,
  /\bрепозитор/i,
  /\bproject\b/i,
  /\bпроект\b/i,
  /\bplatform\b/i,
  /\bплатформ/i,
  /\bsolution\b/i,
  /\bimplementation\b/i,
  /\bреализ/i,
  /\bsource code\b/i,
  /\bисходн(ый|ого) код/i,
  /\bfunctionality\b/i,
  /\bфункциональн/i,
  /\barchitecture\b/i,
  /\bархитектур/i,
  /репозиторий представляет/i,
  /проект предназначен/i,
  /содержит исходный/i,
  /использует технолог/i,
  /реализует функциональн/i,
  /предоставляет возможност/i,
  /платформа для/i,
  /инструмент для/i,
  /open-source проект/i,
  /open source project/i,
  /this (repo|repository|project)/i,
  /данный проект/i,
  /предназначен для/i,
  /демонстрирует возможност/i,
  /framework for/i,
  /library for/i,
  /tool for/i,
  /tooling for/i,
  /provides (a |an )?/i,
  /contains (the )?source/i,
  /implements (a |an )?/i,
];

const EXPERIENCE_RULES: { test: RegExp; say: string }[] = [
  {
    test: /desktop (goose|göös)|desktopgoose|honk/i,
    say: "Гусь врывается на экран и таскает ваши окна.",
  },
  {
    test: /desktop (cat|pet|neko|companion)|virtual pet|tamagotchi|ascii pet|pet on (your )?desktop/i,
    say: "Кот, который ходит по рабочему столу и мешает работать.",
  },
  {
    test: /oneko|neko.*follow|cat follow.*cursor/i,
    say: "Котенок бегает за курсором по всему экрану.",
  },
  {
    test: /meme generat|generat.*meme/i,
    say: "Создаёт мемы прямо в браузере.",
  },
  {
    test: /html.*(generat|from text|from prompt)|generat.*html|text to html|prompt to (html|page|website)/i,
    say: "Пишет готовые веб-страницы по обычному текстовому запросу.",
  },
  {
    test: /ai agent|autonomous agent|agent that|llm agent|coding agent/i,
    say: "AI-помощник, который пытается выполнять задачи без участия человека.",
  },
  {
    test: /retro terminal|terminal.*(80s|1980|retro|vintage)|dos terminal|windows 95 terminal/i,
    say: "Превращает терминал в компьютер из 1985 года.",
  },
  {
    test: /\bdos\b|windows 95|win95|commodore|c64|8-bit|16-bit|retro comput/i,
    say: "Заставляет современный ПК притворяться компьютером из прошлого.",
  },
  {
    test: /shader|webgl|generative art|particle (system|simulation)/i,
    say: "Картинка на экране, от которой сложно оторваться.",
  },
  {
    test: /ascii art|ascii animation/i,
    say: "Анимация из символов — как будто вернулись в эпоху модемов.",
  },
  {
    test: /discord bot.*meme|meme bot|shitpost/i,
    say: "Бот, который шлёт абсурд прямо в ваш чат.",
  },
  {
    test: /useless|overengineer|because i can|nobody asked/i,
    say: "Решает проблему, которой, кажется, не существовало.",
  },
  {
    test: /joke|parody|satire|funny|humor|humour/i,
    say: "Шутка для разработчиков — и почему-то со звёздами на GitHub.",
  },
  {
    test: /wallpaper engine|live wallpaper|desktop wallpaper/i,
    say: "Живые обои, которые оживляют рабочий стол.",
  },
  {
    test: /voice (clone|cloning)|text to speech.*clone/i,
    say: "Клонирует голос — и звучит жутковато реалистично.",
  },
  {
    test: /chatgpt.*wrapper|gpt.*cli|llm.*cli/i,
    say: "Общаться с ChatGPT прямо из терминала, как с соседом.",
  },
  {
    test: /roadmap|learning path|study plan/i,
    say: "Показывает дорожную карту — куда копать дальше.",
  },
  {
    test: /screensaver|screen saver/i,
    say: "Заставка, которую хочется оставить включённой.",
  },
];

const CATEGORY_FALLBACK: Record<WeirdCategoryId, string> = {
  "desktop-pets": "Живой питомец на рабочем столе — зверь внутри Windows.",
  "developer-humor": "Шутка в коде — и почему-то со звёздами на GitHub.",
  "useless-brilliant": "Гениально бесполезная штука — и именно поэтому цепляет.",
  "retro-computing": "Ностальгия по компьютерам, которых уже не найти.",
  "ai-oddities": "AI делает что-то странное — и в этом весь смысл.",
  "visual-experiments": "Сначала смотришь, потом задаёшься вопросом «зачем?».",
  "internet-culture": "Интернет-мем, который кто-то упаковал в код.",
  "unexpected-tools": "Утилита, после которой остаётся только «серьёзно?».",
};

function collapse(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

function haystack(repo: RepositoryWithGrowth): string {
  return [
    repo.name,
    repo.full_name,
    repo.description ?? "",
    repo.ai_summary ?? "",
    repo.topics.join(" "),
  ].join(" ");
}

/** First sentence, capped at max chars on a word boundary. */
function oneSentence(text: string, max: number): string {
  let t = collapse(text);
  const end = t.search(/[.!?…](?:\s|$)/);
  if (end >= 10 && end < max) {
    t = t.slice(0, end + 1);
  }
  if (t.length > max) {
    const cut = t.slice(0, max);
    const lastSpace = cut.lastIndexOf(" ");
    t = lastSpace > max * 0.45 ? cut.slice(0, lastSpace) : cut;
    if (!/[.!?…]$/.test(t)) t += ".";
  }
  if (t.length > max) {
    t = t.slice(0, max - 1).replace(/[,;:]\s*[^,;:]*$/, "") + "…";
  }
  return t;
}

export function isTechnicalDescription(text: string): boolean {
  return TECHNICAL_PATTERNS.some((p) => p.test(text));
}

export function isForbiddenShortDescription(text: string): boolean {
  return isTechnicalDescription(text);
}

function stripDocVoice(text: string): string {
  return text
    .replace(
      /^(the |a |an )?(repository|repo|project|this project|this repo)\s+(is |contains |provides |implements |offers )/i,
      ""
    )
    .replace(
      /^(репозиторий|данный проект|этот проект|проект)\s+(представляет собой|является|содержит|предоставляет|реализует)\s+/i,
      ""
    )
    .replace(/^[-–—•*]\s*/, "")
    .trim();
}

function tryExperienceMatch(text: string): string | null {
  for (const rule of EXPERIENCE_RULES) {
    if (rule.test.test(text)) return rule.say;
  }
  return null;
}

/** Turn "tool for generating X" / "X generator" into outcome phrasing. */
function rewriteEnglishClause(clause: string): string | null {
  const c = clause.toLowerCase().trim();

  const genMatch = c.match(/generat(?:e|ing|or)\s+(.+)/);
  if (genMatch) {
    const what = genMatch[1].replace(/\.$/, "");
    if (/html|web page|website/.test(what)) {
      return "Пишет готовые веб-страницы по обычному текстовому запросу.";
    }
    if (/meme/.test(what)) return "Создаёт мемы прямо в браузере.";
    return `Создаёт ${what} — без лишних телодвижений.`;
  }

  if (/html/.test(c) && /(text|prompt|natural language)/.test(c)) {
    return "Пишет готовые веб-страницы по обычному текстовому запросу.";
  }

  if (/desktop/.test(c) && /(pet|cat|companion|goose)/.test(c)) {
    return "Кот, который ходит по рабочему столу и мешает работать.";
  }

  if (/terminal/.test(c) && /retro|vintage|old/.test(c)) {
    return "Превращает терминал в компьютер из 1985 года.";
  }

  return null;
}

function tryRewriteFromDescription(raw: string): string | null {
  const cleaned = stripDocVoice(raw);
  if (!cleaned || cleaned.length < 8) return null;

  const experience = tryExperienceMatch(cleaned);
  if (experience) return experience;

  const forMatch = cleaned.match(
    /(?:tool|app|application|library|framework|bot|cli|utility|program)\s+(?:for|to)\s+(.+)/i
  );
  if (forMatch) {
    const rewritten = rewriteEnglishClause(forMatch[1]);
    if (rewritten) return rewritten;
  }

  const nounGen = cleaned.match(/(\w[\w\s-]{2,40})\s+generator/i);
  if (nounGen) {
    const subject = nounGen[1].trim().toLowerCase();
    if (/meme/.test(subject)) return "Создаёт мемы прямо в браузере.";
    if (/html|web|page/.test(subject)) {
      return "Пишет готовые веб-страницы по обычному текстовому запросу.";
    }
  }

  return null;
}

function fallbackFromCategory(
  repo: RepositoryWithGrowth,
  category?: WeirdCategoryId
): string {
  if (category && CATEGORY_FALLBACK[category]) {
    return oneSentence(CATEGORY_FALLBACK[category], SHORT_DESC_MAX);
  }

  const name = repo.name.replace(/[-_]/g, " ");
  const topic = repo.topics[0]?.replace(/-/g, " ");
  if (topic) {
    return oneSentence(`Странная штука на тему «${topic}» — кто-то правда это собрал.`, SHORT_DESC_MAX);
  }
  return oneSentence(`${name}: кто вообще сделал такую штуку?`, SHORT_DESC_MAX);
}

function finalizeCandidate(text: string): string {
  let t = oneSentence(text, SHORT_DESC_MAX);
  if (t.length < SHORT_DESC_MIN && text.length > t.length) {
    t = oneSentence(text, SHORT_DESC_MAX);
  }
  return t;
}

/**
 * Human explanation for gallery cards — what you'd say to a friend, not README voice.
 */
export function buildShortDescription(
  repo: RepositoryWithGrowth,
  category?: WeirdCategoryId
): string {
  const blob = haystack(repo);

  const fromSignals = tryExperienceMatch(blob);
  if (fromSignals && validateShortDescription(fromSignals)) {
    return finalizeCandidate(fromSignals);
  }

  for (const raw of [repo.description?.trim(), repo.ai_summary?.trim()].filter(Boolean) as string[]) {
    if (looksLikeGrowthOrTrendText(raw)) continue;

    const rewritten = tryRewriteFromDescription(raw);
    if (rewritten && validateShortDescription(rewritten)) {
      return finalizeCandidate(rewritten);
    }
  }

  return fallbackFromCategory(repo, category);
}

export function validateShortDescription(text: string): boolean {
  const t = collapse(text);
  if (t.length < SHORT_DESC_MIN || t.length > SHORT_DESC_MAX) return false;
  if (isTechnicalDescription(t)) return false;
  if (looksLikeGrowthOrTrendText(t)) return false;
  if (!/[.!?…]$/.test(t)) return false;
  return true;
}

export function sanitizeShortDescription(
  candidate: string,
  repo: RepositoryWithGrowth,
  category?: WeirdCategoryId
): string {
  const cleaned = finalizeCandidate(stripDocVoice(candidate));
  if (validateShortDescription(cleaned)) return cleaned;

  const rewritten = tryRewriteFromDescription(candidate);
  if (rewritten && validateShortDescription(rewritten)) {
    return finalizeCandidate(rewritten);
  }

  return buildShortDescription(repo, category);
}

export function formatShortDescriptionPromptContext(repo: RepositoryWithGrowth): string {
  return [
    `Name: ${repo.full_name}`,
    repo.description ? `GitHub description: ${repo.description}` : null,
    repo.topics.length ? `Topics: ${repo.topics.join(", ")}` : null,
    repo.language ? `Language: ${repo.language}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

export const HUMAN_SHORT_DESCRIPTION_SYSTEM_PROMPT = `Explain this GitHub repository to a curious non-technical person.

Write ONE short sentence in Russian.

Rules:
- Describe what the user would EXPERIENCE, not code or architecture
- Answer: "If a friend showed me this in a bar, how would I explain it?"
- Target 30–90 characters, maximum 120 characters
- One sentence only, no markdown
- Do NOT describe repository structure, implementation, or technologies
- NEVER use: репозиторий, проект, платформа, реализация, исходный код, функциональность, архитектура, инструмент для, предоставляет, содержит
- Sound human and curious, like a museum label for a strange invention

Plain text only.`;
