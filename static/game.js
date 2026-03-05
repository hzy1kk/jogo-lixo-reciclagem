const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const keys = new Set();

const player = {
  x: 100,
  y: 100,
  r: 18,
  speed: 260, // px/s
};

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

window.addEventListener("keydown", (e) => {
  keys.add(e.key.toLowerCase());
  if (e.key === " ") e.preventDefault();
});
window.addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));

let last = performance.now();

function update(dt) {
  let vx = 0, vy = 0;

  if (keys.has("arrowleft") || keys.has("a")) vx -= 1;
  if (keys.has("arrowright") || keys.has("d")) vx += 1;
  if (keys.has("arrowup") || keys.has("w")) vy -= 1;
  if (keys.has("arrowdown") || keys.has("s")) vy += 1;

  // normaliza diagonal
  const mag = Math.hypot(vx, vy) || 1;
  vx /= mag; vy /= mag;

  player.x += vx * player.speed * dt;
  player.y += vy * player.speed * dt;

  // colisão com bordas
  player.x = clamp(player.x, player.r, canvas.width - player.r);
  player.y = clamp(player.y, player.r, canvas.height - player.r);
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // HUD
  ctx.fillStyle = "#aaa";
  ctx.font = "16px system-ui";
  ctx.fillText("Movimente-se (WASD/Setas)", 16, 26);

  // player
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.r, 0, Math.PI * 2);
  ctx.fillStyle = "#4ade80";
  ctx.fill();

  // sombra/outline
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#0f172a";
  ctx.stroke();
}

function loop(now) {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;

  update(dt);
  draw();

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);