import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type MouseEvent,
} from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Braces,
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock3,
  Code2,
  Command,
  Compass,
  ExternalLink,
  FileText,
  GraduationCap,
  Layers3,
  Lightbulb,
  Menu,
  MessageSquareText,
  NotebookPen,
  Route,
  Search,
  X,
} from "lucide-react";
import { lessons, SOURCE_COMMIT, type Lesson } from "./data/curriculum";
import { ConceptLab } from "./components/ConceptLab";
import { Modal } from "./components/Modal";
import { SourceReader } from "./components/SourceReader";
import { isNotes, isStringArray, useLocalState } from "./lib/storage";

type View = "lesson" | "path" | "glossary";
type Tab = "principle" | "lab" | "source";
const groups = ["开始之前", "核心原理", "深入实现"];
const subscribeHash = (callback: () => void) => {
  window.addEventListener("hashchange", callback);
  return () => window.removeEventListener("hashchange", callback);
};
const getHash = () => window.location.hash;
const defaultLesson = "agent-loop";
const mobileQuery = "(max-width: 700px)";
const subscribeMobile = (callback: () => void) => {
  const query = window.matchMedia(mobileQuery);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
};
const getMobile = () => window.matchMedia(mobileQuery).matches;

function focusCourseStart() {
  document.getElementById("main-content")?.focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: "instant" });
}

