-- Схема БД форума (база логин-сервера, по умолчанию la2 — там же, где master_accounts).
-- Выполняется один раз вручную привилегированным пользователем MySQL:
--   mysql -h ХОСТ -u PRIVILEGED_USER -p la2 < server/database/forum.sql
-- У сайта (cms_register) есть SELECT/INSERT/UPDATE/DELETE на la2.* — этого достаточно для работы,
-- но НЕ для создания таблиц: право CREATE нужно выдать отдельно или выполнить скрипт под админом БД.
-- Скрипт идемпотентный: существующие таблицы не затираются, стартовые разделы добавляются только в пустую таблицу.

CREATE TABLE IF NOT EXISTS forum_sections (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  description VARCHAR(255) NOT NULL DEFAULT '',
  sort INT NOT NULL DEFAULT 0,
  created_at INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_sort (sort)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- Тема: заголовок и тело первого сообщения хранятся здесь, ответы — в forum_posts.
-- reply_count/last_post_at/last_post_login пересчитываются сервером при изменении ответов.
CREATE TABLE IF NOT EXISTS forum_topics (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  section_id INT UNSIGNED NOT NULL,
  title VARCHAR(150) NOT NULL,
  body TEXT NOT NULL,
  author_id INT UNSIGNED NOT NULL DEFAULT 0,
  author_login VARCHAR(32) NOT NULL DEFAULT '',
  is_pinned TINYINT UNSIGNED NOT NULL DEFAULT 0,
  is_locked TINYINT UNSIGNED NOT NULL DEFAULT 0,
  view_count INT UNSIGNED NOT NULL DEFAULT 0,
  reply_count INT UNSIGNED NOT NULL DEFAULT 0,
  created_at INT UNSIGNED NOT NULL DEFAULT 0,
  last_post_at INT UNSIGNED NOT NULL DEFAULT 0,
  last_post_login VARCHAR(32) NOT NULL DEFAULT '',
  PRIMARY KEY (id),
  KEY idx_section (section_id, is_pinned, last_post_at),
  KEY idx_author (author_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS forum_posts (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  topic_id INT UNSIGNED NOT NULL,
  body TEXT NOT NULL,
  author_id INT UNSIGNED NOT NULL DEFAULT 0,
  author_login VARCHAR(32) NOT NULL DEFAULT '',
  created_at INT UNSIGNED NOT NULL DEFAULT 0,
  updated_at INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_topic (topic_id, created_at),
  KEY idx_author (author_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- Стартовые разделы (только если таблица пуста). Названия — на русском, как язык сайта по умолчанию;
-- админ может переименовать/добавить разделы в админ-панели (/admin/forum).
INSERT INTO forum_sections (name, description, sort, created_at)
SELECT 'Новости и анонсы', 'Новости сервера, анонсы мероприятий и обновлений.', 1, UNIX_TIMESTAMP()
WHERE NOT EXISTS (SELECT 1 FROM forum_sections);

INSERT INTO forum_sections (name, description, sort, created_at)
SELECT 'Общее обсуждение', 'Общение игроков, обсуждение игры и жизни сервера.', 2, UNIX_TIMESTAMP()
WHERE NOT EXISTS (SELECT 1 FROM forum_sections);

INSERT INTO forum_sections (name, description, sort, created_at)
SELECT 'Кланы и альянсы', 'Поиск клана, набор игроков, дипломатия и войны кланов.', 3, UNIX_TIMESTAMP()
WHERE NOT EXISTS (SELECT 1 FROM forum_sections);

INSERT INTO forum_sections (name, description, sort, created_at)
SELECT 'Торговля', 'Покупка, продажа и обмен предметами между игроками.', 4, UNIX_TIMESTAMP()
WHERE NOT EXISTS (SELECT 1 FROM forum_sections);

INSERT INTO forum_sections (name, description, sort, created_at)
SELECT 'Поддержка и вопросы', 'Вопросы по игре, помощь и сообщения о проблемах.', 5, UNIX_TIMESTAMP()
WHERE NOT EXISTS (SELECT 1 FROM forum_sections);