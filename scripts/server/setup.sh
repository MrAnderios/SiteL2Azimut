#!/usr/bin/env bash
# Подготовка сервера Ubuntu 22.04 / 24.04 для сайта Azimut (Nuxt + личный кабинет).
# Ставит Node.js и nginx, создаёт пользователя deploy, systemd-сервис, конфиг nginx, .env-заготовку,
# фаервол и (если задан CERTBOT_EMAIL) HTTPS-сертификат. Повторный запуск безопасен.
#
# С вашего компьютера (ключ выдаёт scripts/server/github-setup.sh):
#   ssh root@<IP> "DOMAIN=l2azimut.ru CERTBOT_EMAIL=you@mail.ru DEPLOY_PUBKEY='ssh-ed25519 AAAA…' bash -s" \
#     < scripts/server/setup.sh
#
# Параметры (переменные окружения):
#   DOMAIN          домен сайта, обязательно
#   WWW=1           также обслуживать www.DOMAIN (0 — нет)
#   CERTBOT_EMAIL   почта для Let's Encrypt; задана — сразу получаем сертификат (DNS уже должен указывать на сервер)
#   DEPLOY_PUBKEY   публичный SSH-ключ GitHub Actions для пользователя deploy
#   SKIP_UFW=1      не трогать фаервол
# APP_DIR, SERVICE и PORT должны совпадать с .github/workflows/deploy.yml — меняйте их только вместе.

set -euo pipefail

DOMAIN="${DOMAIN:-}"
WWW="${WWW:-1}"
CERTBOT_EMAIL="${CERTBOT_EMAIL:-}"
DEPLOY_PUBKEY="${DEPLOY_PUBKEY:-}"
SKIP_UFW="${SKIP_UFW:-0}"
DEPLOY_USER="deploy"
APP_DIR="/var/www/azimut"
SERVICE="azimut"
PORT="3000"
NODE_MIN="22.21.0"

log() { printf '\n\033[1;33m==> %s\033[0m\n' "$*"; }
warn() { printf '\033[1;31m[!] %s\033[0m\n' "$*"; }

