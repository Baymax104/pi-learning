import { mkdir } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import { lessons, SOURCE_COMMIT, sourceUrl } from "../src/data/curriculum";

const errors = new WeakMap<Page, string[]>();

test.beforeEach(async ({ page }) => {
  const messages: string[] = [];
  errors.set(page, messages);
  page.on("pageerror", (error) => messages.push(error.message));
});

test.afterEach(async ({ page }) => {
  expect(errors.get(page), "页面不应出现浏览器运行错误").toEqual([]);
});

async function noPageOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    ),
  ).toBeLessThanOrEqual(1);
}

function activeLab(page: Page) {
  return page.getByRole("tabpanel").getByTestId("concept-lab");
}

test("默认进入 Agent loop，八节课均可导航、阅读与刷新直达", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Agent 的工作循环",
  );
  await expect(page.getByRole("tab", { name: "原理讲解" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.locator(".lesson-nav:visible")).toHaveCount(8);
  for (const lesson of lessons) {
    await page.getByRole("link", { name: lesson.title, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`#lesson/${lesson.id}$`));
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      lesson.title,
    );
    await expect(page.getByRole("region", { name: "知识检查" })).toContainText(
      lesson.quiz.question,
    );
    await expect(activeLab(page)).toBeVisible();
  }
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    lessons[7].title,
  );
  await page.goBack();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    lessons[6].title,
  );
});

test("课程前后切换与无效 hash 均能继续学习", async ({ page }) => {
  await page.goto("/#lesson/agent-loop");
  await page
    .getByRole("navigation", { name: "相邻课程" })
    .getByRole("button", { name: /下一课/ })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    lessons[2].title,
  );
  await page
    .getByRole("navigation", { name: "相邻课程" })
    .getByRole("button", { name: /上一课/ })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    lessons[1].title,
  );
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBeGreaterThan(0);
  await page.getByRole("link", { name: lessons[3].title, exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    lessons[3].title,
  );
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  const navigation = page.getByRole("navigation", { name: "主导航" });
  await navigation.getByText("学习路径", { exact: true }).click();
  await navigation.getByText("课程", { exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    lessons[3].title,
  );
  await page.goto("/#lesson/%E0%A4%A");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    lessons[1].title,
  );
  await page.goto("/#lesson/not-a-course");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    lessons[1].title,
  );
});

test("搜索支持内容术语、空状态、Enter 导航与 Escape 关闭", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Control+k");
  const modal = page.getByRole("dialog", { name: "搜索课程与概念" });
  await expect(modal).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "搜索课程", exact: true }),
  ).toBeFocused();
  await page
    .getByRole("textbox", { name: "搜索课程", exact: true })
    .fill("not-present-0123456789");
  await expect(modal).toContainText("没有找到相关课程");
  await page
    .getByRole("textbox", { name: "搜索课程", exact: true })
    .fill("compaction");
  await expect(modal.locator(".search-results button")).not.toHaveCount(0);
  await page.keyboard.press("Enter");
  await expect(modal).not.toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    lessons[5].title,
  );
  await page.keyboard.press("Control+k");
  await expect(modal).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(modal).not.toBeVisible();
});

