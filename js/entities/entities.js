collisionNames = ["NO_OBJECT", "PLAYER_OBJECT", "NPC_OBJECT", "ENEMY_OBJECT", "COLLECTABLE_OBJECT", "ACTION_OBJECT", "PROJECTILE_OBJECT", "WORLD_SHAPE", "ALL_OBJECT"]
collisionTypes = {};
for (n in collisionNames) {
  collisionTypes[me.collision.types[collisionNames[n]]] = collisionNames[n]
}

function reportCollision(me, other, response) {
  if (isIgnorableCollision(me, other, response)) return;
  var hs = response.overlapV.x > 0 ? "right" : (response.overlapV.x < 0 ? "left" : "");
  var vs = response.overlapV.y > 0 ? "lower" : (response.overlapV.y < 0 ? "upper" : "");
  var side = (hs.length > 0 && vs.length > 0) ? vs + "-" + hs : vs + hs;
  if ((vs + hs).length < 1) console.log(response, response.overlapV.x, response.overlapV.y)
  console.log(collisionTypes[me.body.collisionType], me.name, me.GUID, "banged its", side, "side against", collisionTypes[other.body.collisionType], other.name, other.GUID);
}
ignorableHitboxes = [];

function isIgnorableCollision(me, other, response) {
  return ignorableHitboxes.indexOf(me.body.getShape(response.indexShapeA)) >= 0 || ignorableHitboxes.indexOf(other.body.getShape(response.indexShapeB)) >= 0;
}

function addIgnorableHitbox(shape) {
  if (ignorableHitboxes.indexOf(shape) < 0) ignorableHitboxes.push(shape);
}

console.log(me.Renderable.prototype);
me.Renderable.prototype.setIfNotCurrentAnimation = function(now, after) {
  if (!this.isCurrentAnimation(now)) {
    this.setCurrentAnimation.apply(this, arguments);
  } else if (after) {
    var frame = this.getCurrentAnimationFrame();
    this.setCurrentAnimation.apply(this, arguments);
    this.setAnimationFrame(frame);
  }
}

