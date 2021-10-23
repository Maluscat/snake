'use strict';
var Snake2D = (function() {
  const CELL = 18;

  let ctx;
  let applePos;
  let snakePos;
  let score = 0;
  let interval = 50;
  let timerID;
  let direction;
  let nextDirection;
  let isInitialized = false;
  const events = {};

  // --- Constructor ----
  function Snake2D(canvas) {
    ctx = canvas.getContext('2d');
    ctx.lineWidth = CELL;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }

  // ---- Internal functions ----
  function move() {
    const nextCell = Array.from(snakePos[snakePos.length - 1]);
    direction = nextDirection;

    switch (direction) {
      case 'left':
        nextCell[0]--;
        break;
      case 'right':
        nextCell[0]++;
        break;
      case 'up':
        nextCell[1]--;
        break;
      case 'down':
        nextCell[1]++;
        break;
    }

    if (nextCell[0] == applePos[0] && nextCell[1] == applePos[1]) {
      // This amazing construct loops until a random apple pos has been chosen that's not inside of the snake
      // TODO this will probably get horribly slow if only a few cells are left
      while (arrayIncludesPos(snakePos, applePos = getRandomCellPos()));
      events.score(++score);
    } else {
      snakePos.shift();
    }

    if (
      // If snake hits the wall
      nextCell[0] == -1 ||
      nextCell[1] == -1 ||
      nextCell[0] == canvas.width / CELL ||
      nextCell[1] == canvas.height / CELL ||
      // If snake hits itself
      direction && arrayIncludesPos(snakePos, nextCell)
    ) {
      gameOver();
    } else {
      snakePos.push(nextCell);
      gameCycle();
    }
  }

  function gameOver() {
    Snake2D.prototype.stopGame();
    nextDirection = null;
    isInitialized = false;
    events.gameOver();
  }

  function gameCycle() {
    clearScene();

    // for (let i = 0; i < canvas.height / CELL; i++) {
    //   for (let n = 0; n < canvas.width / CELL; n++) {
    //     drawCell([i, n], (i + n) % 2 == 0 ? '#000' : '#101010');
    //   }
    // }

    drawCircle(applePos, '#800000');

    ctx.strokeStyle = '#008000';
    ctx.beginPath();
    ctx.moveTo(snakePos[0][0] * CELL + CELL / 2, snakePos[0][1] * CELL + CELL / 2);

    let currentDir = getPosDiff(snakePos[0], snakePos[1]);
    for (let i = 1; i < snakePos.length - 1; i++) {
      const nextDir = getPosDiff(snakePos[i], snakePos[i + 1]);
      if (!nextDir || currentDir[0] !== nextDir[0] || currentDir[1] !== nextDir[1]) {
        drawLineJoin(snakePos[i]);
        currentDir = nextDir;
      }
    }
    drawLineJoin(snakePos[snakePos.length - 1]);

    ctx.stroke();
  }

  // ---- Helper functions ----
  function getPosDiff(pos1, pos2) {
    return [
      pos2[0] - pos1[0],
      pos2[1] - pos1[1]
    ];
  }
  function getRandomCellPos() {
    return [
      Math.floor(Math.random() * (canvas.width / CELL)),
      Math.floor(Math.random() * (canvas.height / CELL))
    ];
  }

  function arrayIncludesPos(baseArr, posArr) {
    for (const basePos of baseArr) {
      if (basePos[0] == posArr[0] && basePos[1] == posArr[1]) {
        return true;
      }
    }
    return false;
  }

  // ---- Drawing functions ----
  function drawCell(pos, style) {
    if (style) ctx.fillStyle = style;
    ctx.fillRect(pos[0] * CELL, pos[1] * CELL, CELL, CELL);
  }
  function drawCircle(pos, style) {
    if (style) ctx.fillStyle = style;
    ctx.beginPath();
    ctx.arc(pos[0] * CELL + CELL / 2, pos[1] * CELL + CELL / 2, CELL / 2, 0, Math.PI * 2);
    ctx.fill();
  }
  function drawLineJoin(pos) {
    ctx.lineTo(pos[0] * CELL + CELL / 2, pos[1] * CELL + CELL / 2);
  }
  function clearScene() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  // ---- Prototypes ----
  Snake2D.prototype.getGameState = function() {
    if (!isInitialized)
      return 'uninitialized';
    else if (timerID == null)
      return 'initialized';
    else if (nextDirection)
      return 'active';
    else
      return 'inactive';
  };

  Snake2D.prototype.newGame = function() {
    events.score(score = 0);

    applePos = getRandomCellPos();
    snakePos = [getRandomCellPos()];
    snakePos.push([
      snakePos[0][0],
      snakePos[0][1] + 1
    ]);

    isInitialized = true;
    move();
  };

  Snake2D.prototype.startGame = function() {
    if (nextDirection && timerID == null) timerID = setInterval(move, interval);
  };

  Snake2D.prototype.stopGame = function() {
    clearInterval(timerID);
    timerID = null;
  };

  Snake2D.prototype.toggleGame = function() {
    timerID == null ? this.startGame() : this.stopGame();
  };

  Snake2D.prototype.setSpeed = function(speed) {
    interval = speed;
  };

  Snake2D.prototype.setDirection = function(dir) {
    if (!isInitialized) return;

    if (direction != null) {
      if (direction == dir) {
        return;
      }
      for (const opposingDirs of [['left', 'right'], ['up', 'down']]) {
        if (
          direction == opposingDirs[0] && dir == opposingDirs[1] ||
          direction == opposingDirs[1] && dir == opposingDirs[0]
        ) return;
      }
    }
    nextDirection = dir;
  };

  Snake2D.prototype.addEvent = function(name, callback) {
    events[name] = callback;
  };

  return Snake2D;
}());