test("内容标签支持箭头键切换与源码逐段导读", async ({ page }) => {
  await page.goto("/#lesson/agent-loop");
  const principle = page.getByRole("tab", { name: "原理讲解" });
  const lab = page.getByRole("tab", { name: "交互实验" });
  const source = page.getByRole("tab", { name: "源码导读" });
  for (const tab of [principle, lab, source]) {
    const panelId = await tab.getAttribute("aria-controls");
    await expect(
      page.locator(`[role="tabpanel"][id="${panelId}"]`),
    ).toHaveCount(1);
  }
  await expect(page.getByRole("tabpanel")).toHaveCount(1);
  await principle.focus();
  await page.keyboard.press("ArrowRight");
  await expect(lab).toHaveAttribute("aria-selected", "true");
  await expect(lab).toBeFocused();
  await page.keyboard.press("End");
  await expect(source).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tabpanel")).toHaveCount(1);
  const reader = page.getByRole("region", { name: "源码阅读器" });
  await expect(reader).toBeVisible();
  await expect(
    page.getByRole("link", { name: "在 GitHub 查看" }),
  ).toHaveAttribute(
    "href",
    sourceUrl(lessons[1].source.path, lessons[1].source.startLine),
  );
  await expect(page.locator(".source-footer")).toContainText(
    SOURCE_COMMIT.slice(0, 7),
  );
  await expect(page.locator(".source-footer")).toContainText("真实源码节选");
  const lastStep = reader.locator(".source-steps button").last();
  const initialHighlight = await reader
    .locator(".code-line.highlight")
    .allTextContents();
  await lastStep.press("Enter");
  await expect(lastStep).toHaveAttribute("aria-pressed", "true");
  await expect(lastStep).toBeFocused();
  await expect(reader.locator(".source-explanation")).toContainText(
    lessons[1].source.steps.at(-1)!.explanation,
  );
  expect(
    await reader.locator(".code-line.highlight").allTextContents(),
  ).not.toEqual(initialHighlight);
  await expect
    .poll(
      () =>
        reader.locator(".source-code").evaluate((code) => {
          const bounds = code.getBoundingClientRect();
          const lines = Array.from(code.querySelectorAll(".highlight"));
          return (
            lines.length > 0 &&
            lines.every((line) => {
              const { top, bottom } = line.getBoundingClientRect();
              return top >= bounds.top - 1 && bottom <= bounds.bottom + 1;
            })
          );
        }),
      { message: "选中步骤的所有高亮行应在代码窗内可见" },
    )
    .toBe(true);
  await source.focus();
  await page.keyboard.press("Home");
  await expect(principle).toHaveAttribute("aria-selected", "true");
  await principle.press("End");
  await expect(lastStep).toHaveAttribute("aria-pressed", "true");
});

test("每课知识检查能解释错误与正确答案", async ({ page }) => {
  for (const lesson of lessons) {
    await page.goto(`/#lesson/${lesson.id}`);
    const quiz = page.getByRole("region", { name: "知识检查" });
    const options = quiz.locator(".quiz-option");
    await options.nth((lesson.quiz.answer + 1) % 3).click();
    await expect(quiz.getByRole("status")).toContainText("再想一步。");
    await expect(quiz.getByRole("status")).toContainText(
      lesson.quiz.explanation,
    );
    await options.nth(lesson.quiz.answer).click();
    await expect(quiz.getByRole("status")).toContainText("理解正确！");
    await expect(options.nth(lesson.quiz.answer)).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  }
});

test("完成状态可刷新恢复并撤销，学习路径反映同一进度", async ({ page }) => {
  await page.goto("/#lesson/agent-loop");
  await expect(
    page.getByRole("progressbar", { name: "学习进度" }),
  ).toHaveAttribute("aria-valuenow", "0");
  await page.getByRole("button", { name: "标记为已完成" }).click();
  await expect(
    page.getByRole("progressbar", { name: "学习进度" }),
  ).toHaveAttribute("aria-valuenow", "13");
  await page.reload();
  await expect(
    page.getByRole("button", { name: "已完成 · 撤销" }),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "主导航" })
    .getByText("学习路径", { exact: true })
    .click();
  await expect(page.locator(".path-node.done")).toHaveCount(1);
  await page
    .locator(".path-lesson")
    .filter({ hasText: lessons[1].title })
    .click();
  await page.getByRole("button", { name: "已完成 · 撤销" }).click();
  await expect(
    page.getByRole("progressbar", { name: "学习进度" }),
  ).toHaveAttribute("aria-valuenow", "0");
  await page.reload();
  await expect(
    page.getByRole("button", { name: "标记为已完成" }),
  ).toBeVisible();
});

test("本地笔记按课程保存，刷新后恢复且互不覆盖", async ({ page }) => {
  await page.goto("/#lesson/agent-loop");
  await page.getByRole("button", { name: "记笔记", exact: true }).click();
  const note = page.getByRole("textbox", { name: "本课笔记" });
  await note.fill("toolCall 由模型提出，工具由运行时执行。");
  await page.getByRole("button", { name: "完成笔记" }).click();
  await page.reload();
  await page.getByRole("button", { name: "记笔记", exact: true }).click();
  await expect(note).toHaveValue("toolCall 由模型提出，工具由运行时执行。");
  await page.keyboard.press("Escape");
  await page.goto("/#lesson/meet-pi");
  await page.getByRole("button", { name: "记笔记", exact: true }).click();
  await expect(note).toHaveValue("");
  await note.fill("Pi 分成不同职责的包。");
  await page.getByRole("button", { name: "完成笔记" }).click();
  await page.goto("/#lesson/agent-loop");
  await page.getByRole("button", { name: "记笔记", exact: true }).click();
  await expect(note).toHaveValue("toolCall 由模型提出，工具由运行时执行。");
});

