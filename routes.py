from flask import Flask, render_template, request, jsonify, redirect
import random
import re
import time
import json
import pickle
from collections import defaultdict
import db as DB

DB_PATH = 'static/data/db.pickle'

app = Flask(__name__)

REQS = 0
default_names = ['fishface','big_daddy_slim_','buttercuppz','peggy','mr_johnson','ulla']
SUIT_TO_UNICODE = {'spades':'\U00002660', 'hearts': '\U00002665',
         'clubs': '\U00002663', 'diamonds': '\U00002666'}

def get_card_lookup():
    with DB.get_db() as db:
        cards = db.execute('select * from card;').fetchall()
        return {card['id']:dict(card) for card in cards}
CARD_LOOKUP = get_card_lookup()

def init_db():
    return {'current_round_id': 0, 'rounds': defaultdict(dict)}

def get_db():
    try:
        with open(DB_PATH, 'rb') as f:
            db = pickle.load(f)
    except FileNotFoundError:
        # rounds: {round_id => {user=>hand}}
        db = init_db()
    return db

def write_db(db):
    with open(DB_PATH, 'wb') as f:
        pickle.dump(db, f)
    print('db state saved')

#CARD_VALUES = ['2','3','4','5','6','7','8','9','10','J','Q','K','A']
#CODED_VALUES = dict(zip(CARD_VALUES, range(13)))
#CODED_SUITS = dict(zip(SUITS, range(4))
class Card:
    def __init__(self, value, suit):
        self.value = value
        self.suit = suit
        self.coded_value = DB.CODED_VALUES[value]
        self.coded_suit = DB.CODED_SUITS[suit]
        self.suit_unicode = SUIT_TO_UNICODE[suit]
        self.id = self.get_id()

    def get_id(self):
        return int(13*(self.coded_suit) + (self.coded_value + 1))

    @classmethod
    def from_string(cls, card_string):
        value, suit = card_string.split('_')
        return cls(value, suit)


class Hand:
    def __init__(self, user, user_id, card_a, card_b, ts, round_id):
        self.user = user
        self.user_id = user_id
        self.card_a = Card.from_string(card_a)
        self.card_b = Card.from_string(card_b)
        self.order_cards()
        self.ts = ts
        self.round_id = round_id

    def order_cards(self):
        if self.card_a.coded_value >= self.card_b.coded_value:
            self.high_card, self.low_card = self.card_a, self.card_b
        else:
            self.high_card, self.low_card = self.card_b, self.card_a

    def to_dict(self):
        d = self.__dict__ 
        d['card_a'] = self.card_a.__dict__
        d['card_b'] = self.card_b.__dict__
        return d

class User:
    _id = 0
    def __init__(self, name, ip_addr=None):
        User._id += 1
        self.id = User._id
        self.ip_addr = ip_addr 
        self.name = name
        self.avatar = None

class Round:
    _id = 0
    def __init__(self):
        Round._id += 1
        self.id = Round._id

@app.route('/api/reset')
def api_reset():
    DB.init_db()
    return jsonify("database was reset")

@app.route('/api/advance')
def api_advance():
    with DB.get_db() as db:
        game = db.execute('SELECT * FROM game ORDER BY id DESC LIMIT 1;').fetchone()
        db.execute('INSERT INTO round (game_id,round_no) VALUES (?,?);',
                        (game['id'], game['current_round_no']+1))
        db.execute('UPDATE game SET current_round_no = current_round_no + 1 \
                    WHERE id = (?);', (game['id'],))
    return jsonify("round was advanced")

# db helper functions

def get_current_round(db):
    return db.execute('SELECT * from round ORDER BY id DESC LIMIT 1').fetchone()

def post_hand(db, hand):
    update = 'UPDATE hand SET high_card_id = (?), low_card_id = (?) \
              WHERE player_id = (?) AND round_id = (?);'
    cur = db.execute(update, (hand.high_card.id, hand.low_card.id, hand.user_id, hand.round_id))

    if cur.rowcount == 0: # first hand submission by player this round, do an INSERT instead
        vals = (hand.user_id, hand.round_id, hand.high_card.id, hand.low_card.id)
        db.execute('INSERT INTO hand (player_id, round_id, high_card_id, low_card_id) \
                    VALUES (?,?,?,?);', vals)


def fold_hand(db, user_id):
    round_id = get_current_round(db)['id']
    vals = (user_id, round_id)
    db.execute('UPDATE hand SET folded = 1 WHERE player_id = (?) AND round_id = (?);', vals)


def get_user_id(db, username):
    user = db.execute('SELECT id FROM user WHERE username = (?);', (username,)).fetchone()
    if user:
        return user['id']
    else: # create new user here? TODO... should never happen, need users to register..
        cur = db.execute('INSERT INTO user (username, emoji) VALUES (?,?);', (username, "Nomoji"))
        return cur.lastrowid


