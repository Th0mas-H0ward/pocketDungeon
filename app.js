import { levels } from "./levels.js";

const canvas = document.getElementById("gameCanvas");
const diceCanvas = document.getElementById("diceCanvas");
const ctx = canvas.getContext("2d");
const dctx = diceCanvas.getContext("2d");

ctx.imageSmoothingEnabled = false;
dctx.imageSmoothingEnabled = false;

ctx.clearRect(0, 0, canvas.width, canvas.height);

const tileSize = 16;
const scale = 4;
const scaledSize = tileSize * scale;
const mapSize = 5;

const tileset = new Image();
const pinkBorder = new Image();
const purpleBorder = new Image();
const diceLayout = new Image();
const diceTileSet = new Image();
const energyDiceTileSet = new Image();
tileset.src = "spriteMap.png";
pinkBorder.src = "border.png";
purpleBorder.src = "border1.png";
diceTileSet.src = "dice.png";
energyDiceTileSet.src = "blackDice.png";
diceLayout.src = "diceLayout.png";

tileset, pinkBorder, purpleBorder, diceTileSet, energyDiceTileSet, diceLayout.onload = () => {
    startGame();
};

const tileMap = {
    "P": { sx: 0, sy: 144 },
    "S": { sx: 48, sy: 127 },
    "U": { sx: 64, sy: 144 },
    "O": { sx: 48, sy: 144 },
    "G": { sx: 16, sy: 144 },
    "E": { sx: 16, sy: 32 },
    "#": { sx: 32, sy: 128 },
    ".": { sx: 80, sy: 32 },
    ",": { sx: 64, sy: 80 }
};

const diceTileMap = {
    "1": { sx: 0, sy: 0 },
    "2": { sx: 16, sy: 0 },
    "3": { sx: 32, sy: 0 },
    "4": { sx: 48, sy: 0 },
    "5": { sx: 64, sy: 0 },
    "6": { sx: 80, sy: 0 }
}

const energyDiceTileMap = diceTileMap;

let map = [];

let levelIndex = 1;

let isDragging = false;
let draggedDice = null;
let dragOffsetX = 0;
let dragOffsetY = 0;
let energyDicePositions = [];
let placedDice = [];

const snapPositions = [
    { x: 20, y: 46 },
    { x: 38, y: 46 },
    { x: 58, y: 46 },
    { x: 78, y: 46 }
];

let borderStyle;
let floorTile;

let player = { hp: 6, spd: 1, atk: 1, def: 1, rng: 2, x: 0, y: 0, moving: false };

let movePoints = 2;

let enemy = { hp: 2, spd: 6, atk: 4, def: 4, rng: 3 };

const MAX_STAT_VALUE = 6;

let statBoosts = {
    spd: 0,
    atk: 0,
    def: 0,
    rng: 0
};

let boostedStats = { ...player };

const statSlots = [
    { x: 20, y: 46, stat: 'spd', statX: 20, statY: 26 },
    { x: 39, y: 46, stat: 'atk', statX: 39, statY: 26 },
    { x: 58, y: 46, stat: 'def', statX: 58, statY: 26 },
    { x: 77, y: 46, stat: 'rng', statX: 77, statY: 26 }
];

function startGame() {
    getCurrentLevel(levelIndex);
    drawMap();
    drawDiceLayout();
    drawDice();
    throwDice();

    gameLoop();
}

function boostPlayerStat(stat) {
    boostedStats[stat] += statBoosts[stat];

    console.log(`Boosted ${stat} ` + boostedStats[stat]);
}

function resetPlayerStat(stat) {
    boostedStats[stat] = player[stat];

    console.log(`Reset ${stat} ` + boostedStats[stat]);
}

function resetAllPlayerStats() {
    for (const stat in statBoosts) {
        boostedStats[stat] = player[stat];
    }
    console.log('All stats reset', boostedStats);
}