game.PlayerEntity = me.Entity.extend({
  init: function(x, y, settings) {
    settings.image = "girl";
    settings.framewidth = settings.frameheight = 35;
    settings.width = 16;
    settings.height = 32;
    this._super(me.Entity, 'init', [x, y, settings]);

    this.stats = {
      hp: 500,
      mp: 100,
      str: 40,
      dex: 10,
      int: 20,
      vit: 40,
      agi: 20,
      mnd: 10
    }
    this.body.collisionType = me.collision.types.PLAYER_OBJECT;
    this.body.maxVelWalk = 2;
    this.body.maxVelRun = 3.5;
    this.body.bounceDistance = 7;
    this.body.bounceFriction = 0.5;
    this.body.setVelocity(1, 1);
    this.body.setMaxVelocity(100, 100);
    this.body.removeShapeAt(0);
    this.body.addShape(new me.Rect(0, 0, 0, 0));
    addIgnorableHitbox(this.body.getShape(0));
    this.body.addShape(new me.Ellipse(0, 24, this.width, this.width));
    me.game.viewport.follow(this.pos, me.game.viewport.AXIS.BOTH);
    this.alwaysUpdate = true;

    var standAnimSpeed = 100;
    var walkAnimSpeed = 150;
    var attackAnimSpeed = 100;
    this.renderable.addAnimation("standN", [0], standAnimSpeed);
    this.renderable.addAnimation("walkN", [2, 4, 2, 3, 1, 3], walkAnimSpeed);
    this.renderable.addAnimation("attackN", [7, 8, 8, 7], attackAnimSpeed);
    this.renderable.addAnimation("standE", [10], standAnimSpeed);
    this.renderable.addAnimation("walkE", [11, 12, 13, 14, 15, 16], walkAnimSpeed);
    this.renderable.addAnimation("attackE", [17, 18, 18, 17], attackAnimSpeed);
    this.renderable.addAnimation("standW", [10], standAnimSpeed);
    this.renderable.addAnimation("walkW", [11, 12, 13, 14, 15, 16], walkAnimSpeed);
    this.renderable.addAnimation("attackW", [17, 18, 18, 17], attackAnimSpeed);
    this.renderable.addAnimation("standS", [20], standAnimSpeed);
    this.renderable.addAnimation("walkS", [22, 21, 22, 23, 24, 23], walkAnimSpeed);
    this.renderable.addAnimation("attackS", [27, 28, 28, 27], attackAnimSpeed);
    this.renderable.setCurrentAnimation("standS");
    this.facing = "S";
  },
  update: function(dt) {
    if (this.renderable.isFlickering()) {
      var speed = this.body.vel.length();
      if (speed > 0) this.body.vel.scale(Math.max(speed - this.body.bounceFriction, 0) / speed);
      this.renderable.setIfNotCurrentAnimation("stand" + this.facing);
    } else if (this.attacking) {
      // don't do anything, should already have been set up
    } else {
      var keys = {
        left: false,
        right: false,
        up: false,
        down: false,
        attack: false
      };
      for (key in keys) {
        keys[key] = me.input.isKeyPressed(key)
      };

      // calc facing
      if (keys.left && (keys.up || !keys.down)) this.facing = "W";
      if (keys.right && (keys.down || !keys.up)) this.facing = "E";
      if (keys.up && (keys.right || !keys.left)) this.facing = "N";
      if (keys.down && (keys.left || !keys.right)) this.facing = "S";
      this.renderable.flipX(this.facing == "W");

      if (keys.attack) {
        this.body.vel = new me.Vector2d(0, 0);

        // start with player center
        var swordX = this.left;
        var swordY = this.top + this.height / 2;

        // modify position based on facing
        if (this.facing == "N") {
          swordX += 1;
          swordY -= this.height / 2;
        } else if (this.facing == "S") {
          swordX -= 1;
          swordY += this.height / 2;
        } else if (this.facing == "W") {
          swordX -= this.width;
          swordY += 4;
        } else if (this.facing == "E") {
          swordX += this.width + 1;
          swordY += 4;
        }

        var sword = me.pool.pull("Sword", swordX, swordY, {
          facing: this.facing,
          owner: this
        });
        this.renderable.setCurrentAnimation("attack" + this.facing, (function() {
          this.attacking = false;
        }).bind(this));
        this.attacking = true;
        var animSpeed = this.renderable.current.animationspeed;
        me.timer.setTimeout(function() {
          me.game.world.addChild(sword);
        }, animSpeed * 1);
        me.timer.setTimeout(function() {
          me.game.world.removeChild(sword);
        }, animSpeed * 3);
      } else if (!this.attacking) {
        // if not attacking, could possibly be moving
        var maxSpeed = false ? this.body.maxVelRun : this.body.maxVelWalk;
        if (keys.left) {
          this.body.vel.x -= this.body.accel.x * me.timer.tick;
        } else if (keys.right) {
          this.body.vel.x += this.body.accel.x * me.timer.tick;
        } else {
          this.body.vel.x = 0;
        }
        if (keys.up) {
          this.body.vel.y -= this.body.accel.y * me.timer.tick;
        } else if (keys.down) {
          this.body.vel.y += this.body.accel.y * me.timer.tick;
        } else {
          this.body.vel.y = 0;
        }

        if (this.body.vel.length() > maxSpeed) this.body.vel.normalize().scale(maxSpeed);

        this.renderable.setIfNotCurrentAnimation(((this.body.vel.length() > 0) ? "walk" : "stand") + this.facing);
      }
    }

    // apply physics to the body (this moves the entity)
    this.body.update(dt);
    // handle collisions against other shapes
    me.collision.check(this);
    // return true if we moved or if the renderable was updated
    this._super(me.Entity, 'update', [dt]);
    me.game.world.sort(me.sortByBottom);
    return true;
  },
  onCollision: function(response, other) {
    // initial shape empty to provide illusion of 3D collision
    if (response[this == response.a ? "indexShapeA" : "indexShapeB"] == 0) return false;

    // buggy collision engine involving top of A where "recovery" vector is zero, solving nothing about the collision
    if (response.overlapV.length() == 0) response.overlapV.y = -0.1;

    if (response.b == this) {
      response.overlapV.scale(-1);
      response.overlapN.scale(-1);
    }
    

    if (other.body.collisionType == me.collision.types.WORLD_SHAPE) {
      return true;
    } else if (other.body.collisionType == me.collision.types.ENEMY_OBJECT) {
      reportCollision(this, other, response);
      if (other.touchDamage) {
        // harm player and bounce back
        this.stats.hp -= 3;
        this.renderable.flicker(600);
        this.body.vel = response.overlapV.clone().normalize().scale(-this.body.bounceDistance);
        return false;
      } else {
        // undo last movement
        this.body.vel.y = -this.body.vel.y * response.overlapV.y;
        this.body.vel.x = -this.body.vel.x * response.overlapV.x;
        return true;
      }
    } else if (other.body.collisionType == me.collision.types.PROJECTILE_OBJECT) {
      if (other.owner == this) return false;
    } else {
      reportCollision(this, other, response);
      console.log(this, response, other);
      debugger
    }

    // Make all other objects solid
    return true;
  }
});

