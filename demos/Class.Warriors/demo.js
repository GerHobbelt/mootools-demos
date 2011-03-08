

// Fx.Sprite by Amadeus: https://github.com/amadeus/Fx.Sprite
(function(){

var spriteKey = (function(){
	var list = ['', 'webkit', 'Moz', 'O', 'ms'],
		element = document.html;

	for (var i = 0; i < list.length; i++){
	var prefix = list[i];
		if (element.style[prefix + 'Transform'] != null)
			return prefix + 'Transform';
		else if (element.style['transform'] != null)
			return 'transform';
	}
	return 'left';
})(),

spriteValue = (function(){
	if (spriteKey === 'webkitTransform' || spriteKey === 'transform')
		return 'translate3d(-{pos}px, 0, 0)';
	if (spriteKey === 'left') return '-{pos}px';
	else return 'translateX(-{pos}px)';
})();


Fx.Sprite = new Class({

	Extends: Fx,

	options: {
		fps: 10,
		width: 40,
		height: 40,
		frames: 4,
		initialFrame: 0,
		loop: true,
		link: 'cancel'
	},

	frame: 0,

	initialize: function(sprite, options){
		this.sprite = (typeOf(sprite) == 'string')
			? new Element('img', { src: sprite })
			: document.id(sprite);
		this.setOptions(options);
		this.options.frameStep = (this.options.frameStep)
			? this.options.frameStep
			: this.options.width / this.options.frames;

		this.sprite.setStyles({
			width: this.options.width,
			height: this.options.height,
			position: 'absolute',
			top: 0,
			left: 0
		});

		this.subject = new Element('div', {
			styles: {
				position: 'relative',
				width: this.options.frameStep,
				height: this.options.height,
				overflow: 'hidden'
			}
		}).adopt(this.sprite);

		if (this.options.container) this.subject.inject(document.id(this.options.container));
	},

	step: function(){
		this.setFrame(this.frame + 1);
		if (this.isRunning()) this.fireEvent('step', [this.frame, this.subject]);
		return this;
	},

	setFrame: function(frameIndex){
		// Manage looping
		if (frameIndex >= this.options.frames) {
			if (!this.options.loop) return this.stop();
			frameIndex = 0;
			this.fireEvent('iterate', [frameIndex, this.subject]);
		}

		this.frame = frameIndex;
		var o = { pos: this.frame * this.options.frameStep };
		this.sprite.setStyle(spriteKey, spriteValue.substitute(o));

		return this;
	},

	stop: function(){
		this.parent();
		this.setFrame(0);
		return this;
	},

	toElement: function(){
		return this.subject;
	}
});

}).call(this);


// Create Mixin for Fx.Sprite, which we can easily implement
// in other classes to use Fx.Sprite
Fx.Sprite.Mixin = new Class({

	$sprite: null,

	initSprite: function(options){
		options.container = this.element;
		this.$sprite = new Fx.Sprite(options.url, options).start();
		return this;
	},

	startSprite: function(){
		if (this.$sprite) this.$sprite.start();
		return this;
	},

	pauseSprite: function(){
		if (this.$sprite) this.$sprite.pause();
		return this;
	},

	stopSprite: function(){
		if (this.$sprite) this.$sprite.stop();
		return this;
	}

});