function getCurrentLevel(levelIndex) {
    const levelKey = `lvl${levelIndex}`;
    if (levels.hasOwnProperty(levelKey)) {
        map = levels[levelKey];
    } else {
        map = levels.lvl1;
    }
}

function getNextLevel() {
    levelIndex++;
    startGame();
}

function drawDiceLayout() {
    const layoutWidth = 448;
    const layoutHeight = 528;
    const centerX = (diceCanvas.width - layoutWidth) / 2;
    const centerY = (diceCanvas.height - layoutHeight) / 2;

    dctx.drawImage(diceLayout, centerX, centerY, layoutWidth, layoutHeight);
}

function drawDice() {

    const diceSpacing = 12;

    const statsToDisplay = ['spd', 'atk', 'def', 'rng'];

    let xOffset = 80;
    let yOffset = 108;

    for (let i = 0; i < statsToDisplay.length; i++) {
        const statName = statsToDisplay[i];
        const statValue = player[statName];

        dctx.drawImage(
            diceTileSet,
            diceTileMap[statValue].sx,
            diceTileMap[statValue].sy,
            tileSize,
            tileSize,
            xOffset,
            yOffset,
            scaledSize,
            scaledSize
        );

        xOffset += scaledSize + diceSpacing;
    }
}

function throwDice() {
    statBoosts = {
        spd: 0,
        atk: 0,
        def: 0,
        rng: 0
    };

    resetAllPlayerStats()

    const originalLayoutWidth = 112;
    const originalLayoutHeight = 132;

    const originalDiceAreaWidth = 72;
    const originalDiceAreaHeight = 38;

    const originalTopOffset = 79;
    const originalSideOffset = 20;

    const layoutWidth = originalLayoutWidth * scale;
    const layoutHeight = originalLayoutHeight * scale;
    const diceAreaWidth = originalDiceAreaWidth * scale;
    const diceAreaHeight = originalDiceAreaHeight * scale;
    const topOffset = originalTopOffset * scale;
    const sideOffset = originalSideOffset * scale;

    const centerX = (diceCanvas.width - layoutWidth) / 2;
    const centerY = (diceCanvas.height - layoutHeight) / 2;

    const diceAreaX = centerX + sideOffset;
    const diceAreaY = centerY + topOffset;

    const diceAmount = 4;
    energyDicePositions = [];
    placedDice = [];

    for (let i = 0; i < diceAmount; i++) {
        let diceValue = Math.floor(Math.random() * 6) + 1;
        let diceX, diceY;
        let isOverlapping;
        let maxAttempts = 50;
        let attempts = 0;

        do {
            diceX = diceAreaX + Math.random() * (diceAreaWidth - scaledSize);
            diceY = diceAreaY + Math.random() * (diceAreaHeight - scaledSize);

            isOverlapping = energyDicePositions.some(dice =>
                Math.abs(dice.x - diceX) < scaledSize && Math.abs(dice.y - diceY) < scaledSize
            );

            attempts++;
            if (attempts >= maxAttempts) {
                console.warn("Failed to place the cube without overlapping after", maxAttempts, "attempts");
                isOverlapping = false;
            }
        } while (isOverlapping);

        energyDicePositions.push({
            x: diceX,
            y: diceY,
            value: diceValue,
            originalX: diceX,
            originalY: diceY,
            placed: false,
            boostedStat: null
        });

        dctx.drawImage(
            energyDiceTileSet,
            energyDiceTileMap[diceValue].sx,
            energyDiceTileMap[diceValue].sy,
            tileSize,
            tileSize,
            diceX,
            diceY,
            scaledSize,
            scaledSize
        );
    }
}

function redrawDice() {
    dctx.clearRect(0, 0, diceCanvas.width, diceCanvas.height);

    drawDiceLayout();

    drawDice();

    energyDicePositions.forEach(dice => {
        dctx.drawImage(
            energyDiceTileSet,
            energyDiceTileMap[dice.value].sx,
            energyDiceTileMap[dice.value].sy,
            tileSize,
            tileSize,
            dice.x,
            dice.y,
            scaledSize,
            scaledSize
        );
    });
}

