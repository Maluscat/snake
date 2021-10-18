'use strict';
class KeyControl {
  actions = {
    keydown: {},
    keyup: {}
  };
  tags = {};

  constructor(target) {
    target.addEventListener('keydown', this.keyEvent.bind(this));
    target.addEventListener('keyup', this.keyEvent.bind(this));
  }

  keyEvent(e) {
    const eventActions = this.actions[e.type];
    for (var prop in eventActions) {
      const action = eventActions[prop];
      if (action.keys && (action.keys.includes(e.key) || action.keys.includes('{' + e.code + '}'))) {
        action.fn.call(e.currentTarget, e, prop);
      }
    }
  }

  addTag(tagName, config) {
    this.tags[tagName] = config;
  };

  registerAction(actionName, config) {
    if (config.tags !== undefined) {
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

