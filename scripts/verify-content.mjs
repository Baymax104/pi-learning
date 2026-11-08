import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { lessons, SOURCE_COMMIT } from "../src/data/curriculum.ts";

// 课程顺序同时决定目录、默认入口与实验类型，修改课程时应同步更新此契约。
const expectedLessons = [
  ["meet-pi", "开始之前", "architecture"],
  ["agent-loop", "核心原理", "loop"],
  ["tool-calling", "核心原理", "tools"],
  ["messages-context", "核心原理", "messages"],
  ["streaming-events", "核心原理", "events"],
  ["sessions-compaction", "深入实现", "context"],
  ["runtime-control", "深入实现", "control"],
  ["extensions", "深入实现", "extensions"],
];

function requireValid(condition, message) {
  if (!condition) throw new Error(message);
}

function parseArguments(args) {
  if (args.length === 0) return undefined;
  if (args.length === 1 && args[0].startsWith("--checkout=")) {
    const path = args[0].slice("--checkout=".length);
    requireValid(path.length > 0, "--checkout 需要指定本地源码目录。");
    return resolve(path);
  }
  requireValid(
    args.length === 2 && args[0] === "--checkout" && args[1].length > 0,
    "用法：node scripts/verify-content.mjs [--checkout 本地源码目录]",
  );
  return resolve(args[1]);
}

function verifyCurriculum() {
  requireValid(
    /^[a-f0-9]{40}$/.test(SOURCE_COMMIT),
    "SOURCE_COMMIT 必须为完整 Git SHA。",
  );
  requireValid(
    lessons.length === expectedLessons.length,
    "课程数量应为 8 节。",
  );
  let highlightCount = 0;

  for (const [index, lesson] of lessons.entries()) {
    const [id, section, lab] = expectedLessons[index];
    requireValid(
      lesson.id === id && lesson.section === section && lesson.lab === lab,
      `第 ${index + 1} 课 ID、分组或实验类型不匹配，预期 ${id} / ${section} / ${lab}。`,
    );
    requireValid(
      lesson.number === String(index + 1).padStart(2, "0"),
      `${id}：课程编号不连续。`,
    );
    requireValid(
      lesson.quiz.options.length === 3 &&
        lesson.quiz.options.every((option) => option.trim().length > 0),
      `${id}：自测应包含 3 个非空选项。`,
    );
    requireValid(
      Number.isInteger(lesson.quiz.answer) &&
        lesson.quiz.answer >= 0 &&
        lesson.quiz.answer < 3,
      `${id}：自测答案必须为 0、1 或 2。`,
    );

    const source = lesson.source;
    requireValid(
      /^packages\/[\w/-]+\.ts$/.test(source.path),
      `${id}：源码路径必须是 packages/ 下的相对 TypeScript 文件路径。`,
    );
    requireValid(
      source.simplified === false,
      `${id}：本检查仅接受标记为真实节选的源码。`,
    );
    requireValid(
      Number.isInteger(source.startLine) && source.startLine > 0,
      `${id}：源码起始行号无效。`,
    );
    requireValid(
      source.code.trim().length > 0 && source.symbol.trim().length > 0,
      `${id}：源码或符号为空。`,
    );
    const lineCount = source.code.split("\n").length;
    requireValid(source.steps.length > 0, `${id}：缺少源码讲解步骤。`);

    for (const [stepIndex, step] of source.steps.entries()) {
      const [start, end] = step.lines;
      requireValid(
        step.lines.length === 2 &&
          Number.isInteger(start) &&
          Number.isInteger(end) &&
          start >= 1 &&
          start <= end &&
          end <= lineCount,
        `${id}：第 ${stepIndex + 1} 个高亮范围超出 ${lineCount} 行源码或格式无效。`,
      );
      highlightCount += 1;
    }
  }

  return highlightCount;
}

function verifyCheckout(checkout) {
  let actualCommit;
  try {
    actualCommit = execFileSync("git", ["-C", checkout, "rev-parse", "HEAD"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch {
    throw new Error(`无法读取本地源码版本：${checkout}`);
  }
  requireValid(
    actualCommit === SOURCE_COMMIT,
    `本地源码版本不匹配：预期 ${SOURCE_COMMIT}，实际 ${actualCommit}。`,
  );
}

function createSourceLoader(checkout) {
  const cache = new Map();

  async function load(path) {
    let text;
    if (checkout) {
      const absolutePath = resolve(checkout, path);
      const relativePath = relative(checkout, absolutePath);
      requireValid(
        relativePath !== ".." &&
          !relativePath.startsWith(`..${sep}`) &&
          !isAbsolute(relativePath),
        `源码路径超出本地目录：${path}`,
      );
      text = await readFile(absolutePath, "utf8");
    } else {
      const url = `https://raw.githubusercontent.com/earendil-works/pi/${SOURCE_COMMIT}/${path}`;
      let response;
      try {
        response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
      } catch (error) {
        throw new Error(
          `获取官方源码失败，未完成核验：${path}（${error.message}）`,
          { cause: error },
        );
      }
      requireValid(
        response.ok,
        `获取官方源码失败，未完成核验：${path}（HTTP ${response.status}）`,
      );
      text = await response.text();
    }
    return text.split(/\r?\n/);
  }

  return {
    // 同一文件的多个节选复用同一个 Promise，每个 path 只读取或请求一次。
    get(path) {
      if (!cache.has(path)) cache.set(path, load(path));
      return cache.get(path);
    },
    count() {
      return cache.size;
    },
  };
}

async function main() {
  const checkout = parseArguments(process.argv.slice(2));
  const highlightCount = verifyCurriculum();
  if (checkout) verifyCheckout(checkout);
  const sources = createSourceLoader(checkout);

  await Promise.all(
    lessons.map(async ({ id, source }) => {
      const original = await sources.get(source.path);
      const snippet = source.code.split("\n");
      requireValid(
        source.startLine + snippet.length - 1 <= original.length,
        `${id}：源码节选超出官方文件末尾。`,
      );
      for (const [index, line] of snippet.entries()) {
        const lineNumber = source.startLine + index;
        requireValid(
          line.trim() === original[lineNumber - 1].trim(),
          `${id}：${source.path}:${lineNumber} 与官方源码不一致（仅允许缩进差异）。`,
        );
      }
    }),
  );

  console.log(
    `核验通过：${lessons.length} 节课程、${highlightCount} 处高亮、${lessons.length} 个自测、${sources.count()} 个官方源码文件。`,
  );
  console.log(
    `源码版本：${SOURCE_COMMIT}；来源：${checkout ? "本地 checkout" : "GitHub 固定版本"}。`,
  );
}

try {
  await main();
} catch (error) {
  console.error(`核验失败：${error.message}`);
  process.exitCode = 1;
}