// Extend Fx to make a continues walking motion
Fx.Walk = new Class({

	Extends: Fx,

	options: {
		limits: {x: [0, 100], y: [0, 100]},
		modifiers: {x: 'left', y: 'top'},
		speed: 200
	},

	initialize: function(subject, options){
		subject = this.subject = document.id(subject);
		this.parent(options);
		var modifiers = this.options.modifiers;
		var current = Object.map(subject.getStyles(Object.values(modifiers)), function(value){
			return (value == 'auto') ? 0 : value.toInt();
		});
		this.current = {x: current[modifiers.x], y: current[modifiers.y]};
		this.modify = {x: 0, y: 0};
	},

	step: function(now){
		var diff = (this.time != null) ? (now - this.time) : 0;
		this.time = now;
		Object.each(this.modify, function(speed, z){
			var current = this.current[z] += (speed * diff / 1000).round();
			var limits = this.options.limits[z];
			if (speed < 0 && current < limits[0]){
				this.current[z] = limits[0];
				this.stop(z);
			}
			if (speed > 0 && current > limits[1]){
				this.current[z] = limits[1];
				this.stop(z);
			}
		}, this);
		var styles = Object.values(this.current).associate(
			Object.values(this.options.modifiers)
		);
		this.fireEvent('step', [this.current, this.subject]);
		this.subject.setStyles(styles);
	},

	start: function(direction, sign, speed){
		sign = (sign == null || sign > 0) ? 1 : -1;
		if (!speed) speed = this.options.speed;
		this.modify[direction] = sign * speed;
		this.parent();
		this.frames = this.frame = 1;
		return this;
	},

	stop: function(direction){
		if (direction) this.modify[direction] = 0;
		if (!direction || (this.modify.x == 0 && this.modify.y == 0)){
			if (!direction) this.modify = {x: 0, y: 0};
			this.parent();
		}
		return this;
	},

	toElement: function(){
		return this.subject;
	}

});

// A simple mixin for Walk so we can implement it in other classes
Fx.Walk.Mixin = new Class({

	initWalk: function(element, options){
		this.$walker = new Fx.Walk(element, options);
		var self = this,
			keys = this.options.walking.keys;

		this.walkEvents = {
			keydown: function(event){
				var direction = Object.keyOf(keys, event.key);
				if (direction) self['walk' + direction.capitalize()]();
			},
			keyup: function(event){
				var direction = Object.keyOf(keys, event.key);
				self.stopWalk(['left', 'right'].contains(direction) ? 'x' : 'y');
			}
		};
		this.attachWalk();
		return this;
	},

	stopWalk: function(direction){
		this.$walker.stop(direction);
		return this;
	},

	attachWalk: function(){
		document.addEvents(this.walkEvents);
	},

	detachWalk: function(){
		document.removeEvents(this.walkEvents);
	}

});

// Walk to different directions
[
	['left',  'x', -1],
	['right', 'x',  1],
	['up',    'y', -1],
	['down',  'y',  1]
].each(function(options){
	Fx.Walk.Mixin.implement('walk' + options[0].capitalize(), function(speed){
		this.$walker.start(options[1], options[2], speed);
		return this;
	});
});

Fx.Gravity = new Class({

	Extends: Fx,

	options: {
		limits: {x: [0, 760], y: [0, 500]},
		modifiers: {x: 'left', y: 'top'},
		speed: {x: 20, y: 0},
		accel: {x: 0, y: 9.81},
		bounce: {x: 0.2, y: 0.6},
		minSpeed: 0.5,
		duration: 20000
	},

	initialize: function(subject, options){
		subject = this.subject = document.id(subject);
		this.parent(options);
	},

	step: function(now){
		var dt = (this.time != null) ? (now - this.time) / 100 : 0,
			t = 0;
		this.time = now;
		if (this.startTime == null) this.startTime = now;
		else t = now - this.startTime;

		var speedOld = Object.clone(this.speed),
			accel = this.options.accel,
			bounce = this.options.bounce,
			limits = this.options.limits;

		var position = Object.map(this.from, function(pos, z){
			this.speed[z] += accel[z] * dt;
			this.from[z] += this.speed[z] * dt;

			limits[z].each(function(limit, side){
				if ((side ? 1 : -1) * this.from[z] > limit){
					this.from[z] = limit;
					this.speed[z] *= bounce[z] * -1;
				}
			}, this);

			return this.from[z];
		}, this);

		this.fireEvent('step', [position, this.subject]);
		var styles = Object.values(position).associate(
			Object.values(this.options.modifiers)
		);
		this.subject.setStyles(styles);

		var x = this.speed.x - speedOld.x,
			y = this.speed.y - speedOld.y,
			z = this.options.minSpeed;
		if (t > 500 && ((x * x + y * y) < (z * z) || t > this.options.duration)) this.stop();
		return this;
	},

	start: function(from, speed){
		this.startTime = null;
		this.speed = speed || Object.map(this.options.speed, function(speed){
			return (typeOf(speed) == 'array') ? Number.random(speed[0], speed[1]) : speed;
		});
		this.parent(from || {x: 0, y: 0});
		this.frames = this.frame = 1;
		return this;
	}

});