def get_hands_in_round(db, round_id):
    hands = db.execute('SELECT user.id, user.username, user.emoji, \
                               hand.high_card_id, hand.low_card_id, hand.folded \
                        FROM hand INNER JOIN user ON user.id = hand.player_id \
                        WHERE round_id=(?);', (round_id,)).fetchall()
    return hands

# end db helper functions        

@app.route('/api/hand/fold')
def api_fold():
    user = request.args.get('user')
    print('request to fold from', user)
    with DB.get_db() as db:
        user_id = get_user_id(db, user) # TODO: fix this hack or make usernames unique
        fold_hand(db, user_id)
    return jsonify("folded successfully")

@app.route('/api/hand')
def api_hand():
    user = request.args.get('user')
    card_a = request.args.get('card_a')
    card_b = request.args.get('card_b')
    ip_addr = request.args.get('remote_addr')
    ts = time.time()
    with DB.get_db() as db:
        user_id = get_user_id(db, user) # TODO: fix this hack or make usernames unique
        round_id = get_current_round(db)['id']
        hand = Hand(user, user_id, card_a, card_b, ts, round_id) 
        post_hand(db, hand)
        print(user, card_a, card_b, ts)
        return 'successfully posted ajax request to sqlite...'



@app.route('/api/round/current')
def api_current_round():
    result = { }
    old_db = get_db()
    with DB.get_db() as db:
        round_data = get_current_round(db)
        result['round_no'] = round_data['round_no']
        hands = get_hands_in_round(db, round_data['id'])
        result['players'] = {hand['username']:dict(hand) for hand in hands}
    return jsonify(result)

@app.route('/api/round/<int:round_id>')
def api_round(round_id):
#    raise RuntimeError('API FUNCTION /api/round/ DEPRECATED')
    db = get_db()
    current_round_id = db.get('current_round_id')
    if round_id > current_round_id:
        return jsonify({'error':f'round {round_id} not played yet'})
    round_data = db['rounds'][round_id]
    return jsonify({username:hand.to_dict() for username,hand in round_data.items()})

@app.route('/ring')
def ring_no_user():
    return ring(user=None)

@app.route('/ring/<user>')
def ring(user): # TODO: make user register if first time here, otherwise load their emoji, etc...
    print('user entered the ring', user)
    with DB.get_db() as db:
        round_data = get_current_round(db)
        round_id = round_data['id']
        round_no = round_data['round_no']

    print('round_no:', round_no)
    emoji = json.load(open('static/js/emoji.json','rb'))['emojis']
    pat = re.compile('.*(food|animal|music|clothing)')
    emoji = [e for e in emoji if pat.match(e['category'].lower())]

    return render_template('ring.html', round_no=round_no, username=user, emoji=emoji)

@app.route('/play/')
def play_no_username():
    global REQS
    REQS += 1
    print('REQUESTS SO FAR:', REQS)
    user = random.choice(default_names) + str(random.randint(2,99))
    return play(user)

@app.route('/play/<user>')
def play(user):
    return redirect(url_for('ring', user=user))
#    db = get_db()
#    round_id = db['current_round_id']
#    values = ['2','3','4','5','6','7','8','9','10','J','Q','K','A']
#    return render_template('play.html', suits=SUIT_TO_UNICODE,
#                            values=values,user=user, round_id=round_id)

@app.route('/watch')
def watch():
    with DB.get_db() as db:
        round_data = get_current_round(db)
        hands = get_hands_in_round(db, round_data['id'])

    #player_to_hand_map = {hand['username']:dict(hand) for hand in hands}
    player_to_hand_map = build_player_to_hand_map(hands)

    return render_template('watch.html', hands=player_to_hand_map, round_no=round_data['round_no'])

def build_player_to_hand_map(hands):
    player_to_hand_map = { }
    for hand in hands: 
        user = hand['username']
        hand_dict = dict(hand)
        hand_dict['high_card'] = CARD_LOOKUP[hand_dict['high_card_id']] #TODO:fix high/low
        hand_dict['low_card'] = CARD_LOOKUP[hand_dict['low_card_id']]
        player_to_hand_map[user] = hand_dict
    return player_to_hand_map

@app.route('/api/watch/update_hands')
def api_update_hands(): #TODO: dont re-render html, do a data swap out of the dom elements instead.
    with DB.get_db() as db:
        round_data = get_current_round(db)
        round_id, round_no = round_data['id'], round_data['round_no']
        hands = get_hands_in_round(db, round_id)
    #player_to_hand_map = {hand['username']:dict(hand) for hand in hands}

    player_to_hand_map = build_player_to_hand_map(hands)

    return render_template('watch_frag_hands.html', hands=player_to_hand_map,
                            round_no=round_data['round_no'])