diceCanvas.addEventListener('mousedown', handleMouseDown);
diceCanvas.addEventListener('mousemove', handleMouseMove);
diceCanvas.addEventListener('mouseup', handleMouseUp);

function handleMouseDown(event) {
    const rect = diceCanvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    for (let i = energyDicePositions.length - 1; i >= 0; i--) {
        const dice = energyDicePositions[i];
        if (
            mouseX >= dice.x &&
            mouseX <= dice.x + scaledSize &&
            mouseY >= dice.y &&
            mouseY <= dice.y + scaledSize
        ) {
            isDragging = true;
            draggedDice = i;
            dragOffsetX = mouseX - dice.x;
            dragOffsetY = mouseY - dice.y;

            const temp = energyDicePositions[i];
            energyDicePositions.splice(i, 1);
            energyDicePositions.push(temp);
            draggedDice = energyDicePositions.length - 1;

            break;
        }
    }
}

function handleMouseMove(event) {
    if (!isDragging || draggedDice === null) return;

    const rect = diceCanvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    energyDicePositions[draggedDice].x = mouseX - dragOffsetX;
    energyDicePositions[draggedDice].y = mouseY - dragOffsetY;

    redrawDice();
}

function handleMouseUp(event) {
    if (!isDragging || draggedDice === null) return;

    const dice = energyDicePositions[draggedDice];

    const layoutWidth = 448;
    const layoutHeight = 528;
    const centerX = (diceCanvas.width - layoutWidth) / 2;
    const centerY = (diceCanvas.height - layoutHeight) / 2;

    let closestSnapIndex = -1;
    let minDistance = Number.MAX_VALUE;

    snapPositions.forEach((slot, index) => {
        const screenX = centerX + slot.x * scale;
        const screenY = centerY + slot.y * scale;

        const distance = Math.sqrt(
            Math.pow(dice.x + scaledSize / 2 - screenX - scaledSize / 2, 2) +
            Math.pow(dice.y + scaledSize / 2 - screenY - scaledSize / 2, 2)
        );

        if (distance < minDistance) {
            minDistance = distance;
            closestSnapIndex = index;
        }
    });

    if (minDistance < scaledSize * 1.5) {
        const slot = statSlots[closestSnapIndex];
        const snapX = centerX + slot.x * scale;
        const snapY = centerY + slot.y * scale;

        const occupiedIndex = energyDicePositions.findIndex((d, idx) =>
            idx !== draggedDice &&
            d.placed &&
            Math.abs(d.x - snapX) < 5 &&
            Math.abs(d.y - snapY) < 5
        );

        if (dice.boostedStat) {
            statBoosts[dice.boostedStat] -= dice.value;
            resetPlayerStat(dice.boostedStat);
            dice.boostedStat = null;
        }

        if (occupiedIndex >= 0) {
            const occupiedDice = energyDicePositions[occupiedIndex];

            if (occupiedDice.boostedStat) {
                statBoosts[occupiedDice.boostedStat] -= occupiedDice.value;
                resetPlayerStat(occupiedDice.boostedStat);
                occupiedDice.boostedStat = null;
            }

            occupiedDice.x = occupiedDice.originalX;
            occupiedDice.y = occupiedDice.originalY;
            occupiedDice.placed = false;

            dice.x = snapX;
            dice.y = snapY;
            dice.placed = true;

            statBoosts[slot.stat] += dice.value;
            dice.boostedStat = slot.stat;

        } else {
            dice.x = snapX;
            dice.y = snapY;
            dice.placed = true;

            statBoosts[slot.stat] += dice.value;
            dice.boostedStat = slot.stat;
        }

        boostPlayerStat(slot.stat);

    } else {
        if (dice.boostedStat) {
            statBoosts[dice.boostedStat] -= dice.value;
            resetPlayerStat(dice.boostedStat);
            dice.boostedStat = null;
        }

        dice.x = dice.originalX;
        dice.y = dice.originalY;
        dice.placed = false;
    }

    isDragging = false;
    draggedDice = null;

    redrawDice();
}

