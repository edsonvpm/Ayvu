/*
==================================================
AYVU
==================================================
*/


/*
==================================================
PALAVRAS
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
ELEMENTOS
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
VARIÁVEIS DO JOGO
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
CONFIGURAÇÕES DO SENSOR
==================================================
*/

/*
Zona morta.

Movimentos pequenos são ignorados.
*/

const DEAD_ZONE = 18;


/*
Ângulo necessário para executar.
*/

const TILT_THRESHOLD = 38;


/*
Depois de executar, o aparelho precisa
voltar para essa zona para desbloquear.
*/

const RESET_ZONE = 12;


/*
Quantidade de leituras usadas no filtro.
*/

const SAMPLE_COUNT = 6;


/*
Tempo mínimo entre ações.
*/

const ACTION_COOLDOWN = 900;


/*
==================================================
ESTADO DO SENSOR
==================================================
*/

let sensorValues = [];

let gyroLocked = false;

let lastGyroAction = 0;

let sensorAvailable = false;


/*
==================================================
TEMPO SELECIONADO
==================================================
*/

document
    .querySelectorAll(".duration")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                document
                    .querySelectorAll(".duration")
                    .forEach(btn => {

                        btn.classList.remove(
                            "active"
                        );

                    });

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
COMEÇAR
==================================================
*/

document
    .getElementById("startBtn")
    .addEventListener(
        "click",
        async () => {

            await requestMotionPermission();

            startGame();

        }
    );


/*
==================================================
JOGAR NOVAMENTE
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
BOTÕES MANUAIS
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
PERMISSÃO DO SENSOR
==================================================
*/

async function requestMotionPermission() {

    /*
    Se o navegador não possui
    DeviceOrientationEvent,
    simplesmente continua.
    */

    if (
        typeof DeviceOrientationEvent ===
        "undefined"
    ) {

        return;

    }


    /*
    iPhone/iPad.

    O pedido de permissão precisa acontecer
    dentro de uma ação do usuário.
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
                permission === "granted"
            ) {

                sensorAvailable = true;

            } else {

                sensorAvailable = false;

                document
                    .getElementById(
                        "permissionHint"
                    )
                    .textContent =
                    "Permissão do giroscópio negada. Use os botões.";

            }

        } catch (error) {

            console.error(
                "Erro no giroscópio:",
                error
            );

        }

    } else {

        /*
        Android/Chrome normalmente
        não precisa de pedido explícito.
        */

        sensorAvailable = true;

    }

}


/*
==================================================
INICIAR JOGO
==================================================
*/

function startGame() {

    score = 0;

    passed = 0;

    total = 0;

    timeLeft =
        selectedDuration;

    gameRunning = true;

    words =
        shuffle([
            ...WORDS
        ]);


    /*
    Reset sensor.
    */

    sensorValues = [];

    gyroLocked = false;

    lastGyroAction = 0;


    /*
    Interface.
    */

    scoreEl.textContent =
        score;

    passedEl.textContent =
        passed;

    timerEl.textContent =
        timeLeft;


    showScreen("game");

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
    Ativa o sensor.
    */

    window.addEventListener(
        "deviceorientation",
        handleOrientation,
        true
    );


    updateOrientationWarning();

}


/*
==================================================
FINALIZAR
==================================================
*/

function endGame() {

    if (!gameRunning) {
        return;
    }

    gameRunning = false;

    clearInterval(timerId);


    window.removeEventListener(
        "deviceorientation",
        handleOrientation,
        true
    );


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

    if (
        words.length === 0
    ) {

        words =
            shuffle([
                ...WORDS
            ]);

    }


    wordEl.textContent =
        words.pop();


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
    Proteção contra múltiplos comandos.
    */

    if (
        now - lastGyroAction <
        ACTION_COOLDOWN
    ) {

        return;
    }


    lastGyroAction =
        now;


    total++;


    /*
    ACERTO.
    */

    if (
        action === "correct"
    ) {

        score++;

        statusEl.textContent =
            "✓ ACERTOU!";

    }


    /*
    PASSOU.
    */

    else {

        passed++;

        statusEl.textContent =
            "↟ PASSOU";

    }


    scoreEl.textContent =
        score;

    passedEl.textContent =
        passed;


    /*
    Próxima palavra.
    */

    setTimeout(
        () => {

            if (gameRunning) {

                nextWord();

            }

        },
        200
    );

}


