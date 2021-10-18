'use strict';
class Snake3D extends GLBoiler {
  POINTS_VERTEX = `#version 300 es
  uniform GlobalMatrices {
    mat4 perspective;
    mat4 origin;
    mat4 scale;
    mat4 translate;
    mat4 rotateX;
    mat4 rotateY;
  };
  uniform int fieldSize;

  mat4 staticScale = mat4(
    1, 0, 0,  0,
    0, 1, 0,  0,
    0, 0, -1, 0,
    0, 0, 0,  1
  );

  out vec4 fragColor;

  void main() {
    vec3 position = vec3(gl_InstanceID % fieldSize, gl_InstanceID / (fieldSize * fieldSize), (gl_InstanceID / fieldSize) % fieldSize);
    fragColor = vec4(position / 20.0 + 0.5, 0.75);

    mat4 matrix = perspective * translate * rotateX * rotateY * scale * staticScale * origin;
    mat4 pointMat = perspective * scale * origin;

    gl_PointSize = sqrt(pow(pointMat[0][0], 2.0) + pow(pointMat[1][1], 2.0) + pow(pointMat[2][2], 2.0)) * .45;
    gl_Position = matrix * vec4(position, 1);
  }
  `;
  UNIVERSAL_VERTEX = `#version 300 es
  in vec3 colors;
  in vec4 points;

  uniform GlobalMatrices {
    mat4 perspective;
    mat4 origin;
    mat4 scale;
    mat4 translate;
    mat4 rotateX;
    mat4 rotateY;
  };
  mat4 staticScale = mat4(
    1, 0, 0,  0,
    0, 1, 0,  0,
    0, 0, -1, 0,
    0, 0, 0,  1
  );

  out vec4 fragColor;

  void main() {
    fragColor = vec4(colors, 1);
    // fragColor = vec3(0, 0.5, 0);

    mat4 matrix = perspective * translate * rotateX * rotateY * scale * staticScale * origin;
    gl_Position = matrix * points;
  }
  `;

  FRAGMENT = `#version 300 es
  precision mediump float;

  in vec4 fragColor;

  out vec4 fragOut;

  void main() {
    fragOut = fragColor;
  }
  `;

  outlinePoints;
  applePoints = new Float32Array();
  snakePoints = new Float32Array();
  pointsBuffer;
  colorsBuffer;

  dims;
  applePos;
  snakePos;
  score = 0;
  interval = 50;
  timerID;
  direction;
  nextDirection;
  isInitialized = false;
  events = {};

  constructor(canvas) {
    super(canvas, {
      // Avoid duplicatated view by manually clearing the canvas
      preserveDrawingBuffer: true
    });
    const gl = this.gl;

    this.pointsProgram = this.createProgram(this.POINTS_VERTEX, this.FRAGMENT);
    this.univerProgram = this.createProgram(this.UNIVERSAL_VERTEX, this.FRAGMENT);

    this.setDimensions();
    this.enable(gl.CULL_FACE, gl.DEPTH_TEST, gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    this.aUniverPoints = gl.getAttribLocation(this.univerProgram, 'points');
    this.uUniverColors = gl.getAttribLocation(this.univerProgram, 'colors');
    this.uPointsFieldSize = gl.getUniformLocation(this.pointsProgram, 'fieldSize');
    this.uPointsMatrices = gl.getUniformBlockIndex(this.pointsProgram, 'GlobalMatrices');
    this.uUniverMatrices = gl.getUniformBlockIndex(this.univerProgram, 'GlobalMatrices');

    // ---- vertex preparation ----
    this.pointsBuffer = gl.createBuffer();
    this.colorsBuffer = gl.createBuffer();
    const vao = gl.createVertexArray();

    gl.bindVertexArray(vao);

    // ---- matrices buffer preparation ----
    const matricesIndex = 0;
    const matricesBuffer = gl.createBuffer();
    const matricesSize = 6 * 64; // 6 matrices * (4 bytes * 16 fields)

    gl.uniformBlockBinding(this.pointsProgram, this.uPointsMatrices, matricesIndex);
    gl.uniformBlockBinding(this.univerProgram, this.uUniverMatrices, matricesIndex);

    gl.bindBuffer(gl.UNIFORM_BUFFER, matricesBuffer);
    gl.bufferData(gl.UNIFORM_BUFFER, matricesSize, gl.DYNAMIC_DRAW);

    this.fillUniformMatrixBuffer('perspective', 0, [canvas, 2.175, 1, 250]);

    gl.bindBufferBase(gl.UNIFORM_BUFFER, matricesIndex, matricesBuffer);

    // ---- misc preparation ----
    this.updateFieldSize(10);

    // ---- controls ----
    this.controls = new Controls3D(canvas, this);
    this.controls.assignNewState({
      scale: {
        x: 1.65,
        y: 1.65,
        z: 1.65
      },
      tran: {
        z: -30
      },
    });
  }

  draw() {
    // Clear canvas, as preserveDrawingBuffer was set in the constructor
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

    this.fillUniformMatrixBuffer('scale', 2 * 64, Object.values(this.controls.state.scale));
    this.fillUniformMatrixBuffer('translate', 3 * 64, Object.values(this.controls.state.tran));
    this.fillUniformMatrixBuffer('rotateX', 4 * 64, [this.controls.state.rot.x]);
    this.fillUniformMatrixBuffer('rotateY', 5 * 64, [this.controls.state.rot.y]);

    this.gl.useProgram(this.univerProgram);

    // this.gl.enableVertexAttribArray(this.aUniverColors);
    this.gl.enableVertexAttribArray(this.aUniverPoints);

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.pointsBuffer);
    this.gl.vertexAttribPointer(this.aUniverPoints, 3, this.gl.FLOAT, false, 0, 0);

    this.gl.bufferData(this.gl.ARRAY_BUFFER, this.outlinePoints, this.gl.STATIC_DRAW);
    this.gl.vertexAttrib3f(this.aUniverColors, 0.5, 0.25, 0.75);
    this.gl.drawArrays(this.gl.LINES, 0, 24);

    this.gl.bufferData(this.gl.ARRAY_BUFFER, this.snakePoints, this.gl.STATIC_DRAW);
    this.gl.vertexAttrib3f(this.aUniverColors, 0, 0.5, 0);
    this.gl.drawArrays(this.gl.TRIANGLES, 0, (this.snakePoints.length / 3));

    this.gl.bufferData(this.gl.ARRAY_BUFFER, this.applePoints, this.gl.STATIC_DRAW);
    this.gl.vertexAttrib3f(this.aUniverColors, 0.5, 0, 0);
    this.gl.drawArrays(this.gl.TRIANGLES, 0, (this.applePoints.length / 3));

    this.gl.disableVertexAttribArray(this.aUniverPoints);
    // this.gl.disableVertexAttribArray(this.aUniverColors);

    this.gl.useProgram(this.pointsProgram);
    this.gl.depthMask(false);
    this.gl.drawArraysInstanced(this.gl.POINTS, 0, 1, (this.dims + 1) * (this.dims + 1) * (this.dims + 1));
    this.gl.depthMask(true);
  };


