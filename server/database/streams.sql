-- Стримы на главной: site_settings на уже работающей базе кабинета (логин-сервер, по умолчанию la2).
-- Для новой установки та же таблица есть в install.sql.

CREATE TABLE IF NOT EXISTS site_settings (
  s_key VARCHAR(32) NOT NULL,
  s_value TEXT NOT NULL,
  PRIMARY KEY (s_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;