function drawBorder() {
    borderStyle = (levelIndex % 2 === 0) ? purpleBorder : pinkBorder;

    const borderSize = 448;
    const centerX = (canvas.width - borderSize) / 2;
    const centerY = (canvas.height - borderSize) / 2;

    ctx.drawImage(borderStyle, centerX, centerY, borderSize, borderSize);
}

function drawTile(x, y, tile, offsetX = 0, offsetY = 0) {
    floorTile = (levelIndex % 2 === 0) ? "," : ".";

    ctx.drawImage(tileset, tileMap[floorTile].sx, tileMap[floorTile].sy, tileSize, tileSize,
        x * scaledSize + offsetX, y * scaledSize + offsetY, scaledSize, scaledSize);

    if (tile !== "." && tile !== ",") {
        let t = tileMap[tile];
        if (t) {
            ctx.drawImage(tileset, t.sx, t.sy, tileSize, tileSize,
                x * scaledSize + offsetX, y * scaledSize + offsetY, scaledSize, scaledSize);
        }
    }
}

function drawMap() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const offsetX = (canvas.width - (mapSize * scaledSize)) / 2;
    const offsetY = (canvas.height - (mapSize * scaledSize)) / 2;

    for (let y = 0; y < mapSize; y++) {
        for (let x = 0; x < mapSize; x++) {
            drawTile(x, y, map[y][x], offsetX, offsetY);
        }
    }
    drawBorder();
}

async function playerTurn() {
    movePoints = 0;

    return new Promise((resolve) => {
        function handleKeyPress(event) {
            if (player.moving) return;

            let dx = 0, dy = 0;
            let moveCost = 0;

            if (event.key === "w") { dy = -1; moveCost = 2; }
            else if (event.key === "s") { dy = 1; moveCost = 2; }
            else if (event.key === "a") { dx = -1; moveCost = 2; }
            else if (event.key === "d") { dx = 1; moveCost = 2; }
            else if (event.key === "e") { dx = 1; dy = -1; moveCost = 3; }
            else if (event.key === "q") { dx = -1; dy = -1; moveCost = 3; }
            else if (event.key === "z") { dx = -1; dy = 1; moveCost = 3; }
            else if (event.key === "c") { dx = 1; dy = 1; moveCost = 3; }

            else if (event.key === " ") {
                document.removeEventListener("keydown", handleKeyPress);
                resolve();
                return;
            }


            if (moveCost > 0 && movePoints + moveCost <= boostedStats.spd) {

                if (dx !== 0 || dy !== 0) {
                    let willMove = movePlayer(dx, dy, true);

                    if (willMove) {
                        movePoints += moveCost;
                        movePlayer(dx, dy);
                    }
                }
            }


            updateActionPointsDisplay();


            if (movePoints >= boostedStats.spd) {
                document.removeEventListener("keydown", handleKeyPress);
                resolve();
            }
        }


        document.addEventListener("keydown", handleKeyPress);


        let log = document.getElementById("log");
        log.textContent = `Your turn! Action points: ${boostedStats.spd}. Press SPACE to end your turn.`;


        updateActionPointsDisplay();
    });
}


function animateMove(oldX, oldY, newX, newY, callback) {
    const frames = 15;
    let frame = 0;


    const offsetX = (canvas.width - (mapSize * scaledSize)) / 2;
    const offsetY = (canvas.height - (mapSize * scaledSize)) / 2;

    function step() {
        frame++;
        ctx.clearRect(0, 0, canvas.width, canvas.height);


        for (let y = 0; y < mapSize; y++) {
            for (let x = 0; x < mapSize; x++) {
                drawTile(x, y, floorTile, offsetX, offsetY);
                if (map[y][x] !== floorTile && map[y][x] !== "P") {
                    drawTile(x, y, map[y][x], offsetX, offsetY);
                }
            }
        }


        let interpX = oldX * scaledSize + (newX - oldX) * scaledSize * (frame / frames) + offsetX;
        let interpY = oldY * scaledSize + (newY - oldY) * scaledSize * (frame / frames) + offsetY;

        ctx.drawImage(tileset, tileMap["P"].sx, tileMap["P"].sy, tileSize, tileSize,
            interpX, interpY, scaledSize, scaledSize);


        drawBorder();

        if (frame < frames) {
            requestAnimationFrame(step);
        } else {
            callback();
        }
    }

    step();
}