test("学习路径可继续课程，术语可筛选并回到所属课程", async ({ page }) => {
  await page.goto("/#path");
  await expect(page.locator(".path-lesson")).toHaveCount(8);
  await page.getByRole("button", { name: "开始学习" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("认识 Pi");
  await page
    .getByRole("navigation", { name: "主导航" })
    .getByText("术语手册", { exact: true })
    .click();
  await page.getByRole("textbox", { name: "筛选术语" }).fill("toolCallId");
  await expect(page.locator(".glossary-entry")).not.toHaveCount(0);
  await expect(page.locator(".glossary-entry").first()).toContainText(
    "toolCallId",
  );
  await page.locator(".glossary-entry").first().getByRole("button").click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Agent 的工作循环",
  );
  await page.goto("/#glossary");
  await page
    .getByRole("textbox", { name: "筛选术语" })
    .fill("not-present-0123456789");
  await expect(
    page.getByRole("heading", { name: "没有匹配的术语" }),
  ).toBeVisible();
});

test("损坏和不可用 localStorage 均不会阻断学习", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("inside-pi:completed", "{broken");
    localStorage.setItem("inside-pi:notes", JSON.stringify(["wrong shape"]));
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Agent 的工作循环",
  );
  await page.getByRole("button", { name: "标记为已完成" }).click();
  await expect(
    page.getByRole("button", { name: "已完成 · 撤销" }),
  ).toBeVisible();
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => {
      throw new Error("Storage disabled");
    };
    Storage.prototype.setItem = () => {
      throw new Error("Storage disabled");
    };
  });
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Agent 的工作循环",
  );
  await page.getByRole("button", { name: "标记为已完成" }).click();
  await expect(
    page.getByRole("button", { name: "已完成 · 撤销" }),
  ).toBeVisible();
});

for (const width of [320, 390, 768]) {
  test(`${width}px 下可展开目录、切课、阅读源码且整页不溢出`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await noPageOverflow(page);
    const menu = page.getByRole("button", { name: "打开课程目录" });
    if (await menu.isVisible()) await menu.click();
    await page
      .getByRole("link", { name: lessons[2].title, exact: true })
      .click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      lessons[2].title,
    );
    if (await menu.isVisible())
      await expect(menu).toHaveAttribute("aria-expanded", "false");
    await page.getByRole("tab", { name: "源码导读" }).click();
    await expect(
      page.getByRole("region", { name: "源码阅读器" }),
    ).toBeVisible();
    await noPageOverflow(page);
    for (const lesson of lessons) {
      await page.goto(`/#lesson/${lesson.id}`);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(
        lesson.title,
      );
      await expect(activeLab(page)).toBeVisible();
      await noPageOverflow(page);
    }
    await page.goto("/#path");
    await noPageOverflow(page);
    await page.goto("/#glossary");
    await noPageOverflow(page);
  });
}

test("移动端目录管理键盘焦点，选课后返回阅读起点", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#lesson/agent-loop");
  const menu = page.getByRole("button", { name: "打开课程目录" });
  const drawer = page.getByRole("dialog", { name: "课程目录", exact: true });
  const current = drawer.getByRole("link", {
    name: lessons[1].title,
    exact: true,
  });

  await expect(menu).toBeVisible();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  expect(
    await page.evaluate(() =>
      Boolean(document.activeElement?.closest(".sidebar")),
    ),
  ).toBe(false);
  await expect(drawer).toBeHidden();
  await expect(
    page.getByRole("link", { name: lessons[1].title, exact: true }),
  ).toHaveCount(0);

  await menu.press("Enter");
  await expect(drawer).toBeVisible();
  await expect(
    drawer.getByRole("button", { name: "关闭课程目录" }),
  ).toBeVisible();
  await expect(current).toBeFocused();
  await page.keyboard.press("Tab");
  expect(
    await drawer.evaluate((dialog) => dialog.contains(document.activeElement)),
  ).toBe(true);
  const drawerSearch = drawer.getByRole("button", { name: /搜索课程与概念/ });
  const search = page.getByRole("dialog", { name: "搜索课程与概念", exact: true });
  const searchInput = search.getByRole("textbox", { name: "搜索课程", exact: true });
  await drawerSearch.press("Enter");
  await expect(searchInput).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(search).toBeHidden();
  await expect(drawer).toBeVisible();
  await expect(drawerSearch).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();
  await expect(menu).toBeFocused();

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBeGreaterThan(0);
  await menu.press("Enter");
  await drawer
    .getByRole("link", { name: lessons[2].title, exact: true })
    .press("Enter");
  await expect(drawer).toBeHidden();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    lessons[2].title,
  );
  await expect(page.locator("#main-content")).toBeFocused();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);

  const searchButton = page.getByRole("banner").getByRole("button", {
    name: "搜索课程与概念",
    exact: true,
  });
  await searchButton.press("Enter");
  await expect(searchInput).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(searchButton).toBeFocused();
});

