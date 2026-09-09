const canvas = document.querySelector('#game');
const ctx = canvas.getContext('2d');
const overlay = document.querySelector('#overlay');
const title = document.querySelector('#overlay-title');
const kicker = document.querySelector('#overlay-kicker');
const copy = document.querySelector('#overlay-copy');
const startButton = document.querySelector('#start-btn');
const scoreEl = document.querySelector('#score');
const bestEl = document.querySelector('#best');
const shareButton = document.querySelector('#share-btn');
const shareStatus = document.querySelector('#share-status');

let width, height, lastTime, score, running = false, animationId;
let player, sparks = [], comets = [], particles = [], keys = {};
let best = Number(localStorage.getItem('neon-drift-best') || 0);
bestEl.textContent = String(best).padStart(4, '0');

function resize() {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  width = canvas.clientWidth; height = canvas.clientHeight;
  canvas.width = width * ratio; canvas.height = height * ratio;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}
window.addEventListener('resize', resize);
resize();

function random(min, max) { return Math.random() * (max - min) + min; }
function spawnSpark() { sparks.push({ x: random(28, width - 28), y: random(28, height - 28), r: 4, pulse: random(0, 7) }); }
function spawnComet() {
  const edge = Math.floor(random(0, 4));
  const x = edge === 1 ? width + 20 : edge === 3 ? -20 : random(0, width);
  const y = edge === 0 ? -20 : edge === 2 ? height + 20 : random(0, height);
  const angle = Math.atan2(height / 2 - y, width / 2 - x) + random(-.5, .5);
  const speed = random(55, 100) + score * .025;
  comets.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, r: random(8, 15), hue: random(0, 1) });
}
function reset() {
  score = 0; player = { x: width / 2, y: height / 2, r: 11, speed: 220 };
  sparks = []; comets = []; particles = [];
  for (let i = 0; i < 4; i++) spawnSpark();
  for (let i = 0; i < 2; i++) spawnComet();
  scoreEl.textContent = '0000';
}
function burst(x, y, color, count = 12) {
  for (let i = 0; i < count; i++) particles.push({ x, y, vx: random(-90, 90), vy: random(-90, 90), life: random(.3, .8), color });
}
function start() {
  reset(); running = true; overlay.classList.add('hidden'); lastTime = performance.now();
  cancelAnimationFrame(animationId); animationId = requestAnimationFrame(loop);
}
function end() {
  running = false; burst(player.x, player.y, '#ff4d9d', 28);
  if (score > best) { best = score; localStorage.setItem('neon-drift-best', best); bestEl.textContent = String(best).padStart(4, '0'); }
  kicker.textContent = 'RUN OVER'; title.innerHTML = `${String(score).padStart(4, '0')} <span>POINTS</span>`;
  copy.innerHTML = 'The drift was strong.<br />Ready for another run?'; startButton.innerHTML = 'TRY AGAIN <span>↻</span>'; overlay.classList.remove('hidden');
}
function update(dt) {
  const dx = (keys.ArrowRight || keys.d ? 1 : 0) - (keys.ArrowLeft || keys.a ? 1 : 0);
  const dy = (keys.ArrowDown || keys.s ? 1 : 0) - (keys.ArrowUp || keys.w ? 1 : 0);
  const magnitude = Math.hypot(dx, dy) || 1;
  player.x = Math.max(player.r, Math.min(width - player.r, player.x + dx / magnitude * player.speed * dt));
  player.y = Math.max(player.r, Math.min(height - player.r, player.y + dy / magnitude * player.speed * dt));
  if (Math.random() < dt * .8 && sparks.length < 5) spawnSpark();
  if (Math.random() < dt * (.25 + score / 2500) && comets.length < 10) spawnComet();
  sparks = sparks.filter(s => {
    s.pulse += dt * 4;
    if (Math.hypot(player.x - s.x, player.y - s.y) < player.r + 10) { score += 10; scoreEl.textContent = String(score).padStart(4, '0'); burst(s.x, s.y, '#64f6e4'); return false; }
    return true;
  });
  comets.forEach(c => { c.x += c.vx * dt; c.y += c.vy * dt; });
  comets = comets.filter(c => c.x > -40 && c.x < width + 40 && c.y > -40 && c.y < height + 40);
  if (comets.some(c => Math.hypot(player.x - c.x, player.y - c.y) < player.r + c.r - 2)) end();
  particles.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; });
  particles = particles.filter(p => p.life > 0);
}
function draw() {
  ctx.fillStyle = '#0d0a1d'; ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = 'rgba(100,246,228,.055)'; ctx.lineWidth = 1;
  for (let x = 0; x < width; x += 46) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke(); }
  for (let y = 0; y < height; y += 46) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke(); }
  sparks.forEach(s => { const glow = 9 + Math.sin(s.pulse) * 3; ctx.shadowBlur = glow; ctx.shadowColor = '#64f6e4'; ctx.fillStyle = '#dffffb'; ctx.beginPath(); ctx.arc(s.x, s.y, s.r + Math.sin(s.pulse) * 1.5, 0, Math.PI * 2); ctx.fill(); });
  comets.forEach(c => { ctx.shadowBlur = 16; ctx.shadowColor = '#ff4d9d'; ctx.fillStyle = c.hue > .5 ? '#ff4d9d' : '#ff9b72'; ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = .25; ctx.beginPath(); ctx.arc(c.x - c.vx * .12, c.y - c.vy * .12, c.r * 1.8, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; });
  if (player) { ctx.shadowBlur = 20; ctx.shadowColor = '#64f6e4'; ctx.fillStyle = '#64f6e4'; ctx.beginPath(); ctx.arc(player.x, player.y, player.r, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(player.x - 3, player.y - 3, 3, 0, Math.PI * 2); ctx.fill(); }
  particles.forEach(p => { ctx.globalAlpha = Math.max(0, p.life); ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, 3, 3); }); ctx.globalAlpha = 1; ctx.shadowBlur = 0;
}
function loop(now) { const dt = Math.min((now - lastTime) / 1000, .05); lastTime = now; update(dt); draw(); if (running) animationId = requestAnimationFrame(loop); }
window.addEventListener('keydown', e => { keys[e.key] = true; if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault(); });
window.addEventListener('keyup', e => { keys[e.key] = false; });
document.querySelectorAll('[data-key]').forEach(button => {
  const key = button.dataset.key;
  button.addEventListener('pointerdown', () => { keys[key] = true; });
  button.addEventListener('pointerup', () => { keys[key] = false; });
  button.addEventListener('pointerleave', () => { keys[key] = false; });
});
startButton.addEventListener('click', start);
shareButton.addEventListener('click', async () => {
  const shareData = {
    title: 'Neon Drift',
    text: `I scored ${score} points in Neon Drift. Can you beat me?`,
    url: window.location.href
  };
  try {
    if (navigator.share) {
      await navigator.share(shareData);
      shareStatus.textContent = 'SHARED';
    } else {
      await navigator.clipboard.writeText(window.location.href);
      shareStatus.textContent = 'LINK COPIED';
    }
  } catch (error) {
    if (error.name !== 'AbortError') {
      shareStatus.textContent = 'COPY BLOCKED';
    }
  }
  window.setTimeout(() => { shareStatus.textContent = ''; }, 2400);
});
reset(); draw();