function updateActionPointsDisplay() {
    let log = document.getElementById("log");
    log.textContent = `Action points: ${boostedStats.spd - movePoints}/${boostedStats.spd}`;
}


function movePlayer(dx, dy, checkOnly = false) {
    let px, py;


    for (let y = 0; y < mapSize; y++) {
        for (let x = 0; x < mapSize; x++) {
            if (map[y][x] === "P") {
                px = x;
                py = y;
            }
        }
    }

    let newX = px + dx;
    let newY = py + dy;


    if (newX >= 0 && newX < mapSize && newY >= 0 && newY < mapSize && map[newY][newX] !== "#") {

        if (checkOnly) {
            return true;
        }


        const enemySymbols = ["S", "U", "O", "G"];
        if (enemySymbols.includes(map[newY][newX])) {

            const enemy = enemies.find(e => e.x === newX && e.y === newY);
            if (enemy && confirmPlayerAttack(enemy)) {
                playerAttack(enemy);
                if (enemy.hp <= 0) {

                    enemies = enemies.filter(e => e !== enemy);
                    map[newY][newX] = floorTile;


                    animateMove(px, py, newX, newY, () => {
                        map[py][px] = floorTile;
                        map[newY][newX] = "P";
                        player.moving = false;
                        drawMap();
                    });
                    return true;
                }
                return false;
            }
            return false;
        }


        if (map[newY][newX] === "E") {
            lvlUp();
            getNextLevel();
            return true;
        }


        player.moving = true;
        animateMove(px, py, newX, newY, () => {
            map[py][px] = floorTile;
            map[newY][newX] = "P";
            player.moving = false;
            drawMap();


            checkEnemyAttackOpportunity();
        });
        return true;
    }
    return false;
}


function confirmPlayerAttack(enemy) {
    return confirm(`Attack ${getEnemyName(enemy.type)}? (HP: ${enemy.hp}, DEF: ${enemy.def})`);
}


function getEnemyName(type) {
    switch (type) {
        case "S": return "Spider";
        case "U": return "Undead";
        case "O": return "Ogre";
        case "G": return "Ghoul";
        default: return "Monster";
    }
}


function playerAttack(enemy) {
    let log = document.getElementById("log");


    const attackPower = boostedStats.atk;
    const defensePower = enemy.def;


    const multiplier = Math.floor(attackPower / defensePower);

    if (multiplier > 0) {

        enemy.hp -= multiplier;
        log.textContent = `You hit the ${getEnemyName(enemy.type)} for ${multiplier} damage! Enemy HP: ${enemy.hp}`;

        if (enemy.hp <= 0) {
            log.textContent += ` The ${getEnemyName(enemy.type)} is defeated!`;
        }
    } else {
        log.textContent = `Your attack isn't strong enough to hurt the ${getEnemyName(enemy.type)}!`;
    }
}


let enemies = [];


function initializeEnemies() {
    enemies = [];

    for (let y = 0; y < mapSize; y++) {
        for (let x = 0; x < mapSize; x++) {
            const tile = map[y][x];
            if (["S", "U", "O", "G"].includes(tile)) {

                let enemyStats = { x, y, type: tile };

                switch (tile) {
                    case "S":
                        Object.assign(enemyStats, { hp: 2, spd: 6, atk: 1, def: 1, rng: 2 });
                        break;
                    case "U":
                        Object.assign(enemyStats, { hp: 3, spd: 4, atk: 2, def: 1, rng: 1 });
                        break;
                    case "O":
                        Object.assign(enemyStats, { hp: 5, spd: 4, atk: 3, def: 2, rng: 2 });
                        break;
                    case "G":
                        Object.assign(enemyStats, { hp: 4, spd: 6, atk: 2, def: 2, rng: 3 });
                        break;
                }

                enemies.push(enemyStats);
            }
        }
    }
}

