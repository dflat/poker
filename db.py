import sqlite3

class Database:
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

    def __getattr__(self, attr):
        # pass thru to wrapped sqlite3 connection
        return getattr(self.conn, attr)

def get_db():
    return Database('data/poker.db')

def init_db():
    db = get_db()
    with open('data/schema.sql') as f:
        db.executescript(f.read())
    
    # initialize all 52 cards in card table
    CARD_VALS = ['2','3','4','5','6','7','8','9','10','J','Q','K','A']
    CARD_SUITS = ['hearts','diamonds','spades','clubs']
    SUIT_UNICODE = {'hearts':'\u2665', 'diamonds':'\u2666', 'spades':'\u2660',
                    'clubs':'\u2663'}
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
    db.execute('INSERT INTO game (current_round_id) VALUES (?);', (0,))