test("reduced motion 下仍能键盘操作课程，默认实验不自动推进", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(activeLab(page)).toBeVisible();
  const stage = activeLab(page).getByTestId("loop-stage");
  const initial = await stage.textContent();
  await page.waitForTimeout(1800);
  await expect(stage).toHaveText(initial ?? "");
  await page.getByRole("tab", { name: "原理讲解" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "交互实验" })).toBeFocused();
});

test("跳到课程内容只移动焦点，不改变正在学习的课程", async ({ page }) => {
  await page.goto("/#lesson/tool-calling");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "跳到课程内容" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#lesson\/tool-calling$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    lessons[2].title,
  );
  await expect(page.locator("#main-content")).toBeFocused();
});

test("Loop 默认暂停、单步回填结果、运行结束后可重置", async ({ page }) => {
  await page.goto("/#lesson/agent-loop");
  await page.getByRole("tab", { name: "交互实验" }).click();
  const lab = activeLab(page);
  await expect(lab.getByTestId("loop-stage")).toContainText("准备好了");
  await expect(lab.getByTestId("loop-log")).toContainText("推进流程后");
  const externalRequests: string[] = [];
  page.on("request", (request) => {
    if (!request.url().startsWith("http://127.0.0.1:4173"))
      externalRequests.push(request.url());
  });
  for (let step = 0; step < 4; step++)
    await lab.getByRole("button", { name: "下一步", exact: true }).click();
  await expect(lab.getByTestId("loop-stage")).toContainText(
    "把工具结果放回上下文",
  );
  await expect(lab.getByTestId("loop-log")).toContainText(
    'toolCallId: "call_01", isError: false',
  );
  for (let step = 0; step < 2; step++)
    await lab.getByRole("button", { name: "下一步", exact: true }).click();
  await expect(lab.getByTestId("loop-stage")).toContainText("运行结束");
  await expect(lab.getByTestId("loop-log")).toContainText("agent_end");
  await expect(
    lab.getByRole("button", { name: "下一步", exact: true }),
  ).toBeDisabled();
  await lab.getByRole("button", { name: "重置演示" }).click();
  await expect(lab.getByTestId("loop-stage")).toContainText("准备好了");
  await expect(lab.getByTestId("loop-log")).toContainText("推进流程后");
  await expect(
    lab.getByRole("button", { name: "下一步", exact: true }),
  ).toBeEnabled();
  expect(externalRequests, "教学实验不应发送外部模型或工具请求").toEqual([]);
});

test("Loop 工具失败会回填错误结果，并继续生成解释", async ({ page }) => {
  await page.goto("/#lesson/agent-loop");
  await page.getByRole("tab", { name: "交互实验" }).click();
  const lab = activeLab(page);
  await lab.getByRole("combobox", { name: "演示场景" }).selectOption("error");
  for (let step = 0; step < 4; step++)
    await lab.getByRole("button", { name: "下一步", exact: true }).click();
  await expect(lab.getByTestId("loop-stage")).toContainText(
    "错误也是一条工具结果",
  );
  await expect(lab.getByTestId("loop-log")).toContainText("isError: true");
  await expect(lab.getByTestId("loop-log")).toContainText(
    "ENOENT: missing.json",
  );
  await lab.getByRole("button", { name: "下一步", exact: true }).click();
  await expect(lab.getByTestId("loop-log")).toContainText(
    "assistant: 没有找到 missing.json",
  );
  await lab.getByRole("button", { name: "下一步", exact: true }).click();
  await expect(lab.getByTestId("loop-stage")).toContainText("运行结束");
});

