-- Схема БД личного кабинета (база логин-сервера, по умолчанию la2).
-- Нужна только для новой установки: на текущем сервере таблицы уже созданы старой PHP-CMS
-- и новый кабинет работает с ними без изменений.
-- Таблица accounts — штатная таблица логин-сервера L2, здесь не создаётся.

CREATE TABLE IF NOT EXISTS master_accounts (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  login VARCHAR(32) NOT NULL,
  email VARCHAR(45) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  coins BIGINT NOT NULL DEFAULT 0,
  ref_code VARCHAR(16) NULL DEFAULT NULL,
  reg_ip VARCHAR(45) NOT NULL DEFAULT '',
  ref_by INT UNSIGNED NOT NULL DEFAULT 0,
  created_at INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_login (login),
  UNIQUE KEY uq_email (email),
  UNIQUE KEY uq_ref_code (ref_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS payments (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  payment_code VARCHAR(20) NOT NULL,
  master_id INT UNSIGNED NOT NULL DEFAULT 0,
  master_login VARCHAR(32) NOT NULL DEFAULT '',
  amount_rub INT UNSIGNED NOT NULL DEFAULT 0,
  amount_coins BIGINT NOT NULL DEFAULT 0,
  status ENUM('pending','paid','canceled','expired') NOT NULL DEFAULT 'pending',
  provider VARCHAR(20) NOT NULL DEFAULT 'manual',
  provider_payment_id VARCHAR(64) NOT NULL DEFAULT '',
  qr_data TEXT NULL,
  created_at INT UNSIGNED NOT NULL DEFAULT 0,
  paid_at INT UNSIGNED NOT NULL DEFAULT 0,
  confirmed_by VARCHAR(32) NOT NULL DEFAULT '',
  PRIMARY KEY (id),
  UNIQUE KEY uq_code (payment_code),
  KEY idx_master (master_id),
  KEY idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS donate_log (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  master_id INT UNSIGNED NOT NULL DEFAULT 0,
  master_login VARCHAR(32) NOT NULL DEFAULT '',
  char_name VARCHAR(35) NOT NULL DEFAULT '',
  server VARCHAR(32) NOT NULL DEFAULT '',
  item_id INT NOT NULL DEFAULT 0,
  amount BIGINT NOT NULL DEFAULT 0,
  action VARCHAR(20) NOT NULL DEFAULT '',
  created_at INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_master (master_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS referral_relations (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  referrer_id INT UNSIGNED NOT NULL DEFAULT 0,
  referred_id INT UNSIGNED NOT NULL DEFAULT 0,
  created_at INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_referred (referred_id),
  KEY idx_referrer (referrer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS referral_claims (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  kind VARCHAR(20) NOT NULL DEFAULT '',
  account_id INT UNSIGNED NOT NULL DEFAULT 0,
  type VARCHAR(20) NOT NULL DEFAULT '',
  referrer_id INT UNSIGNED NOT NULL DEFAULT 0,
  char_id INT NOT NULL DEFAULT 0,
  ips VARCHAR(1000) NOT NULL DEFAULT '',
  hwids VARCHAR(1000) NOT NULL DEFAULT '',
  created_at INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_claim (kind, account_id, type),
  KEY idx_referrer (referrer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS referral_rewards_log (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  kind VARCHAR(20) NOT NULL DEFAULT '',
  master_id INT UNSIGNED NOT NULL DEFAULT 0,
  referrer_id INT UNSIGNED NOT NULL DEFAULT 0,
  referred_id INT UNSIGNED NOT NULL DEFAULT 0,
  char_id INT NOT NULL DEFAULT 0,
  type VARCHAR(20) NOT NULL DEFAULT '',
  item_id INT NOT NULL DEFAULT 0,
  item_count BIGINT NOT NULL DEFAULT 0,
  coin_amount BIGINT NOT NULL DEFAULT 0,
  server VARCHAR(32) NOT NULL DEFAULT '',
  created_at INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_master (master_id),
  KEY idx_referrer (referrer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS referral_reward_items (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  reward_key VARCHAR(30) NOT NULL DEFAULT '',
  item_id INT NOT NULL DEFAULT 0,
  count BIGINT NOT NULL DEFAULT 1,
  sort INT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_key (reward_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS referral_settings (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  s_key VARCHAR(32) NOT NULL,
  s_value VARCHAR(255) NOT NULL DEFAULT '',
  PRIMARY KEY (id),
  UNIQUE KEY uq_key (s_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

INSERT IGNORE INTO referral_settings (s_key, s_value) VALUES
  ('reward_enabled', '1'),
  ('commission_pct', '5'),
  ('ref_prof1_coins', '50'),
  ('ref_prof2_coins', '100'),
  ('ref_prof3_coins', '250'),
  ('ref_noble_coins', '200');

-- Права пользователя сайта: полный доступ к своим таблицам, к игровой БД — только нужное.
-- Имя игровой БД — id сервера из shared/cabinet.ts (сейчас la2x3). Ограничьте хост ('%') IP-адресом сервера сайта.
GRANT SELECT, INSERT, UPDATE, DELETE ON la2.* TO 'cms_register'@'%';

-- Кабинет: персонажи, профессии, дворянство, выдача предметов
GRANT SELECT ON la2x3.characters TO 'cms_register'@'%';
GRANT SELECT ON la2x3.character_subclasses TO 'cms_register'@'%';
GRANT SELECT ON la2x3.olympiad_nobles TO 'cms_register'@'%';
GRANT SELECT, INSERT, DELETE ON la2x3.items_delayed TO 'cms_register'@'%';

-- Реферальная программа: защита от твинков по IP и HWID (если таблиц нет, проверка просто пропускается)
GRANT SELECT ON la2x3.accounts TO 'cms_register'@'%';
GRANT SELECT ON la2x3.hwid_info TO 'cms_register'@'%';

-- Статистика (/api/castles, /api/heroes)
GRANT SELECT ON la2x3.castle TO 'cms_register'@'%';
GRANT SELECT ON la2x3.clan_data TO 'cms_register'@'%';
GRANT SELECT ON la2x3.clan_subpledges TO 'cms_register'@'%';
GRANT SELECT ON la2x3.ally_data TO 'cms_register'@'%';
GRANT SELECT ON la2x3.heroes TO 'cms_register'@'%';
FLUSH PRIVILEGES;
