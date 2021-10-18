function handleMenu(e, menuTarget = this.dataset.menu, spacePause) {
  if (this != window && this.classList.contains('disabled')) return;

  const overlay = overlays.querySelector('[data-overlay="' + menuTarget + '"]');
  if (!overlay) throw new Error('handleMenu: no overlay for specified menuTarget "' + menuTarget + '" found');

  const activeMenu = overlays.querySelector('.menu:not(.persistent):not(.hidden):not([data-overlay="' + menuTarget + '"])');
  const persistentMenus = overlays.querySelectorAll('.menu.persistent:not(.hidden):not([data-overlay="' + menuTarget + '"])');

  // Hide a potentially active non-persistent overlay
  if (activeMenu) {
    if (spacePause) return;
    activeMenu.classList.add('hidden');
  }

  // Toggle overlays which have been called directly by the event or which are hidden
  if (e || overlay.classList.contains('hidden')) {
    overlay.classList.toggle('hidden');

    // Toggle buttons specified in `data-disables`
    if (overlay.dataset.disables) {
      const disableBtns = overlay.dataset.disables.split(',');
      for (const controlBtn of gameControlBtns) {
        if (disableBtns.includes(controlBtn.dataset.menu)) {
          toggleButton(controlBtn);
        }
      }
    }
  }

  if (!overlay.classList.contains('hidden')) {
    if (snake.getGameState() != 'inactive') snake.stopGame();

    // Get the default focus button and focus it
    const focusBtn = overlay.querySelector('button.focus');
    if (focusBtn && !spacePause) {
      focusBtn.focus();
    }
  } else if (persistentMenus.length > 0) {
    // If there are underlying persistent menus, proxy the menu handling to them (e.g. for the button focus)
    // TODO for multiple persistent menus, implement z-indexing
    for (const menu of persistentMenus) {
      handleMenu(false, menu.dataset.overlay);
    }
  } else if (snake.getGameState() == 'initialized') {
    startGame();
  }
}

function changeDifficulty() {
  const difficulty = this.textContent.trim().toLowerCase();
  switch (difficulty) {
    case 'easy':
      snake.setSpeed(200);
      break;
    case 'medium':
      snake.setSpeed(150);
      break;
    case 'hard':
      snake.setSpeed(100);
      break;
    default:
      console.error('Incorrect difficulty button text content "%s":\n%o', difficulty, this);
  }
}

function arrowKeyPress(e, name) {
  snake.setDirection(name);
  if (snake.getGameState() == 'initialized') startGame();
}

function newGame() {
  snake.newGame();
  gameWindow.focus();
}
function startGame() {
  snake.startGame();
  gameWindow.focus();
}

function gameOver() {
  handleMenu(null, 'gameover');
}

function handleScore(score) {
  gameScoreNode.textContent = score;
  if (score > highscore) {
    highScoreNode.textContent = (highscore = score);
  }
}

function toggleButton(buttonNode) {
  if (buttonNode.classList.contains('disabled')) {
    buttonNode.removeAttribute('tabindex');
  } else {
    buttonNode.setAttribute('tabindex', '-1');
  }
  buttonNode.classList.toggle('disabled');
}
