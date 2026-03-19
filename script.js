// --- CONFIGURAÇÃO CANVAS ---
const canvas = document.getElementById('snake');
const ctx = canvas.getContext('2d');

const COLS = 20;
const ROWS = 20;
const CELL = canvas.width / COLS; // 20px por célula

// --- ELEMENTOS UI ---
const scoreElement    = document.getElementById('score');
const levelElement    = document.getElementById('level');
const lengthElement   = document.getElementById('length');
const highscoreElement = document.getElementById('highscore');
const shakerElement   = document.getElementById('main-shaker');
const popTextElement  = document.getElementById('pop-text');
const gameOverOverlay = document.getElementById('game-over-overlay');
const startOverlay    = document.getElementById('start-overlay');
const finalScoreEl    = document.getElementById('final-score');
const restartBtn      = document.getElementById('restart-btn');
const startBtn        = document.getElementById('start-btn');

// --- PALETA NEON ---
const COLOR_HEAD  = '#0DFF72';
const COLOR_BODY  = '#0DC2FF';
const COLOR_FOOD  = '#FF0D72';
const COLOR_GRID  = 'rgba(255,255,255,0.03)';
const COLOR_TRAIL = 'rgba(13, 255, 114, 0.15)';

// --- ESTADO DO JOGO ---
let snake, direction, nextDirection, food, score, level, highscore;
let isGameOver  = false;
let isStarted   = false;
let particles   = [];

// Recorde persistido em localStorage
highscore = parseInt(localStorage.getItem('snake_highscore') || '0');
highscoreElement.innerText = fmt(highscore);

// --- PARTÍCULA ---
class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 4;
        this.vy = (Math.random() - 0.5) * 4;
        this.color = color;
        this.alpha = 1;
        this.decay = Math.random() * 0.03 + 0.015;
        this.size = Math.random() * 4 + 2;
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.1; // gravidade leve
        this.alpha -= this.decay;
    }
    draw() {
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.alpha);
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 6;
        ctx.shadowColor = this.color;
        ctx.fillRect(this.x, this.y, this.size, this.size);
        ctx.restore();
    }
}

function spawnFoodParticles(cx, cy) {
    for (let i = 0; i < 20; i++) {
        particles.push(new Particle(cx * CELL + CELL / 2, cy * CELL + CELL / 2, COLOR_FOOD));
    }
}

// --- INICIALIZAÇÃO / RESET ---
function initGame() {
    snake = [
        { x: 10, y: 10 },
        { x: 9,  y: 10 },
        { x: 8,  y: 10 },
    ];
    direction     = { x: 1, y: 0 };
    nextDirection = { x: 1, y: 0 };
    score         = 0;
    level         = 1;
    particles     = [];
    isGameOver    = false;

    placeFood();
    updateUI();
}

// --- COMIDA ---
function placeFood() {
    let pos;
    do {
        pos = {
            x: Math.floor(Math.random() * COLS),
            y: Math.floor(Math.random() * ROWS),
        };
    } while (snake.some(s => s.x === pos.x && s.y === pos.y));
    food = pos;
}

// --- LÓGICA DO JOGO ---
function step() {
    if (isGameOver) return;

    direction = { ...nextDirection };

    const head = {
        x: snake[0].x + direction.x,
        y: snake[0].y + direction.y,
    };

    // Colisão com parede
    if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) {
        triggerGameOver();
        return;
    }

    // Colisão com o próprio corpo
    if (snake.some(s => s.x === head.x && s.y === head.y)) {
        triggerGameOver();
        return;
    }

    snake.unshift(head);

    // Comeu a comida?
    if (head.x === food.x && head.y === food.y) {
        spawnFoodParticles(food.x, food.y);
        score += 10 * level;
        showPopText(`+${10 * level}!`);

        if (score % 100 === 0) {
            shakerElement.classList.add('shake-active');
            setTimeout(() => shakerElement.classList.remove('shake-active'), 400);
        }

        placeFood();
        updateUI();
    } else {
        snake.pop(); // Remove cauda só se não comeu
    }
}

// --- DESENHO ---
function draw() {
    // Fundo
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grade sutil (estilo do Tetris)
    ctx.strokeStyle = COLOR_GRID;
    ctx.lineWidth = 0.5;
    for (let c = 0; c < COLS; c++) {
        for (let r = 0; r < ROWS; r++) {
            ctx.strokeRect(c * CELL, r * CELL, CELL, CELL);
        }
    }

    // Comida — pulsando
    drawFood();

    // Cobra
    drawSnake();

    // Partículas
    particles.forEach((p, i) => {
        p.update();
        if (p.alpha <= 0) particles.splice(i, 1);
        else p.draw();
    });
}

function drawSnake() {
    snake.forEach((seg, i) => {
        const isHead = i === 0;
        const t = i / snake.length; // 0 = cabeça, 1 = rabo

        ctx.save();

        // Glow mais forte na cabeça
        ctx.shadowBlur = isHead ? 18 : 8;
        ctx.shadowColor = isHead ? COLOR_HEAD : COLOR_BODY;

        // Cor interpolada: cabeça verde → corpo azul
        ctx.fillStyle = isHead ? COLOR_HEAD : lerpColor(COLOR_BODY, '#003344', t);

        const padding = isHead ? 1 : 2;
        ctx.fillRect(
            seg.x * CELL + padding,
            seg.y * CELL + padding,
            CELL - padding * 2,
            CELL - padding * 2
        );

        // Borda brilhante na cabeça
        if (isHead) {
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 0.8;
            ctx.globalAlpha = 0.4;
            ctx.strokeRect(
                seg.x * CELL + padding,
                seg.y * CELL + padding,
                CELL - padding * 2,
                CELL - padding * 2
            );
        }

        ctx.restore();
    });
}