  // ---- general functions ----
  move() {
    const nextCell = Array.from(this.snakePos[this.snakePos.length - 1]);
    this.direction = this.nextDirection;

    switch (this.direction) {
      case 'left':
        nextCell[0]--;
        break;
      case 'right':
        nextCell[0]++;
        break;
      case 'down':
        nextCell[1]--;
        break;
      case 'up':
        nextCell[1]++;
        break;
      case 'backward':
        nextCell[2]--;
        break;
      case 'forward':
        nextCell[2]++;
        break;
    }

    if (nextCell[0] == this.applePos[0] && nextCell[1] == this.applePos[1] && nextCell[2] == this.applePos[2]) {
      // This amazing construct loops until a random apple pos has been chosen that's not inside of the snake
      // TODO this will probably get horribly slow if only a few cells are left
      while (this.arrayIncludesPos(this.snakePos, this.applePos = this.getRandomCellPos()));
      this.events.score(++this.score);
    } else {
      this.snakePos.shift();
    }

    if (
      // If snake hits the wall
      nextCell[0] == -1 ||
      nextCell[1] == -1 ||
      nextCell[2] == -1 ||
      nextCell[0] == this.dims ||
      nextCell[1] == this.dims ||
      nextCell[2] == this.dims ||
      // If snake hits itself
      this.direction && this.arrayIncludesPos(this.snakePos, nextCell)
    ) {
      this.gameOver();
    } else {
      this.snakePos.push(nextCell);
      this.drawGameCycle();
    }
  }

  drawGameCycle() {
    const snakePoints = new Array();
    for (const pos of this.snakePos) {
      snakePoints.push(...this.getPosCube(pos));
    }

    this.snakePoints = new Float32Array(snakePoints);

    this.applePoints = new Float32Array(this.getPosCube(this.applePos));

    this.draw();
  }

  gameOver() {
    this.stopGame();
    this.nextDirection = null;
    this.isInitialized = false;
    this.events.gameOver();
  }


