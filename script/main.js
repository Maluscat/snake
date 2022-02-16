function handleMenu(e, menuTarget = this.dataset.menu, spacePause) {
  if (this != window && this.classList.contains('disabled')) return;

  const overlay = overlays.querySelector('[data-overlay="' + menuTarget + '"]');
  if (!overlay) throw new Error('handleMenu: no overlay for specified menuTarget "' + menuTarget + '" found');

  const activeMenu = overlays.querySelector('.menu:not(.persistent):not(.hidden):not([data-overlay="' + menuTarget + '"])');
  const persistentMenus = overlays.querySelectorAll('.menu.persistent:not(.hidden):not([data-overlay="' + menuTarget + '"])');

  // Handle overlays which have been called directly (not proxied) or which are hidden
  if (e || overlay.classList.contains('hidden')) {
    // Check if any menu is open which disables the current one. If so, return
    // This is used to deny keypresses
    const activeDisablingMenus = overlays.querySelectorAll('.menu:not(.hidden)[data-disables]:not([data-overlay="' + menuTarget + '"])');
    for (const disablingMenu of activeDisablingMenus) {
      if (disablingMenu.dataset.disables.includes(menuTarget)) {
        return;
      }
    }

    // Toggle buttons specified in `data-disables`
    if (overlay.dataset.disables) {
      const disableBtns = overlay.dataset.disables.split(',');
      for (const controlBtn of gameControlBtns) {
        if (disableBtns.includes(controlBtn.dataset.menu)) {
          toggleButton(controlBtn);
        }
      }
    }

    overlay.classList.toggle('hidden');
  }

  // Hide a potentially active non-persistent overlay
  if (activeMenu) {
    if (spacePause) return;
    activeMenu.classList.add('hidden');
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

function toggleParentOverlay(e) {
  this.parentNode.classList.toggle('backdrop-hidden');
}

function switchControlsKeyLists(e) {
  if (this.dataset.activate === 'keyboard') {
    controlsKeyListKeyboard.classList.remove('hidden');
    controlsKeyListGamepad.classList.add('hidden');
  } else if (this.dataset.activate === 'gamepad') {
    controlsKeyListGamepad.classList.remove('hidden');
    controlsKeyListKeyboard.classList.add('hidden');
  }
  for (const child of this.parentNode.children) {
    if (child !== this) {
      child.classList.remove('active');
    }
  }
  this.classList.add('active');
}

function insertNewKeyButton(btnContent, parentNode, isNewItem, eventType = 'keydown') {
  const button = keyButton.cloneNode(true);
  const container = button.querySelector('.container');
  // keeps track of the current value as stored in the keyControl actions
  let keyStr = btnContent;

  parentNode.insertBefore(button, parentNode.lastElementChild);

  const keyGroupArray = keyControl.actions[eventType][button.parentNode.dataset.keyGroup].keys;

  if (btnContent) {
    container.textContent = btnContent;
  } else {
    button.focus();
    startKeyListen();
  }

  button.addEventListener('click', startKeyListen);

  return button;


  function startKeyListen() {
    container.textContent = '...';

    button.addEventListener('keydown', listenForNewKey);
    button.addEventListener('blur', removeButton);
  }

  function listenForNewKey(e) {
    if (e.code === 'Escape') {
      removeButton();
      return;
    }
    e.preventDefault();

    let curlyCode = '{' + e.code + '}';
    let key = e.key;
    // If pressed key is a letter, uppercase it
    if (/^Key/.test(e.code) && e.key != 'ß') {
      key = key.toUpperCase();
    }

    if (e.key === e.code || 'Key' + e.key.toUpperCase() === e.code) {
      container.textContent = key;
    } else {
      container.textContent = key + ' ' + curlyCode;
    }

    updateCurrentKey(curlyCode);

    button.removeEventListener('keydown', listenForNewKey);
    button.removeEventListener('blur', removeButton);
  }

  function removeButton() {
    keyGroupArray.splice(keyGroupArray.indexOf(keyStr), 1);
    button.remove();
  }

  function updateCurrentKey(newValue) {
    if (isNewItem) {
      keyGroupArray.push(newValue);
      isNewItem = false;
    } else {
      keyGroupArray[keyGroupArray.indexOf(keyStr)] = newValue;
    }
    keyStr = newValue;
  }
}

function addControlsKeyBtn(e) {
  insertNewKeyButton(null, this.parentNode, true);
}

function focusElementInTabIndex(offset = 1) {
  if (snake.getGameState() != 'active') {
    // Idea from https://stackoverflow.com/a/35173443
    const focusableElems =
    Array.from(document.querySelectorAll('button:not([tabindex="-1"]), [tabIndex="0"]'))
    .filter(elem => {
      return elem.offsetHeight > 0 || elem.offsetWidth > 0 || elem === document.activeElement;
    });

    const focusIdx = focusableElems.indexOf(document.activeElement);
    const newIndex = focusIdx + offset;
    if (focusIdx === -1) {
      gameWindow.focus();
    } else if (newIndex >= focusableElems.length) {
      focusableElems[0].focus();
    } else if (newIndex < 0) {
      focusableElems[focusableElems.length - 1].focus();
    } else {
      focusableElems[newIndex].focus();
    }
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
  if (!overlays.querySelector('.menu:not(.hidden)')) {
    snake.setDirection(name);
    if (snake.getGameState() == 'initialized') {
      startGame();
    }
  }
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
  localStorage.setItem(localStorageKey, highscore);
  handleMenu(null, 'gameover');
}

function handleScore(score) {
  gameScoreNode.textContent = score;
  if (score > highscore) {
    updateHighscore(score);
  }
}
function updateHighscore(newHighscore) {
  highscore = newHighscore;
  highScoreNode.textContent = newHighscore;
}

function toggleButton(buttonNode) {
  if (buttonNode.classList.contains('disabled')) {
    buttonNode.removeAttribute('tabindex');
  } else {
    buttonNode.setAttribute('tabindex', '-1');
  }
  buttonNode.classList.toggle('disabled');
}