Fx.Gravity.Mixin = new Class({

	$gravity: null,

	initGravity: function(options){
		this.$gravity = new Fx.Gravity(this.element, options);
		return this;
	},

	drop: function(from){
		this.$gravity.start(from);
		return this;
	}

});

// Create a base class for objects on the battlefied
var BattleFieldObject = new Class({

	$coords: {x: 0, y: 0, width: 0, height: 0},

	getCoords: function(){
		return this.$coords;
	},

	setCoords: function(coords){
		Object.merge(this.$coords, coords);
		return this;
	},

	getDistanceTo: function(object){
		if (!object.getCoords) return null;
		var coords1 = this.getCoords(),
			coords2 = object.getCoords(),
			x = coords1.x + coords1.width / 2
			 - (coords2.x + coords2.width / 2),
			y = coords1.y + coords1.height / 2
			 - (coords2.y + coords2.height / 2);
		return Math.sqrt(x * x + y * y);
	}

}).extend('calculateCoords', function(element){
	return Object.map(Object.merge({
		x: element.getStyle('left'),
		y: element.getStyle('top')
	}, element.getStyles('width', 'height')), function(value){
		return value.toInt();
	});
});

// This is where the interesing stuff begins
// We create a base class for every mammels
var Mammal = new Class({

	Extends: BattleFieldObject,

	Implements: [Fx.Walk.Mixin, Fx.Sprite.Mixin, Options, Events],

	options: {
		protection: 20,
		power: 20,
		walking: {
			keys: {left: 'h', right: 'l', up: 'k', down: 'j'}
		},
		sprite: null
	},

	energy: 100,

	initialize: function(element, options){
		element = this.element = document.id(element);
		this.setOptions(options);
		this.initWalk(element, options.walking);
		if (this.options.sprite) this.initSprite(this.options.sprite);

		// Set initial coordinates
		this.setCoords(BattleFieldObject.calculateCoords(element));

		// Update coordinates when they change
		this.$walker.addEvent('step', function(position){
			this.setCoords(position);
		}.bind(this));
	},

	eat: function(food){
		if (instanceOf(food, Food)) this.setEnergy(this.energy + food.energy);
		return this;
	},

	sleep: function(hours){
		if (this.sleeping) return this;
		this.detachWalk();
		this.sleeping = true;
		this.stopSprite();
		if (!hours) hours = 1;
		this.fireEvent('sleep', hours);
		(function(){
			this.sleeping = false;
			this.attachWalk();
			this.startSprite();
			this.fireEvent('readySleeping', hours);
		}).delay(hours * 3000, this);
		return this.setEnergy(this.energy + hours * 10);
	},

	setEnergy: function(energy){
		if (this.energy == 0) return this;
		this.energy = energy.round();
		if (this.energy < 0) this.energy = 0;
		if (this.energy > 100) this.energy = 100;
		this.fireEvent('energyChange', this.energy);
		if (this.energy == 0){
			this.detachWalk();
			this.stopSprite();
			this.fireEvent('die');
		}
		return this;
	},

	reincarnate: function(){
		if (this.energy == 0){
			this.energy = 100;
			this.attachWalk();
			this.startSprite();
			this.fireEvent('reincarnate').fireEvent('energyChange', 100);
		}
		return this;
	}

});

