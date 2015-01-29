'use strict';

var _ = require('lodash');
var Pah = require('./pah.model');

var decks = {
	master: require('../../decks/cards_against_humanity/master_cards'),
	base: require('../../decks/cards_against_humanity/base')
}

var availableBlackCards = decks.base.black;

function hashUser(name, length) {
    var chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    var result = '';
    for (var i = length; i > 0; --i) result += chars[Math.round(Math.random() * (chars.length - 1))];
    return name + '-' + result;
}

// Get list of pahs
exports.index = function(req, res) {
    Pah.find(function(err, pahs) {
        if (err) {
            return handleError(res, err);
        }
        return res.json(200, pahs);
    });
};

// Get a single pah
exports.show = function(req, res) {
    Pah.findById(req.params.id, function(err, pah) {
        if (err) {
            return handleError(res, err);
        }
        if (!pah) {
            return res.send(404);
        }
        return res.json(pah);
    });
};

// Creates a new pah in the DB.
exports.create = function(req, res) {
    var pah = new Pah({
        host: '',
        users: [],
        discardedWhite: [],
        discardedBlack: []
    })

    pah.save(function(err, pah) {
        console.log(pah);
        if (err) {
            return handleError(res, err);
        }
        return res.json(pah);
    })
};

exports.join = function(req, res) {
    var code = req.params.code;
    var nameHash = hashUser(req.body.name, 5);

    var regex = new regExp(code + '$', 'i');
    var query = Pah.where('_id').$regex(regex);

    query.findOne(function(err, game) {
        if (err) {
            return handleError(res, err);
        }
        console.log(code, game._id.substr(game._id.length - 4));
        if (code === game._id.substr(game._id.length - 4)) {
            console.log('FOUND GAME', game);

            var isJudge = game.users.length === 0 ? true : false;
            var player = {
                name: req.body.name,
                _id: nameHash,
                score: 0,
                cards: [],
                icon: '',
                isJudge: isJudge
            }

            game.users.push(player);
            game.save(function(err, game) {
            		console.log('SAVED GAME',game);
                if (err) {
                    return handleError(res, err);
                }
                return res.json(player)
            })
        }
    })
};

exports.draw = function(req, res) {
    Pah.findById(req.params.id, function(err, pah) {
        if (err) {
            return handleError(res, err);
        }
        pah.discardedWhite.push(req.params.card_id);
        pah.save(function(err, pah) {
            if (err) {
                return handleError(res, err);
            }
            return res.json(200);
        })
    })
};

exports.submit = function(req, res) {
    Pah.findById(req.params.id, function(err, pah) {
        if (err) {
            return handleError(res, err);
        }
        pah.cardsInPlay.push({
            user_id: req.params.user,
            card_id: req.body.card_id
        });
        pah.save(function(err, pah) {
            if (err) {
                return handleError(res, err);
            }
            return res.json(200);
        })
    })
};

exports.judge = function(req, res) {
		var winning_card = req.body.card_id;
		var winning_user = req.body.user_id;

    Pah.findById(req.params.id, function(err, pah) {
        if (err) {
            return handleError(res, err);
        }
        //MAYBE MARK MODIFIED.
        pah.users.forEach(function(user){
        	if(user._id === winning_user){
        		console.log('WINNING USER',user);
        		user.score += 1000;
        	}
        })

        var judgeIndex;
        pah.users.forEach(function(user,index){
        	if(user.isJudge){
        		judgeIndex = index;
        		user.isJudge = false;
        	}
        })

        if(judgeIndex === pah.users.length - 1){
        	pah.users[0].isJudge = true;
        }
        else{
        	pah.users[judgeIndex+1].isJudge = true;
        }

        availableBlackCards = _.filter(availableBlackCards,function(card){
        	return card._id !== pah.blackCard._id;
        })
        console.log(availableBlackCards);

        pah.blackCard = availableBlackCards[Math.floor(Math.random()*availableBlackCards.length)];
        console.log(pah.blackCard);

        pah.cardsInPlay.length = 0;

        pah.save(function(err, pah) {
            if (err) {
                return handleError(res, err);
            }
            return res.json(200);
        })
    })
};

// Updates an existing pah in the DB.
exports.update = function(req, res) {
    if (req.body._id) {
        delete req.body._id;
    }
    Pah.findById(req.params.id, function(err, pah) {
        if (err) {
            return handleError(res, err);
        }
        if (!pah) {
            return res.send(404);
        }
        var updated = _.merge(pah, req.body);
        updated.save(function(err) {
            if (err) {
                return handleError(res, err);
            }
            return res.json(200, pah);
        });
    });
};

// Deletes a pah from the DB.
exports.destroy = function(req, res) {
    Pah.findById(req.params.id, function(err, pah) {
        if (err) {
            return handleError(res, err);
        }
        if (!pah) {
            return res.send(404);
        }
        pah.remove(function(err) {
            if (err) {
                return handleError(res, err);
            }
            return res.send(204);
        });
    });
};

function handleError(res, err) {
    return res.send(500, err);
}