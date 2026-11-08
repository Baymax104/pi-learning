import { useLayoutEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  Check,
  Code2,
  Copy,
  GitCommitHorizontal,
  X,
} from "lucide-react";
import { SOURCE_COMMIT, sourceUrl, type Lesson } from "../data/curriculum";

const copyFeedback = {
  idle: { icon: Copy, label: "复制", announcement: "" },
  copied: { icon: Check, label: "已复制", announcement: "代码已复制。" },
  error: {
    icon: X,
    label: "复制失败",
    announcement: "复制失败。可以手动选择代码复制。",
  },
};

function revealHighlightedLines(code: HTMLDivElement | null) {
  if (!code?.clientHeight) return;

  const lines = code.querySelectorAll(".code-line.highlight");
  const first = lines[0]?.getBoundingClientRect();
  const last = lines[lines.length - 1]?.getBoundingClientRect();
  if (!first || !last) return;

  const visibleTop = code.getBoundingClientRect().top + code.clientTop;
  const visibleBottom = visibleTop + code.clientHeight;
  // 直接滚动代码窗，避免将页面或当前步骤按钮带离视野。
  if (first.top < visibleTop || last.bottom - first.top > code.clientHeight) {
    code.scrollTop += first.top - visibleTop;
  } else if (last.bottom > visibleBottom) {
    code.scrollTop += last.bottom - visibleBottom;
  }
}

export function SourceReader({
  lesson,
  active = true,
}: {
  lesson: Lesson;
  active?: boolean;
}) {
  const [selected, setSelected] = useState(0);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">(
    "idle",
  );
  const codeRef = useRef<HTMLDivElement>(null);
  const source = lesson.source;
  const step = source.steps[selected];
  const lineStart = source.startLine + step.lines[0] - 1;
  const lineEnd = source.startLine + step.lines[1] - 1;
  const { icon: CopyIcon, label, announcement } = copyFeedback[copyState];

  useLayoutEffect(() => {
    if (active) revealHighlightedLines(codeRef.current);
  }, [active, selected, source]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(source.code);
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }
  }
  return (
    <section className="source-reader" aria-label="源码阅读器">
      <div className="section-intro">
        <span className="section-icon">
          <Code2 size={20} />
        </span>
        <div>
          <h2>把原理放回源码</h2>
          <p>选择一个阅读步骤，看它在代码里如何发生。</p>
        </div>
      </div>
      <div className="source-workbench">
        <div className="source-walkthrough">
          <div className="source-steps" role="group" aria-label="源码讲解步骤">
            {source.steps.map((item, index) => (
              <button
                type="button"
                className={index === selected ? "selected" : ""}
                aria-pressed={index === selected}
                onClick={() => {
                  if (index === selected)
                    revealHighlightedLines(codeRef.current);
                  else setSelected(index);
                }}
                key={item.title}
              >
                <span aria-hidden="true">{index + 1}</span>
                {item.title}
              </button>
            ))}
          </div>
          <div className="source-explanation" aria-live="polite">
            <h3>{step.title}</h3>
            <div className="source-explanation-meta">
              <span className="mini-label">{source.symbol}</span>
              <span className="source-line-range">
                L{lineStart}
                {lineEnd !== lineStart && `–${lineEnd}`}
              </span>
            </div>
            <p>{step.explanation}</p>
          </div>
        </div>
        <div className="source-window">
          <div className="source-toolbar">
            <span>
              <Code2 size={15} />
              {source.path}
            </span>
            <button
              type="button"
              className="source-copy"
              data-state={copyState}
              onClick={copy}
              aria-label="复制代码"
            >
              <CopyIcon size={16} aria-hidden="true" />
              <span>{label}</span>
            </button>
            <div role="status" className="sr-only">
              {announcement}
            </div>
          </div>
          <div
            className="source-code"
            ref={codeRef}
            role="region"
            tabIndex={0}
            aria-label={`${source.symbol} 代码`}
          >
            <pre>
              <code>
                {source.code.split("\n").map((line, index) => {
                  const number = source.startLine + index;
                  return (
                    <span
                      className={`code-line ${number >= lineStart && number <= lineEnd ? "highlight" : ""}`}
                      key={number}
                    >
                      <span className="line-number" aria-hidden="true">
                        {number}
                      </span>
                      <span>{line || " "}</span>
                    </span>
                  );
                })}
              </code>
            </pre>
          </div>
          <div className="source-footer">
            <span>
              <GitCommitHorizontal size={14} />
              {SOURCE_COMMIT.slice(0, 7)} ·{" "}
              {source.simplified ? "教学简化代码" : "真实源码节选"}
            </span>
            <a
              href={sourceUrl(source.path, source.startLine)}
              target="_blank"
              rel="noreferrer"
            >
              在 GitHub 查看 <ArrowUpRight size={14} />
            </a>
          </div>
        </div>
      </div>
      {source.notes && (
        <div className="source-reading-notes">
          <strong>阅读提示</strong>
          {source.notes.map((note) => (
            <p key={note}>{note}</p>
          ))}
        </div>
      )}
    </section>
  );
}
