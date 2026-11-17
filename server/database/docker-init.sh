#!/bin/sh
# Первый старт контейнера: схема кабинета из install.sql без боевых GRANT,
# затем заглушки логин-сервера и игровой базы (local.sql).
set -eu

echo "[azimut] схема кабинета и форума"
sed -e '/^GRANT /d' -e '/^FLUSH PRIVILEGES;/d' /opt/azimut/install.sql \
  | mariadb -uroot -p"${MARIADB_ROOT_PASSWORD}" la2

echo "[azimut] заглушки accounts и игровой базы la2x3"
mariadb -uroot -p"${MARIADB_ROOT_PASSWORD}" < /opt/azimut/local.sql
