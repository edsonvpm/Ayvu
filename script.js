/*
==================================================
GUESS UP
SCRIPT PRINCIPAL
==================================================
*/


/*
==================================================
BANCO DE PALAVRAS
==================================================
*/

const WORDS = [
    "ABACAXI",
    "AVIÃO",
    "BICICLETA",
    "CACHORRO",
    "CHOCOLATE",
    "ESCOLA",
    "FOGUETE",
    "GATO",
    "GELADEIRA",
    "GIRASSOL",
    "GUARDA-CHUVA",
    "HAMBÚRGUER",
    "IGREJA",
    "JACARÉ",
    "JANELA",
    "LARANJA",
    "LEÃO",
    "LIVRO",
    "MONTANHA",
    "MOUSE",
    "NAVIO",
    "NUVEM",
    "ÓCULOS",
    "PIPOCA",
    "PIRATA",
    "PIZZA",
    "PRAIA",
    "RAINHA",
    "ROBÔ",
    "SORVETE",
    "TELEVISÃO",
    "TIGRE",
    "TREM",
    "UNICÓRNIO",
    "VIOLÃO",
    "ZEBRA",

    "ASTRONAUTA",
    "BANANA",
    "BOLA",
    "BONECA",
    "BRUXA",
    "CAVALO",
    "CIRCO",
    "COELHO",
    "COMPUTADOR",
    "DINOSSAURO",
    "DRAGÃO",
    "ELEFANTE",
    "ESTRELA",
    "FUTEBOL",
    "FOCA",
    "GIRAFA",
    "HELICÓPTERO",
    "JARDIM",
    "LIMÃO",
    "MACACO",
    "MELANCIA",
    "MÚSICA",
    "PANDA",
    "PATO",
    "PEIXE",
    "PONTE",
    "RATO",
    "SAPO",
    "SOL",
    "TARTARUGA",
    "TUBARÃO",
    "URSO",
    "VAMPIRO",
    "VULCÃO",
    "XÍCARA",
    "BÚSSOLA",
    "CASTELO",
    "ESPADA",
    "FANTASMA",
    "FORMIGA",
    "GALINHA",
    "HOSPITAL",
    "ILHA",
    "LUA",
    "MÁGICO",
    "MÉDICO",
    "MOTO",
    "PARQUE",
    "POLICIAL",
    "PRINCESA",
    "PROFESSOR",
    "REI",
    "SAMBA",
    "SUPERMERCADO",
    "TAXI",
    "TRATOR",
    "VETERINÁRIO",
    "ZUMBI"
];


/*
==================================================
ELEMENTOS HTML
==================================================
*/

const screens = {
    home: document.getElementById("home"),
    game: document.getElementById("game"),
    result: document.getElementById("result")
};

const wordEl =
    document.getElementById("word");

const scoreEl =
    document.getElementById("score");

const passedEl =
    document.getElementById("passed");

const timerEl =
    document.getElementById("timer");

const statusEl =
    document.getElementById("status");

const orientationWarning =
    document.getElementById(
        "orientationWarning"
    );


/*
==================================================
CONFIGURAÇÕES DO JOGO
==================================================
*/

let selectedDuration = 60;

let timeLeft = 60;

let score = 0;

let passed = 0;

let total = 0;

let timerId = null;

let gameRunning = false;

let words = [];


/*
==================================================
CONFIGURAÇÕES DO GIROSCÓPIO
==================================================

DEAD_ZONE

Zona onde o jogador pode segurar o
celular normalmente sem disparar nada.

THRESHOLD

Ângulo necessário para executar
o comando.

RESET_ZONE

Ângulo para onde o celular precisa
voltar depois de um comando.

HOLD_TIME

Tempo que o jogador precisa permanecer
inclinado para confirmar o comando.

ACTION_COOLDOWN

Tempo mínimo entre comandos.

SAMPLE_COUNT

Quantidade de leituras usadas para
calcular uma média e reduzir tremores.
==================================================
*/

const DEAD_ZONE = 20;

const TILT_THRESHOLD = 45;

const RESET_ZONE = 15;

const HOLD_TIME = 180;

const ACTION_COOLDOWN = 1000;

const SAMPLE_COUNT = 8;


/*
==================================================
VARIÁVEIS DO SENSOR
==================================================
*/

/*
Últimas leituras do beta.
*/
let motionSamples = [];


/*
Depois de executar um comando,
fica bloqueado até voltar ao centro.
*/
let gyroLocked = false;


/*
Momento em que começou a inclinação.
*/
let tiltStartTime = null;


/*
Direção que está sendo mantida.
*/
let tiltDirection = null;