export default function App() {
  const hash = useSyncExternalStore(subscribeHash, getHash);
  const mobile = useSyncExternalStore(subscribeMobile, getMobile);
  const view: View =
    hash === "#path" ? "path" : hash === "#glossary" ? "glossary" : "lesson";
  const lessonId = hash.startsWith("#lesson/")
    ? decodeHash(hash.slice(8))
    : defaultLesson;
  const lesson = lessons.find((item) => item.id === lessonId) ?? lessons[1];
  const [completed, setCompleted] = useLocalState(
    "inside-pi:completed",
    [],
    isStringArray,
  );
  const [notes, setNotes] = useLocalState("inside-pi:notes", {}, isNotes);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const drawerRef = useRef<HTMLDialogElement | null>(null);
  const focusAfterNavigation = useRef<string | null>(null);
  const lastLesson = useRef(lesson.id);
  const Sidebar = mobile ? "dialog" : "aside";
  const completedCount = lessons.filter((item) =>
    completed.includes(item.id),
  ).length;
  const progress = Math.round((completedCount / lessons.length) * 100);
  function navigateTo(nextHash: string) {
    setMenuOpen(false);
    setSearchOpen(false);
    setNotesOpen(false);
    if (hash === nextHash) {
      window.requestAnimationFrame(focusCourseStart);
      return;
    }
    focusAfterNavigation.current = nextHash;
    window.location.hash = nextHash;
  }
  function navigate(id: string) {
    navigateTo(`#lesson/${id}`);
  }
  function openLessonLink(event: MouseEvent<HTMLAnchorElement>, id: string) {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)
      return;
    event.preventDefault();
    navigate(id);
  }
  function changeView(next: View) {
    navigateTo(
      next === "lesson" ? `#lesson/${lastLesson.current}` : `#${next}`,
    );
  }
  function toggleComplete(id: string) {
    setCompleted((current) =>
      current.includes(id)
        ? current.filter((entry) => entry !== id)
        : [...current, id],
    );
  }
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", handler);
    const stopWatchingViewport = subscribeMobile(() => setMenuOpen(false));
    return () => {
      window.removeEventListener("keydown", handler);
      stopWatchingViewport();
    };
  }, []);
  useEffect(() => {
    const drawer = drawerRef.current;
    if (!mobile || !menuOpen || !drawer) return;
    drawer.showModal();
    drawer.querySelector<HTMLElement>('[aria-current="page"]')?.focus();
    return () => drawer.close();
  }, [mobile, menuOpen]);
  useEffect(() => {
    document.title = `${view === "lesson" ? lesson.title : view === "path" ? "学习路径" : "术语手册"} · Inside Pi`;
    if (view === "lesson") lastLesson.current = lesson.id;
    if (focusAfterNavigation.current === hash) {
      focusAfterNavigation.current = null;
      focusCourseStart();
    }
  }, [hash, lesson.id, lesson.title, view]);
  return (
    <div className="app-shell">
      <a
        className="skip-link"
        href="#main-content"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById("main-content")?.focus();
        }}
      >
        跳到课程内容
      </a>
      <Sidebar
        ref={(element) => {
          drawerRef.current =
            element instanceof HTMLDialogElement ? element : null;
        }}
        id="course-sidebar"
        className={mobile ? "sidebar sidebar-drawer" : "sidebar"}
        aria-label="课程目录"
        onCancel={(event) => {
          event.preventDefault();
          setMenuOpen(false);
        }}
        onClick={(event) => {
          if (
            mobile &&
            event.target === event.currentTarget &&
            event.clientX > event.currentTarget.getBoundingClientRect().right
          ) {
            setMenuOpen(false);
          }
        }}
      >
        <div className="sidebar-heading">
          <a
            className="brand"
            href="#lesson/agent-loop"
            onClick={(event) => openLessonLink(event, defaultLesson)}
            aria-label="Inside Pi 首页"
          >
            <span className="brand-mark">
              π<span />
            </span>
            <span className="brand-name">
              inside pi<span>让 Agent 的原理变得清晰</span>
            </span>
          </a>
          {mobile && (
            <button
              className="icon-button drawer-close"
              aria-label="关闭课程目录"
              onClick={() => setMenuOpen(false)}
            >
              <X size={20} />
            </button>
          )}
        </div>
        <button className="sidebar-search" onClick={() => setSearchOpen(true)}>
          <Search size={16} />
          <span>搜索课程与概念</span>
          {!mobile && <kbd>Ctrl/⌘ K</kbd>}
        </button>
        <button
          className={`sidebar-overview ${view === "path" ? "active" : ""}`}
          onClick={() => changeView("path")}
        >
          <Compass size={18} />
          学习路线
          <ChevronRight size={14} />
        </button>
        <div className="sidebar-course-heading">
          <span>学习课程</span>
          <span>8 课</span>
        </div>
        <nav className="course-navigation">
          {groups.map((group, groupIndex) => (
            <div className="nav-group" key={group}>
              <div className="nav-group-title">
                <span>{String(groupIndex + 1).padStart(2, "0")}</span>
                {group}
              </div>
              {lessons
                .filter((item) => item.section === group)
                .map((item) => (
                  <a
                    key={item.id}
                    href={`#lesson/${item.id}`}
                    onClick={(event) => openLessonLink(event, item.id)}
                    aria-current={
                      view === "lesson" && lesson.id === item.id
                        ? "page"
                        : undefined
                    }
                    className={`lesson-nav ${view === "lesson" && lesson.id === item.id ? "active" : ""}`}
                  >
                    <span className="nav-status">
                      {completed.includes(item.id) ? (
                        <CheckCircle2 size={15} className="complete-icon" />
                      ) : (
                        <Circle size={14} />
                      )}
                    </span>
                    <span>{item.title}</span>
                    {view === "lesson" && lesson.id === item.id && (
                      <span className="active-dot" />
                    )}
                  </a>
                ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="progress-summary">
            <span>你的学习进度</span>
            <strong>
              {completedCount}
              <span> / {lessons.length}</span>
            </strong>
          </div>
          <div
            className="progress-track"
            role="progressbar"
            aria-label="学习进度"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <span style={{ width: `${progress}%` }} />
          </div>
          <p>
            {completedCount === lessons.length
              ? "全部学完了，再去读一遍源码吧。"
              : "每理解一点，就离源码更近一点。"}
          </p>
          <a
            className="repository-link"
            href="https://github.com/earendil-works/pi"
            target="_blank"
            rel="noreferrer"
          >
            <Braces size={16} />
            earendil-works / pi
            <ArrowUpRight size={14} />
          </a>
        </div>
      </Sidebar>
      <div className="workspace">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-button mobile-menu"
              aria-label="打开课程目录"
              aria-expanded={menuOpen}
              aria-controls="course-sidebar"
              aria-haspopup="dialog"
              onClick={() => setMenuOpen(true)}
            >
              <Menu size={20} />
            </button>
            <span className="product-tag">交互式学习手册</span>
            <span className="topbar-divider" />
            <nav aria-label="主导航">
              <button
                className={view === "lesson" ? "active" : ""}
                onClick={() => changeView("lesson")}
              >
                课程
              </button>
              <button
                className={view === "path" ? "active" : ""}
                onClick={() => changeView("path")}
              >
                学习路径
              </button>
              <button
                className={view === "glossary" ? "active" : ""}
                onClick={() => changeView("glossary")}
              >
                术语手册
              </button>
            </nav>
          </div>
          <a
            className="topbar-source"
            href={`https://github.com/earendil-works/pi/tree/${SOURCE_COMMIT}`}
            target="_blank"
            rel="noreferrer"
          >
            <span className="status-dot" />
            基于真实源码
            <ArrowUpRight size={14} />
          </a>
          <button
            className="icon-button mobile-search"
            aria-label="搜索课程与概念"
            onClick={() => setSearchOpen(true)}
          >
            <Search size={20} />
          </button>
        </header>
        <main id="main-content" className="main-content" tabIndex={-1}>
          {view === "lesson" ? (
            <LessonPage
              key={lesson.id}
              lesson={lesson}
              completed={completed.includes(lesson.id)}
              onComplete={() => toggleComplete(lesson.id)}
              onNavigate={navigate}
              onNotes={() => setNotesOpen(true)}
              onPath={() => changeView("path")}
            />
          ) : view === "path" ? (
            <LearningPath completed={completed} onNavigate={navigate} />
          ) : (
            <Glossary onNavigate={navigate} />
          )}
        </main>
        <footer className="site-footer">
          <span>
            <span className="footer-pi">π</span> 把复杂的事，一步步看清楚。
          </span>
          <span>
            非官方学习项目 <span>·</span> 源码版本{" "}
            <a
              href={`https://github.com/earendil-works/pi/tree/${SOURCE_COMMIT}`}
              target="_blank"
              rel="noreferrer"
            >
              {SOURCE_COMMIT.slice(0, 7)} <ExternalLink size={11} />
            </a>
          </span>
        </footer>
      </div>
      {searchOpen && (
        <SearchModal
          onClose={() => setSearchOpen(false)}
          onNavigate={navigate}
        />
      )}
      {notesOpen && (
        <Modal
          title="我的学习笔记"
          onClose={() => setNotesOpen(false)}
          className="notes-modal"
        >
          <p className="modal-description">{lesson.title} · 保存在当前浏览器</p>
          <label className="sr-only" htmlFor="lesson-note">
            本课笔记
          </label>
          <textarea
            id="lesson-note"
            placeholder="用自己的话，记下刚刚理解的概念……"
            value={notes[lesson.id] ?? ""}
            onChange={(event) =>
              setNotes((current) => ({
                ...current,
                [lesson.id]: event.target.value,
              }))
            }
            autoFocus
          />
          <div className="notes-footer">
            <span>
              <Check size={14} />
              输入自动保留
            </span>
            <button
              className="primary-button small"
              onClick={() => setNotesOpen(false)}
            >
              完成笔记
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function decodeHash(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return defaultLesson;
  }
}

function LessonPage({
  lesson,
  completed,
  onComplete,
  onNavigate,
  onNotes,
  onPath,
}: {
  lesson: Lesson;
  completed: boolean;
  onComplete: () => void;
  onNavigate: (id: string) => void;
  onNotes: () => void;
  onPath: () => void;
}) {
  const [tab, setTab] = useState<Tab>("principle");
  const [visitedTabs, setVisitedTabs] = useState<Tab[]>(["principle"]);
  const [answer, setAnswer] = useState<number | null>(null);
  const quizRef = useRef<HTMLElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const index = lessons.findIndex((item) => item.id === lesson.id);
  const tabs: { id: Tab; label: string; icon: typeof BookOpen }[] = [
    { id: "principle", label: "原理讲解", icon: BookOpen },
    { id: "lab", label: "交互实验", icon: Layers3 },
    { id: "source", label: "源码导读", icon: Code2 },
  ];
  function selectTab(id: Tab, jumpToTabs = false) {
    setTab(id);
    setVisitedTabs((visited) =>
      visited.includes(id) ? visited : [...visited, id],
    );
    if (jumpToTabs) {
      tabsRef.current?.scrollIntoView({ block: "start" });
      document.getElementById(`tab-${id}`)?.focus({ preventScroll: true });
    }
  }
  return (
    <div className="lesson-layout">
      <article className="lesson-article">
        <div className="breadcrumb">
          <span>学习课程</span>
          <ChevronRight size={12} />
          <span>{lesson.section}</span>
          <ChevronRight size={12} />
          <span>第 {lesson.number} 课</span>
        </div>
        <div className="lesson-heading">
          <h1>{lesson.title}</h1>
          <p className="lesson-subtitle">{lesson.subtitle}</p>
          <div className="lesson-meta">
            <span>
              <Clock3 size={14} />
              {lesson.duration}
            </span>
            <span>
              <Layers3 size={14} />
              含交互演示
            </span>
            <button onClick={onNotes}>
              <NotebookPen size={14} />
              记笔记
            </button>
          </div>
        </div>
        <div
          ref={tabsRef}
          className="lesson-tabs"
          role="tablist"
          aria-label="课程内容形式"
        >
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              id={`tab-${id}`}
              role="tab"
              aria-selected={tab === id}
              aria-controls={`panel-${id}`}
              tabIndex={tab === id ? 0 : -1}
              className={tab === id ? "active" : ""}
              onClick={() => selectTab(id)}
              onKeyDown={(event) => {
                if (
                  ["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)
                ) {
                  event.preventDefault();
                  const next =
                    event.key === "Home"
                      ? 0
                      : event.key === "End"
                        ? 2
                        : (tabs.findIndex((item) => item.id === tab) +
                            (event.key === "ArrowRight" ? 1 : 2)) %
                          3;
                  selectTab(tabs[next].id);
                  document.getElementById(`tab-${tabs[next].id}`)?.focus();
                }
              }}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>
        <div
          id="panel-principle"
          role="tabpanel"
          aria-labelledby="tab-principle"
          className="lesson-tab-content"
          hidden={tab !== "principle"}
        >
          <div className="objective">
            <span className="objective-icon">
              <Lightbulb size={19} />
            </span>
            <div>
              <strong>学习目标</strong>
              <p>{lesson.objective}</p>
            </div>
          </div>
          <section className="explanation-section" id="intuition">
            <div className="section-title">
              <h2>
                {lesson.id === "agent-loop"
                  ? "先建立一个直觉"
                  : "从一个简单问题开始"}
              </h2>
            </div>
            <p className="body-copy">{lesson.paragraphs[0]}</p>
          </section>
          <div className="visual-section" id="visual">
            <ConceptLab
              kind={lesson.lab}
              compact
              active={tab === "principle"}
            />
          </div>
          <section className="explanation-section" id="concepts">
            <div className="section-title">
              <h2>理解背后的关键</h2>
            </div>
            {lesson.paragraphs.slice(1).map((paragraph) => (
              <p className="body-copy" key={paragraph}>
                {paragraph}
              </p>
            ))}
            <div className="concept-list">
              {lesson.concepts.map((concept, conceptIndex) => (
                <div className="concept-row" key={concept.term}>
                  <span className="concept-index">
                    {String(conceptIndex + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3>{concept.term}</h3>
                    <p>{concept.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
          <button
            className="source-invitation"
            onClick={() => selectTab("source", true)}
          >
            <span className="source-invitation-icon">
              <Code2 size={21} />
            </span>
            <span>
              <strong>原理有了，去源码里找答案</strong>
              <small>{lesson.source.path}</small>
            </span>
            <ArrowRight size={18} />
          </button>
        </div>
        <div
          id="panel-lab"
          role="tabpanel"
          aria-labelledby="tab-lab"
          className="lesson-tab-content"
          hidden={tab !== "lab"}
        >
          {visitedTabs.includes("lab") && (
            <>
              <div className="experiment-intro">
                <span className="section-icon">
                  <Layers3 size={21} />
                </span>
                <div>
                  <h2>在实验中验证你的理解</h2>
                  <p>改变条件、观察结果。每一个操作，都对应一个概念。</p>
                </div>
              </div>
              <ConceptLab kind={lesson.lab} active={tab === "lab"} />
              <div className="experiment-tip">
                <Lightbulb size={18} />
                <p>
                  先试着预测下一步，再点击操作。把观察到的结果和「源码导读」对照起来。
                </p>
              </div>
            </>
          )}
        </div>
        <div
          id="panel-source"
          role="tabpanel"
          aria-labelledby="tab-source"
          className="lesson-tab-content"
          hidden={tab !== "source"}
        >
          {visitedTabs.includes("source") && (
            <SourceReader lesson={lesson} active={tab === "source"} />
          )}
        </div>
        <section
          className="quiz-section"
          ref={quizRef}
          id="quiz"
          aria-label="知识检查"
          tabIndex={-1}
        >
          <div className="quiz-title">
            <span className="section-icon">
              <GraduationCap size={21} />
            </span>
            <div>
              <h2>停一下，想一想</h2>
              <p>一个小问题，检查你是否理解了。</p>
            </div>
            <span className="quiz-badge">知识检查</span>
          </div>
          <h3>{lesson.quiz.question}</h3>
          <div className="quiz-options">
            {lesson.quiz.options.map((option, optionIndex) => (
              <button
                key={option}
                className={`quiz-option ${answer === optionIndex ? (answer === lesson.quiz.answer ? "correct" : "incorrect") : ""}`}
                aria-pressed={answer === optionIndex}
                onClick={() => setAnswer(optionIndex)}
              >
                <span>{String.fromCharCode(65 + optionIndex)}</span>
                {option}
                {answer === optionIndex &&
                  (answer === lesson.quiz.answer ? (
                    <CheckCircle2 size={18} />
                  ) : (
                    <X size={18} />
                  ))}
              </button>
            ))}
          </div>
          {answer !== null && (
            <div
              className={`quiz-feedback ${answer === lesson.quiz.answer ? "correct" : "incorrect"}`}
              role="status"
            >
              <strong>
                {answer === lesson.quiz.answer ? "理解正确！" : "再想一步。"}
              </strong>
              <p>{lesson.quiz.explanation}</p>
            </div>
          )}
        </section>
        <div className={`completion-banner ${completed ? "is-complete" : ""}`}>
          <span className="completion-icon">
            {completed ? <CheckCircle2 size={24} /> : <BookOpen size={23} />}
          </span>
          <div>
            <strong>
              {completed
                ? "这一课，已收入你的知识地图"
                : "理解了，就记录这一步"}
            </strong>
            <p>
              {completed
                ? "随时可以回来重温原理和源码。"
                : "按照自己的节奏学习，不用着急。"}
            </p>
          </div>
          <button
            className={completed ? "secondary-button" : "primary-button"}
            onClick={onComplete}
          >
            {completed ? <Check size={15} /> : <CheckCircle2 size={15} />}
            {completed ? "已完成 · 撤销" : "标记为已完成"}
          </button>
        </div>
        <nav className="lesson-pagination" aria-label="相邻课程">
          {index > 0 ? (
            <button onClick={() => onNavigate(lessons[index - 1].id)}>
              <ArrowLeft size={17} />
              <span>
                <small>上一课</small>
                {lessons[index - 1].title}
              </span>
            </button>
          ) : (
            <span />
          )}
          {index < lessons.length - 1 ? (
            <button onClick={() => onNavigate(lessons[index + 1].id)}>
              <span>
                <small>下一课</small>
                {lessons[index + 1].title}
              </span>
              <ArrowRight size={17} />
            </button>
          ) : (
            <button onClick={onPath}>
              <span>
                <small>完成课程</small>查看学习路径
              </span>
              <Route size={17} />
            </button>
          )}
        </nav>
      </article>
      <aside className="lesson-aside">
        <div className="aside-sticky">
          <div className="aside-label">在这一课</div>
          <button
            aria-current={tab === "principle" ? "true" : undefined}
            onClick={() => selectTab("principle", true)}
          >
            建立直觉
          </button>
          <button
            aria-current={tab === "lab" ? "true" : undefined}
            onClick={() => selectTab("lab", true)}
          >
            交互演示
          </button>
          <button
            aria-current={tab === "source" ? "true" : undefined}
            onClick={() => selectTab("source", true)}
          >
            阅读源码
          </button>
          <button
            onClick={() => {
              quizRef.current?.scrollIntoView({ block: "center" });
              quizRef.current?.focus({ preventScroll: true });
            }}
          >
            知识检查
          </button>
          <div className="aside-note">
            <h3>学习，从好奇开始</h3>
            <p>不必一次读懂所有代码。先观察运行过程，再回到实现细节。</p>
            <button onClick={onNotes}>
              记下你的想法
              <NotebookPen size={14} />
            </button>
          </div>
          <a
            className="aside-source"
            href={`https://github.com/earendil-works/pi/tree/${SOURCE_COMMIT}`}
            target="_blank"
            rel="noreferrer"
          >
            <Code2 size={15} />
            与真实源码一起学
            <ArrowUpRight size={14} />
          </a>
        </div>
      </aside>
    </div>
  );
}

function SearchModal({
  onClose,
  onNavigate,
}: {
  onClose: () => void;
  onNavigate: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const normalized = query.trim().toLowerCase();
  const results = lessons.filter((lesson) =>
    [
      lesson.title,
      lesson.subtitle,
      lesson.objective,
      ...lesson.paragraphs,
      ...lesson.concepts.flatMap((concept) => [
        concept.term,
        concept.description,
      ]),
      lesson.source.path,
      lesson.source.symbol,
    ]
      .join(" ")
      .toLowerCase()
      .includes(normalized),
  );
  return (
    <Modal title="搜索课程与概念" onClose={onClose} className="search-modal">
      <div className="search-field">
        <Search size={21} />
        <input
          aria-label="搜索课程"
          autoFocus
          placeholder="试试 Agent loop、工具调用、上下文…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && results[0]) onNavigate(results[0].id);
          }}
        />
        <kbd>Esc</kbd>
      </div>
      <div className="search-results">
        <span className="search-caption">
          {normalized ? `${results.length} 个匹配课程` : "全部课程"}
        </span>
        {results.length ? (
          results.map((lesson) => (
            <button key={lesson.id} onClick={() => onNavigate(lesson.id)}>
              <span className="search-result-icon">
                <BookOpen size={19} />
              </span>
              <span>
                <strong>{lesson.title}</strong>
                <small>{lesson.subtitle}</small>
              </span>
              <ChevronRight size={17} />
            </button>
          ))
        ) : (
          <div className="search-empty">
            <Search size={26} />
            <h3>没有找到相关课程</h3>
            <p>换个关键词试试，例如「消息」或「工具」。</p>
          </div>
        )}
      </div>
      <div className="search-footer">
        <span>
          <Command size={12} /> K 打开搜索
        </span>
        <span>Enter 打开首个结果</span>
      </div>
    </Modal>
  );
}

function LearningPath({
  completed,
  onNavigate,
}: {
  completed: string[];
  onNavigate: (id: string) => void;
}) {
  const next =
    lessons.find((lesson) => !completed.includes(lesson.id)) ?? lessons[0];
  return (
    <div className="overview-page">
      <div className="breadcrumb">
        Inside Pi
        <ChevronRight size={12} />
        学习路径
      </div>
      <span className="page-emblem">
        <Route size={27} />
      </span>
      <h1>从好奇，到读懂源码。</h1>
      <p className="overview-subtitle">
        八节短课，一条清晰的路径。把一个 Agent 拆开，再亲手把它连接起来。
      </p>
      <div className="path-intro">
        <span>
          <BookOpen size={17} />8 节课程
        </span>
        <span>
          <Layers3 size={17} />8 个交互实验
        </span>
        <span>
          <Code2 size={17} />
          真实源码导读
        </span>
      </div>
      <div className="continue-learning">
        <div>
          <span className="mini-label">下一步</span>
          <h2>{next.title}</h2>
          <p>{next.subtitle}</p>
        </div>
        <button className="primary-button" onClick={() => onNavigate(next.id)}>
          开始学习
          <ArrowRight size={16} />
        </button>
      </div>
      <div className="learning-path">
        {groups.map((group, groupIndex) => (
          <section className="path-group" key={group}>
            <div className="path-group-heading">
              <span>{String(groupIndex + 1).padStart(2, "0")}</span>
              <h2>{group}</h2>
            </div>
            {lessons
              .filter((lesson) => lesson.section === group)
              .map((lesson) => (
                <button
                  className="path-lesson"
                  key={lesson.id}
                  onClick={() => onNavigate(lesson.id)}
                >
                  <span
                    className={`path-node ${completed.includes(lesson.id) ? "done" : ""}`}
                  >
                    {completed.includes(lesson.id) ? (
                      <Check size={17} />
                    ) : (
                      lesson.number
                    )}
                  </span>
                  <span>
                    <strong>{lesson.title}</strong>
                    <small>{lesson.subtitle}</small>
                  </span>
                  <span className="path-duration">{lesson.duration}</span>
                  <ArrowRight size={17} />
                </button>
              ))}
          </section>
        ))}
      </div>
      <div className="path-ending">
        <GraduationCap size={25} />
        <p>
          学完之后，试着在源码中追踪一次完整的请求。
          <br />
          你已经有了地图，接下来可以自己探索。
        </p>
        <ArrowDown size={18} />
      </div>
    </div>
  );
}

function Glossary({ onNavigate }: { onNavigate: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const entries = lessons.flatMap((lesson) =>
    lesson.concepts.map((concept) => ({ ...concept, lesson })),
  );
  const results = entries.filter((entry) =>
    `${entry.term} ${entry.description}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
  return (
    <div className="overview-page glossary-page">
      <div className="breadcrumb">
        Inside Pi
        <ChevronRight size={12} />
        术语手册
      </div>
      <span className="page-emblem">
        <MessageSquareText size={27} />
      </span>
      <h1>让每个概念，都有着落。</h1>
      <p className="overview-subtitle">
        遇到陌生词时，来这里找一个清晰的解释，再回到课程里看它如何工作。
      </p>
      <label className="glossary-search">
        <Search size={19} />
        <input
          aria-label="筛选术语"
          placeholder="输入术语或关键词…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <span>{results.length} 个概念</span>
      </label>
      <div className="glossary-list">
        {results.map((entry) => (
          <div
            className="glossary-entry"
            key={`${entry.lesson.id}-${entry.term}`}
          >
            <span className="glossary-icon">
              <FileText size={19} />
            </span>
            <div>
              <h2>{entry.term}</h2>
              <p>{entry.description}</p>
              <button onClick={() => onNavigate(entry.lesson.id)}>
                在「{entry.lesson.title}」中学习
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        ))}
        {!results.length && (
          <div className="search-empty">
            <Search size={25} />
            <h3>没有匹配的术语</h3>
            <p>尝试更短的关键词，或清空搜索查看全部概念。</p>
          </div>
        )}
      </div>
    </div>
  );
}
