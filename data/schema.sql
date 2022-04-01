DROP TABLE IF EXISTS user;
DROP TABLE IF EXISTS card;
DROP TABLE IF EXISTS hand;
DROP TABLE IF EXISTS round;
DROP TABLE IF EXISTS winner;
DROP TABLE IF EXISTS game;
DROP TRIGGER IF EXISTS insert_round_winners;

CREATE TABLE user (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  emoji TEXT NOT NULL,
  ip_addr TEXT,
  mac_addr TEXT,
  created TIMESTAMP NOT NULL DEFAULT (datetime(CURRENT_TIMESTAMP, 'localtime'))
);

CREATE TABLE card (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  value TEXT NOT NULL,
  suit TEXT NOT NULL,
  suit_unicode TEXT NOT NULL,
  display_text TEXT NOT NULL,
  coded_value INTEGER NOT NULL
);

CREATE TABLE game (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  current_round_no INTEGER NOT NULL DEFAULT 0,
  created TIMESTAMP NOT NULL DEFAULT (datetime(CURRENT_TIMESTAMP, 'localtime'))
);

CREATE TABLE round (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  round_no INTEGER NOT NULL,
  game_id INTEGER NOT NULL,
  created TIMESTAMP NOT NULL DEFAULT (datetime(CURRENT_TIMESTAMP, 'localtime')),
  FOREIGN KEY (game_id) REFERENCES game (id)
);

CREATE TABLE winner (
  user_id INTEGER NOT NULL,
  round_id INTEGER NOT NULL,
  PRIMARY KEY(user_id, round_id),
  FOREIGN KEY (user_id) REFERENCES user (id),
  FOREIGN KEY (round_id) REFERENCES round (id)
);

CREATE TRIGGER insert_round_winners AFTER INSERT ON round /*WHEN (NEW.id > 1)*/
  BEGIN
    INSERT INTO winner (user_id,round_id)
    SELECT player_id, round_id FROM hand WHERE round_id = NEW.id - 1 AND folded = 0;
  END;


CREATE TABLE hand (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id INTEGER NOT NULL,
  round_id INTEGER NOT NULL,
  high_card_id INTEGER NOT NULL,
  low_card_id INTEGER NOT NULL,
  folded INTEGER NOT NULL DEFAULT 0,
  created TIMESTAMP NOT NULL DEFAULT (datetime(CURRENT_TIMESTAMP, 'localtime')),
  FOREIGN KEY (player_id) REFERENCES user (id),
  FOREIGN KEY (round_id) REFERENCES round (id),
  FOREIGN KEY (high_card_id) REFERENCES card (id),
  FOREIGN KEY (low_card_id) REFERENCES card (id)
);
