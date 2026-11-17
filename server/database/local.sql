-- Локальная разработка. На бою эти таблицы принадлежат логин-серверу и игровому серверу
-- и в install.sql не создаются. Здесь — только колонки, которые читает и пишет кабинет.

USE la2;

-- Игровые аккаунты логин-сервера. Кабинет связывает их с мастером по e-mail.
CREATE TABLE IF NOT EXISTS accounts (
  login VARCHAR(45) NOT NULL,
  password VARCHAR(128) NOT NULL DEFAULT '',
  email VARCHAR(45) NULL DEFAULT NULL,
  last_access INT UNSIGNED NOT NULL DEFAULT 0,
  access_level INT NOT NULL DEFAULT 0,
  last_server INT NOT NULL DEFAULT 0,
  last_ip VARCHAR(45) NULL DEFAULT NULL,
  PRIMARY KEY (login)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE DATABASE IF NOT EXISTS la2x3 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE la2x3;

CREATE TABLE IF NOT EXISTS characters (
  obj_Id INT NOT NULL,
  char_name VARCHAR(35) NOT NULL,
  account_name VARCHAR(45) NOT NULL DEFAULT '',
  online TINYINT NOT NULL DEFAULT 0,
  accesslevel INT NOT NULL DEFAULT 0,
  deletetime INT NOT NULL DEFAULT 0,
  pvpkills INT NOT NULL DEFAULT 0,
  pkkills INT NOT NULL DEFAULT 0,
  clanid INT NOT NULL DEFAULT 0,
  PRIMARY KEY (obj_Id),
  KEY idx_account (account_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS character_subclasses (
  char_obj_id INT NOT NULL,
  class_id INT NOT NULL DEFAULT 0,
  level TINYINT UNSIGNED NOT NULL DEFAULT 1,
  exp BIGINT NOT NULL DEFAULT 0,
  active TINYINT NOT NULL DEFAULT 0,
  PRIMARY KEY (char_obj_id, class_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS items_delayed (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  owner_id INT NOT NULL,
  item_id INT NOT NULL,
  count BIGINT NOT NULL DEFAULT 0,
  description VARCHAR(255) NOT NULL DEFAULT '',
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS olympiad_nobles (
  char_id INT NOT NULL,
  PRIMARY KEY (char_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS accounts (
  login VARCHAR(45) NOT NULL,
  last_ip VARCHAR(45) NULL DEFAULT NULL,
  PRIMARY KEY (login)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS hwid_info (
  Account VARCHAR(45) NOT NULL,
  HWID VARCHAR(64) NOT NULL DEFAULT '',
  HWIDSecond VARCHAR(64) NOT NULL DEFAULT '',
  PRIMARY KEY (Account)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- Пустые таблицы статистики: /api/top, /api/castles и /api/heroes отвечают пустым списком, а не 503.
CREATE TABLE IF NOT EXISTS castle (
  id INT NOT NULL,
  name VARCHAR(64) NOT NULL DEFAULT '',
  tax_percent INT NOT NULL DEFAULT 0,
  siege_date BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS clan_data (
  clan_id INT NOT NULL,
  hasCastle INT NOT NULL DEFAULT 0,
  ally_id INT NOT NULL DEFAULT 0,
  PRIMARY KEY (clan_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS clan_subpledges (
  clan_id INT NOT NULL,
  type INT NOT NULL DEFAULT 0,
  name VARCHAR(64) NOT NULL DEFAULT '',
  leader_id INT NOT NULL DEFAULT 0,
  PRIMARY KEY (clan_id, type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS ally_data (
  ally_id INT NOT NULL,
  ally_name VARCHAR(64) NOT NULL DEFAULT '',
  PRIMARY KEY (ally_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS heroes (
  char_id INT NOT NULL,
  played TINYINT NOT NULL DEFAULT 0,
  count INT NOT NULL DEFAULT 0,
  PRIMARY KEY (char_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- Пользователь из docker-compose видит и кабинет, и игровую базу.
GRANT ALL PRIVILEGES ON la2.* TO 'azimut'@'%';
GRANT ALL PRIVILEGES ON la2x3.* TO 'azimut'@'%';
FLUSH PRIVILEGES;

-- Демо-данные. Пароль везде azimut. admin входит в NUXT_ADMIN_LOGINS.
USE la2;

INSERT INTO master_accounts (login, email, password_hash, coins, ref_code, reg_ip, created_at)
VALUES (
  'admin',
  'admin@localhost',
  '$2b$10$BGj.eX9tAH6ZSxXtTlHRDu7TGbF55ZQHZIaFi/ysIlcqowvrNusdm',
  1000,
  'ADMIN',
  '127.0.0.1',
  UNIX_TIMESTAMP()
);

INSERT INTO accounts (login, password, email, last_access, access_level, last_server)
VALUES (
  'player',
  'zYeqHke8RrYmkZL+B8xw69WXoPAXAgaKtUvIF8TYERZNwPkxqf17jvy9iRHpLQ/Z8nu2Uw21ZVLabnsgrt9xmA==',
  'admin@localhost',
  UNIX_TIMESTAMP(),
  0,
  1
);

INSERT INTO forum_profiles (master_id, name, created_at)
SELECT id, 'Admin', UNIX_TIMESTAMP() FROM master_accounts WHERE login = 'admin';

INSERT INTO forum_topics (category, author_id, title, pinned, closed, replies, created_at, last_post_at)
SELECT 'general', id, 'Локальный форум', 1, 0, 0, UNIX_TIMESTAMP(), UNIX_TIMESTAMP()
FROM master_accounts WHERE login = 'admin';

INSERT INTO forum_posts (topic_id, author_id, body, format, hidden, created_at, edited_at)
SELECT t.id, t.author_id, 'Тема для проверки форума на локальной базе.', 'plain', 0, t.created_at, 0
FROM forum_topics t
WHERE t.title = 'Локальный форум';

USE la2x3;

INSERT INTO characters (obj_Id, char_name, account_name, online, accesslevel, deletetime, pvpkills, pkkills)
VALUES (1, 'Azimut', 'player', 0, 0, 0, 12, 0);

INSERT INTO character_subclasses (char_obj_id, class_id, level, exp, active)
VALUES (1, 88, 80, 0, 1);