async function enemyTurn() {
    let log = document.getElementById("log");
    log.textContent = "Enemy turn...";


    for (const enemy of enemies) {
        await processEnemyTurn(enemy);
    }

    log.textContent = "Your turn!";
}

async function processEnemyTurn(enemy) {
    return new Promise(resolve => {
        setTimeout(() => {

            let playerPos = findPlayerPosition();
            if (!playerPos) {
                resolve();
                return;
            }

            let path = findPathToPlayer(enemy, playerPos);

            moveEnemyAlongPath(enemy, path, () => {

                checkEnemyAttack(enemy, playerPos);
                resolve();
            });
        }, 500);
    });
}

function findPlayerPosition() {
    for (let y = 0; y < mapSize; y++) {
        for (let x = 0; x < mapSize; x++) {
            if (map[y][x] === "P") {
                return { x, y };
            }
        }
    }
    return null;
}

function findPathToPlayer(enemy, playerPos) {

    let queue = [];
    let visited = Array(mapSize).fill().map(() => Array(mapSize).fill(false));
    let parent = Array(mapSize).fill().map(() => Array(mapSize).fill(null));

    queue.push({ x: enemy.x, y: enemy.y });
    visited[enemy.y][enemy.x] = true;

    while (queue.length > 0) {
        let current = queue.shift();

        if (current.x === playerPos.x && current.y === playerPos.y) {
            let path = [];
            let p = current;


            while (parent[p.y][p.x]) {
                path.unshift(p);
                p = parent[p.y][p.x];
            }

            return path;
        }

        const directions = [
            { dx: 0, dy: -1, cost: 2 },
            { dx: 1, dy: 0, cost: 2 },
            { dx: 0, dy: 1, cost: 2 },
            { dx: -1, dy: 0, cost: 2 },
            { dx: 1, dy: -1, cost: 3 },
            { dx: 1, dy: 1, cost: 3 },
            { dx: -1, dy: 1, cost: 3 },
            { dx: -1, dy: -1, cost: 3 }
        ];

        for (const dir of directions) {
            const newX = current.x + dir.dx;
            const newY = current.y + dir.dy;


            if (newX >= 0 && newX < mapSize && newY >= 0 && newY < mapSize &&
                !visited[newY][newX] && map[newY][newX] !== "#") {


                const tileIsEnemy = ["S", "U", "O", "G"].includes(map[newY][newX]);
                const isPlayer = map[newY][newX] === "P";

                if (isPlayer || !tileIsEnemy || (tileIsEnemy && isPlayer)) {
                    queue.push({ x: newX, y: newY });
                    visited[newY][newX] = true;
                    parent[newY][newX] = current;
                }
            }
        }
    }

    return [];
}

function moveEnemyAlongPath(enemy, path, callback) {
    let remainingSpd = enemy.spd;
    let moveIndex = 0;

    function moveStep() {
        if (moveIndex >= path.length || remainingSpd <= 0) {

            callback();
            return;
        }

        const nextPos = path[moveIndex];

        const dx = nextPos.x - enemy.x;
        const dy = nextPos.y - enemy.y;
        const moveCost = (Math.abs(dx) === 1 && Math.abs(dy) === 1) ? 3 : 2;


        if (moveCost <= remainingSpd) {

            const destinationTile = map[nextPos.y][nextPos.x];
            const isDestinationEnemy = ["S", "U", "O", "G"].includes(destinationTile) &&
                !(nextPos.x === enemy.x && nextPos.y === enemy.y);

            if (!isDestinationEnemy || destinationTile === "P") {

                const oldX = enemy.x;
                const oldY = enemy.y;

                map[oldY][oldX] = floorTile;

                enemy.x = nextPos.x;
                enemy.y = nextPos.y;

                if (destinationTile !== "P") {
                    map[enemy.y][enemy.x] = enemy.type;
                }

                animateEnemyMove(oldX, oldY, enemy.x, enemy.y, enemy.type, () => {

                    remainingSpd -= moveCost;
                    moveIndex++;


                    moveStep();
                });
            } else {

                moveIndex++;
                moveStep();
            }
        } else {

            callback();
        }
    }
    moveStep();
}

