#!/usr/bin/env bash
# Настройка GitHub для деплоя на свой сервер: SSH-ключ, окружение production и его секреты.
# Запускается на вашем компьютере из папки репозитория. Нужен gh (https://cli.github.com) после `gh auth login`.
#
#   scripts/server/github-setup.sh <IP или домен сервера> [порт SSH, по умолчанию 22]
#
# Закрытый ключ сразу уходит в секреты GitHub и на диске не остаётся. Публичный ключ скрипт печатает
# вместе с готовой командой для scripts/server/setup.sh. Повторный запуск создаёт новый ключ
# (старый из ~deploy/.ssh/authorized_keys на сервере тогда стоит удалить).

set -euo pipefail

HOST="${1:-}"
PORT="${2:-22}"
[ -n "$HOST" ] || { echo "Использование: $0 <IP или домен сервера> [порт SSH]"; exit 1; }
command -v gh >/dev/null || { echo "Нужен GitHub CLI: https://cli.github.com"; exit 1; }
gh auth status >/dev/null 2>&1 || { echo "Сначала выполните: gh auth login"; exit 1; }

REPO="$(gh repo view --json nameWithOwner -q .nameWithOwner)"
echo "Репозиторий: $REPO"

echo "Получаем ключ сервера (ssh-keyscan $HOST:$PORT)…"
KNOWN_HOSTS="$(ssh-keyscan -p "$PORT" "$HOST" 2>/dev/null)"
[ -n "$KNOWN_HOSTS" ] || { echo "Сервер $HOST:$PORT не ответил по SSH"; exit 1; }
echo "Отпечатки ключей сервера — сверьте с выводом на сервере: ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub"
ssh-keygen -lf - <<<"$KNOWN_HOSTS" | sed 's/^/  /'

KEY_DIR="$(mktemp -d)"
trap 'rm -rf "$KEY_DIR"' EXIT
ssh-keygen -q -t ed25519 -C "github-actions-azimut" -f "$KEY_DIR/key" -N ""

echo "Окружение production и секреты…"
gh api -X PUT "repos/$REPO/environments/production" >/dev/null
gh secret set SSH_HOST --env production --body "$HOST"
gh secret set SSH_PORT --env production --body "$PORT"
gh secret set SSH_USER --env production --body "deploy"
gh secret set SSH_KNOWN_HOSTS --env production --body "$KNOWN_HOSTS"
gh secret set SSH_PRIVATE_KEY --env production <"$KEY_DIR/key"

PUBKEY="$(cat "$KEY_DIR/key.pub")"
cat <<EOF

Готово. Публичный ключ для пользователя deploy:

  $PUBKEY

Подготовка сервера (подставьте домен и почту; DNS домена уже должен указывать на сервер):

  ssh -p $PORT root@$HOST "DOMAIN=l2azimut.ru CERTBOT_EMAIL=you@example.com DEPLOY_PUBKEY='$PUBKEY' bash -s" < scripts/server/setup.sh

После заполнения .env на сервере запустите деплой:

  gh workflow run deploy.yml
EOF
