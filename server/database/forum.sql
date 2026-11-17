-- Форум на уже работающей базе кабинета (логин-сервер, по умолчанию la2).
-- Для новой установки те же таблицы есть в install.sql.
-- Разделы фиксированы в shared/forum.ts.
-- format: plain — текст без разметки, markdown — сообщение из редактора.

CREATE TABLE IF NOT EXISTS forum_profiles (
  master_id INT UNSIGNED NOT NULL,
  name VARCHAR(16) NOT NULL,
  created_at INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (master_id),
  UNIQUE KEY uq_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS forum_topics (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  category VARCHAR(16) NOT NULL,
  author_id INT UNSIGNED NOT NULL,
  title VARCHAR(120) NOT NULL,
  pinned TINYINT UNSIGNED NOT NULL DEFAULT 0,
  closed TINYINT UNSIGNED NOT NULL DEFAULT 0,
  replies INT UNSIGNED NOT NULL DEFAULT 0,
  created_at INT UNSIGNED NOT NULL DEFAULT 0,
  last_post_at INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_category_list (category, pinned, last_post_at),
  KEY idx_author (author_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS forum_posts (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  topic_id INT UNSIGNED NOT NULL,
  author_id INT UNSIGNED NOT NULL,
  body TEXT NOT NULL,
  format ENUM('plain', 'markdown') NOT NULL DEFAULT 'plain',
  hidden TINYINT UNSIGNED NOT NULL DEFAULT 0,
  created_at INT UNSIGNED NOT NULL DEFAULT 0,
  edited_at INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_topic (topic_id, id),
  KEY idx_author (author_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Уже созданная таблица: CREATE выше её не меняет.
ALTER TABLE forum_posts
  MODIFY format ENUM('plain', 'markdown') NOT NULL DEFAULT 'plain';
