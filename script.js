// --- Звуковые эффекты (Web Audio API) ---
class SoundController {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  playShoot() {
    if (!this.enabled || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(400, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.08);
  }

  playHit() {
    if (!this.enabled || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  playBomb() {
    if (!this.enabled || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);
  }
}

const sound = new SoundController();

// --- Настройки сложности ---
const DIFFICULTY_SETTINGS = {
  easy: {
    baseScore: 10,
    scoreMult: 1.0,
    spawnInterval: 1200,
    targetSpeed: 1.0,
    targetRadius: 28,
    bombChance: 0.05
  },
  medium: {
    baseScore: 20,
    scoreMult: 1.5,
    spawnInterval: 900,
    targetSpeed: 1.8,
    targetRadius: 24,
    bombChance: 0.12
  },
  hard: {
    baseScore: 35,
    scoreMult: 2.2,
    spawnInterval: 650,
    targetSpeed: 2.6,
    targetRadius: 20,
    bombChance: 0.20
  }
};

// --- Основная логика игры ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let currentDifficulty = 'easy';
let isPlaying = false;
let score = 0;
let level = 1;
let lives = 3;
let combo = 0;
let maxCombo = 0;
let totalShots = 0;
let totalHits = 0;

let targets = [];
let particles = [];
let floatingTexts = [];
let spawnTimer = null;
let lastTime = 0;

// Изменение размера canvas
function resizeCanvas() {
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Класс мишени
class Target {
  constructor(config) {
    this.radius = config.targetRadius * (Math.random() * 0.3 + 0.85);
    this.x = Math.random() * (canvas.width - this.radius * 2) + this.radius;
    this.y = Math.random() * (canvas.height - this.radius * 2) + this.radius;
    
    // Случайный тип: normal, fast, bomb
    const isBomb = Math.random() < config.bombChance;
    const isFast = !isBomb && Math.random() < 0.25;

    if (isBomb) {
      this.type = 'bomb';
      this.color = '#f43f5e';
      this.speed = config.targetSpeed * 1.2;
    } else if (isFast) {
      this.type = 'fast';
      this.color = '#facc15';
      this.radius *= 0.75;
      this.speed = config.targetSpeed * 1.8;
    } else {
      this.type = 'normal';
      this.color = '#38bdf8';
      this.speed = config.targetSpeed;
    }

    // Движение
    const angle = Math.random() * Math.PI * 2;
    this.vx = Math.cos(angle) * this.speed;
    this.vy = Math.sin(angle) * this.speed;

    this.pulse = 0;
    this.lifeTime = 0;
    this.maxLifeTime = 5000 / (level * 0.1 + 1);
  }

  update(dt) {
    this.x += this.vx;
    this.y += this.vy;
    this.lifeTime += dt;

    // Отскоки от стен
    if (this.x - this.radius < 0 || this.x + this.radius > canvas.width) this.vx *= -1;
    if (this.y - this.radius < 0 || this.y + this.radius > canvas.height) this.vy *= -1;

    this.pulse += 0.05;
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);

    if (this.type === 'bomb') {
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + Math.sin(this.pulse) * 2, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = `${this.radius}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('💣', 0, 0);
    } else {
      const currentRadius = this.radius + Math.sin(this.pulse) * 1.5;
      
      ctx.beginPath();
      ctx.arc(0, 0, currentRadius, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(0, 0, currentRadius * 0.65, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(0, 0, currentRadius * 0.3, 0, Math.PI * 2);
      ctx.fillStyle = this.type === 'fast' ? '#a855f7' : '#020617';
      ctx.fill();
    }

    ctx.restore();
  }
}

// Частицы при попадании
class Particle {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.radius = Math.random() * 4 + 2;
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 6 + 2;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.alpha = 1;
    this.decay = Math.random() * 0.03 + 0.02;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.alpha -= this.decay;
  }

  draw() {
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.alpha);
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.restore();
  }
}

// Всплывающий текст
class FloatingText {
  constructor(text, x, y, color) {
    this.text = text;
    this.x = x;
    this.y = y;
    this.color = color;
    this.alpha = 1;
    this.vy = -1.5;
  }

  update() {
    this.y += this.vy;
    this.alpha -= 0.02;
  }

  draw() {
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.alpha);
    ctx.font = 'bold 18px Segoe UI, sans-serif';
    ctx.fillStyle = this.color;
    ctx.fillText(this.text, this.x, this.y);
    ctx.restore();
  }
}

// Спавн мишеней
function spawnTarget() {
  if (!isPlaying) return;
  const config = DIFFICULTY_SETTINGS[currentDifficulty];
  targets.push(new Target(config));

  const nextInterval = Math.max(350, config.spawnInterval - (level - 1) * 40);
  spawnTimer = setTimeout(spawnTarget, nextInterval);
}

// Обработка выстрелов
canvas.addEventListener('mousedown', (e) => {
  if (!isPlaying) return;
  sound.init();
  sound.playShoot();

  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  totalShots++;
  let hit = false;

  for (let i = targets.length - 1; i >= 0; i--) {
    const t = targets[i];
    const dist = Math.hypot(mouseX - t.x, mouseY - t.y);

    if (dist <= t.radius) {
      hit = true;
      totalHits++;
      createParticles(t.x, t.y, t.color);

      if (t.type === 'bomb') {
        sound.playBomb();
        lives--;
        combo = 0;
        createFloatingText('-1 Жизнь! 💣', t.x, t.y, '#f43f5e');
      } else {
        sound.playHit();
        combo++;
        if (combo > maxCombo) maxCombo = combo;

        const config = DIFFICULTY_SETTINGS[currentDifficulty];
        let addedScore = config.baseScore * config.scoreMult;
        
        if (t.type === 'fast') addedScore *= 2.5;
        
        const comboBonus = 1 + (combo - 1) * 0.1;
        addedScore = Math.round(addedScore * comboBonus);

        score += addedScore;

        let text = `+${addedScore}`;
        if (combo > 2) text += ` (${combo}x Combo!)`;
        createFloatingText(text, t.x, t.y, t.type === 'fast' ? '#facc15' : '#38bdf8');
      }

      targets.splice(i, 1);
      break;
    }
  }

  if (!hit) {
    combo = 0;
  }

  checkLevelProgression();
  updateUI();

  if (lives <= 0) {
    endGame();
  }
});

function createParticles(x, y, color) {
  for (let i = 0; i < 15; i++) {
    particles.push(new Particle(x, y, color));
  }
}

function createFloatingText(text, x, y, color) {
  floatingTexts.push(new FloatingText(text, x, y, color));
}

function checkLevelProgression() {
  const nextLevelScore = level * 150;
  if (score >= nextLevelScore) {
    level++;
    createFloatingText(`УРОВЕНЬ ${level}!`, canvas.width / 2 - 40, canvas.height / 2, '#facc15');
  }
}

function updateUI() {
  document.getElementById('scoreDisplay').innerText = score;
  document.getElementById('levelDisplay').innerText = level;
  
  const config = DIFFICULTY_SETTINGS[currentDifficulty];
  const currentMult = (config.scoreMult * (1 + (combo > 0 ? (combo - 1) * 0.1 : 0))).toFixed(1);
  document.getElementById('multiplierDisplay').innerText = `${currentMult}x`;

  document.getElementById('livesDisplay').innerText = '❤️'.repeat(Math.max(0, lives));
}

// Игровой цикл
function gameLoop(timestamp) {
  if (!isPlaying) return;

  const dt = timestamp - lastTime;
  lastTime = timestamp;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let i = targets.length - 1; i >= 0; i--) {
    const t = targets[i];
    t.update(dt);
    t.draw();

    if (t.lifeTime >= t.maxLifeTime) {
      if (t.type !== 'bomb') {
        lives--;
        combo = 0;
        createFloatingText('Упущено! -1 ❤️', t.x, t.y, '#f43f5e');
        updateUI();
        if (lives <= 0) endGame();
      }
      targets.splice(i, 1);
    }
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.update();
    p.draw();
    if (p.alpha <= 0) particles.splice(i, 1);
  }

  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    const ft = floatingTexts[i];
    ft.update();
    ft.draw();
    if (ft.alpha <= 0) floatingTexts.splice(i, 1);
  }

  requestAnimationFrame(gameLoop);
}

// Управление игрой
function startGame() {
  score = 0;
  level = 1;
  lives = 3;
  combo = 0;
  maxCombo = 0;
  totalShots = 0;
  totalHits = 0;
  targets = [];
  particles = [];
  floatingTexts = [];

  isPlaying = true;
  document.getElementById('startMenu').classList.add('hidden');
  document.getElementById('gameOverMenu').classList.add('hidden');

  updateUI();
  lastTime = performance.now();
  spawnTarget();
  requestAnimationFrame(gameLoop);
}

function endGame() {
  isPlaying = false;
  clearTimeout(spawnTimer);

  const accuracy = totalShots > 0 ? Math.round((totalHits / totalShots) * 100) : 0;
  
  const recordKey = `target_shooter_highscore_${currentDifficulty}`;
  const savedHighScore = parseInt(localStorage.getItem(recordKey) || '0');
  const newHighScore = Math.max(savedHighScore, score);
  localStorage.setItem(recordKey, newHighScore);

  document.getElementById('finalScore').innerText = score;
  document.getElementById('finalAccuracy').innerText = `${accuracy}%`;
  document.getElementById('finalCombo').innerText = `${maxCombo}x`;
  document.getElementById('highScore').innerText = newHighScore;

  document.getElementById('gameOverMenu').classList.remove('hidden');
}

// Кнопки
document.querySelectorAll('.btn-diff').forEach(btn => {
  btn.addEventListener('click', (e) => {
    document.querySelectorAll('.btn-diff').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    currentDifficulty = e.target.dataset.diff;
  });
});

document.getElementById('startBtn').addEventListener('click', startGame);
document.getElementById('restartBtn').addEventListener('click', startGame);

const soundBtn = document.getElementById('soundToggle');
soundBtn.addEventListener('click', () => {
  sound.enabled = !sound.enabled;
  soundBtn.innerText = sound.enabled ? '🔊 Звук: Вкл' : '🔇 Звук: Выкл';
});