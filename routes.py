from flask import Flask, render_template, request, jsonify
import random
import time
import json
import pickle
from collections import defaultdict

DB_PATH = 'static/data/db.pickle'

app = Flask(__name__)

REQS = 0
default_names = ['fishface','big_daddy_slim_','buttercuppz','peggy','mr_johnson','ulla']
SUIT_TO_UNICODE = {'spades':'\U00002660', 'hearts': '\U00002665',
         'clubs': '\U00002663', 'diamonds': '\U00002666'}

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

class Card:
    def __init__(self, value, suit):
        self.value = value
        self.suit = suit
        self.suit_unicode = SUIT_TO_UNICODE[suit]

    @classmethod
    def from_string(cls, card_string):
        value, suit = card_string.split('_')
        return cls(value, suit)


class Hand:
    def __init__(self, user, card_a, card_b, ts, round_id):
        self.user = user
        self.card_a = Card.from_string(card_a)
        self.card_b = Card.from_string(card_b)
        self.ts = ts
        self.round_id = round_id
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
    db = init_db()
    write_db(db)
    return 'db reset'

@app.route('/api/advance')
def api_advance():
    db = get_db()
    db['current_round_id'] += 1
    write_db(db)
    return str(db['current_round_id'])

@app.route('/api/hand')
def api_hand():
    db = get_db()
    round_id = db.get('current_round_id')
    user = request.args.get('user')
    ip_addr = request.args.get('remote_addr')
    card_a = request.args.get('card_a')
    card_b = request.args.get('card_b')
    ts = time.time()
    hand = Hand(user, card_a, card_b, ts, round_id)
    db['rounds'][round_id][user] = hand
    write_db(db)
    print(user, card_a, card_b, ts)
    return 'successfully sent ajax request...'

@app.route('/api/round/<int:round_id>')
def api_round(round_id):
    db = get_db()
    current_round_id = db.get('current_round_id')
    if round_id > current_round_id:
        return jsonify({'error':f'round {round_id} not played yet'})
    round_data = db['rounds'][round_id]
    return jsonify({username:hand.to_dict() for username,hand in round_data.items()})

@app.route('/play/')
def play_no_username():
    global REQS
    REQS += 1
    print('REQUESTS SO FAR:', REQS)
    user = random.choice(default_names) + str(random.randint(2,99))
    return play(user)

@app.route('/play/<user>')
def play(user):
    db = get_db()
    round_id = db['current_round_id']
    values = ['2','3','4','5','6','7','8','9','10','J','Q','K','A']
    return render_template('play.html', suits=SUIT_TO_UNICODE,
                            values=values,user=user, round_id=round_id)

@app.route('/watch')
def watch():
    db = get_db()
    round_id = db['current_round_id']
    return render_template('watch.html', hands=db['rounds'][round_id], round_id=round_id)

@app.route('/api/watch/update_hands')
def api_update_hands():
    db = get_db()
    round_id = db['current_round_id']
    return render_template('watch_frag_hands.html', hands=db['rounds'][round_id],
                            round_id=round_id)