  // ---- drawing helper functions ----
  getPosCube(pos) {
    return [
      // front
      pos[0],   pos[1],   pos[2],
      pos[0]+1, pos[1],   pos[2],
      pos[0]+1, pos[1]+1, pos[2],
      pos[0],   pos[1],   pos[2],
      pos[0]+1, pos[1]+1, pos[2],
      pos[0],   pos[1]+1, pos[2],
      // top
      pos[0],   pos[1]+1, pos[2],
      pos[0]+1, pos[1]+1, pos[2],
      pos[0]+1, pos[1]+1, pos[2]+1,
      pos[0],   pos[1]+1, pos[2],
      pos[0]+1, pos[1]+1, pos[2]+1,
      pos[0],   pos[1]+1, pos[2]+1,
      // bottom
      pos[0],   pos[1],   pos[2]+1,
      pos[0]+1, pos[1],   pos[2]+1,
      pos[0]+1, pos[1],   pos[2],
      pos[0],   pos[1],   pos[2]+1,
      pos[0]+1, pos[1],   pos[2],
      pos[0],   pos[1],   pos[2],
      // left
      pos[0],   pos[1],   pos[2]+1,
      pos[0],   pos[1],   pos[2],
      pos[0],   pos[1]+1, pos[2],
      pos[0],   pos[1],   pos[2]+1,
      pos[0],   pos[1]+1, pos[2],
      pos[0],   pos[1]+1, pos[2]+1,
      // right
      pos[0]+1, pos[1],   pos[2],
      pos[0]+1, pos[1],   pos[2]+1,
      pos[0]+1, pos[1]+1, pos[2]+1,
      pos[0]+1, pos[1],   pos[2],
      pos[0]+1, pos[1]+1, pos[2]+1,
      pos[0]+1, pos[1]+1, pos[2],
      // back
      pos[0]+1, pos[1],   pos[2]+1,
      pos[0],   pos[1],   pos[2]+1,
      pos[0],   pos[1]+1, pos[2]+1,
      pos[0]+1, pos[1],   pos[2]+1,
      pos[0],   pos[1]+1, pos[2]+1,
      pos[0]+1, pos[1]+1, pos[2]+1,
    ];
  }

  // ---- helper functions ----
  getPosDiff(pos1, pos2) {
    return [
      pos2[0] - pos1[0],
      pos2[1] - pos1[1],
      pos2[2] - pos1[2]
    ];
  }
  getRandomCellPos() {
    return [
      Math.floor(Math.random() * this.dims),
      Math.floor(Math.random() * this.dims),
      Math.floor(Math.random() * this.dims)
    ];
  }

  arrayIncludesPos(baseArr, posArr) {
    for (const basePos of baseArr) {
      if (basePos[0] == posArr[0] && basePos[1] == posArr[1] && basePos[2] == posArr[2]) {
        return true;
      }
    }
    return false;
  }


  // ---- class functions ----
  getGameState() {
    if (!this.isInitialized)
      return 'uninitialized';
    else if (this.timerID == null)
      return 'initialized';
    else if (this.nextDirection)
      return 'active';
    else
      return 'inactive';
  };

  newGame() {
    this.events.score(this.score = 0);

    this.applePos = this.getRandomCellPos();
    this.snakePos = [this.getRandomCellPos()];
    this.snakePos.push([
      this.snakePos[0][0],
      this.snakePos[0][1],
      this.snakePos[0][2]
    ]);

    this.isInitialized = true;
    this.move();
  };

  startGame() {
    if (this.nextDirection && this.timerID == null) this.timerID = setInterval(this.move.bind(this), this.interval);
  };

  stopGame() {
    clearInterval(this.timerID);
    this.timerID = null;
  };

  toggleGame() {
    this.timerID == null ? this.startGame() : this.stopGame();
  };

  setSpeed(speed) {
    this.interval = speed;
  };

  setDirection(dir) {
    if (!this.isInitialized) return;

    if (this.direction != null) {
      if (this.direction == dir) {
        return;
      }
      for (const opposingDirs of [['left', 'right'], ['up', 'down'], ['backward', 'forward']]) {
        if (
          this.direction == opposingDirs[0] && dir == opposingDirs[1] ||
          this.direction == opposingDirs[1] && dir == opposingDirs[0]
        ) return;
      }
    }
    this.nextDirection = dir;
  };

  addEvent(name, callback) {
    this.events[name] = callback;
  };

  updateFieldSize(newSize) {
    this.gl.useProgram(this.pointsProgram);
    this.gl.uniform1i(this.uPointsFieldSize, newSize + 1);
    this.dims = newSize;

    this.fillUniformMatrixBuffer('origin', 1 * 64, [newSize / -2, newSize / -2, newSize / -2]);

    this.outlinePoints = new Float32Array([
      0, 0, 0,
      newSize, 0, 0,
      newSize, 0, 0,
      newSize, newSize, 0,
      newSize, newSize, 0,
      0, newSize, 0,
      0, newSize, 0,
      0, 0, 0,
      0, 0, newSize,
      newSize, 0, newSize,
      newSize, 0, newSize,
      newSize, newSize, newSize,
      newSize, newSize, newSize,
      0, newSize, newSize,
      0, newSize, newSize,
      0, 0, newSize,
      0, 0, 0,
      0, 0, newSize,
      newSize, 0, 0,
      newSize, 0, newSize,
      newSize, newSize, 0,
      newSize, newSize, newSize,
      0, newSize, 0,
      0, newSize, newSize,
    ]);
  }
}