function drawFood() {
    const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 200);
    const padding = 3 - pulse * 2;

    ctx.save();
    ctx.shadowBlur = 15 + pulse * 10;
    ctx.shadowColor = COLOR_FOOD;
    ctx.fillStyle = COLOR_FOOD;
    ctx.fillRect(
        food.x * CELL + padding,
        food.y * CELL + padding,
        CELL - padding * 2,
        CELL - padding * 2
    );
    ctx.restore();
}

// --- HELPERS ---
function lerpColor(a, b, t) {
    const ah = parseInt(a.replace('#',''), 16);
    const bh = parseInt(b.replace('#',''), 16);
    const ar = (ah >> 16) & 0xff, ag = (ah >> 8) & 0xff, ab = ah & 0xff;
    const br = (bh >> 16) & 0xff, bg = (bh >> 8) & 0xff, bb = bh & 0xff;
    const rr = Math.round(ar + (br - ar) * t);
    const rg = Math.round(ag + (bg - ag) * t);
    const rb = Math.round(ab + (bb - ab) * t);
    return `rgb(${rr},${rg},${rb})`;
}

function fmt(n) {
    return n.toString().padStart(4, '0');
}

function updateUI() {
    scoreElement.innerText  = fmt(score);
    level = Math.floor(score / 50) + 1;
    levelElement.innerText  = level;
    lengthElement.innerText = snake.length;

    if (score > highscore) {
        highscore = score;
        localStorage.setItem('snake_highscore', highscore);
        highscoreElement.innerText = fmt(highscore);
    }
}

function showPopText(text) {
    popTextElement.innerText = text;
    popTextElement.classList.remove('hidden', 'show');
    void popTextElement.offsetWidth; // force reflow
    popTextElement.classList.add('show');
    setTimeout(() => {
        popTextElement.classList.remove('show');
        popTextElement.classList.add('hidden');
    }, 800);
}

// --- GAME OVER ---
function triggerGameOver() {
    isGameOver = true;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;

    finalScoreEl.innerText = fmt(score);
    gameOverOverlay.classList.remove('hidden');

    // Explode a cobra toda
    snake.forEach(seg => {
        for (let i = 0; i < 5; i++) {
            particles.push(new Particle(
                seg.x * CELL + CELL / 2,
                seg.y * CELL + CELL / 2,
                COLOR_HEAD
            ));
        }
    });

    // Continua desenhando as partículas por ~1.5s a 60fps
    let frames = 0;
    function drawDeath() {
        if (frames++ > 90) return;
        draw();
        requestAnimationFrame(drawDeath);
    }
    drawDeath();
}

// --- VELOCIDADE ---
function getStepInterval() {
    // Começa em 180ms, diminui conforme o nível (mín 60ms)
    return Math.max(60, 180 - (level - 1) * 12);
}

// --- LOOP  ---
let rafId       = null;
let lastTime    = 0;
let accumulator = 0;

function gameFrame(timestamp) {
    if (isGameOver) return;

    const delta = timestamp - lastTime;
    lastTime = timestamp;

    // Evita salto enorme após tab ficar em background
    accumulator += Math.min(delta, 200);

    // Avança a lógica somente quando o acumulador atingir o intervalo
    if (accumulator >= getStepInterval()) {
        accumulator -= getStepInterval();
        step();
    }

    draw();
    rafId = requestAnimationFrame(gameFrame);
}

function startLoop() {
    if (rafId) cancelAnimationFrame(rafId);
    accumulator = 0;
    lastTime    = performance.now();
    rafId = requestAnimationFrame(gameFrame);
}

// --- RESET COMPLETO ---
function resetGame() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    gameOverOverlay.classList.add('hidden');
    initGame();
    startLoop();
}

// --- INÍCIO ---
function startGame() {
    startOverlay.classList.add('hidden');
    isStarted = true;
    initGame();
    startLoop();
}

// --- CONTROLES TECLADO ---
document.addEventListener('keydown', e => {
    if (!isStarted || isGameOver) return;

    switch (e.key) {
        case 'ArrowUp':    case 'w': case 'W':
            if (direction.y !== 1)  nextDirection = { x: 0, y: -1 }; break;
        case 'ArrowDown':  case 's': case 'S':
            if (direction.y !== -1) nextDirection = { x: 0, y: 1 };  break;
        case 'ArrowLeft':  case 'a': case 'A':
            if (direction.x !== 1)  nextDirection = { x: -1, y: 0 }; break;
        case 'ArrowRight': case 'd': case 'D':
            if (direction.x !== -1) nextDirection = { x: 1, y: 0 };  break;
    }

    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) {
        e.preventDefault();
    }
});

// --- CONTROLES MOBILE ---
function addTouchListener(id, action) {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.addEventListener('touchstart', (e) => { e.preventDefault(); action(); }, { passive: false });
    btn.addEventListener('mousedown',  (e) => { e.preventDefault(); action(); });
}

addTouchListener('btn-up',    () => { if (direction.y !== 1)  nextDirection = { x: 0, y: -1 }; });
addTouchListener('btn-down',  () => { if (direction.y !== -1) nextDirection = { x: 0, y: 1 };  });
addTouchListener('btn-left',  () => { if (direction.x !== 1)  nextDirection = { x: -1, y: 0 }; });
addTouchListener('btn-right', () => { if (direction.x !== -1) nextDirection = { x: 1, y: 0 };  });

document.addEventListener('touchmove', (e) => {
    if (e.target.classList.contains('control-btn')) e.preventDefault();
}, { passive: false });

// --- BOTÕES ---
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', resetGame);

// --- DESENHO INICIAL (tela de início) ---
(function drawIdle() {
    draw();
    if (!isStarted) requestAnimationFrame(drawIdle);
})();