test("Loop steering 在工具批次完成后、下次模型请求前注入", async ({ page }) => {
  await page.goto("/#lesson/agent-loop");
  await page.getByRole("tab", { name: "交互实验" }).click();
  const lab = activeLab(page);
  await lab
    .getByRole("combobox", { name: "演示场景" })
    .selectOption("steering");
  for (let step = 0; step < 4; step++)
    await lab.getByRole("button", { name: "下一步", exact: true }).click();
  await expect(lab.getByTestId("loop-log")).not.toContainText(
    "user (steering)",
  );
  await lab.getByRole("button", { name: "下一步", exact: true }).click();
  await expect(lab.getByTestId("loop-stage")).toContainText(
    "当前工具批次已完成",
  );
  const log = lab.getByTestId("loop-log").locator("li");
  await expect(log).toHaveCount(5);
  await expect(log.nth(3)).toContainText("tool_execution_end");
  await expect(log.nth(4)).toContainText("user (steering): 只告诉我启动命令");
  await lab.getByRole("button", { name: "下一步", exact: true }).click();
  await expect(log.nth(5)).toContainText("assistant: npm run dev");
  await lab.getByRole("button", { name: "下一步", exact: true }).click();
  await expect(lab.getByTestId("loop-stage")).toContainText("运行结束");
  await lab.getByRole("combobox", { name: "演示场景" }).selectOption("success");
  await expect(lab.getByTestId("loop-stage")).toContainText("准备好了");
  await expect(lab.getByTestId("loop-log")).toContainText("推进流程后");
});

test("Loop 播放、暂停和重置会控制实际推进", async ({ page }) => {
  await page.goto("/#lesson/agent-loop");
  await page.getByRole("tab", { name: "交互实验" }).click();
  const lab = activeLab(page);
  await lab.getByRole("combobox", { name: "播放速度" }).selectOption("2");
  await lab.getByRole("button", { name: "播放动画" }).click();
  await expect(lab.getByTestId("loop-stage")).toContainText(
    "一条消息，开启一次运行",
  );
  await lab.getByRole("button", { name: "暂停动画" }).click();
  const paused = await lab.getByTestId("loop-stage").textContent();
  await page.waitForTimeout(1200);
  await expect(lab.getByTestId("loop-stage")).toHaveText(paused ?? "");
  await lab.getByRole("button", { name: "播放动画" }).click();
  await lab.getByRole("button", { name: "重置演示" }).click();
  await page.waitForTimeout(1200);
  await expect(lab.getByTestId("loop-stage")).toContainText("准备好了");
  await expect(lab.getByRole("button", { name: "播放动画" })).toBeVisible();
});

test("Loop 可单步后退，切换标签保留当前进度且暂停播放", async ({ page }) => {
  await page.clock.install();
  await page.goto("/#lesson/agent-loop");
  const principleTab = page.getByRole("tab", { name: "原理讲解" });
  const labTab = page.getByRole("tab", { name: "交互实验" });
  const lab = activeLab(page);
  const stage = lab.getByTestId("loop-stage");
  const next = lab.getByRole("button", { name: "下一步", exact: true });
  const previous = lab.getByRole("button", { name: "上一步", exact: true });
  const scenario = lab.getByRole("combobox", { name: "演示场景" });

  await next.click();
  const previewStage = (await stage.textContent()) ?? "";
  await labTab.click();
  await scenario.selectOption("error");
  await expect(previous).toBeDisabled();
  await next.click();
  const firstStep = (await stage.textContent()) ?? "";
  await next.click();
  await expect(stage).not.toHaveText(firstStep);
  await previous.click();
  await expect(stage).toHaveText(firstStep);

  await lab.getByRole("button", { name: "播放动画" }).click();
  await expect(lab.getByRole("button", { name: "暂停动画" })).toBeVisible();
  await labTab.press("ArrowRight");
  await expect(page.getByRole("region", { name: "源码阅读器" })).toBeVisible();
  await page.clock.fastForward(5000);
  await labTab.click();
  await expect(scenario).toHaveValue("error");
  await expect(stage).toHaveText(firstStep);
  await expect(lab.getByRole("button", { name: "播放动画" })).toBeVisible();
  await principleTab.click();
  await expect(stage).toHaveText(previewStage);
  await expect(scenario).toHaveValue("success");
});

