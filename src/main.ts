import "./style.css";
import { generateFlower, palettes, renderFlower, type Palette } from "./flower";
import { readState, stateQuery } from "./state";
import { BloomAnimation } from "./animation";

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <header><a class="wordmark" href="./" aria-label="Bloom 처음으로">bloom<span>✳</span></a><span class="edition">A LITTLE STUDY OF NATURE</span></header>
  <main><figure><div class="canvas-wrap"><canvas aria-label="겹치는 반투명 꽃잎으로 이루어진 생성형 꽃" role="img"></canvas></div><figcaption><span class="specimen">BOTANICAL STUDY <span id="number"></span></span><span class="caption">잠시, 피어나는 중.</span></figcaption></figure>
  <section class="controls" aria-label="작품 조작"><fieldset><legend>꽃의 색</legend>${Object.entries(
    palettes,
  )
    .map(
      ([id, p]) =>
        `<label class="swatch ${id}" title="${p.name}"><input type="radio" name="palette" value="${id}" aria-label="${p.name}"><span></span></label>`,
    )
    .join(
      "",
    )}</fieldset><button id="new" class="primary"><span aria-hidden="true">✳</span> 새 꽃 피우기</button><div class="secondary"><button id="save" aria-label="완성된 꽃 PNG 저장"><span aria-hidden="true">↓</span> PNG 저장</button><button id="share"><span aria-hidden="true">↗</span> 공유</button></div></section>
  <div id="link-box" hidden><label for="share-url">링크를 선택해 복사하세요</label><input id="share-url" readonly><button id="close-link">닫기</button></div><p id="status" role="status" aria-live="polite"></p></main>
  <footer><span>어떤 꽃도, 같은 순간은 없으니까.</span><span>GENERATIVE BOTANICALS · № 001</span></footer>`;
const canvas = document.querySelector("canvas")!;
const ctx = canvas.getContext("2d")!;
let state = readState(location.search);
if (!location.search)
  state.seed = crypto.getRandomValues(new Uint32Array(1))[0];
let model = generateFlower(state.seed),
  progress = 0;
const motion = matchMedia("(prefers-reduced-motion: reduce)");
const status = document.querySelector<HTMLElement>("#status")!;
const linkBox = document.querySelector<HTMLDivElement>("#link-box")!;
const linkInput = document.querySelector<HTMLInputElement>("#share-url")!;
const caption = document.querySelector<HTMLElement>(".caption")!;
function draw(p = progress) {
  progress = p;
  renderFlower(ctx, model, state.palette, p);
  caption.textContent =
    p === 1 ? "당신에게 피어난, 하나의 꽃." : "잠시, 피어나는 중.";
}
const animation = new BloomAnimation(draw);
function sync() {
  history.replaceState(null, "", `${location.pathname}?${stateQuery(state)}`);
  document.querySelector("#number")!.textContent =
    ` / ${state.seed.toString(16).toUpperCase().padStart(8, "0")}`;
  document.querySelector<HTMLInputElement>(
    `input[value="${state.palette}"]`,
  )!.checked = true;
  linkBox.hidden = true;
  status.textContent = "";
}
const observer = new ResizeObserver(() => {
  const size = Math.max(
    1,
    Math.round(
      canvas.getBoundingClientRect().width * Math.min(devicePixelRatio, 2),
    ),
  );
  if (canvas.width !== size || canvas.height !== size) {
    canvas.width = canvas.height = size;
    draw();
  }
});
observer.observe(canvas);
document.querySelector("#new")!.addEventListener("click", () => {
  let seed = crypto.getRandomValues(new Uint32Array(1))[0];
  if (seed === state.seed) seed = (seed + 1) >>> 0;
  state = { ...state, seed };
  model = generateFlower(seed);
  sync();
  animation.start(motion.matches);
});
document
  .querySelectorAll<HTMLInputElement>('input[name="palette"]')
  .forEach((input) =>
    input.addEventListener("change", () => {
      state = { ...state, palette: input.value as Palette };
      sync();
      draw();
    }),
  );
motion.addEventListener("change", () => {
  if (motion.matches) {
    animation.stop();
    draw(1);
  }
});
window.addEventListener("popstate", () => {
  state = readState(location.search);
  model = generateFlower(state.seed);
  sync();
  animation.start(motion.matches);
});
document.querySelector("#save")!.addEventListener("click", () => {
  const output = document.createElement("canvas");
  output.width = output.height = 2048;
  const snapshot = { ...state };
  renderFlower(output.getContext("2d")!, model, snapshot.palette, 1);
  output.toBlob((blob) => {
    if (!blob) {
      status.textContent = "이미지를 저장하지 못했습니다. 다시 시도해 주세요.";
      return;
    }
    const url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = `bloom-${snapshot.seed}-${snapshot.palette}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    status.textContent = "완성된 꽃을 PNG로 저장했습니다.";
  }, "image/png");
});
document.querySelector("#share")!.addEventListener("click", async () => {
  const url = location.href;
  if (navigator.share) {
    try {
      await navigator.share({ title: "Bloom — 당신에게 피어난 꽃", url });
      return;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    status.textContent = "꽃의 링크를 복사했습니다.";
  } catch {
    linkInput.value = url;
    linkBox.hidden = false;
    linkInput.focus();
    linkInput.select();
  }
});
document.querySelector("#close-link")!.addEventListener("click", () => {
  linkBox.hidden = true;
  document.querySelector<HTMLButtonElement>("#share")!.focus();
});
sync();
animation.start(motion.matches);
