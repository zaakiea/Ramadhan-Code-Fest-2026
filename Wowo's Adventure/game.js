const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreElement = document.getElementById("score-display");
const finalScoreElement = document.getElementById("final-score");
const highScoreElement = document.getElementById("high-score");
const startMenu = document.getElementById("start-menu");
const gameOverMenu = document.getElementById("game-over-menu");

const config = {
  width: 360,
  height: 640,
  gravity: 0.25,
  jumpStrength: -5,
  pipeSpeed: 2,
  pipeGap: 150,
  pipeWidth: 60,
  pipeSpawnRate: 100,
};

canvas.width = config.width;
canvas.height = config.height;

let bird,
  pipes,
  frameCount,
  score,
  highScore = 0,
  gameActive = false;
let birdImg = new Image();
let pipeImg = new Image();
birdImg.src = "bird.png";
pipeImg.src = "pipe.png";

class Bird {
  constructor() {
    this.x = 50;
    this.y = config.height / 2;
    this.width = 34;
    this.height = 24;
    this.velocity = 0;
    this.rotation = 0;
  }

  draw() {
    ctx.save();
    ctx.translate(this.x + this.width / 2, this.y + this.height / 2);

    this.rotation = Math.min(
      Math.PI / 4,
      Math.max(-Math.PI / 4, this.velocity * 0.1),
    );
    ctx.rotate(this.rotation);

    ctx.beginPath();
    ctx.arc(0, 0, this.width / 2, 0, Math.PI * 2);
    ctx.clip();

    if (birdImg.complete) {
      ctx.drawImage(
        birdImg,
        -this.width / 2,
        -this.height / 2,
        this.width,
        this.height,
      );
    }

    ctx.restore();
  }

  update() {
    this.velocity += config.gravity;
    this.y += this.velocity;
    if (this.y + this.height > config.height || this.y < 0) {
      endGame();
    }
  }

  jump() {
    if (gameActive) {
      this.velocity = config.jumpStrength;
    }
  }
}

class Pipe {
  constructor() {
    this.topHeight =
      Math.random() * (config.height - config.pipeGap - 100) + 50;
    this.x = config.width;
    this.passed = false;
  }

  draw() {
    if (pipeImg.complete) {
      ctx.globalCompositeOperation = "source-over";

      ctx.save();
      ctx.translate(this.x + config.pipeWidth / 2, this.topHeight / 2);
      ctx.rotate(Math.PI);
      ctx.drawImage(
        pipeImg,
        -config.pipeWidth / 2,
        -this.topHeight / 2,
        config.pipeWidth,
        this.topHeight,
      );
      ctx.restore();

      const bottomY = this.topHeight + config.pipeGap;
      const bottomHeight = config.height - bottomY;
      ctx.drawImage(pipeImg, this.x, bottomY, config.pipeWidth, bottomHeight);
    }
  }

  update() {
    this.x -= config.pipeSpeed;

    if (
      bird.x + bird.width > this.x &&
      bird.x < this.x + config.pipeWidth &&
      (bird.y < this.topHeight ||
        bird.y + bird.height > this.topHeight + config.pipeGap)
    ) {
      endGame();
    }

    if (!this.passed && bird.x > this.x + config.pipeWidth) {
      score++;
      scoreElement.innerText = score;
      this.passed = true;
    }
  }
}

function startGame() {
  bird = new Bird();
  pipes = [];
  frameCount = 0;
  score = 0;
  gameActive = true;

  scoreElement.innerText = "0";
  scoreElement.classList.remove("hidden");
  startMenu.classList.add("hidden");
  gameOverMenu.classList.add("hidden");

  gameLoop();
}

function endGame() {
  if (!gameActive) return;
  gameActive = false;

  if (score > highScore) {
    highScore = score;
  }

  finalScoreElement.innerText = score;
  highScoreElement.innerText = highScore;

  scoreElement.classList.add("hidden");
  gameOverMenu.classList.remove("hidden");
}

function drawBackground() {
  ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
  ctx.beginPath();
  ctx.arc(100, 100, 30, 0, Math.PI * 2);
  ctx.arc(130, 100, 40, 0, Math.PI * 2);
  ctx.arc(170, 100, 30, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(280, 200, 20, 0, Math.PI * 2);
  ctx.arc(305, 200, 30, 0, Math.PI * 2);
  ctx.arc(330, 200, 20, 0, Math.PI * 2);
  ctx.fill();
}

function gameLoop() {
  if (!gameActive) return;

  ctx.clearRect(0, 0, config.width, config.height);
  drawBackground();

  bird.update();
  bird.draw();

  if (frameCount % config.pipeSpawnRate === 0) {
    pipes.push(new Pipe());
  }

  for (let i = pipes.length - 1; i >= 0; i--) {
    pipes[i].update();
    pipes[i].draw();

    if (pipes[i].x + config.pipeWidth < 0) {
      pipes.splice(i, 1);
    }
  }

  frameCount++;
  requestAnimationFrame(gameLoop);
}

window.addEventListener("keydown", (e) => {
  if (e.code === "Space") bird.jump();
});

canvas.addEventListener(
  "touchstart",
  (e) => {
    e.preventDefault();
    bird.jump();
  },
  { passive: false },
);

canvas.addEventListener("mousedown", () => {
  bird.jump();
});