test("架构、消息与事件实验显示所选元素对应的解释", async ({ page }) => {
  await page.goto("/#lesson/meet-pi");
  const lab = activeLab(page);
  await lab.getByRole("button", { name: /pi-ai/ }).click();
  await expect(lab.locator(".clab-detail")).toContainText(
    "不负责运行编程工具或保存会话",
  );
  await page.goto("/#lesson/messages-context");
  await lab.getByRole("button", { name: /^toolResult/ }).click();
  await expect(lab.locator(".clab-detail")).toContainText("content 发给模型");
  await expect(lab.locator(".clab-detail")).toContainText(
    "details、structuredContent",
  );
  await page.goto("/#lesson/streaming-events");
  await lab.getByRole("button", { name: /工具完成/ }).click();
  await expect(lab.locator(".clab-detail")).toContainText("tool_execution_end");
  await expect(lab.locator(".clab-ui-preview")).toContainText(
    "scripts.dev = vite",
  );
});

test("工具实验的成功与错误由选定路径决定", async ({ page }) => {
  await page.goto("/#lesson/tool-calling");
  const lab = activeLab(page);
  await lab.getByRole("button", { name: "模拟执行 read" }).click();
  await expect(lab.locator(".clab-tool-result")).toContainText("读取成功");
  await expect(lab.locator(".clab-tool-result pre")).toContainText(
    '"isError": false',
  );
  await lab
    .getByRole("combobox", { name: "工具文件路径" })
    .selectOption("missing.json");
  await expect(lab.locator(".clab-tool-result")).toContainText(
    "选择路径，再执行一次模拟",
  );
  await lab.getByRole("button", { name: "模拟执行 read" }).click();
  await expect(lab.locator(".clab-tool-result")).toContainText(
    "读取失败，回填错误结果",
  );
  await expect(lab.locator(".clab-tool-result pre")).toContainText(
    '"isError": true',
  );
});

test("会话分支和压缩只改变选定上下文，保留原始历史说明", async ({ page }) => {
  await page.goto("/#lesson/sessions-compaction");
  const lab = activeLab(page);
  await lab.getByRole("button", { name: /分支 B/ }).click();
  const output = lab.locator(".clab-context-output");
  await expect(output).toContainText("用原生 JS 实现");
  await expect(output).not.toContainText("用 React 实现");
  await lab.getByRole("button", { name: "模拟上下文压缩" }).click();
  await expect(output).toContainText("较早历史的摘要");
  await expect(output.getByRole("status")).toContainText(
    "原始 JSONL 历史仍保留",
  );
  await lab.getByRole("button", { name: "恢复未压缩视图" }).click();
  await expect(output).toContainText("当前分支的共享历史");
  await expect(output.getByRole("status")).not.toBeVisible();
});

test("运行控制与扩展拦截会产生各自结果", async ({ page }) => {
  await page.goto("/#lesson/runtime-control");
  const lab = activeLab(page);
  await lab.getByRole("button", { name: "follow-up", exact: true }).click();
  await lab.getByRole("button", { name: "模拟发送" }).click();
  await expect(lab.getByRole("status")).toContainText(
    "当前任务收尾 → 消费 follow-up",
  );
  await lab.getByRole("button", { name: "abort", exact: true }).click();
  await expect(lab.getByRole("status")).not.toBeVisible();
  await lab.getByRole("button", { name: "模拟中止" }).click();
  await expect(lab.getByRole("status")).toContainText("AbortSignal");
  await page.goto("/#lesson/extensions");
  await lab.getByRole("button", { name: "测试工具调用" }).click();
  await expect(lab.getByRole("status")).toContainText("工具没有执行");
  await lab.getByRole("checkbox", { name: "启用扩展拦截" }).uncheck();
  await expect(lab.getByRole("status")).not.toBeVisible();
  await lab.getByRole("button", { name: "测试工具调用" }).click();
  await expect(lab.getByRole("status")).toContainText("进入工具执行阶段");
});

test("默认课的播放按钮在桌面和移动首屏可见，并生成截图", async ({ page }) => {
  await mkdir("test-results/screenshots", { recursive: true });
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto("/");
  const play = activeLab(page).getByRole("button", { name: "播放动画" });
  await expect(play).toBeInViewport({ ratio: 1 });
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  await page.screenshot({
    path: "test-results/screenshots/desktop-lesson.png",
    fullPage: true,
  });
  await page.getByRole("tab", { name: "源码导读" }).click();
  await page.screenshot({
    path: "test-results/screenshots/desktop-source.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await noPageOverflow(page);
  await expect(play).toBeInViewport({ ratio: 1 });
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  await page.screenshot({
    path: "test-results/screenshots/mobile-lesson.png",
    fullPage: true,
  });
});
