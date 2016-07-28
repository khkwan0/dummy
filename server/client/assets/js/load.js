var cards_suit = [];
var cards_value = [];
var cards_meta = [];
var load = {
    preload: function() {
        var deck_set = 'svg_cards';
        var cards_meta = [];
        var cards_url = [];
        for (i=0;i<52;i++) {
            var suit = '';
            if (Math.floor(i/13) == 0) {
                suit = 'Hearts';
            } else if (Math.floor(i/13) == 1) {
                suit = 'Clubs';
            } else if (Math.floor(i/13) == 2) {
                suit = 'Diamonds';
            } else {
                suit = 'Spades';
            }
            cards_suit[i] = suit;
            value = cards_value[i] = i%13+2.0;
            cards_meta[i] = suit+value;
            cards_url[i] = 'assets/images/'+deck_set+'/'+suit+'%20'+(i%13+2.0)+'.svg';
            game.load.images(cards_meta,cards_url);
            var back = 'rider_back_blue';
            game.load.image('back', 'assets/images/'+back+'/'+'_Back.png');
            game.load.image('discard', 'assets/images/discard.png');
            game.load.image('meld', 'assets/images/meld.png');
            game.load.image('layoff', 'assets/images/layoff.png');
            game.load.image('resort', 'assets/images/resort.png');
        }    
    },
    create: function() {
        game.state.start('login');
    }
}
