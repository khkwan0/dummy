var lobby = {
    preload: function() {
        console.log('lobby preload');
        document.getElementById('login_area').style.display = 'none';
        socket.on('lobby', function(data) {
                console.log(data);
                data.forEach(function(item) {
                    console.log(item);
                });
        });

        socket.on('lobby_update', function(data) {
            console.log(data);
        });

        socket.on('gamelist', function(data) {
                game_list = JSON.parse(data);
                game_table = '<table>';
                game_list.forEach(function(game) {
                    console.log(game.gameid+' '+game.min+' '+game.max_time);
                    game_table += '<tr id="game'+game.gameid+'">';
                    game_table += '<td>'+game.gameid+'</td>';
                    game_table += '<td>'+game.min+'</td>';
                    game_table += '<td>'+game.max_time+'</td>';
                });
                game_table += '</table>';
                $('#active-tab').html(game_table);
                $('#tabs').show();
        });
        socket.emit('login', {'email':email, 'fb_id':fb_id, 'name':name, 'pro_pic':pro_pic});
    },
    create: function() {
    }
}
