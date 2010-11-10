(function(window, document, RightJS) {

  var $dump = function $dump(obj) {
    console.debug(obj);
    return obj
  };

  var $safely = function $safely(func, obj) {
    try {
      return func.call(obj);
    } catch (e) {
      console.error(e + "\n" + e.stack);
    }
  };

  var
  R        = RightJS,
  $        = RightJS.$,
  $$        = RightJS.$$,
  $w       = RightJS.$w,
  Class    = RightJS.Class,
  Options    = RightJS.Options,
  //  isHash   = RightJS.isHash,
  //  isArray  = RightJS.isArray,
  Element  = RightJS.Element,
  Observer = RightJS.Observer;

  var Hammer = new Class(Observer, {
    EVENTS: $w('update connection-lost connection-error hash-changed'),
    extend: [ Options, {
      Options: {
        debug: true
      },

      component: function(id) {
        return $(id).component();
      }
    }],

    initialize: function() {
      if (Hammer.instance) return Hammer.instance;

      if(!Hammer.options) throw 'missiong options';
      this.options = Hammer.options;

      if (this.options.debug) {
        $dump('Options: ' + JSON.stringify(this.options));

        this.EVENTS.map(R(function(hammer, event) {
          hammer.on(event, hammer.logger.debug.bind(hammer.logger, 'Event "'+event+'" fired'));
        }).curry(this));
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
          HammerInst.logger.debug("recieving: " + evt.data);
          new Hammer.Reciever(evt.data).execute();
          HammerInst.fire('update')
        });
      };

      this.websocket.onclose = function() {
        HammerInst.fire('connection-lost');
      };
      this.websocket.onerror = function() {
        HammerInst.fire('connection-error')
      };

      this.websocket.onopen = function() {
        HammerInst.logger.debug("WebSocket connected...");
        $('hammer-loading').remove();
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
      R(Object.keys(this.json)).each(R(function (scope, key) {
        if (key == 'js') scope.evalJs();
        else if (key == 'context_id') scope.contextId();
        else if (key == 'update') scope.update();
        else HammerInst.logger.error("unknown command: " + key);
      }).curry(this));
    //    if (this.json.hash) this._setHash();
    },

    evalJs: function() {
      eval(this.json.js);
    },

    contextId: function() {
      if (!HammerInst.options.contextId) {
        HammerInst.options.contextId = this.json.context_id;
      } else if (HammerInst.options.contextId != this.json.context_id) {
        HammerInst.logger.error("difrent context id recieved"); // FIXME deal with it don't just throw error
      }
    },

    update: function() {
      var components = $$('.component');
      var updates = new Element('div', {
        html: this.json.update
      }).children().map(function (elem) {
        var component = new Hammer.Component('div', {
          'html': elem.html()
        })
        R(elem.attributes()).each(function(attr) {
          component.set(attr, elem.get(attr));
        });
        return component;
      });
      var places = {};

      // collecting places
      updates.each(function(update) {
        update.find('ins.insert_component').each(function(place) {
          places[place.text()] = place;
        });
      });

      // updating .changed classes
      components.each('removeClass', 'changed');
      updates.each('addClass', 'changed');

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
      tree_updates.select('ins.insert_component').each(function(place) {
        var componentId = place.text();
        place.replace($(componentId));
      });

      // moving to dom
      tree_updates.subNodes().each(function(element) {
        var place_id = element.get('id'), place = $(place_id);
        if (place) {
          place.replace(element);
        } else if (element.hasClass('root')) {
          $('hammer-content').update(element, 'instead');
        } else {
          HammerInst.logger.error("no place for component with id: " + place_id );
        }
      });
    }
  });

  Hammer.Message = new Class({
    initialize: function() {
      this.session_id = HammerInst.options.sessionId
      this.context_id = HammerInst.options.contextId,
      this.hash = HammerInst.location()
    },

    send: function() {
      var jsonString = JSON.stringify(this);
      HammerInst.logger.debug("sending: " + jsonString);
      if(HammerInst.websocket) {
        HammerInst.websocket.send(jsonString);
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
      R(Object.keys(values)).each(R(function(scope, k) {
        var v = values[k];
        scope.setFormValue(componentId, k, v);
      }).curry(this));
      return this;
    },

    setComponentForm: function(component) {
      if (component) this.setFormValues(component.id(), component.values());
      return this;
    }
  });

  Hammer.Component = new Class(Element, {
    id: function () {
      return this.get('id');
    },

    form: function() {
      return this.children('form').first();
    },

    values: function() {
      return this.form() ? this.form().values() : {};
    }
  });

  Element.include({
    component: function() {
      if (this instanceof Hammer.Component) {
        return this
      } else {
        return this.parents('.component').first();
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
    },

    attributes: function() {
      var attrs = [], i, raw_attrs = this._.attributes;
      for (i = 0; i < raw_attrs.length; i++) {
        var attr = raw_attrs[i]
        attrs.push(attr.name)
      }
      return attrs;
    }
  });


  $(document).onReady(function() {
    $safely(function() {
      window.HammerInst = new Hammer();
    });

    R("a[data-action-id]").on('click', function(event) {
      event.preventDefault();
      new Hammer.Message().setAction(event.target.actionId()).send();
    });

    R(".component > form").on('submit', function(event) {
      event.preventDefault();
      $safely(function() {
        new Hammer.Message().setComponentForm(event.target.component()).setAction(event.target.actionId()).send();
      });
    });

    jQuery(window).bind('hashchange', function(evt) {
      HammerInst.fire('hash-changed');
    });

    HammerInst.on('update', function() {
      Draggable.rescan('.changed');
      Droppable.rescan('.changed');
    });

    HammerInst.on('update', function() {
      $$('a').each(function (a) {
        a.set('href', '#' + HammerInst.location())
      });
    });
  });

  window.Hammer = Hammer;

})(window, document, RightJS);





