    function print_r(obj) {
        for (var key in obj.parent) {
            if (obj.parent.hasOwnProperty(key)) {
                console.log(key+' '+obj[key]);
            }
        }
    }

    var socket = io();

    window.onload = function() {
        var cards = [];
        var cards_suit= [];
        var cards_value= [];
        var dragging = false;
        var dragging_card;
        var dragging_start_pos = {};
        var colliding = false;
        var result0 = result1 = result2 = result3 = 'Debug';
        var player_position = 'ul';
        var meld_area_group;
        var meld_area;
        var deck_status = [];
        var pile_count = 0;
        var num_players = 4;
        var sort_type = 0; // 0 is soort by grouped suit, 1 is sort by value
        var animation_speed = 100;

        var game_world_dim = {w:1024,h:768};

        var game = new Phaser.Game(game_world_dim.w, game_world_dim.h, Phaser.CANVAS, 'kendummy', { preload: preload, create: create, update: update, render: render }, false, true);


        var options = {
            x:0,
            y:0,
            discard: {
                obj:null
                     },
            meld: {
                obj:null
                  },
            layoff: {
                obj:null
                    }
        };

        function CardArea(type) {
            this.type = type;
            this.x_offset = 0;
            this.y_offset = 0;
            this.can_rearrange = false;
            this.group = null;
            this.cardWidth = 0;
            this.chosen = [];
            this.swapped = false;

            this.addCard = function(card) {
                this.group.add(card);
                game.physics.enable(card, Phaser.Physics.ARCADE);
                card.body.setSize(card.width/8,card.height, card.x, 0);
                //card.scale.setTo(0.21,0.16);
                card.scale.setTo(0.40, 0.35);
                card.anchor.setTo(0.5,0.5);
                card.x = this.x_offset+this.group.children.length*card.width/2;
                card.y = this.y_offset-game.rnd.between(0,1);
                card.inputEnabled = true;
                this.cardWidth = card.width;
                card.fromDiscard = false;
            };

            this.setScale = function(x,y) {
                this.group.forEach(function(card) {
                    card.scale.setTo(x,y);
                });
            };

            this.addCardB = function(card) {
                this.group.add(card);
                game.physics.enable(card, Phaser.Physics.ARCADE);
                card.body.setSize(card.width/8,card.height, card.x, 0);
                /*
                card.scale.setTo(0.21,0.16);
                card.anchor.setTo(0.5,0.5);
                card.x = this.x_offset+this.group.children.length*card.width/2;
                card.y = this.y_offset;
                */
                card.inputEnabled = true;
                //this.cardWidth = card.width;
                card.fromDiscard = false;
            };

            this.create_group = function(group) {
                this.group = group;
            };

            this.enableRearrange = function() {
                this.group.forEach(function(card) {
                    card.input.enableDrag();
                    card.events.onDragStart.add(function(sprite, pointer) {
                        hand.swapped = false;
                        discard.swapped = false;
                        dragging = true;
                        dragging_card = sprite;
                        }, this);
                    card.events.onDragStop.add(stopDrag, this);
                });
            }

            this.disableRearrange = function() {
                if (this.group) {
                    this.group.forEach(function(card) {
                        card.input.disableDrag();
                    });
                }
            }

            this.enableClick = function(the_func) {
                this.group.forEach(function(card) {
                    card.inputEnabled = true;
                    card.events.onInputUp.add(the_func, this);
                });
            }

            this.disableClick = function() {
                this.group.forEach(function(card) {
                    card.inputEnabled = false;
                });
            }

            this.realign = function(drag_card) {
                var card_group = this.group;
                result0 = drag_card.x;
                this.group.forEach(function(hand_card) {
                    if (hand_card != drag_card) {
                        game.physics.arcade.overlap(hand_card, drag_card, collisionHandler, collisionHandlerCustom, this);
                    }
                });
            }

            this.renderChosen = function() {
                y_offset = this.y_offset;
                this.chosen.forEach(function(card, index) {
                    card.y = this.y_offset-card.height/2;
//                    card.x = this.x_offset + index*card.width/2 + card.width/2;
                });
            }

        }

        var hand = new CardArea('hand');
        var discard = new CardArea('discard');
        var pile = new CardArea('pile');
        var resort;

        function doResort(sprite) {
            if (sort_type) {
                hand.group.sort('value', Phaser.Group.SORT_ASCENDING);
            } else {
                hand.group.sort('suit_value', Phaser.Group.SORT_ASCENDING);
            }
            sort_type = !sort_type;
            reRender(hand, true);
        }
        function doHandClick(sprite) {
            if (!hand.swapped) { /// make sure we aren't dragging and swapping
                var found = false;
                hand.chosen.forEach(function(card, index) {
                    if (card == sprite) {
                        found = true;
                        game.add.tween(sprite).to({y:hand.y_offset}, animation_speed, Phaser.Easing.easeIn, true, 0, 0, false);
                        hand.chosen.splice(index, 1);
                    }
                });
                if (!found) {
                    new_y = hand.y_offset - sprite.height/2;
                    new_x = hand.x_offset + hand.group.getIndex(sprite)*hand.cardWidth/2 + hand.cardWidth/2;
                    game.add.tween(sprite).to({x:new_x,y:new_y}, animation_speed, Phaser.Easing.easeIn, true, 0, 0, false);
                    hand.chosen.push(sprite);
                }
            }
            options.discard.obj.inputEnabled = false;
            if (hand.chosen.length == 0) {
                hand.enableRearrange();
            } else {
                if (hand.chosen.length == 1) {
                    options.discard.obj.inputEnabled = true;
                }
                hand.disableRearrange();
            }

        }

        function doPileClick(sprite) {
            var card = getCardFromDeck();
            if (card) {
                discard.addCard(card);
                discard.enableClick(handleDiscardClick);
            } else {
                endGame();
                pile.group.visible = false;
            }
            pile_count--;
            if (pile_count == 0) {
                endGame();
                pile.group.visible = false;
            }
        }

        function endGame() {
            console.log('end game');
            pile.disableClick();
        }

        function stopDrag(sprite,pointer) {
            if (hand.swapped) {
                hand.group.forEach(function(card) {
                    game.add.tween(card).to({x:hand.x_offset + card.width/2 + card.width/2*hand.group.getIndex(card),y:hand.y_offset-game.rnd.between(0,3)},animation_speed,Phaser.Easing.easeIn,true, 0,0,false);
                });
            }
            dragging = false;
            dragging_card = null;
        }

        function collisionHandlerCustom(card1, card2) {
            if (!colliding) {
                hand.group.swap(card1, card2);
                hand.swapped= true;
                hand.group.forEach(function(card) {
                    if (card != dragging_card) {
                        card.x = hand.x_offset + card.width/2 + card.width/2*hand.group.getIndex(card);
                    }
                });
            }
            colliding = false;
        }
        

        function collisionHandler(card1, card2) {
            colliding = true;
        }

        function reRender(obj, animate) {
            obj.group.forEach(function(card) {
                index = obj.group.getIndex(card);
                new_x = obj.x_offset + index * card.width/2 + card.width/2;
//                console.log(index+' '+new_x);
                if (animate) {
                    game.add.tween(card).to({x:new_x},animation_speed,Phaser.Easing.easeIn,true,0,0,false);
                } else {
                    card.x = new_x;
                }
                card.alpha = 1.0;
            });
        }

        function sameValue(the_cards) {
            var same = true;
            var first_card_value = the_cards[0].value;
            the_cards.forEach(function(card, index) {
                if (card.value != first_card_value) {
                    same = false;
                }
            });
            return same;
        }

        function sameSuit(the_cards) {
            var same = true;
            var first_card_suit = the_cards[0].suit;
            the_cards.forEach(function(card, index) {
                if (card.suit != first_card_suit) {
                same = false;
                }
            });
            return same;
        }

        function inSequence(the_cards) {
            var in_sequence = true;
            the_cards.forEach(function(card, index) {
                the_cards.forEach(function(card2, index) {
                    if (Math.abs(card.value - card2.value) > (the_cards.length-1)) { in_sequence = false; }
                });
            });
            return in_sequence;
        }

        function isMeldable(the_cards) {
            var meldable = false;
            if (sameValue(the_cards)) {
                meldable  = true;
            } else {
                if (sameSuit(the_cards) && inSequence(the_cards)) {
                    meldable = true;
                }
            }
            return meldable;
        }

        function doMeld(sprite) {
            if (hand.chosen.length > 2) {
                if (isMeldable(hand.chosen)) {
                    var meld_group = game.add.group();
                    hand.chosen.forEach(function(card, index) {
                        meld_group.add(card);
                    });
                    resort.inputEnabled = true;
                    meld_group.inputEnabled = false;
                    discard.enableClick(handleDiscardClick);
                    hand.enableRearrange();
                    meld_group.forEach(function(card) {
                        card.alpha = 1.0;
                        card.inputEnabled = false;
                        x_offset = meld_area.x_offset + meld_group.getIndex(card)*0.2*card.width + meld_area_group.children.length*card.width*2;
                        game.add.tween(card).to({x:x_offset,y:meld_area.y_offset},animation_speed, Phaser.Easing.easeIn, true, 0, 0, false);
                        game.add.tween(card.scale).to({x:0.40,y:0.35},animation_speed,Phaser.Easing.easeIn,true,0,0,false);
                    });
                    hand.chosen.length = 0;
                    meld_area_group.add(meld_group);
                    reRender(hand, true);
                    hand.group.forEach(function(card) {
                        card.fromDiscard = false;
                    });
                    while(discard.chosen.length) {
                        discard.group.forEach(function(card) {
                            discard.chosen.forEach(function(dcard, index) {
                                if (card.key == dcard.key) {
                                    discard.group.remove(card);
                                    discard.chosen.splice(index, 1);
                                }
                            });
                        });
                    }
                }
            }
        }

        function doDiscard(sprite) {
            if (!hand.chosen[0].fromDiscard) {
                hand.chosen[0].events.destroy();
                hand.chosen[0].events.onInputDown.add(handleDiscardClick, this);
//                console.log(discard.x_offset+ ' '+discard.group.children.length + ' '+ hand.chosen[0].width);
                new_x = discard.x_offset + discard.group.children.length*hand.chosen[0].width/2;
//                console.log(new_x);
                game.add.tween(hand.chosen[0]).to({x:new_x,y:discard.y_offset}, animation_speed, Phaser.Easing.easeIn, true, 0, 0, false);
                discard.addCardB(hand.chosen[0]);
                hand.chosen.length = 0;
                hand.enableRearrange();
                reRender(hand, true);
            }
        }

        function handleDiscardClick(card) {
            var already_chosen = false;
            discard.chosen.forEach(function(discard_card, index) {
                if (card == discard_card) {
                    already_chosen  = true;
                }
            });
            if (already_chosen) {
                resort.inputEnabled = true;
                discard.group.forEach(function(discard_card, index) {
                    discard_card.inputEnabled = true;
                    game.add.tween(discard_card).to({y: discard.y_offset},animation_speed,Phaser.Easing.easeIn,true,0,0,false);
                });
                discard.chosen.length = 0;
                var found_some;
                do {
                    found_some = false;
                    hand.group.forEach(function(card) {
                        if (card.fromDiscard == true) {
                            hand.group.remove(card);
                            found_some = true;
                        }
                    });
                } while (found_some);
                hand.chosen.forEach(function(hand_card, index) {
                    if (hand_card.fromDiscard) {
                        hand.chosen.splice(index, 1);
                    }
                });
                hand.enableClick(doHandClick);
            } else {
                resort.inputEnabled = false;
                discard.group.cursor = discard.group.getBottom();
                while (discard.group.cursor.key != card.key) { // walk the cursor up to the selected card
                    discard.group.cursor.inputEnabled = false;
                    discard.group.next();
                }
                var first = true;
                do {  // start working on the selected card and beyond
//                    console.log(discard.group.cursor.key);
                    discard.chosen.push(discard.group.cursor);

                    // clone to hands
                    card = game.add.sprite(0,0,discard.group.cursor.key);
                    card.alpha = 0.5;
                    hand.addCard(card);
                    card.value = discard.group.cursor.value;
                    card.suit = discard.group.cursor.suit;
                    if (first) {
                        hand.chosen.push(card);
    //                    hand.renderChosen();
                    } 
                    card.fromDiscard = true;
                    discard.group.next();
                    first = false;
                    
                } while(discard.group.cursor != discard.group.getBottom());

                hand.renderChosen();
                hand.enableClick(doHandClick);
                discard.chosen.forEach(function(card, index) {
                    game.add.tween(card).to({y: discard.y_offset - card.height/2},animation_speed,Phaser.Easing.easeIn,true,0,0,false);
                });
            }
        }

        function preload () {

            var deck_set = 'svg_cards';
            var cards_meta = [];
            var cards_url = [];

            var hand_area_pos = {
                x: 0.1 * game_world_dim.w,
                y: 0.9 * game_world_dim.h
            };

            var discard_area_pos = {x: game.world.centerX - 0.6* game.world.centerX , y: game.world.centerY};
            meld_area = {
                x_offset:game.world.centerX - game.world.centerX*0.8,
                y_offset:game.world.centerY - game.world.centerY*0.8
            };
            meld_area_group = game.add.group();

            hand.create_group(game.add.group());
            discard.create_group(game.add.group());
            pile.create_group(game.add.group());

            hand.y_offset = hand_area_pos.y;
            hand.x_offset = hand_area_pos.x;

            discard.x_offset = discard_area_pos.x;
            discard.y_offset = discard_area_pos.y;


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
                deck_status[i] = 1;
            }    
            game.stage.backgroundColor = "#41c450";
            game.load.images(cards_meta,cards_url);
            deck_set = 'rider_back_blue';
            game.load.image('back', 'assets/images/'+deck_set+'/'+'_Back.png');

            game.load.image('discard', 'assets/images/discard.png');
            game.load.image('meld', 'assets/images/meld.png');
            game.load.image('layoff', 'assets/images/layoff.png');
            game.load.image('resort', 'assets/images/resort.png');

        }

        function getCardFromDeck() {
            var keep_going = false;
            deck_status.forEach(function(val) {
                if (val == 1) { keep_going = true; }
            });
            var card = null;
            if (keep_going) {
                index = game.rnd.integerInRange(0,51);
                while (deck_status[index] == 0) {
                    index = game.rnd.integerInRange(0,51);
                }
                console.log(index);
                deck_status[index] = 0;
                if (Math.floor(index/13) == 0) {
                    suit = 'Hearts';
                } else if (Math.floor(index/13) == 1) {
                    suit = 'Clubs';
                } else if (Math.floor(index/13) == 2) {
                    suit = 'Diamonds';
                } else {
                    suit = 'Spades';
                }
                card = game.add.sprite(0,0,suit+(cards_value[index]));
                card.fromDiscard = false;
                card.suit = suit;
                card.value = cards_value[index];
                if (card.value == 1) { card.value = 14; }
                card.suit_value = suit+String.fromCharCode(65+card.value);
            }
            return card;
        }

        function create() {
            switch(num_players) {
                case 4: num_cards = 7; break;
                case 3: num_cards = 9; break;
                case 2: num_cards = 11; break;
                default: num_cards = 0; break;
            }

            pile_count = 52 - num_players * num_cards;

            for (i=0;i<num_cards;i++) {
                hand.addCard(getCardFromDeck());
            }

            hand.enableRearrange();
            hand.enableClick(doHandClick);
            discard.disableRearrange();

            pile_pos = {x:discard.x_offset-hand.cardWidth-0.2*hand.cardWidth,y:game.world.centerY};
            pile.x_offset = pile_pos.x;
            pile.y_offset = pile_pos.y;
            var pile_card = game.add.sprite(pile_pos.x, pile_pos.y,'back');
            pile_card.anchor.setTo(0.5,0.5);
            pile_card.scale.setTo(0.18, 0.155);
            pile_card.x = pile_pos.x;
            pile_card.y = pile_pos.y;
            pile.addCardB(pile_card);
            pile.enableClick(doPileClick);

            options.x = 2*game.world.centerX - 600;
            options.discard.obj = game.add.sprite(options.x,0,'discard');
            options.discard.obj.inputEnabled = false;
            options.discard.obj.events.onInputDown.add(doDiscard, this);

            options.meld.obj = game.add.sprite(options.discard.obj.x + options.discard.obj.width,0,'meld');
            options.meld.obj.inputEnabled = true;
            options.meld.obj.events.onInputDown.add(doMeld, this);
            options.layoff.obj = game.add.sprite(options.meld.obj.x + options.meld.obj.width,0,'layoff');

            resort = game.add.sprite(game.world.centerX + 0.8*game.world.centerX, game.world.centerY+0.8*game.world.centerY,'resort');
            resort.anchor.setTo(0.5,0.5);
            resort.inputEnabled = true;
            resort.events.onInputDown.add(doResort, this);
        }

        function update() {
            if (dragging) {
                colliding = false;
                hand.realign(dragging_card);
            }
        }

        function render() {
            game.debug.text(result0,10,20);
            game.debug.text(result1,10,40);
            game.debug.text(result2,10,60);
            game.debug.text(result3,10,80);
            /*
            hand.group.forEach(function(card) {
                game.debug.body(card);
            });
            */
        }

        function login() {
            console.log('login');
        }

    };
