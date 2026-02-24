const HOLD_MS = 3000;
const SPEED_SCALE = 0.2;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const byId = (id) => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element: ${id}`);
  return el;
};

const viewQuestion = byId("view-question");
const viewSuccess = byId("view-success");
const stage = byId("stage");
const card = stage.querySelector(".card");
if (!card) throw new Error("Missing element: .card");
const yesBtn = byId("yesBtn");
const noBtn = byId("noBtn");
const restartBtn = byId("restartBtn");
const toast = byId("toast");
const confettiRoot = byId("confetti");

const state = {
  stageRect: null,
  noSize: { w: 120, h: 48 },
  obstacles: {
    yes: { x: 0, y: 0, radius: 190 },
    card: { x: 0, y: 0, radius: 320 },
  },
  pos: { x: 0, y: 0 },
  vel: { x: 220 * SPEED_SCALE, y: 160 * SPEED_SCALE },
  lastTs: 0,
  pointer: { x: 0, y: 0, active: false, type: null },
  holding: { active: false, pointerId: null, startedAt: 0 },
  toastTimer: null,
};

function setScreen(screen) {
  const isSuccess = screen === "success";

  cancelHold();

  viewQuestion.setAttribute("aria-hidden", String(isSuccess));
  viewSuccess.setAttribute("aria-hidden", String(!isSuccess));

  if (isSuccess) {
    spawnConfetti();
  } else {
    confettiRoot.replaceChildren();
  }
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  if (state.toastTimer) window.clearTimeout(state.toastTimer);
  state.toastTimer = window.setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 1600);
}

function updateRects() {
  state.stageRect = stage.getBoundingClientRect();

  const noRect = noBtn.getBoundingClientRect();
  state.noSize = {
    w: Math.max(90, Math.round(noRect.width)),
    h: Math.max(40, Math.round(noRect.height)),
  };

  const stageRect = state.stageRect;

  const yesRect = yesBtn.getBoundingClientRect();
  state.obstacles.yes = {
    x: yesRect.left - stageRect.left + yesRect.width / 2,
    y: yesRect.top - stageRect.top + yesRect.height / 2,
    radius: Math.max(170, Math.hypot(yesRect.width, yesRect.height) / 2 + 110),
  };

  const cardRect = card.getBoundingClientRect();
  state.obstacles.card = {
    x: cardRect.left - stageRect.left + cardRect.width / 2,
    y: cardRect.top - stageRect.top + cardRect.height / 2,
    radius: Math.max(240, Math.hypot(cardRect.width, cardRect.height) / 2 + 90),
  };
}

function randomizeStartPosition() {
  const rect = state.stageRect ?? stage.getBoundingClientRect();
  const pad = 14;
  const maxX = Math.max(pad, rect.width - state.noSize.w - pad);
  const maxY = Math.max(pad, rect.height - state.noSize.h - pad);

  state.pos.x = clamp(rect.width * 0.62 + (Math.random() - 0.5) * 120, pad, maxX);
  state.pos.y = clamp(rect.height * 0.52 + (Math.random() - 0.5) * 140, pad, maxY);
}

function setNoHoldProgress(progress01) {
  noBtn.style.setProperty("--hold", String(clamp(progress01, 0, 1)));
}

function cancelHold() {
  state.holding.active = false;
  state.holding.pointerId = null;
  state.holding.startedAt = 0;
  setNoHoldProgress(0);
}

function completeHold() {
  cancelHold();
  showToast("아니오는 선택지에 없어요. 예만 가능해요.");
  warpNoButton();
}

function warpNoButton() {
  updateRects();
  const rect = state.stageRect;
  if (!rect) return;

  const pad = 14;
  const maxX = Math.max(pad, rect.width - state.noSize.w - pad);
  const maxY = Math.max(pad, rect.height - state.noSize.h - pad);

  const corners = [
    { x: pad, y: pad },
    { x: maxX, y: pad },
    { x: pad, y: maxY },
    { x: maxX, y: maxY },
  ];

  const pick = corners[Math.floor(Math.random() * corners.length)];
  state.pos.x = pick.x;
  state.pos.y = pick.y;

  const angle = Math.random() * Math.PI * 2;
  const speed = 420 * SPEED_SCALE;
  state.vel.x = Math.cos(angle) * speed;
  state.vel.y = Math.sin(angle) * speed;
}

function pointerToStage(e) {
  const rect = state.stageRect ?? stage.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

function isPointerInsideNo() {
  if (!state.holding.active) return false;

  const { w, h } = state.noSize;
  return (
    state.pointer.x >= state.pos.x &&
    state.pointer.x <= state.pos.x + w &&
    state.pointer.y >= state.pos.y &&
    state.pointer.y <= state.pos.y + h
  );
}

function applyNoTransform() {
  noBtn.style.transform = `translate3d(${Math.round(state.pos.x)}px, ${Math.round(state.pos.y)}px, 0)`;
}

function keepNoInsideBounds(dt) {
  const rect = state.stageRect;
  if (!rect || rect.width <= 0 || rect.height <= 0) return;

  const pad = 10;
  const maxX = rect.width - state.noSize.w - pad;
  const maxY = rect.height - state.noSize.h - pad;

  if (state.pos.x < pad) {
    state.pos.x = pad;
    state.vel.x = Math.abs(state.vel.x) * 0.98;
  } else if (state.pos.x > maxX) {
    state.pos.x = maxX;
    state.vel.x = -Math.abs(state.vel.x) * 0.98;
  }

  if (state.pos.y < pad) {
    state.pos.y = pad;
    state.vel.y = Math.abs(state.vel.y) * 0.98;
  } else if (state.pos.y > maxY) {
    state.pos.y = maxY;
    state.vel.y = -Math.abs(state.vel.y) * 0.98;
  }

  state.vel.x *= 1 - Math.min(0.01, dt * 0.02);
  state.vel.y *= 1 - Math.min(0.01, dt * 0.02);
}

function repelFromPoint(point, radius, strength, dt) {
  const cx = state.pos.x + state.noSize.w / 2;
  const cy = state.pos.y + state.noSize.h / 2;
  const dx = cx - point.x;
  const dy = cy - point.y;
  const dist = Math.hypot(dx, dy);
  if (!Number.isFinite(dist) || dist <= 0.001) return;
  if (dist >= radius) return;

  const awayX = dx / dist;
  const awayY = dy / dist;
  const factor = (radius - dist) / radius;

  state.vel.x += awayX * strength * factor * dt;
  state.vel.y += awayY * strength * factor * dt;
}

function avoidYesButton(dt) {
  repelFromPoint(state.obstacles.yes, state.obstacles.yes.radius, 1400 * SPEED_SCALE, dt);
  repelFromPoint(state.obstacles.card, state.obstacles.card.radius, 1200 * SPEED_SCALE, dt);
}

function updateHold(ts) {
  if (!state.holding.active) return;

  if (!isPointerInsideNo()) {
    cancelHold();
    return;
  }

  const elapsed = ts - state.holding.startedAt;
  const progress = elapsed / HOLD_MS;
  setNoHoldProgress(progress);

  if (progress >= 1) completeHold();
}

function tick(ts) {
  if (!state.lastTs) state.lastTs = ts;
  const dt = clamp((ts - state.lastTs) / 1000, 0, 0.05);
  state.lastTs = ts;

  const rect = state.stageRect;
  const questionVisible = viewQuestion.getAttribute("aria-hidden") !== "true";

  const t = ts / 1000;
  state.vel.x += Math.cos(t * 0.9) * (12 * SPEED_SCALE) * dt;
  state.vel.y += Math.sin(t * 1.1) * (12 * SPEED_SCALE) * dt;

  if (state.pointer.active) {
    repelFromPoint(state.pointer, 220, 2400 * SPEED_SCALE, dt);
    const maxSpeed = 980 * SPEED_SCALE;
    const speed = Math.hypot(state.vel.x, state.vel.y);
    if (speed > maxSpeed) {
      state.vel.x = (state.vel.x / speed) * maxSpeed;
      state.vel.y = (state.vel.y / speed) * maxSpeed;
    }
  } else {
    const speed = Math.hypot(state.vel.x, state.vel.y);
    const min = 160 * SPEED_SCALE;
    const max = 320 * SPEED_SCALE;
    if (speed < min && speed > 0.01) {
      state.vel.x = (state.vel.x / speed) * min;
      state.vel.y = (state.vel.y / speed) * min;
    } else if (speed > max) {
      state.vel.x = (state.vel.x / speed) * max;
      state.vel.y = (state.vel.y / speed) * max;
    }
  }

  if (questionVisible) avoidYesButton(dt);

  if (questionVisible && rect && rect.width > 0 && rect.height > 0) {
    state.pos.x += state.vel.x * dt;
    state.pos.y += state.vel.y * dt;
    keepNoInsideBounds(dt);
  }

  applyNoTransform();
  if (questionVisible) updateHold(ts);

  requestAnimationFrame(tick);
}

function initNavigation() {
  const applyFromLocation = () => {
    const hash = (window.location.hash || "").replace("#", "");
    setScreen(hash === "success" ? "success" : "question");
  };

  window.addEventListener("popstate", applyFromLocation);
  applyFromLocation();

  yesBtn.addEventListener("click", () => {
    history.pushState({}, "", "#success");
    setScreen("success");
  });

  restartBtn.addEventListener("click", () => {
    history.pushState({}, "", "#");
    setScreen("question");
    warpNoButton();
    showToast("다시 한번, “예” 부탁해요.");
  });
}

function initNoButtonEvents() {
  noBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
  });

  noBtn.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    updateRects();

    state.pointer.active = true;
    state.pointer.type = e.pointerType ?? null;
    const p = pointerToStage(e);
    state.pointer.x = p.x;
    state.pointer.y = p.y;

    state.holding.active = true;
    state.holding.pointerId = e.pointerId;
    state.holding.startedAt = performance.now();
    setNoHoldProgress(0);

    try {
      noBtn.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  });

  const endHolding = (e) => {
    cancelHold();
    if ((e?.pointerType ?? state.pointer.type) !== "mouse") state.pointer.active = false;
  };
  noBtn.addEventListener("pointerup", endHolding);
  noBtn.addEventListener("pointercancel", endHolding);

  window.addEventListener(
    "pointermove",
    (e) => {
      state.pointer.active = true;
      state.pointer.type = e.pointerType ?? state.pointer.type;
      const p = pointerToStage(e);
      state.pointer.x = p.x;
      state.pointer.y = p.y;
    },
    { passive: true },
  );

  window.addEventListener(
    "pointerup",
    (e) => {
      if ((e.pointerType ?? state.pointer.type) !== "mouse") state.pointer.active = false;
      cancelHold();
    },
    { passive: true },
  );
  window.addEventListener(
    "pointercancel",
    (e) => {
      if ((e.pointerType ?? state.pointer.type) !== "mouse") state.pointer.active = false;
      cancelHold();
    },
    { passive: true },
  );

  stage.addEventListener(
    "pointerleave",
    () => {
      state.pointer.active = false;
      cancelHold();
    },
    { passive: true },
  );

  window.addEventListener("blur", () => {
    state.pointer.active = false;
    state.pointer.type = null;
    cancelHold();
  });

  window.addEventListener("resize", () => {
    updateRects();
    state.pos.x = clamp(state.pos.x, 10, (state.stageRect?.width ?? 0) - state.noSize.w - 10);
    state.pos.y = clamp(state.pos.y, 10, (state.stageRect?.height ?? 0) - state.noSize.h - 10);
    applyNoTransform();
  });
}

function spawnConfetti() {
  confettiRoot.replaceChildren();

  const colors = ["#ff6aa2", "#a78bfa", "#38bdf8", "#fbbf24", "#34d399"];
  const count = 70;

  const rootRect = viewSuccess.getBoundingClientRect();
  const w = rootRect.width;
  const h = rootRect.height;

  for (let i = 0; i < count; i += 1) {
    const piece = document.createElement("i");
    piece.className = "confetti__piece";
    piece.style.left = `${Math.random() * w}px`;
    piece.style.top = `${-30 - Math.random() * 140}px`;
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.setProperty("--dx", `${(Math.random() - 0.5) * 240}px`);
    piece.style.setProperty("--dy", `${h * (0.68 + Math.random() * 0.45)}px`);
    piece.style.setProperty("--rot", `${(Math.random() - 0.5) * 520}deg`);
    piece.style.animationDelay = `${Math.random() * 240}ms`;
    piece.style.animationDuration = `${1100 + Math.random() * 700}ms`;
    confettiRoot.append(piece);
  }
}

function init() {
  initNavigation();
  initNoButtonEvents();

  updateRects();
  randomizeStartPosition();
  applyNoTransform();

  requestAnimationFrame(tick);
}

init();