game.SlimeEntity = me.Entity.extend({
  init: function(x, y, settings) {
    settings.image = "slime";
    settings.framewidth = settings.width = settings.frameheight = settings.height = 32;
    settings.shapes[0] = new me.Ellipse(settings.framewidth / 2, settings.frameheight / 2, 26, 26);
    this._super(me.Entity, 'init', [x, y, settings]);
    this.stats = {
      hp: 500,
      mp: 100,
      str: 40,
      dex: 10,
      int: 20,
      vit: 40,
      agi: 20,
      mnd: 10
    }

    this.touchDamage = true;
    this.body.collisionType = me.collision.types.ENEMY_OBJECT;
    this.renderable.addAnimation("bouncing", [0, 1, 2, 1], 200);
    this.renderable.addAnimation("attacked", [3, 4, 5, 6]);
    this.renderable.addAnimation("dead", [6, 6], 1000);
    this.renderable.setCurrentAnimation("bouncing");

    this.refillTravel = function(distance) {
      r = distance || 96;
      a = Math.random() * 2 * Math.PI;
      this.travelVector = new me.Vector2d(r * Math.cos(a), r * Math.sin(a))
    }
    this.body.setMaxVelocity(1, 1);
    this.travelDistance = 0;
    this.refillTravel = this.refillTravel.bind(this);
    this.refillTravel();
    me.timer.setInterval(this.refillTravel, 4000, true);
  },
  update: function(dt) {
    if (this.renderable.isCurrentAnimation("bouncing")) {
      var step = this.travelVector.clone()
        .normalize().scale(this.body.maxVel.x);
      if (step.length() > this.travelVector.length()) step = this.travelVector.clone();
      step.scale(me.timer.tick);
      if (step.x < 0) {
        this.renderable.flipX(true);
      } else if (step.x > 0) {
        this.renderable.flipX(false);
      }
      this.body.vel.x = step.x;
      this.body.vel.y = step.y;
      this.travelVector.sub(step);
    } else {
      this.body.vel = new me.Vector2d(0, 0);
    }

    // apply physics to the body (this moves the entity)
    this.body.update(dt);
    // handle collisions against other shapes
    me.collision.check(this);
    // return true if we moved or if the renderable was updated
    return (this._super(me.Entity, 'update', [dt]) || this.body.vel.x !== 0 || this.body.vel.y !== 0);
  },
  /**
   * colision handler
   * (called when colliding with other objects)
   */
  onCollision: function(response, other) {
    if (isIgnorableCollision(this, other, response)) return false;
    if (response.b == this) {
      response.overlapV.scale(-1);
      response.overlapN.scale(-1);
    }
    //reportCollision(this, other, response);

    if (other.body.collisionType == me.collision.types.WORLD_SHAPE) {
      // undo last movement
      this.body.vel.y = -this.body.vel.y * response.overlapV.y;
      this.body.vel.x = -this.body.vel.x * response.overlapV.x;
      if (response.overlapV.x != 0) this.travelVector.x = -this.travelVector.x;
      if (response.overlapV.y != 0) this.travelVector.y = -this.travelVector.y;
      return true;
    } else if (other.body.collisionType == me.collision.types.PROJECTILE_OBJECT) {
      if (this.renderable.isCurrentAnimation("attacked")) {
        return false;
      } else if (this.alive) {
        this.stats.hp -= 250;
        if (this.stats.hp <= 0) {
          this.alive = false;
          this.body.collisionType = me.collision.types.NO_OBJECT;
          this.z -= 1;
          this.renderable.setCurrentAnimation("attacked", (function() {
            this.renderable.setCurrentAnimation("dead", (function() {
              this.renderable.flicker(1000, (function() {
                me.game.world.removeChild(this);
                me.game.repaint();
              }).bind(this));
            }).bind(this));
          }).bind(this));
        } else {
          this.renderable.setCurrentAnimation("attacked", "bouncing");
        }
        return false;
      } else if (this.renderable.isCurrentAnimation("dead")) {
        return false;
      } else {
        console.log("wtf");
      }
    }

    // Make all other objects solid
    return false;
  }
});

