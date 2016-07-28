var game_world_dim = {w:1280,h:720};

var game = new Phaser.Game(game_world_dim.w, game_world_dim.h, Phaser.CANVAS, 'kendummy');
game.state.add('boot', boot);
game.state.add('load',load);
game.state.add('login',login);
game.state.add('lobby', lobby);
game.state.start('boot');
