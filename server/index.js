var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var redis = require('redis');
var client = redis.createClient();
var client2 = redis.createClient();
var lobby_pub = redis.createClient();
var lobby_sub = redis.createClient();

client.on('connect', function() {
    console.log('connected to redis');
});
//var redis = require('socket.io-redis');
//io.adapter(redis({ host: 'localhost', port: 6379 }));

app.use(express.static('client'));
app.get('/', function(req, res) {
    res.sendFile(__dirname + '/index.html');
});


io.on('connection', function(socket) {
    console.log('a user connected');
    lobby_sub.subscribe('lobby');
    socket.on('login', function(data) {
        console.log(data.email+' '+data.fb_id+' '+data.name+' '+data.pro_pic);
        client.multi()
            .hmset(data.fb_id+':'+data.name, {
                'name': data.name,
                'email': data.email,
                'pro_pic': data.pro_pic,
                'status': 'lobby'
            })
            .sadd('lobbylist', data.name)
            .smembers('lobbylist')
            .exec(function(err, replies) {
                console.log(replies);
                var game_list = [];
                client.smembers('gamelist', function( err, gamelist) {
                    multi = client.multi();
                    for (var key in gamelist) {
                        multi.hgetall(gamelist[key]);
                    };
                    multi.exec(function(err, replies) {
                        console.log(err);
                        console.dir(replies);
                        socket.emit('gamelist', JSON.stringify(replies));
                    });
                });
            });
    });

    socket.on('create_game', function(data) {
        console.log(data.min+' '+data.max_time);
        client.incr('game_number', function(err, game_number) {
            game_info = {'gameid': game_number, 'min':data.min, 'max_time':data.max_time};
            client.hmset(game_number, game_info, function(err, redis_status) {
                console.log(redis_status);
                client.sadd('gamelist', game_number);
                client.hget(game_number, 'min', function(err, data) {
                    console.log(data);
                });
                lobby_pub.publish('lobby',game_number+' created');
            });

        });
        /*
        multi = client.multi();
        multi.incr('game_number');
        multi.get('game_number');
        multi.exec(function(err, replies) {
            game_number = replies[0];
            console.log(game_number);
            game_info = {'min':data.min, 'max_time':data.max_time};
            //multi2.hmset(game_number, game_info);
            client.sadd('games', game_number);
        });
        */
    });

    socket.on('logout', function(data) {
        console.log(data);
    });

    lobby_sub.on('message', function(channel, message) {
        console.log(channel+': '+message);
        socket.emit('lobby_update', message);
    });
});

http.listen(3000, function() {
    console.log('listening on *:3000');
});

