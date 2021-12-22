'use strict';
class KeyControl {
  // Mapping names to their API indices
  GAMEPAD_BUTTONS = [
    'rightPadDown',
    'rightPadRight',
    'rightPadLeft',
    'rightPadUp',
    'LB',
    'RB',
    'LT',
    'RT',
    'frontButtonLeft', // Select/back
    'frontButtonRight', // Start/forward
    'leftStickPressed',
    'rightStickPressed',
    'leftPadUp',
    'leftPadDown',
    'leftPadLeft',
    'leftPadRight',
    'centerButton',
  ];

  actions = {
    keydown: {},
    keyup: {}
  };
  tags = {};

  gamepadLoopID;
  gamepads = {};

  constructor(target, useGamepad) {
    target.addEventListener('keydown', this.keyEvent.bind(this));
    target.addEventListener('keyup', this.keyEvent.bind(this));

    if (useGamepad) {
      window.addEventListener('gamepadconnected', this.gamepadConnected.bind(this));
      window.addEventListener('gamepaddisconnected', this.gamepadDisconnected.bind(this));
    }
  }

  // ---- Gamepad functions ----
  gamepadConnected(e) {
    this.gamepads[e.gamepad.index] = e.gamepad;
    this.gamepadLoopID = requestAnimationFrame(this.gamepadLoop.bind(this));
  }
  gamepadDisconnected(e) {
    cancelAnimationFrame(this.gamepadLoopID);
    delete this.gamepads[e.gamepad.index];
  }

  gamepadLoop(e) {
    for (const gamepadIndex in this.gamepads) {
      const gamepad = this.gamepads[gamepadIndex];

      for (const actionName in this.actions.keydown) {
        const action = this.actions.keydown[actionName];

        const actionButtons = action.keys.filter(function(val) {
          return typeof val == 'number';
        });
        for (const button of actionButtons) {
          if (gamepad.buttons[button].pressed && (action.gamepadTimeout == null || action.$isReady)) {
            action.fn.call(e.currentTarget, e, actionName);

            if (action.gamepadTimeout != null) {
              action.$isReady = false;
              setTimeout(function() {
                action.$isReady = true;
              }, action.gamepadTimeout);
            }
          }
        }
      }
    }

    requestAnimationFrame(this.gamepadLoop.bind(this));
  }

  // ---- key functions ----
  keyEvent(e) {
    const eventActions = this.actions[e.type];
    for (const actionName in eventActions) {
      const action = eventActions[actionName];
      if (action.keys && (action.keys.includes(e.key) || action.keys.includes('{' + e.code + '}'))) {
        action.fn.call(e.currentTarget, e, actionName);
      }
    }
  }

  // ---- Prototype functions ----
  addTag(tagName, config) {
    this.tags[tagName] = config;
  };

  registerAction(actionName, config) {
    if ('tags' in config) {
      for (let i = 0; i < config.tags.length; i++) {
        const tagObj = this.tags[config.tags[i]];
        for (let tagProp in tagObj) {
          if (Object.prototype.hasOwnProperty.call(tagObj, tagProp) && config[tagProp] === undefined) {
            config[tagProp] = tagObj[tagProp];
          }
        }
      }
      delete config.tags;
    }

    if ('keys' in config) {
      const that = this;
      config.keys = config.keys.map(function(val) {
        if (val[0] === '[' && val[val.length - 1] === ']') {
          return that.GAMEPAD_BUTTONS.indexOf(val.slice(1, -1));
        } else {
          return val;
        }
      });
    }

    if ('gamepadTimeout' in config) {
      config.$isReady = true;
    }

    const target = this.actions[!config.event || config.event !== 'keyup' ? 'keydown' : 'keyup'];
    target[actionName] = config;
  };
  registerActions(configs) {
    for (var prop in configs) {
      this.registerAction(prop, configs[prop]);
    }
  };

  removeAction(action) {
    delete this.actions[action];
  };
}