/*
==================================================
GIROSCÓPIO
==================================================

IMPORTANTE:

Não usamos mais somente o beta
como anteriormente.

Calculamos um valor de inclinação
com beta e gamma.

Isso melhora a compatibilidade com
diferentes posições do celular.
==================================================
*/

function handleOrientation(event) {

    if (!gameRunning) {
        return;
    }


    /*
    Verifica se temos os valores.
    */

    if (
        typeof event.beta !==
        "number" ||

        typeof event.gamma !==
        "number"
    ) {

        return;
    }


    /*
    ==================================================
    BETA
    ==================================================

    Movimento para frente/trás.
    */

    const beta =
        event.beta;


    /*
    ==================================================
    GAMMA
    ==================================================

    Movimento lateral.
    */

    const gamma =
        event.gamma;


    /*
    ==================================================
    ESCOLHER O EIXO
    ==================================================

    Quando o aparelho está horizontal,
    dependendo da orientação física,
    beta/gamma podem trocar de função.

    Usamos o eixo que tiver maior
    inclinação.
    */

    let tilt;

    let axis;


    if (
        Math.abs(beta) >
        Math.abs(gamma)
    ) {

        tilt = beta;

        axis = "beta";

    } else {

        tilt = gamma;

        axis = "gamma";

    }


    /*
    ==================================================
    FILTRO
    ==================================================
    */

    sensorValues.push(tilt);


    if (
        sensorValues.length >
        SAMPLE_COUNT
    ) {

        sensorValues.shift();

    }


    if (
        sensorValues.length <
        SAMPLE_COUNT
    ) {

        return;
    }


    /*
    Média das leituras.
    */

    const average =
        sensorValues.reduce(
            (sum, value) =>
                sum + value,
            0
        ) /
        sensorValues.length;


    /*
    ==================================================
    DESBLOQUEIO
    ==================================================
    */

    if (gyroLocked) {

        /*
        Voltou para a posição neutra.
        */

        if (
            Math.abs(average) <=
            RESET_ZONE
        ) {

            gyroLocked = false;

            sensorValues = [];

            statusEl.textContent =
                "PRONTO";

        }

        return;
    }


    /*
    ==================================================
    DEAD ZONE
    ==================================================
    */

    if (
        Math.abs(average) <=
        DEAD_ZONE
    ) {

        statusEl.textContent =
            "INCLINE O CELULAR";

        return;
    }


    /*
    ==================================================
    MOVIMENTO
    ==================================================
    */

    let action = null;


    /*
    ==========================================
    MOVIMENTO POSITIVO
    ==========================================

    Por padrão:

    positivo = PASSAR
    */

    if (
        average >=
        TILT_THRESHOLD
    ) {

        action = "pass";

    }


    /*
    ==========================================
    MOVIMENTO NEGATIVO
    ==========================================

    negativo = ACERTAR
    */

    else if (
        average <=
        -TILT_THRESHOLD
    ) {

        action = "correct";

    }


    /*
    Ainda não inclinou o suficiente.
    */

    if (!action) {

        statusEl.textContent =
            "INCLINE MAIS...";

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
        now - lastGyroAction <
        ACTION_COOLDOWN
    ) {

        return;
    }


    /*
    ==================================================
    EXECUTAR
    ==================================================
    */

    gyroLocked = true;


    sensorValues = [];


    registerAction(
        action
    );

}


/*
==================================================
DETECTAR HORIZONTAL
==================================================
*/

function isLandscape() {

    /*
    screen.orientation.
    */

    if (
        screen.orientation &&
        screen.orientation.type
    ) {

        return screen.orientation.type
            .includes("landscape");

    }


    /*
    Fallback.
    */

    return (
        window.innerWidth >
        window.innerHeight
    );

}


/*
==================================================
AVISO DE ORIENTAÇÃO
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
RESIZE
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
ORIENTATION CHANGE
==================================================
*/

window.addEventListener(
    "orientationchange",
    () => {

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
EMBARALHAR
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
