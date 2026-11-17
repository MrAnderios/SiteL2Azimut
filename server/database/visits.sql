-- Уникальные заходы на уже работающей базе кабинета (логин-сервер, по умолчанию la2).
-- Для новой установки та же таблица есть в install.sql.
-- Один IP, один раздел, одни московские сутки — одна строка.
-- Боевой MySQL 5.1.73 без utf8mb4.

CREATE TABLE IF NOT EXISTS site_visits (
  section VARCHAR(16) NOT NULL,
  day CHAR(8) NOT NULL,
  ip VARCHAR(45) NOT NULL,
  created_at INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (day, section, ip)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
