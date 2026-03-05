const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// UI
const btnMode1 = document.getElementById("btnMode1");
const btnMode2 = document.getElementById("btnMode2");

const elDiff = document.getElementById("difficulty");
const btnStart = document.getElementById("btnStart");
const btnPause = document.getElementById("btnPause");
const btnReset = document.getElementById("btnReset");

const elHintText = document.getElementById("hintText");
const elWasteBadge = document.getElementById("wasteBadge");

const elName = document.getElementById("playerName");
const btnSave = document.getElementById("btnSave");
const elSaveMsg = document.getElementById("saveMsg");
const elBoard = document.getElementById("board");

const keys = new Set();

window.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  keys.add(k);

  // evita scroll/setas/space no canvas
  if (k === " " || k === "arrowup" || k === "arrowdown") e.preventDefault();

  if (k === "enter") startGame();
  if (k === "p") togglePause();
  if (k === "r") resetGame();
});
window.addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));

btnStart.addEventListener("click", startGame);
btnPause.addEventListener("click", togglePause);
btnReset.addEventListener("click", resetGame);
btnSave.addEventListener("click", saveScore);

elDiff.addEventListener("change", () => resetGame());

// --- Tema: resíduos e dicas (química/reciclagem) ---
const WASTES = [
  {
    id: "plastico",
    label: "PLÁSTICO",
    color: "#60a5fa",
    tips: [
      "PET é um polímero; reciclagem mecânica reaproveita o material sem voltar a monômeros.",
      "Pirólise pode quebrar polímeros em moléculas menores (reciclagem química), exigindo controle de emissões.",
      "Plásticos mistos dificultam reciclagem: diferentes temperaturas de fusão e aditivos atrapalham."
    ]
  },
  {
    id: "vidro",
    label: "VIDRO",
    color: "#34d399",
    tips: [
      "Vidro é rede de silicatos amorfa. Pode ser reciclado várias vezes sem perder qualidade.",
      "Cerâmica/pedra no vidro reciclado pode causar defeitos por diferenças de fusão.",
      "Caco (cullet) reduz energia: derrete mais fácil que matéria-prima virgem."
    ]
  },
  {
    id: "metal",
    label: "METAL",
    color: "#fbbf24",
    tips: [
      "Alumínio: reciclar economiza muita energia comparado à produção a partir da bauxita (eletrólise).",
      "Separação magnética ajuda no aço/ferro. Oxidação é uma reação redox.",
      "Ligas diferentes exigem triagem: composição altera propriedades e qualidade final."
    ]
  },
  {
    id: "papel",
    label: "PAPEL",
    color: "#e5e7eb",
    tips: [
      "Papel é celulose. Na reciclagem, as fibras encurtam — existe limite de ciclos.",
      "Desentintamento usa química/surfactantes para remover pigmentos.",
      "Papel com gordura/óleo contamina a polpa e reduz reciclagem."
    ]
  },
  {
    id: "organico",
    label: "ORGÂNICO",
    color: "#a78bfa",
    tips: [
      "Compostagem: decomposição controlada transforma resíduos em nutrientes para o solo.",
      "Digestão anaeróbia pode gerar biogás (CH₄/CO₂) por ação microbiana.",
      "Misturar orgânico com recicláveis aumenta contaminação e reduz eficiência."
    ]
  }
];

function pickWaste() {
  return WASTES[Math.floor(Math.random() * WASTES.length)];
}
function pickTip(waste) {
  const arr = waste.tips;
  return arr[Math.floor(Math.random() * arr.length)];
}
function abbrevWaste(id) {
  if (id === "plastico") return "PET";
  if (id === "vidro") return "SiO₂";
  if (id === "metal") return "Al/Fe";
  if (id === "papel") return "CEL";
  if (id === "organico") return "C-H-O";
  return "RES";
}

// --- Estado do jogo ---
const FIELD = { w: canvas.width, h: canvas.height, margin: 24 };
const scoreToWin = 7;

const p1 = {
  x: 52, y: FIELD.h / 2,
  w: 18, h: 120,
  speed: 420
};