/*
Último comando executado.
*/
let lastAction = 0;


/*
==================================================
SELEÇÃO DO TEMPO
==================================================
*/

document
    .querySelectorAll(".duration")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                /*
                Remove seleção anterior.
                */

                document
                    .querySelectorAll(".duration")
                    .forEach(btn => {

                        btn.classList.remove(
                            "active"
                        );

                    });


                /*
                Seleciona o novo tempo.
                */

                button.classList.add(
                    "active"
                );


                selectedDuration =
                    Number(
                        button.dataset.seconds
                    );

            }
        );

    });


/*
==================================================
BOTÃO COMEÇAR
==================================================
*/

document
    .getElementById("startBtn")
    .addEventListener(
        "click",
        async () => {

            /*
            Primeiro pedimos permissão
            para o giroscópio.

            Isso é necessário principalmente
            no iPhone.
            */

            await requestMotionPermission();


            /*
            Depois iniciamos o jogo.
            */

            startGame();

        }
    );


/*
==================================================
BOTÃO JOGAR NOVAMENTE
==================================================
*/

document
    .getElementById("againBtn")
    .addEventListener(
        "click",
        () => {

            showScreen("home");

        }
    );


/*
==================================================
BOTÃO PASSAR
==================================================
*/

document
    .getElementById("passBtn")
    .addEventListener(
        "click",
        () => {

            registerAction("pass");

        }
    );


/*
==================================================
BOTÃO ACERTEI
==================================================
*/

document
    .getElementById("correctBtn")
    .addEventListener(
        "click",
        () => {

            registerAction("correct");

        }
    );


/*
==================================================
TECLADO
==================================================

Útil para testar o jogo no computador.

↑ = PASSAR

↓ = ACERTAR
==================================================
*/

document.addEventListener(
    "keydown",
    event => {

        if (!gameRunning) {
            return;
        }


        if (
            event.key === "ArrowUp"
        ) {

            registerAction("pass");

        }


        if (
            event.key === "ArrowDown"
        ) {

            registerAction("correct");

        }

    }
);


/*
==================================================
SOLICITAR PERMISSÃO DO SENSOR
==================================================
*/

async function requestMotionPermission() {

    /*
    Alguns navegadores não exigem
    permissão explícita.
    */

    if (
        typeof DeviceOrientationEvent ===
        "undefined"
    ) {

        return;

    }


    /*
    iOS exige requestPermission().
    */

    if (
        typeof DeviceOrientationEvent
            .requestPermission ===
        "function"
    ) {

        try {

            const permission =
                await DeviceOrientationEvent
                    .requestPermission();


            if (
                permission !==
                "granted"
            ) {

                document
                    .getElementById(
                        "permissionHint"
                    )
                    .textContent =
                    "Permissão do giroscópio não concedida. Use os botões.";

            }

        } catch (error) {

            console.warn(
                "Erro ao solicitar permissão do giroscópio:",
                error
            );

        }

    }

}


/*
==================================================
INICIAR JOGO
==================================================
*/

function startGame() {

    /*
    Reseta pontuação.
    */

    score = 0;

    passed = 0;

    total = 0;


    /*
    Reseta tempo.
    */

    timeLeft =
        selectedDuration;


    /*
    Marca jogo como ativo.
    */

    gameRunning = true;


    /*
    Reseta giroscópio.
    */

    motionSamples = [];

    gyroLocked = false;

    tiltStartTime = null;

    tiltDirection = null;

    lastAction = 0;


    /*
    Embaralha palavras.
    */

    words =
        shuffle([
            ...WORDS
        ]);


    /*
    Atualiza interface.
    */

    scoreEl.textContent =
        score;

    passedEl.textContent =
        passed;

    timerEl.textContent =
        timeLeft;


    /*
    Mostra jogo.
    */

    showScreen("game");


    /*
    Primeira palavra.
    */

    nextWord();


    /*
    Timer.
    */

    clearInterval(timerId);


    timerId =
        setInterval(
            () => {

                timeLeft--;

                timerEl.textContent =
                    timeLeft;


                if (
                    timeLeft <= 0
                ) {

                    endGame();

                }

            },
            1000
        );


    /*
    Ativa o giroscópio.
    */

    window.addEventListener(
        "deviceorientation",
        handleOrientation,
        true
    );


    /*
    Verifica orientação.
    */

    updateOrientationWarning();

}


/*
==================================================
FINALIZAR JOGO
==================================================
*/

