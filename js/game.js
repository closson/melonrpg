
/* Game namespace */
var game = {

    // an object where to store game information
    data : {
        // score
        score : 0
    },


    // Run on page load.
    "onload" : function () {
    // Initialize the video.
    if (!me.video.init(640, 640, {wrapper : "screen", scale : "auto"})) {
        alert("Your browser does not support HTML5 canvas.");
        return;
    }

    // add "#debug" to the URL to enable the debug Panel
    if (me.game.HASH.debug === true) {
        window.onReady(function () {
            me.plugin.register.defer(this, me.debug.Panel, "debug", me.input.KEY.V);
        });
    }

    // Initialize the audio.
    me.audio.init("mp3,ogg");

    // Set a callback to run when loading is complete.
    me.loader.onload = this.loaded.bind(this);

    // Load the resources.
    me.loader.preload(game.resources);

    // Initialize melonJS and display a loading screen.
    me.state.change(me.state.LOADING);
    
    me.sys.gravity = 0;
    me.game.world.sortOn = "bottom";
    me.game.world._sortBOTTOM = function (a, b) {
      var result = (b.z - a.z);
      return (result ? result : (b.bottom - a.bottom) || 0);
    };
    me.debug.renderHitBox = true;
    me.debug.renderVelocity = true;
},

    // Run on game resources loaded.
    "loaded" : function () {
        me.state.set(me.state.MENU, new game.TitleScreen());
        me.state.set(me.state.PLAY, new game.PlayScreen());

        // add our player entity in the entity pool
        me.pool.register("Player", game.PlayerEntity);
        me.pool.register("Blue Slime", game.SlimeEntity, true);
        me.pool.register("Sword", game.SwordEntity, true);
        me.pool.register("Marker", game.MarkerEntity, true);

        me.input.bindKey(me.input.KEY.LEFT,  "left");
          me.input.bindKey(me.input.KEY.RIGHT, "right");
          me.input.bindKey(me.input.KEY.UP,  "up");
          me.input.bindKey(me.input.KEY.DOWN, "down");
          me.input.bindKey(me.input.KEY.SPACE, "attack", true);
        // Start the game.
        me.state.change(me.state.PLAY);
    }
};