game.SwordEntity = me.Entity.extend({
  init: function(x, y, settings) {
    for (n in settings) {
      this[n] = settings[n]
    }
    settings.image = "sword";
    settings.framewidth = 16
    settings.frameheight = 8;

    if (this.facing == "W" || this.facing == "E") {
      settings.width = 16;
      settings.height = 8;
      y -= settings.height / 2;
      if (this.facing == "W") x -= settings.width;
    } else {
      settings.width = 8;
      settings.height = 16;
      x -= settings.width / 2;
      if (this.facing == "N") y -= settings.height;
    }
    this._super(me.Entity, "init", [x, y, settings]);
    this.body.addShape(new me.Rect(0, 0, this.width, this.height));
    this.body.updateBounds();
    this.body.collisionType = me.collision.types.PROJECTILE_OBJECT;
    // single frame animations never "end"
    this.renderable.addAnimation("default", [0]);
    this.renderable.setCurrentAnimation("default");
    this.renderable.angle = {
      E: 0,
      N: -1,
      W: 0,
      S: 1
    }[this.facing] * Math.PI / 2;
    this.renderable.flipX(this.facing == "W" || this.facing == "S")
  },
  update: function(dt) {
    this.body.update();
    me.collision.check(this);
    return this._super(me.Entity, 'update', [dt]);
  }
});



game.MarkerEntity = me.Entity.extend({
  init: function(x, y, settings) {
    var wh = 4,
      hwh = wh / 2;
    this._super(me.Entity, "init", [x - hwh, y - hwh, {
      width: wh,
      height: wh
    }]);
    this.body.removeShape(0);
    this.body.collisionType = me.collision.types.NO_OBJECT;
    this.renderable = new(me.Renderable.extend({
      init: function() {
        this._super(me.Renderable, "init", [-hwh, -hwh, wh, wh]);
      },
      destroy: function() {},
      draw: function(renderer) {
        var color = renderer.globalColor.toHex();
        renderer.setColor((new me.Color()).random());
        renderer.fillRect(0, 0, wh, wh);
        renderer.setColor(color);
      }
    }));
    this.alwaysUpdate = true;
  },
  update: function(dt) {
    this.body.update();
    me.collision.check(this);
    return this._super(me.Entity, 'update', [dt]);
  }
});