function animateEnemyMove(oldX, oldY, newX, newY, enemyType, callback) {
    const frames = 10;
    let frame = 0;

    const offsetX = (canvas.width - (mapSize * scaledSize)) / 2;
    const offsetY = (canvas.height - (mapSize * scaledSize)) / 2;

    function step() {
        frame++;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        for (let y = 0; y < mapSize; y++) {
            for (let x = 0; x < mapSize; x++) {
                drawTile(x, y, map[y][x], offsetX, offsetY);
            }
        }

        let interpX = oldX * scaledSize + (newX - oldX) * scaledSize * (frame / frames) + offsetX;
        let interpY = oldY * scaledSize + (newY - oldY) * scaledSize * (frame / frames) + offsetY;

        ctx.drawImage(tileset, tileMap[enemyType].sx, tileMap[enemyType].sy, tileSize, tileSize,
            interpX, interpY, scaledSize, scaledSize);


        drawBorder();

        if (frame < frames) {
            requestAnimationFrame(step);
        } else {
            callback();
        }
    }

    step();
}

function checkEnemyAttack(enemy, playerPos) {

    const dx = Math.abs(playerPos.x - enemy.x);
    const dy = Math.abs(playerPos.y - enemy.y);


    let rangeCost;
    if (dx === 0 && dy === 0) {
        rangeCost = 0;
    } else if (dx === 0 || dy === 0) {
        rangeCost = 2 * Math.max(dx, dy);
    } else {
        rangeCost = 3 * Math.max(dx, dy);
    }

    if (rangeCost <= enemy.rng) {

        let log = document.getElementById("log");
        log.textContent = `${getEnemyName(enemy.type)} attacks you!`;


        const damage = Math.max(0, Math.floor(enemy.atk / player.def));

        if (damage > 0) {
            player.hp -= damage;
            log.textContent += ` You take ${damage} damage! HP: ${player.hp}`;


            if (player.hp <= 0) {
                alert("You have been defeated...");
                location.reload();
            }
        } else {
            log.textContent += " Your defense blocks the attack!";
        }
    }
}

function checkEnemyAttackOpportunity() {
    const playerPos = findPlayerPosition();
    if (!playerPos) return;

    for (const enemy of enemies) {

        const dx = Math.abs(playerPos.x - enemy.x);
        const dy = Math.abs(playerPos.y - enemy.y);


        const inRange = (dx <= 1 && dy <= 1);

        if (inRange) {

            checkEnemyAttack(enemy, playerPos);
        }
    }
}

async function gameLoop() {
    while (true) {

        initializeEnemies();


        await playerTurn();


        await enemyTurn();


        if (player.hp <= 0) {
            alert("Game Over!");
            location.reload();
            break;
        }
    }
}

function lvlUp() {
    let stat;
    let canIncrease = false;

    while (!canIncrease) {
        stat = prompt("You can increase one of your characteristics (speed(spd), attack (atk), defense (def), range (rng)) or heal (hp)");
        if (player.hasOwnProperty(stat)) {
            if (player[stat] < MAX_STAT_VALUE) {
                player[stat] += 1;
                alert(`${stat} increased by 1`);
                canIncrease = true;
            } else {
                alert(`${stat} is max`);
            }
        } else {
            alert("There is no such stat.");
        }
    }
}
