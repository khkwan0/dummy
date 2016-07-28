var socket = io();

var boot = {
    preload: function() {
    },
    create: function() {
        game.physics.startSystem(Phaser.Physics.ARCARDE);
        game.stage.backgroundColor = '#d3d3d3';
        game.state.start('load');
    }
}