const p2 = {
  x: FIELD.w - 52, y: FIELD.h / 2,
  w: 18, h: 120,
  speed: 420
};

const ball = {
  x: FIELD.w / 2, y: FIELD.h / 2,
  r: 12,
  vx: 0, vy: 0,
  baseSpeed: 420,
  speedUp: 1.045,
  waste: pickWaste()
};

let score = { left: 0, right: 0 };
let running = false;
let paused = false;
let last = performance.now();

let gameMode = "1p"; // "1p" (vs IA) ou "2p"

// --- Modo ---
function setMode(m) {
  gameMode = m;
  btnMode1.classList.toggle("active", m === "1p");
  btnMode2.classList.toggle("active", m === "2p");

  setHint(m === "1p"
    ? "Modo: 1 jogador vs IA. Use W/S para mover. Enter para iniciar."
    : "Modo: 2 jogadores. P1 W/S vs P2 ↑/↓. Enter para iniciar.");

  resetGame(false); // não reseta dica do modo
}

btnMode1.addEventListener("click", () => setMode("1p"));
btnMode2.addEventListener("click", () => setMode("2p"));

// --- util ---
function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}
function setHint(text) {
  elHintText.textContent = text;
}

function resetBall(direction) {
  ball.x = FIELD.w / 2;
  ball.y = FIELD.h / 2;

  ball.waste = pickWaste();
  elWasteBadge.textContent = `RESÍDUO: ${ball.waste.label}`;

  const angle = (Math.random() * 0.7 - 0.35); // -0.35..0.35 rad (~+-20°)
  const speed = ball.baseSpeed;
  const dir = direction ?? (Math.random() < 0.5 ? -1 : 1);

  ball.vx = Math.cos(angle) * speed * dir;
  ball.vy = Math.sin(angle) * speed;
}

function rectForPaddle(p) {
  return { x: p.x - p.w / 2, y: p.y - p.h / 2, w: p.w, h: p.h };
}

function circleRectCollision(cx, cy, cr, rx, ry, rw, rh) {
  const closestX = clamp(cx, rx, rx + rw);
  const closestY = clamp(cy, ry, ry + rh);
  const dx = cx - closestX;
  const dy = cy - closestY;
  return (dx * dx + dy * dy) <= cr * cr;
}

// --- controles do jogo ---
function startGame() {
  if (!running) {
    running = true;
    paused = false;
    score.left = 0;
    score.right = 0;
    p1.y = FIELD.h / 2;
    p2.y = FIELD.h / 2;
    resetBall((Math.random() < 0.5) ? -1 : 1);
    setHint("Começou! A cada ponto aparece uma dica. Boa triagem!");
  } else {
    paused = false;
  }
}

function togglePause() {
  if (!running) return;
  paused = !paused;
}

function resetGame(resetHint = true) {
  running = false;
  paused = false;
  score.left = 0;
  score.right = 0;
  p1.y = FIELD.h / 2;
  p2.y = FIELD.h / 2;

  ball.waste = pickWaste();
  elWasteBadge.textContent = "RESÍDUO";

  if (resetHint) {
    setHint("Escolha o modo acima e aperte Enter para começar.");
  }
  draw();
}

// --- IA ---
function aiUpdate(dt) {
  const diff = elDiff.value;
  let react = 0.9, maxSpeed = 360;
  if (diff === "easy") { react = 0.75; maxSpeed = 300; }
  if (diff === "normal") { react = 0.9; maxSpeed = 380; }
  if (diff === "hard") { react = 1.05; maxSpeed = 460; }

  const target = ball.y;
  const dy = target - p2.y;
  const step = clamp(dy * react, -maxSpeed * dt, maxSpeed * dt);

  p2.y += step;
  p2.y = clamp(p2.y, FIELD.margin + p2.h / 2, FIELD.h - FIELD.margin - p2.h / 2);
}