function endGame() {

    /*
    Evita finalizar duas vezes.
    */

    if (!gameRunning) {
        return;
    }


    gameRunning = false;


    /*
    Para timer.
    */

    clearInterval(timerId);


    /*
    Remove listener do giroscópio.
    */

    window.removeEventListener(
        "deviceorientation",
        handleOrientation,
        true
    );


    /*
    Atualiza tela de resultado.
    */

    document
        .getElementById("finalScore")
        .textContent =
        score;


    document
        .getElementById("finalPassed")
        .textContent =
        passed;


    document
        .getElementById("finalTotal")
        .textContent =
        total;


    showScreen("result");

}


/*
==================================================
PRÓXIMA PALAVRA
==================================================
*/

function nextWord() {

    /*
    Quando acabarem as palavras,
    embaralha novamente.
    */

    if (
        words.length === 0
    ) {

        words =
            shuffle([
                ...WORDS
            ]);

    }


    /*
    Mostra próxima palavra.
    */

    wordEl.textContent =
        words.pop();


    /*
    Libera nova inclinação.
    */

    tiltStartTime = null;

    tiltDirection = null;

    motionSamples = [];


    /*
    Não desbloqueamos aqui.

    O desbloqueio acontece quando o
    jogador voltar fisicamente o celular
    para a zona neutra.
    */

    statusEl.textContent =
        "INCLINE O CELULAR";

}


/*
==================================================
REGISTRAR AÇÃO
==================================================
*/

function registerAction(action) {

    if (!gameRunning) {
        return;
    }


    const now =
        Date.now();


    /*
    Proteção contra múltiplos comandos
    muito próximos.
    */

    if (
        now - lastAction <
        ACTION_COOLDOWN
    ) {

        return;
    }


    lastAction =
        now;


    /*
    Conta a palavra.
    */

    total++;


    /*
    ACERTOU
    */

    if (
        action === "correct"
    ) {

        score++;


        statusEl.textContent =
            "✓ ACERTOU!";

    }


    /*
    PASSOU
    */

    else {

        passed++;


        statusEl.textContent =
            "↟ PASSOU";

    }


    /*
    Atualiza pontuação.
    */

    scoreEl.textContent =
        score;

    passedEl.textContent =
        passed;


    /*
    Pequeno atraso visual.
    */

    setTimeout(
        () => {

            if (
                gameRunning
            ) {

                nextWord();

            }

        },
        180
    );

}


/*
==================================================
GIROSCÓPIO
==================================================

IMPORTANTE:

beta positivo:

    celular inclinado com
    topo para cima

    ↓

    PASSAR


beta negativo:

    celular inclinado com
    topo para baixo

    ↓

    ACERTAR
==================================================
*/

