collisionNames = ["NO_OBJECT", "PLAYER_OBJECT", "NPC_OBJECT", "ENEMY_OBJECT", "COLLECTABLE_OBJECT", "ACTION_OBJECT", "PROJECTILE_OBJECT", "WORLD_SHAPE", "ALL_OBJECT"]
collisionTypes = {};
for (n in collisionNames) { collisionTypes[me.collision.types[collisionNames[n]]] = collisionNames[n] }
function reportCollision(me, other, response) {
  var hs = response.overlapV.x > 0 ? "right" : (response.overlapV.x < 0 ? "left" : "");
  var vs = response.overlapV.y > 0 ? "lower" : (response.overlapV.y < 0 ? "upper" : "");
  var side = (hs.length > 0 && vs.length > 0) ? vs + "-" + hs : vs + hs;
  console.log(collisionTypes[me.body.collisionType], me.name, me.GUID, "banged its", side, "side against", collisionTypes[other.body.collisionType], other.name, other.GUID);
}


game.PlayerEntity = me.Entity.extend({
  init: function(x, y, settings) {
    settings.image = "girl";
    settings.framewidth = settings.width = settings.frameheight = settings.height = 34;
    this._super(me.Entity, 'init', [x, y, settings]);
    
    this.stats = {
      hp: 500, mp: 100, str: 40, dex: 10, int: 20, vit: 40, agi: 20, mnd: 10
    }
    this.body.collisionType = me.collision.types.PLAYER_OBJECT;
    this.body.maxVelWalk = 2;
    this.body.maxVelRun = 3.5;
    this.body.bounceVel = 5;
    this.body.setVelocity(1, 1);
    this.body.setFriction(0.5, 0.5);
    this.body.setMaxVelocity(10, 10);
    this.body.removeShapeAt(0);
    this.body.addShape(new me.Rect(0, 0, 0, 0));
    this.body.addShape(new me.Rect(0, 18, 16, 16));
    me.game.viewport.follow(this.pos, me.game.viewport.AXIS.BOTH);
    this.alwaysUpdate = true;
    
    this.renderable.addAnimation("standU",  [0]);
    this.renderable.addAnimation("walkU",  [2, 4, 2, 3, 1, 3], 150);
    this.renderable.addAnimation("standH",  [7]);
    this.renderable.addAnimation("walkH",  [8, 9, 10, 11, 12, 13], 150);
    this.renderable.addAnimation("standD",  [14]);
    this.renderable.addAnimation("walkD",  [16, 15, 16, 17, 18, 17], 150);
    this.renderable.setCurrentAnimation("standD");
    this.facing = "D";
  },
  update: function(dt) {
    if (this.renderable.isFlickering()) {
    } else {
      var keys = {left: false, right: false, up: false, down: false};
      for (key in keys) { keys[key] = me.input.isKeyPressed(key) };
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
      
      //console.log(this.body.vel.length());
      if (this.body.vel.length() > maxSpeed) this.body.vel.normalize().scale(maxSpeed);
      //console.log(this.body.vel.length());
    
      // calc facing
      if (keys.left && (keys.up || !keys.down)) this.facing = "W";
      if (keys.right && (keys.down || !keys.up)) this.facing = "E";
      if (keys.up && (keys.right || !keys.left)) this.facing = "N";
      if (keys.down && (keys.left || !keys.right)) this.facing = "S";
      this.renderable.flipX(this.facing == "E");
    
      // calc moving
      var moving = (this.body.vel.x != 0 || this.body.vel.y != 0) ? "walk" : "stand";
    
      // set animation
      var animation = moving;
      if (this.facing == "N") animation += "U";
      else if (this.facing == "S") animation += "D";
      else animation += "H";
      if (!this.renderable.isCurrentAnimation(animation)) this.renderable.setCurrentAnimation(animation);
    }
    
    // apply physics to the body (this moves the entity)
    this.body.update(dt);
    // handle collisions against other shapes
    me.collision.check(this);
    // return true if we moved or if the renderable was updated
    return (this._super(me.Entity, 'update', [dt]) || this.body.vel.x !== 0 || this.body.vel.y !== 0);
  },
  onCollision: function(response, other) {
    // initial shape empty to provide illusion of 3D collision
    if (response.indexShapeA == 0) return false;
    
    reportCollision(this, other, response);
    
    if (response.b.body.collisionType == me.collision.types.WORLD_SHAPE) {
      // undo last movement
      this.body.vel.y = -this.body.vel.y * response.overlapV.y;
      this.body.vel.x = -this.body.vel.x * response.overlapV.x;
      return true;
    } else if (response.b.body.collisionType == me.collision.types.ENEMY_OBJECT) {
      if (other.touchDamage) {
        // harm player and bounce back
        this.stats.hp -= 3;
        this.renderable.flicker(600);
        var newVector = response.overlapV.clone().normalize().scale(-this.body.bounceVel);
        if (newVector.length() < this.body.bounceVel * 0.9)
          newVector = this.body.vel.clone().normalize().scale(-this.body.bounceVel);
        this.body.vel = newVector;
        console.log(response.overlapV.x, this.body.vel.x, response.overlapV.y, this.body.vel.y);
      } else {
        // undo last movement
        this.body.vel.y = -this.body.vel.y * response.overlapV.y;
        this.body.vel.x = -this.body.vel.x * response.overlapV.x;
        return true;
      }
    } else {
      console.log(t, response);
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
    
    this.touchDamage = true;
    
    this.renderable.addAnimation("bouncing", [0, 1, 2, 1], 200);
    this.renderable.addAnimation("attacked", [3, 4, 5, 6]);
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
    
    reportCollision(this, other, response);
    
    if (response.b.body.collisionType == me.collision.types.WORLD_SHAPE) {
      // undo last movement
      this.body.vel.y = -this.body.vel.y * response.overlapV.y;
      this.body.vel.x = -this.body.vel.x * response.overlapV.x;
      if (response.overlapV.x != 0) this.travelVector.x = -this.travelVector.x;
      if (response.overlapV.y != 0) this.travelVector.y = -this.travelVector.y;
      return true;
    }
    
    this.renderable.setCurrentAnimation("attacked", "bouncing");
    

    // Make all other objects solid
    return true;
  }
});
