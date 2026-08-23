const WORDS = [
  "ABACAXI","AVIÃO","BICICLETA","CACHORRO","CHOCOLATE","ESCOLA","FOGUETE","GATO",
  "GELADEIRA","GIRASSOL","GUARDA-CHUVA","HAMBÚRGUER","IGREJA","JACARÉ","JANELA",
  "LARANJA","LEÃO","LIVRO","MONTANHA","MOUSE","NAVIO","NUVEM","ÓCULOS","PIPOCA",
  "PIRATA","PIZZA","PRAIA","RAINHA","ROBÔ","SORVETE","TELEVISÃO","TIGRE","TREM",
  "UNICÓRNIO","VIOLÃO","ZEBRA","ASTRONAUTA","BANANA","BOLA","BONECA","BRUXA",
  "CAVALO","CIRCO","COELHO","COMPUTADOR","DINOSSAURO","DRAGÃO","ELEFANTE","ESTRELA",
  "FUTEBOL","FOCA","GIRAFA","HELICÓPTERO","JARDIM","LIMÃO","MACACO","MELANCIA",
  "MÚSICA","PANDA","PATO","PEIXE","PONTE","RATO","SAPO","SOL","TARTARUGA","TUBARÃO",
  "URSO","VAMPIRO","VULCÃO","XÍCARA","BÚSSOLA","CASTELO","DELEGACIA","ESPADA",
  "FANTASMA","FORMIGA","GALINHA","HOSPITAL","ILHA","LUA","MÁGICO","MÉDICO",
  "MOTO","PARQUE","POLICIAL","PRINCESA","PROFESSOR","REI","ROBÔ","SAMBA",
  "SUPERMERCADO","TAXI","TRATOR","VAMPIRO","VETERINÁRIO","ZUMBI"
];

const screens = {
  home: document.getElementById("home"),
  game: document.getElementById("game"),
  result: document.getElementById("result")
};

const wordEl = document.getElementById("word");
const scoreEl = document.getElementById("score");
const passedEl = document.getElementById("passed");
const timerEl = document.getElementById("timer");
const statusEl = document.getElementById("status");
const orientationWarning = document.getElementById("orientationWarning");

let selectedDuration = 60;
let timeLeft = 60;
let score = 0;
let passed = 0;
let total = 0;
let timerId = null;
let gameRunning = false;
let words = [];
let currentWord = "";
let lastAction = 0;

// O valor de referência é obtido ao iniciar a rodada.
// Assim, pequenas diferenças entre modelos de celular não atrapalham.
let neutralBeta = null;
const PASS_THRESHOLD = 35;
const CORRECT_THRESHOLD = -35;
const ACTION_COOLDOWN = 900;

document.querySelectorAll(".duration").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".duration").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    selectedDuration = Number(btn.dataset.seconds);
  });
});

document.getElementById("startBtn").addEventListener("click", async () => {
  await requestMotionPermission();
  startGame();
});

document.getElementById("againBtn").addEventListener("click", () => {
  showScreen("home");
});

document.getElementById("passBtn").addEventListener("click", () => registerAction("pass"));
document.getElementById("correctBtn").addEventListener("click", () => registerAction("correct"));

document.addEventListener("keydown", e => {
  if (!gameRunning) return;
  if (e.key === "ArrowUp") registerAction("pass");
  if (e.key === "ArrowDown") registerAction("correct");
});

async function requestMotionPermission() {
  // iOS exige que DeviceOrientation seja autorizado por uma ação do usuário.
  if (typeof DeviceOrientationEvent !== "undefined" &&
      typeof DeviceOrientationEvent.requestPermission === "function") {
    try {
      const permission = await DeviceOrientationEvent.requestPermission();
      if (permission !== "granted") {
        document.getElementById("permissionHint").textContent =
          "Permissão do giroscópio não concedida. Você ainda pode usar os botões.";
      }
    } catch (error) {
      console.warn("Permissão do sensor:", error);
    }
  }
}

function startGame() {
  score = 0;
  passed = 0;
  total = 0;
  timeLeft = selectedDuration;
  gameRunning = true;
  neutralBeta = null;
  words = shuffle([...WORDS]);

  scoreEl.textContent = score;
  passedEl.textContent = passed;
  timerEl.textContent = timeLeft;
  statusEl.textContent = "AGUARDANDO MOVIMENTO";
  showScreen("game");
  nextWord();

  clearInterval(timerId);
  timerId = setInterval(() => {
    timeLeft--;
    timerEl.textContent = timeLeft;

    if (timeLeft <= 0) endGame();
  }, 1000);

  // Sensor é ativado somente durante a rodada.
  window.addEventListener("deviceorientation", handleOrientation, true);
  updateOrientationWarning();
}

function endGame() {
  if (!gameRunning) return;

  gameRunning = false;
  clearInterval(timerId);
  window.removeEventListener("deviceorientation", handleOrientation, true);

  document.getElementById("finalScore").textContent = score;
  document.getElementById("finalPassed").textContent = passed;
  document.getElementById("finalTotal").textContent = total;

  showScreen("result");
}

function nextWord() {
  if (!words.length) words = shuffle([...WORDS]);
  currentWord = words.pop();
  wordEl.textContent = currentWord;
  statusEl.textContent = "INCLINE O CELULAR";
}

function registerAction(action) {
  if (!gameRunning) return;

  const now = Date.now();
  if (now - lastAction < ACTION_COOLDOWN) return;
  lastAction = now;

  total++;

  if (action === "correct") {
    score++;
    statusEl.textContent = "✓ ACERTOU!";
  } else {
    passed++;
    statusEl.textContent = "↟ PASSOU";
  }

  scoreEl.textContent = score;
  passedEl.textContent = passed;

  // Pequena pausa visual para o jogador perceber a troca.
  setTimeout(() => {
    if (gameRunning) nextWord();
  }, 180);
}

function handleOrientation(event) {
  if (!gameRunning) return;

  updateOrientationWarning();

  if (!isLandscape()) {
    neutralBeta = null;
    statusEl.textContent = "VIRE PARA A HORIZONTAL";
    return;
  }

  if (typeof event.beta !== "number") return;

  // Calibra a posição inicial. O jogador pode segurar o celular
  // naturalmente sem precisar estar em um ângulo absoluto específico.
  if (neutralBeta === null) {
    neutralBeta = event.beta;
    statusEl.textContent = "PRONTO — INCLINE!";
    return;
  }

  const delta = normalizeAngle(event.beta - neutralBeta);

  if (delta >= PASS_THRESHOLD) {
    registerAction("pass");
  } else if (delta <= CORRECT_THRESHOLD) {
    registerAction("correct");
  } else {
    statusEl.textContent = "INCLINE PARA PASSAR / ACERTAR";
  }
}

function normalizeAngle(angle) {
  while (angle > 180) angle -= 360;
  while (angle < -180) angle += 360;
  return angle;
}

function isLandscape() {
  // Melhor método quando disponível.
  if (screen.orientation && screen.orientation.type) {
    return screen.orientation.type.includes("landscape");
  }

  // Fallback para navegadores que não expõem screen.orientation.
  return window.innerWidth > window.innerHeight;
}

function updateOrientationWarning() {
  orientationWarning.classList.toggle("show", !isLandscape());
}

window.addEventListener("resize", updateOrientationWarning);
window.addEventListener("orientationchange", updateOrientationWarning);

function showScreen(name) {
  Object.values(screens).forEach(screen => screen.classList.remove("active"));
  screens[name].classList.add("active");
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