// A human is a mammal, and we assume only humans have names
var Human = new Class({

	Extends: Mammal,

	options: {
		name: 'Bob'
	},

	initialize: function(element, info, options){
		this.parent(element, options);
		element = this.element.set('tween', {link: 'chain'});

		info = this.info = document.id(info);
		info.getElement('.name').set('text', this.options.name);

		var energyBar = info.getElement('.energy').set('tween', {link: 'cancel'});

		this.addEvent('energyChange', function(energy){
			element.fade(energy * 0.8 / 100 + 0.2);
			energyBar.tween('width', energy * 1.5);
		}, true);

		var originalColor = energyBar.getStyle('background-color');
		this.addEvent('die', function(){
			energyBar.setStyle('background-color', '#f00').tween('width', 150);
		}, true);

		this.addEvent('reincarnate', function(){
			energyBar.setStyle('background-color', originalColor);
		});
	}

});

// Warrior extends a human. This adds attack method
var Warrior = new Class({

	Extends: Human,

	options: {
		attackRange: 250,
		power: 60,
		armour: 70
	},

	attack: function(prey){
		if (this.sleeping || this.energy == 0) return this;
		if (instanceOf(prey, Human)){
			var distance = this.getDistanceTo(prey),
				loose = (distance > this.options.attackRange) ? 0 : (
						this.options.power * 0.5
						+ this.energy * 0.3
					) / (
						prey.options.armour * 0.3
						* distance * 0.01
					) * 10 ;

			prey.setEnergy(prey.energy - loose);
			prey.fireEvent('attacked', prey.energy);
		}
		return this;
	},

	fire: function(target){
		if (this.getWeapon && this.energy > 0){
			var weapon = this.getWeapon();
			weapon.fire(target);
		}
		return this;
	}

});

// Our warrior types: Ninja vs. Knight! They have different options
var Ninja = new Class({
	
	Extends: Warrior,

	options: {
		armour: 80,
		power: 70,
		attackRange: 300
	}

});

var Knight = new Class({

	Extends: Warrior,

	options: {
		armour: 100, // strong armour :)
		power: 50,
		attackRange: 250
	}

});


// Weapons that can be thrown
var Weapon = new Class({

	Extends: BattleFieldObject,

	Implements: [Fx.Gravity.Mixin, Options, Events],

	options: {
		deadlyness: 10,
		'class': 'weapon',
		container: 'battleField',
		gravity: {
			limits: {x: [0, 730], y: [0, 470]},
			speed: {x: [25, 30], y: [40, 50]}
		}
	},

	owner: null,

	initialize: function(owner, options){
		if (instanceOf(owner, Warrior)) this.owner = owner;
		this.setOptions(options);
		this.element = new Element('div', {
			'class': this.options['class']
		});
		if (this.options.container) this.element.inject(this.options.container);

		this.initGravity(this.options.gravity);
		this.$gravity.addEvent('complete', function(subject){
			subject.destroy.delay(500, subject);
		}, true); // set as internal events (can't be removed)
		this.$gravity.addEvent('step', function(current){
			this.setCoords(current);
			if (this.target && this.target.energy && this.getDistanceTo(this.target) < 70){
				this.fireEvent('inpact');
				this.target.setEnergy(
					this.target.energy
					- this.options.deadlyness
				);
				this.$gravity.stop();
				this.element.destroy.delay(500, this.element);
			}
		}.bind(this), true);
	},

	fire: function(target){
		var coords = this.owner.getCoords();
		if (instanceOf(target, Warrior)) this.target = target;
		this.drop({
			x: coords.x + coords.width / 2,
			y: coords.y + coords.height / 2
		});
		return this;
	}

});