// --- movimento jogadores ---
function playerUpdate(dt) {
  // P1: W/S
  let dir1 = 0;
  if (keys.has("w")) dir1 -= 1;
  if (keys.has("s")) dir1 += 1;

  p1.y += dir1 * p1.speed * dt;
  p1.y = clamp(p1.y, FIELD.margin + p1.h / 2, FIELD.h - FIELD.margin - p1.h / 2);

  if (gameMode === "2p") {
    // P2: setas
    let dir2 = 0;
    if (keys.has("arrowup")) dir2 -= 1;
    if (keys.has("arrowdown")) dir2 += 1;

    p2.y += dir2 * p2.speed * dt;
    p2.y = clamp(p2.y, FIELD.margin + p2.h / 2, FIELD.h - FIELD.margin - p2.h / 2);
  } else {
    aiUpdate(dt);
  }
}

// --- física ---
function update(dt) {
  if (!running || paused) return;

  playerUpdate(dt);

  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;

  // teto/chão
  if (ball.y - ball.r < FIELD.margin) {
    ball.y = FIELD.margin + ball.r;
    ball.vy *= -1;
  }
  if (ball.y + ball.r > FIELD.h - FIELD.margin) {
    ball.y = FIELD.h - FIELD.margin - ball.r;
    ball.vy *= -1;
  }

  // colisão com paddles
  const r1 = rectForPaddle(p1);
  const r2 = rectForPaddle(p2);

  if (circleRectCollision(ball.x, ball.y, ball.r, r1.x, r1.y, r1.w, r1.h) && ball.vx < 0) {
    bounceOffPaddle(p1);
  }
  if (circleRectCollision(ball.x, ball.y, ball.r, r2.x, r2.y, r2.w, r2.h) && ball.vx > 0) {
    bounceOffPaddle(p2);
  }

  // ponto?
  if (ball.x + ball.r < 0) {
    score.right += 1;
    onPointScored("right");
  } else if (ball.x - ball.r > FIELD.w) {
    score.left += 1;
    onPointScored("left");
  }

  // vitória
  if (score.left >= scoreToWin || score.right >= scoreToWin) {
    running = false;
    const winner = score.left > score.right ? "P1" : (gameMode === "2p" ? "P2" : "IA");
    setHint(`Fim de jogo! Vencedor: ${winner}. Dica extra: separar corretamente reduz contaminação e melhora rendimento do processo.`);
  }
}

function bounceOffPaddle(p) {
  const offset = (ball.y - p.y) / (p.h / 2); // -1..1
  const maxAngle = 0.85; // ~48°
  const angle = offset * maxAngle;

  const speed = Math.hypot(ball.vx, ball.vy) * ball.speedUp;
  const dir = (p === p1) ? 1 : -1;

  ball.vx = Math.cos(angle) * speed * dir;
  ball.vy = Math.sin(angle) * speed;

  // evita grudar
  ball.x = (p === p1)
    ? (p.x + p.w / 2 + ball.r + 1)
    : (p.x - p.w / 2 - ball.r - 1);
}

function onPointScored(side) {
  const tip = pickTip(ball.waste);
  const who = side === "left"
    ? "P1"
    : (gameMode === "2p" ? "P2" : "IA");

  setHint(`${who} marcou! ${tip}`);
  resetBall(side === "left" ? 1 : -1);
}

// --- render ---
function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawCollector(p, mainColor, label) {
  const x = p.x - p.w / 2;
  const y = p.y - p.h / 2;

  // “suporte”
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  roundRect(x - 10, y - 10, p.w + 20, p.h + 20, 14);
  ctx.fill();

  // paddle
  ctx.fillStyle = mainColor;
  roundRect(x, y, p.w, p.h, 10);
  ctx.fill();

  // “tampa”
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  roundRect(x - 3, y - 18, p.w + 6, 12, 8);
  ctx.fill();

  // etiqueta
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(232,238,252,0.85)";
  ctx.font = "800 11px system-ui";
  ctx.fillText(label, p.x, y - 24);
}

function drawWasteBall(b) {
  const grd = ctx.createRadialGradient(b.x - 4, b.y - 4, 2, b.x, b.y, b.r * 1.6);
  grd.addColorStop(0, "rgba(255,255,255,0.9)");
  grd.addColorStop(1, b.waste.color);

  ctx.beginPath();
  ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
  ctx.fillStyle = grd;
  ctx.fill();

  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.stroke();

  ctx.font = "900 10px system-ui";
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.textAlign = "center";
  ctx.fillText(abbrevWaste(b.waste.id), b.x, b.y + 3);
}

