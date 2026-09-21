import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("공유 URL 재현, 팔레트, 리사이즈, 모바일", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("?v=1&seed=42&palette=iris");
  await expect(page.locator(".caption")).toHaveText(
    "당신에게 피어난, 하나의 꽃.",
  );
  const data = () =>
    page
      .locator("canvas")
      .evaluate((c) => (c as HTMLCanvasElement).toDataURL());
  const original = await data();
  await page.reload();
  expect(await data()).toBe(original);
  await page.getByRole("radio", { name: "로즈", exact: true }).check();
  await expect(page).toHaveURL(/seed=42&palette=rose/);
  expect(await data()).not.toBe(original);
  await page.getByRole("radio", { name: "아이리스" }).check();
  expect(await data()).toBe(original);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("button", { name: "새 꽃 피우기" }),
  ).toBeInViewport();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.setViewportSize({ width: 320, height: 568 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.setViewportSize({ width: 1280, height: 720 });
  await expect.poll(data).toBe(original);
  expect(errors).toEqual([]);
});
test("오류 URL, 연속 생성, 개화 완료", async ({ page }) => {
  await page.goto("?v=1&seed=-3&palette=invalid");
  await expect(page).toHaveURL(/seed=104729&palette=rose/);
  await page.locator("#new").evaluate((button) => {
    for (let i = 0; i < 30; i++) (button as HTMLButtonElement).click();
  });
  await expect(page.locator(".caption")).toHaveText(
    "당신에게 피어난, 하나의 꽃.",
    { timeout: 6000 },
  );
  const final = await page
    .locator("canvas")
    .evaluate((c) => (c as HTMLCanvasElement).toDataURL());
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  expect(
    await page
      .locator("canvas")
      .evaluate((c) => (c as HTMLCanvasElement).toDataURL()),
  ).toBe(final);
});
test("개화 중 PNG 저장은 완성 화면과 픽셀 일치", async ({ page }) => {
  await page.setViewportSize({ width: 2300, height: 2500 });
  await page.goto("?v=1&seed=42&palette=rose");
  await page.addStyleTag({
    content:
      "main{width:2048px!important}.canvas-wrap{width:2048px!important;max-width:none!important}canvas{width:2048px!important}",
  });
  await expect
    .poll(() =>
      page.locator("canvas").evaluate((c) => (c as HTMLCanvasElement).width),
    )
    .toBe(2048);
  const pending = page.waitForEvent("download");
  await page.locator("#save").click();
  const download = await pending;
  expect(download.suggestedFilename()).toBe("bloom-42-rose.png");
  const bytes = await readFile((await download.path())!);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".caption")).toHaveText(
    "당신에게 피어난, 하나의 꽃.",
  );
  const same = await page.evaluate(async (base64) => {
    const img = new Image();
    img.src = `data:image/png;base64,${base64}`;
    await img.decode();
    const saved = document.createElement("canvas");
    saved.width = saved.height = 2048;
    const ctx = saved.getContext("2d")!;
    ctx.drawImage(img, 0, 0);
    const a = ctx.getImageData(0, 0, 2048, 2048).data;
    const b = document
      .querySelector("canvas")!
      .getContext("2d")!
      .getImageData(0, 0, 2048, 2048).data;
    return (
      img.width === 2048 && img.height === 2048 && a.every((v, i) => v === b[i])
    );
  }, bytes.toString("base64"));
  expect(same).toBe(true);
});
test("공유 API 실패 시 수동 링크 복사", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "share", {
      value: async () => {
        throw new Error("unavailable");
      },
    });
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: async () => {
          throw new Error("denied");
        },
      },
    });
  });
  await page.goto("?v=1&seed=42&palette=meadow");
  await page.locator("#share").click();
  await expect(page.locator("#share-url")).toBeVisible();
  await expect(page.locator("#share-url")).toHaveValue(page.url());
  await expect(page.locator("#share-url")).toBeFocused();
  await page.locator("#close-link").click();
  await expect(page.locator("#share")).toBeFocused();
});
test("공유 취소는 클립보드를 호출하지 않는다", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "share", {
      value: async () => {
        throw new DOMException("cancel", "AbortError");
      },
    });
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: async () => {
          document.title = "unexpected copy";
        },
      },
    });
  });
  await page.goto("?seed=0");
  await page.locator("#share").click();
  await expect(page).toHaveTitle("Bloom — 작은 꽃의 기록");
  await expect(page.locator("#link-box")).toBeHidden();
});
test("공유 API가 없으면 클립보드에 현재 URL을 복사한다", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "share", { value: undefined });
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: async (text: string) => {
          document.documentElement.dataset.copied = text;
        },
      },
    });
  });
  await page.goto("?v=1&seed=42&palette=iris");
  await page.locator("#share").click();
  await expect(page.locator("#status")).toHaveText("꽃의 링크를 복사했습니다.");
  expect(await page.locator("html").getAttribute("data-copied")).toBe(
    page.url(),
  );
});