// Create some food, that will help the warriors regain some energy
var Food = new Class({

	Extends: BattleFieldObject,

	Implements: Options,

	options: {
		energy: 5,
		coords: {x: 100, y: 100, width: 50, height: 50},
		container: null
	},

	initialize: function(img, options){
		this.element = (typeOf(img) == 'element')
			? document.id(img)
			: new Element('img', {src: img});

		this.setOptions(options);
		this.setCoords(this.options.coords);

		var coords = this.getCoords();
		this.element.setStyles({
			position: 'absolute',
			left: coords.x - coords.width / 2,
			top: coords.y - coords.height / 2
		});
		if (this.options.container) this.element.inject(this.options.container);

		this.energy = this.options.energy;
	},

	toElement: function(){
		return this.element;
	}

});

Food.Banana = new Class({

	Extends: Food,

	options: {
		energy: 15,
		coords: {width: 18, height: 30},
		container: 'battleField'
	},

	initialize: function(options){
		this.parent('demos/Class.Warriors/banana.png', options);
	}

});

Food.Apple = new Class({

	Extends: Food,

	options: {
		energy: 10,
		coords: {width: 30, height: 30},
		container: 'battleField'
	},

	initialize: function(options){
		this.parent('demos/Class.Warriors/apple.png', options);
	}

});

// For debugging only
var warriors = {};

window.addEvent('domready', function(){
	
	// Create our ninja
	var ninja = new Ninja('ninja', 'ninjaInfo', {
		name: 'Chika Fighter',
		walking: {
			limits: {x: [-60, 600], y: [-30, 210]},
			keys: {left: 'a', right: 'd', up: 'w', down: 's'}
		},
		sprite: {
			url: 'demos/Class.Warriors/ninja-sprite.png',
			width: 2800,
			height: 300,
			frames: 14
		}
	});
	ninja.getWeapon = function(){
		return new Weapon(ninja, {
			gravity: {
				speed: {x: [45, 50], y: [-20, -30]}
			}
		});
	};

	warriors.ninja = ninja

	// Create the opponent: the Knight
	var knight = new Knight('knight', 'knightInfo', {
		name: 'Sir Cane of Kamilot',
		walking: {
			limits: {x: [-20, 670], y: [-10, 270]},
			keys: {left: 'j', right: 'l', up: 'i', down: 'k'}
		},
		sprite: {
			url: 'demos/Class.Warriors/warrior-sprite.png',
			width: 1750,
			height: 250,
			frames: 14
		}
	});
	knight.getWeapon = function(){
		return new Weapon(knight, {
			gravity: {
				speed: {x: [-40, -45], y: [-25, -30]}
			}
		});
	};

	warriors.knight = knight;

	// Create some actions under different keys
	// Use the :throttle psuedo event to calm down the events a bit
	document.addEvent('keydown:throttle(500)', function(event){
		switch (event.key){
			case 'e': ninja.attack(knight); break;
			case 'r': ninja.reincarnate(); break;
			case 'q': ninja.sleep(); break;
			case 'f': ninja.fire(knight); break;
		}
	});
	document.addEvent('keydown:throttle(500)', function(event){
		switch (event.key){
			case 'u': knight.attack(ninja); break;
			case 'y': knight.reincarnate(); break;
			case 'o': knight.sleep(); break;
			case 'h': knight.fire(ninja); break;
		}
	});

	// Randomly generate some food the warriors can grab to regain energy
	var battleField = $('battleField'),
		battleFieldSize = battleField.getSize(),
		food;
	var putFood = function(){
		(function(){
			if (food) return;
			food = new (Number.random(0, 1) ? Food.Apple : Food.Banana)({
				coords: {
					x: Number.random(50, battleFieldSize.x - 50),
					y: Number.random(50, battleFieldSize.y - 50)
				}
			});
			warriors.food = food;
		}).delay(Number.random(4000, 10000));
	};
	putFood();

	[ninja, knight].each(function(warrior){
		warrior.$walker.addEvent('step', function(){
			if (food && warrior.getDistanceTo(food) < 150){
				warrior.eat(food);
				$(food).destroy();
				food = null;
				putFood();
			}
		});
	});

});