function overlayText(line1, line2, alpha) {
  ctx.fillStyle = `rgba(0,0,0,${alpha})`;
  ctx.fillRect(0, 0, FIELD.w, FIELD.h);

  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.font = "800 30px system-ui";
  ctx.fillText(line1, FIELD.w / 2, FIELD.h / 2 - 8);

  ctx.fillStyle = "rgba(232,238,252,0.78)";
  ctx.font = "600 16px system-ui";
  ctx.fillText(line2, FIELD.w / 2, FIELD.h / 2 + 20);
}

function draw() {
  ctx.clearRect(0, 0, FIELD.w, FIELD.h);

  // moldura
  roundRect(10, 10, FIELD.w - 20, FIELD.h - 20, 18);
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 2;
  ctx.stroke();

  // área interna
  ctx.fillStyle = "rgba(255,255,255,0.02)";
  ctx.fillRect(FIELD.margin, FIELD.margin, FIELD.w - FIELD.margin * 2, FIELD.h - FIELD.margin * 2);

  // linha central
  ctx.setLineDash([8, 10]);
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(FIELD.w / 2, FIELD.margin);
  ctx.lineTo(FIELD.w / 2, FIELD.h - FIELD.margin);
  ctx.stroke();
  ctx.setLineDash([]);

  // placar
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.font = "700 42px system-ui";
  ctx.textAlign = "center";
  ctx.fillText(String(score.left), FIELD.w / 2 - 70, 82);
  ctx.fillText(String(score.right), FIELD.w / 2 + 70, 82);

  // topo
  ctx.font = "600 13px system-ui";
  ctx.fillStyle = "rgba(232,238,252,0.75)";
  ctx.textAlign = "left";
  ctx.fillText("P1 • Coleta seletiva (W/S)", FIELD.margin, 22);

  ctx.textAlign = "right";
  const rightLabel = (gameMode === "2p") ? "P2 • Triagem (↑/↓)" : "IA • Triagem automatizada";
  ctx.fillText(rightLabel, FIELD.w - FIELD.margin, 22);

  // paddles
  drawCollector(p1, "#60a5fa", "AZUL");
  drawCollector(p2, "#34d399", "VERDE");

  // bola
  drawWasteBall(ball);

  if (!running) {
    overlayText("Escolha um modo e pressione Enter", gameMode === "2p" ? "2 jogadores" : "1 jogador vs IA", 0.22);
  } else if (paused) {
    overlayText("PAUSADO (P para voltar)", "Dica: reciclagem começa na separação", 0.22);
  }
}

// --- loop ---
function loop(now) {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;

  update(dt);
  draw();

  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// --- leaderboard ---
async function refreshBoard() {
  try {
    const r = await fetch("/api/leaderboard?limit=10");
    const data = await r.json();
    elBoard.innerHTML = "";
    for (const it of data.items ?? []) {
      const li = document.createElement("li");
      li.innerHTML = `<b>${escapeHtml(it.name)}</b> — ${it.score} <span class="small">(${escapeHtml(it.mode)})</span>`;
      elBoard.appendChild(li);
    }
  } catch {
    // ok ficar quieto
  }
}

async function saveScore() {
  elSaveMsg.textContent = "";
  const name = (elName.value || "").trim();
  if (!name) {
    elSaveMsg.textContent = "Digite um nome antes de salvar.";
    return;
  }

  // salva score do P1 (você)
  const mode = gameMode === "2p" ? "2P" : "1P-IA";
  const myScore = score.left;

  try {
    const r = await fetch("/api/score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, score: myScore, mode }),
    });
    if (!r.ok) throw new Error("bad");
    elSaveMsg.textContent = "Salvo no leaderboard!";
    await refreshBoard();
  } catch {
    elSaveMsg.textContent = "Não foi possível salvar (servidor offline?).";
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[c]));
}

// inicial
refreshBoard();
setMode("1p");
resetGame();