function $dump(obj) {
  console.debug(obj);
  return obj
};

function $safely(func, obj) {
  try {
    return func.call(obj);
  } catch (e) {
    console.error(e + "\n" + e.stack);
  }
};

Hammer = new Class(Observer, {
  EVENTS: $w('update connection-lost connection-error hash-changed'),
  extend: [ Options, {
    Options: {
      debug: true
    },

    component: function(id) {
      return $(id).component();
    }
  }
  ],

  initialize: function() {
    if (Hammer.instance) return Hammer.instance;

    if(!Hammer.options) throw 'missiong options';
    this.options = Hammer.options;

    if (this.options.debug) {
      $dump('Options: ' + JSON.stringify(this.options));

      this.EVENTS.map(function(hammer, event) {
        hammer.on(event, hammer.logger.debug.bind(hammer.logger, 'Event "'+event+'" fired'));
      }.curry(this));
    }

    this.on('hash-changed', function(event) {
      new Hammer.Message().send();
    });

    this.on('update', function() {
      $$('[data-js]').each('evalOnce')
    });

    this.on('connection-lost', function() {
      alert('Connection to server was lost, click OK to reload.');
      location.reload();
    });

    this.setupWebsocket();

    return Hammer.instance = this;
  },

  logger: {
    error:  function(message) {
      this._add('error', message)
    },

    warn:  function(message) {
      this._add('warn', message)
    },

    info:  function(message) {
      this._add('debug', message)
    },

    debug:  function(message) {
      this._add('debug', message, 'log')
    },

    _add: function(level, message, alternative) {
      if (console && console[level]) {
        console[level](message);
      } else if (console && alternative && console[alternative]) {
        console[alternative](message);
      } else {
        alert(message);
      }
    //    if(hammer.sendLogBack == true) new Hammer.Log('debug', message).send();
    }
  },

  setupWebsocket: function() {
    this.websocket = new WebSocket("ws://" + this.options.server + ":" + this.options.port + "/");
    this.websocket.onmessage = function(evt) {
      $safely( function() {
        hammer.logger.debug("recieving: " + evt.data);
        new Hammer.Reciever(evt.data).execute();
        hammer.fire('update')
      });
    };

    this.websocket.onclose = function() {
      hammer.fire('connection-lost');
    };
    this.websocket.onerror = function() {
      hammer.fire('connection-error')
    };

    this.websocket.onopen = function() {
      hammer.logger.debug("WebSocket connected...");
      $('hammer-loading').replace('');
      new Hammer.Message().send();
    };
  },

  location: function() {
    return location.hash.replace(/^#/, '')
  }
});

Hammer.Reciever = new Class({
  initialize: function(jsonString) {
    this.json = JSON.parse(jsonString);
  },

  execute: function() {
    if (this.json.html) this.replaceContent();
    if (this.json.js) this.evalJs();
    if (this.json.context_id) this.setContextId();
    if (this.json.update) this.update();
  //    if (this.json.hash) this._setHash();
  },

  replaceContent: function() {
    $("hammer-content").update(this.json.html);
  },

  evalJs: function() {
    eval(this.json.js);
  },

  setContextId: function() {
    hammer.options.contextId = this.json.context_id;
  },

  update: function() {
    var components = $$('.component');
    var updates = new Element('div', {
      html: this.json.update
    }).subNodes();
    var places = {};
    updates.each(function(update) {
      update.select('span[data-component-replace]').each(function(place) {
        places[place.get('data-component-replace')] = place;
      });
    });

    // remove old .changed classes
    components.each('removeClass', 'changed');

    // building tree from updates
    var tree_updates = new Element('div');
    updates.each(function(update) {
      var place = places[update.get('id')];
      if (place) {
        place.replace(update);
      } else {
        tree_updates.insert(update);
      }
    });

    // moving unchanged components
    tree_updates.select('span[data-component-replace]').each(function(place) {
      var componentId = place.get('data-component-replace');
      place.replace($(componentId));
    });

    // moving to dom
    tree_updates.subNodes().each(function(element) {
      var place = $(element.get('id'))
      if (place) {
        place.replace(element);
      } else {
        $('hammer-content').update(element, 'instead');
      }
    });
  }
});

Hammer.Message = new Class({
  initialize: function() {
    this.session_id = hammer.options.sessionId
    this.context_id = hammer.options.contextId,
    this.hash = hammer.location()
  },

  send: function() {
    var jsonString = JSON.stringify(this);
    hammer.logger.debug("sending: " + jsonString);
    if(hammer.websocket) {
      hammer.websocket.send(jsonString);
    } else {
      throw Error('no websocket')
    }
  },

  setAction: function(id, args) {
    if (id) {
      if (this.action_id)
        throw Error('already set');
      else {
        this.action_id = id;
        this.arguments = args;
      }
    }
    return this;
  },

  setFormValue: function(componentId, key, value) {
    if (!this.form) this.form = {};
    if (!this.form[componentId]) this.form[componentId] = {};
    this.form[componentId][key] = value;
    return this;
  },

  setFormValues: function(componentId, values) {
    Object.keys(values).each(function(scope, k) {
      var v = values[k];
      scope.setFormValue(componentId, k, v);
    }.curry(this));
    return this;
  },

  setComponentForm: function(component) {
    if (component) this.setFormValues(component.id, component.values());
    return this;
  }
});

Hammer.Component = new Class({
  initialize: function(element) {
    if (!element.hasClass('component')) throw 'element is not a component';
    this.element = element;
    this.id = element.get('id');
    this.form = this.element.subNodes('form').first()
  },

  values: function() {
    return this.form ? this.form.values() : {};
  }
});

Element.include({
  component: function() {
    if (this.hasClass('component')) {
      return this._component = this._component || new Hammer.Component(this);
    } else {
      return this.parents('.component').first().component();
    }
  },

  actionId: function() {
    return this.get('data-action-id');
  },

  eval: function() {
    eval(this.get('data-js'));
    return this;
  },

  evalOnce: function() {
    if (!this._evaluated) this.eval();
    this._evaluated = true;
    return this;
  }
});


document.onReady(function() {
  $safely(function() {
    hammer = new Hammer();
  });

  "a[data-action-id]".on('click', function(event) {
    event.preventDefault();
    new Hammer.Message().setAction(event.target.actionId()).send();
  });

  ".component > form".on('submit', function(event) {
    event.preventDefault();
    $safely(function() {
      new Hammer.Message().setComponentForm(event.target.component()).setAction(event.target.actionId()).send();
    });
  });

  jQuery(window).bind('hashchange', function(evt) {
    hammer.fire('hash-changed');
  });

  hammer.on('update', function() {
    Draggable.rescan('.changed');
    Droppable.rescan('.changed');
  });

  hammer.on('update', function() {
    $$('a').each(function (a) {
      a.set('href', '#' + hammer.location())
    });
  });
});

