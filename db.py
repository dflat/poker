import sqlite3

class Database:
    IntegrityError = sqlite3.IntegrityError
    def __init__(self, name):
        self.conn = sqlite3.connect(name, detect_types=sqlite3.PARSE_DECLTYPES)
        self.conn.row_factory = sqlite3.Row

    def execute(self, query, args=()):
        try:
            cursor = self.conn.execute(query, args)
        except Exception as e:
            raise e
        finally:
            self.conn.commit()
        return cursor

    def close(self):
        self.conn.close()
        print('db connection closed')

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        # make sure the db connection gets closed
        self.close()

    def __getattr__(self, attr):
        # pass thru to wrapped sqlite3 connection
        return getattr(self.conn, attr)

def get_db():
    return Database('data/poker.db')

CARD_VALS = ['2','3','4','5','6','7','8','9','10','J','Q','K','A']
CARD_SUITS = ['hearts','diamonds','spades','clubs']
SUIT_UNICODE = {'hearts':'\u2665', 'diamonds':'\u2666', 'spades':'\u2660',
                'clubs':'\u2663'}
CODED_VALUES = dict(zip(CARD_VALS, range(13)))
CODED_SUITS = dict(zip(CARD_SUITS, range(4)))

def init_db():
    db = get_db()
    with open('data/schema.sql') as f:
        db.executescript(f.read())
    
    # initialize all 52 cards in card table
    for suit in range(4):
        for val in range(13):
            value = CARD_VALS[val] 
            suit_name = CARD_SUITS[suit]
            suit_unicode = SUIT_UNICODE[suit_name]
            display_text = value + suit_unicode
            vals = (value, suit_name, suit_unicode, display_text, val)
            db.execute('INSERT INTO card (value,suit,suit_unicode,display_text, \
                    coded_value) VALUES (?,?,?,?,?);', vals)

    #initialize game table
    cur = db.execute('INSERT INTO game (current_round_no) VALUES (?);', (1,))
    game_id = cur.lastrowid

    cur = db.execute('INSERT INTO round (game_id, round_no) VALUES (?,?);', (game_id,1))
    round_id = cur.lastrowid

    # initialize some test data
#    db.execute('INSERT INTO user (username, emoji) VALUES (?,?);', ('ulla','🌶️'))
#    db.execute('INSERT INTO user (username, emoji) VALUES (?,?);', ('cityboi','🌶️'))

#    db.execute('INSERT INTO hand (player_id, round_id, high_card_id, low_card_id) \
#                VALUES (?,?,?,?);', (1,round_id,52,51))
#    db.execute('INSERT INTO hand (player_id, round_id, high_card_id, low_card_id) \
#                VALUES (?,?,?,?);', (2,round_id,50,49))

    db.close()