function handleOrientation(event) {

    if (!gameRunning) {
        return;
    }


    /*
    Verifica orientação.
    */

    updateOrientationWarning();


    /*
    Se estiver vertical,
    ignoramos o giroscópio.
    */

    if (
        !isLandscape()
    ) {

        motionSamples = [];

        gyroLocked = false;

        tiltStartTime = null;

        tiltDirection = null;

        statusEl.textContent =
            "VIRE PARA A HORIZONTAL";

        return;
    }


    /*
    Verifica se temos beta.
    */

    if (
        typeof event.beta !==
        "number"
    ) {

        return;
    }


    /*
    ==================================================
    FILTRO
    ==================================================

    Adicionamos a leitura.
    */

    motionSamples.push(
        event.beta
    );


    /*
    Mantemos somente as últimas
    SAMPLE_COUNT leituras.
    */

    if (
        motionSamples.length >
        SAMPLE_COUNT
    ) {

        motionSamples.shift();

    }


    /*
    Ainda não temos leituras suficientes.
    */

    if (
        motionSamples.length <
        SAMPLE_COUNT
    ) {

        statusEl.textContent =
            "SEGURE O CELULAR...";

        return;
    }


    /*
    ==================================================
    CALCULAR MÉDIA
    ==================================================
    */

    const beta =
        motionSamples.reduce(
            (
                sum,
                value
            ) => {

                return sum + value;

            },
            0
        ) /
        motionSamples.length;


    /*
    ==================================================
    DESBLOQUEIO
    ==================================================

    Depois de passar/acertar,
    o jogador precisa voltar o celular
    para a zona neutra.

    Isso é muito importante.

    Sem isso, segurando o celular
    inclinado o jogo poderia continuar
    passando palavras.
    */

    if (
        gyroLocked
    ) {

        if (
            Math.abs(beta) <=
            RESET_ZONE
        ) {

            gyroLocked = false;

            tiltStartTime = null;

            tiltDirection = null;

            statusEl.textContent =
                "PRONTO";

        }


        /*
        Continua bloqueado.
        */

        return;
    }


    /*
    ==================================================
    DEAD ZONE
    ==================================================

    De -20° até +20°:

    NÃO FAZ NADA.
    */

    if (
        Math.abs(beta) <=
        DEAD_ZONE
    ) {

        tiltStartTime = null;

        tiltDirection = null;

        statusEl.textContent =
            "INCLINE O CELULAR";

        return;
    }


    /*
    ==================================================
    DETECTAR DIREÇÃO
    ==================================================
    */

    let direction = null;


    /*
    ==========================================
    PASSAR
    ==========================================

    O topo do celular está para cima.
    */

    if (
        beta >=
        TILT_THRESHOLD
    ) {

        direction =
            "pass";

    }


    /*
    ==========================================
    ACERTAR
    ==========================================

    O topo do celular está para baixo.
    */

    else if (
        beta <=
        -TILT_THRESHOLD
    ) {

        direction =
            "correct";

    }


    /*
    ==================================================
    ENTRE DEAD ZONE E THRESHOLD
    ==================================================

    Exemplo:

    +20° até +45°

    Ainda não executa.
    */

    if (
        direction === null
    ) {

        statusEl.textContent =
            "INCLINE MAIS...";

        tiltStartTime = null;

        tiltDirection = null;

        return;
    }


    /*
    ==================================================
    CONFIRMAR DIREÇÃO
    ==================================================

    Se começou uma nova inclinação,
    começamos a contar o tempo.
    */

    if (
        tiltDirection !==
        direction
    ) {

        tiltDirection =
            direction;

        tiltStartTime =
            Date.now();

        statusEl.textContent =
            direction === "pass"
                ? "SEGURE PARA PASSAR"
                : "SEGURE PARA ACERTAR";

        return;
    }


    /*
    ==================================================
    TEMPO INCLINADO
    ==================================================
    */

    const heldTime =
        Date.now() -
        tiltStartTime;


    /*
    Ainda não segurou tempo suficiente.
    */

    if (
        heldTime <
        HOLD_TIME
    ) {

        statusEl.textContent =
            direction === "pass"
                ? "SEGURE PARA PASSAR"
                : "SEGURE PARA ACERTAR";

        return;
    }


    /*
    ==================================================
    COOLDOWN
    ==================================================
    */

    const now =
        Date.now();


    if (
        now - lastAction <
        ACTION_COOLDOWN
    ) {

        return;
    }


    /*
    ==================================================
    EXECUTAR COMANDO
    ==================================================
    */

    lastAction =
        now;


    /*
    Bloqueia o giroscópio.

    O jogador agora precisa voltar
    o celular para a posição neutra.
    */

    gyroLocked = true;


    tiltStartTime = null;

    tiltDirection = null;


    /*
    Executa a ação.
    */

    registerAction(
        direction
    );

}


/*
==================================================
VERIFICAR ORIENTAÇÃO
==================================================
*/

function isLandscape() {

    /*
    Método principal.
    */

    if (
        screen.orientation &&
        screen.orientation.type
    ) {

        return screen.orientation.type
            .includes("landscape");

    }


    /*
    Fallback para navegadores
    que não possuem screen.orientation.
    */

    return (
        window.innerWidth >
        window.innerHeight
    );

}


/*
==================================================
AVISO DE CELULAR VERTICAL
==================================================
*/

function updateOrientationWarning() {

    if (!gameRunning) {
        return;
    }


    orientationWarning
        .classList
        .toggle(
            "show",
            !isLandscape()
        );

}


/*
==================================================
 MUDANÇA DE TAMANHO DA TELA
==================================================
*/

window.addEventListener(
    "resize",
    () => {

        setTimeout(
            updateOrientationWarning,
            100
        );

    }
);


/*
==================================================
MUDANÇA DE ORIENTAÇÃO
==================================================
*/

window.addEventListener(
    "orientationchange",
    () => {

        /*
        Dá tempo para o navegador
        atualizar a viewport.
        */

        setTimeout(
            updateOrientationWarning,
            150
        );

    }
);


/*
==================================================
TROCAR TELA
==================================================
*/

function showScreen(name) {

    Object
        .values(screens)
        .forEach(
            screen => {

                screen.classList.remove(
                    "active"
                );

            }
        );


    screens[name]
        .classList
        .add("active");

}


/*
==================================================
EMBARALHAR ARRAY
==================================================
*/

function shuffle(array) {

    for (
        let i = array.length - 1;
        i > 0;
        i--
    ) {

        const j =
            Math.floor(
                Math.random() *
                (i + 1)
            );


        [
            array[i],
            array[j]
        ] =
        [
            array[j],
            array[i]
        ];

    }


    return array;

}