# Всё в функции: при запуске через `bash -s` команды, читающие stdin (apt, curl | bash),
# иначе «съели» бы остаток скрипта.
main() {
  [ "$(id -u)" = 0 ] || { echo "Запустите от root или через sudo"; exit 1; }
  [ -n "$DOMAIN" ] || { echo "Не задан DOMAIN (например DOMAIN=l2azimut.ru)"; exit 1; }
  export DEBIAN_FRONTEND=noninteractive

  local domains=("$DOMAIN")
  [ "$WWW" = 1 ] && domains+=("www.$DOMAIN")

  log "Пакеты: nginx, certbot, ufw"
  apt-get update -qq </dev/null
  apt-get install -y -qq curl ca-certificates openssl nginx certbot python3-certbot-nginx ufw </dev/null

  log "Node.js (нужен ≥ $NODE_MIN)"
  local have=""
  command -v node >/dev/null && have="$(node -v | sed 's/^v//')"
  if [ -z "$have" ] || [ "$(printf '%s\n%s\n' "$NODE_MIN" "$have" | sort -V | head -1)" != "$NODE_MIN" ]; then
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash - </dev/null
    apt-get install -y -qq nodejs </dev/null
  fi
  local node_bin
  node_bin="$(command -v node)"
  echo "node $(node -v) ($node_bin)"

  log "Пользователь $DEPLOY_USER и папка $APP_DIR"
  id "$DEPLOY_USER" >/dev/null 2>&1 || adduser --disabled-password --gecos "" "$DEPLOY_USER" </dev/null
  usermod -aG systemd-journal "$DEPLOY_USER"   # CI читает логи сервиса при неудачном деплое
  install -d -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$APP_DIR" "$APP_DIR/releases"

  if [ -n "$DEPLOY_PUBKEY" ]; then
    local home ak
    home="$(getent passwd "$DEPLOY_USER" | cut -d: -f6)"
    ak="$home/.ssh/authorized_keys"
    install -d -m 700 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$home/.ssh"
    touch "$ak"
    grep -qxF "$DEPLOY_PUBKEY" "$ak" || echo "$DEPLOY_PUBKEY" >>"$ak"
    chown "$DEPLOY_USER:$DEPLOY_USER" "$ak"
    chmod 600 "$ak"
    echo "SSH-ключ GitHub Actions добавлен"
  else
    warn "DEPLOY_PUBKEY не задан — ключ GitHub Actions не добавлен"
  fi

  log "sudo: $DEPLOY_USER может только перезапускать $SERVICE"
  local sudoers
  sudoers="$(mktemp)"
  echo "$DEPLOY_USER ALL=(root) NOPASSWD: /usr/bin/systemctl restart $SERVICE" >"$sudoers"
  visudo -cf "$sudoers" >/dev/null
  install -m 440 "$sudoers" "/etc/sudoers.d/$SERVICE-deploy"
  rm -f "$sudoers"

  log "Переменные кабинета: $APP_DIR/.env"
  if [ -f "$APP_DIR/.env" ]; then
    echo "Уже есть, не трогаем"
  else
    (
      umask 077
      cat >"$APP_DIR/.env" <<EOF
# Секреты личного кабинета (полный список — .env.example в репозитории).
# После изменения: sudo systemctl restart $SERVICE

# Ключ шифрования cookie сессии. Не меняйте без причины: все игроки будут разлогинены.
NUXT_SESSION_PASSWORD=$(openssl rand -base64 48 | tr -d '\n')

# База логин-сервера
NUXT_DB_HOST=
NUXT_DB_PORT=3306
NUXT_DB_USER=cms_register
NUXT_DB_PASSWORD=
NUXT_DB_DATABASE=la2

# Игровые БД, если они на другом MySQL (иначе оставьте пустыми)
NUXT_GAME_DB_HOST=
NUXT_GAME_DB_PORT=
NUXT_GAME_DB_USER=
NUXT_GAME_DB_PASSWORD=

NUXT_ADMIN_LOGINS=admin
NUXT_PUBLIC_I18N_BASE_URL=https://$DOMAIN
EOF
    )
    chown "$DEPLOY_USER:$DEPLOY_USER" "$APP_DIR/.env"
    echo "Создан, ключ сессии сгенерирован. Заполните доступы к БД."
  fi

  log "systemd-сервис $SERVICE"
  cat >"/etc/systemd/system/$SERVICE.service" <<EOF
[Unit]
Description=Azimut site (Nuxt)
After=network.target

[Service]
Type=simple
User=$DEPLOY_USER
WorkingDirectory=$APP_DIR/current
ExecStart=$node_bin $APP_DIR/current/server/index.mjs
Environment=NODE_ENV=production
Environment=HOST=127.0.0.1
Environment=PORT=$PORT
EnvironmentFile=$APP_DIR/.env
Restart=always
RestartSec=3
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF
  systemctl daemon-reload
  systemctl enable "$SERVICE" >/dev/null 2>&1
  [ -e "$APP_DIR/current" ] && systemctl restart "$SERVICE"

  log "Откат: /usr/local/bin/$SERVICE-rollback"
  cat >"/usr/local/bin/$SERVICE-rollback" <<EOF
#!/usr/bin/env bash
# Переключает сайт на предыдущий (или указанный) релиз: $SERVICE-rollback [имя папки из releases]
set -euo pipefail
cd "$APP_DIR/releases"
current="\$(basename "\$(readlink -f "$APP_DIR/current")")"
target="\${1:-\$(ls -1t | grep -vxF "\$current" | head -1 || true)}"
if [ -z "\$target" ] || [ ! -d "\$target" ]; then
  echo "Релиз не найден. Доступные (новые сверху):"; ls -1t; exit 1
fi
ln -sfn "$APP_DIR/releases/\$target" "$APP_DIR/current"
sudo /usr/bin/systemctl restart $SERVICE
echo "Сайт переключён: \$current → \$target"
EOF
  chmod 755 "/usr/local/bin/$SERVICE-rollback"

  log "nginx: ${domains[*]}"
  local site="/etc/nginx/sites-available/$SERVICE"
  if [ -f "$site" ] && grep -q "managed by Certbot" "$site"; then
    echo "Конфиг уже дополнен certbot (HTTPS), не перезаписываем: $site"
  else
    cat >"$site" <<EOF
server {
    listen 80;
    server_name ${domains[*]};

    # Хешированные ассеты Nuxt можно кешировать навсегда
    location /_nuxt/ {
        proxy_pass http://127.0.0.1:$PORT;
        proxy_set_header Host \$host;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location / {
        proxy_pass http://127.0.0.1:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        # По X-Real-IP работают лимиты входа и защита рефералов; заодно он закрывает /api/health снаружи
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    gzip on;
    gzip_types text/css application/javascript application/json image/svg+xml;
}
EOF
  fi
  ln -sfn "$site" "/etc/nginx/sites-enabled/$SERVICE"
  rm -f /etc/nginx/sites-enabled/default
  nginx -t
  systemctl enable --now nginx >/dev/null 2>&1
  systemctl reload nginx

  if [ "$SKIP_UFW" != 1 ]; then
    log "Фаервол"
    local ssh_port
    ssh_port="$(sshd -T 2>/dev/null | awk '$1 == "port" { print $2; exit }')"
    ufw allow "${ssh_port:-22}/tcp" >/dev/null   # порт SSH из конфига sshd, чтобы не потерять доступ
    ufw allow 'Nginx Full' >/dev/null
    ufw --force enable >/dev/null
    ufw status | sed 's/^/  /'
  fi

  if [ -n "$CERTBOT_EMAIL" ]; then
    log "HTTPS (Let's Encrypt)"
    local args=()
    for d in "${domains[@]}"; do args+=(-d "$d"); done
    if certbot --nginx --non-interactive --agree-tos --redirect -m "$CERTBOT_EMAIL" "${args[@]}" </dev/null; then
      echo "Сертификат получен, автопродление настроено"
    else
      warn "Сертификат не получен. Проверьте, что DNS ${domains[*]} указывает на этот сервер, и запустите скрипт снова."
    fi
  else
    warn "CERTBOT_EMAIL не задан — HTTPS не настроен. Без HTTPS вход в кабинет не работает (cookie Secure)."
  fi

  log "Готово. Что осталось:"
  cat <<EOF
  1. Заполнить доступы к БД:   sudo -u $DEPLOY_USER nano $APP_DIR/.env
  2. В MySQL выдать права пользователю cms_register с IP этого сервера
     (server/database/install.sql; IP сервера: $(hostname -I 2>/dev/null | awk '{print $1}')).
  3. Запустить деплой:  GitHub → Actions → Deploy → Run workflow  (или: gh workflow run deploy.yml)
EOF
}

main "$@"
