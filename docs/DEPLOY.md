# Деплой на сервер Ubuntu (CI/CD)

Как устроено: при пуше в `main` GitHub Actions (`.github/workflows/deploy.yml`) собирает сайт
(`npm run build`), по SSH заливает `.output/` на сервер в новую папку релиза, переключает симлинк
`current` на неё и перезапускает systemd-сервис. Nginx проксирует запросы на Node (порт 3000) и
отдаёт HTTPS.

```
GitHub Actions ──ssh──▶ /var/www/azimut/
                          ├─ releases/<sha>-<дата>/   ← последние 5 сборок
                          └─ current → releases/…     ← то, что запущено
Интернет ──443──▶ nginx ──▶ 127.0.0.1:3000 (systemd: azimut)
```

Сборка идёт на стороне GitHub, поэтому на сервере не нужны ни исходники, ни `npm install`:
`.output/` у Nuxt самодостаточна, ей нужен только Node.js.

Проверено на Ubuntu 22.04 / 24.04. Команды ниже выполняются от пользователя с `sudo`.
Вместо `azimut.example.com` подставьте свой домен.

## 1. Подготовка сервера

### Node.js 22

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs nginx
node -v   # v22.x
```

### Пользователь для деплоя

```bash
sudo adduser --disabled-password --gecos "" deploy
sudo usermod -aG systemd-journal deploy          # чтобы CI мог читать логи сервиса
sudo mkdir -p /var/www/azimut/releases
sudo chown -R deploy:deploy /var/www/azimut
```

Разрешаем `deploy` перезапускать только наш сервис и ничего больше:

```bash
echo 'deploy ALL=(root) NOPASSWD: /usr/bin/systemctl restart azimut' \
  | sudo tee /etc/sudoers.d/azimut-deploy
sudo chmod 440 /etc/sudoers.d/azimut-deploy
sudo visudo -c   # проверка синтаксиса
```

### SSH-ключ для GitHub Actions

На своём компьютере (не на сервере) создайте отдельный ключ без пароля:

```bash
ssh-keygen -t ed25519 -C "github-actions-azimut" -f ./azimut_deploy -N ""
```

Публичную часть положите на сервер:

```bash
sudo mkdir -p /home/deploy/.ssh
sudo tee -a /home/deploy/.ssh/authorized_keys < azimut_deploy.pub   # или вставьте содержимое вручную
sudo chown -R deploy:deploy /home/deploy/.ssh
sudo chmod 700 /home/deploy/.ssh && sudo chmod 600 /home/deploy/.ssh/authorized_keys
```

Проверьте вход: `ssh -i azimut_deploy deploy@<IP сервера>`.

### systemd-сервис

`/etc/systemd/system/azimut.service`:

```ini
[Unit]
Description=Azimut landing (Nuxt)
After=network.target

[Service]
Type=simple
User=deploy
WorkingDirectory=/var/www/azimut/current
ExecStart=/usr/bin/node /var/www/azimut/current/server/index.mjs
Environment=NODE_ENV=production
Environment=HOST=127.0.0.1
Environment=PORT=3000
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable azimut   # запустится сам после первого деплоя
```

Пока первого деплоя не было, папки `current` нет и сервис стартовать не сможет. Это нормально.

### Nginx

`/etc/nginx/sites-available/azimut`:

```nginx
server {
    listen 80;
    server_name azimut.example.com www.azimut.example.com;

    # Хешированные ассеты Nuxt можно кешировать навсегда
    location /_nuxt/ {
        proxy_pass http://127.0.0.1:3000;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    gzip on;
    gzip_types text/css application/javascript application/json image/svg+xml;
}
```

```bash
sudo ln -s /etc/nginx/sites-available/azimut /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

### HTTPS и фаервол

DNS-запись домена должна уже указывать на сервер.

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d azimut.example.com -d www.azimut.example.com

sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

Certbot сам допишет HTTPS в конфиг nginx и настроит автопродление.

## 2. Настройка GitHub

В репозитории: **Settings → Environments → New environment**, имя `production`.
В нём (**Environment secrets**) добавьте:

| Секрет            | Значение                                                              |
|-------------------|-----------------------------------------------------------------------|
| `SSH_HOST`        | IP или домен сервера                                                  |
| `SSH_PORT`        | порт SSH (можно не задавать, по умолчанию `22`)                        |
| `SSH_USER`        | `deploy`                                                              |
| `SSH_PRIVATE_KEY` | содержимое файла `azimut_deploy` целиком, включая строки `-----BEGIN…`/`-----END…` |
| `SSH_KNOWN_HOSTS` | вывод `ssh-keyscan -p <порт> <IP сервера>` (выполнить на своём компьютере) |

После этого файл `azimut_deploy` с компьютера можно удалить.

В настройках environment можно включить **Required reviewers**, чтобы деплой ждал ручного
подтверждения, или ограничить его веткой `main`.

## 3. Деплой

- Автоматически: любой пуш/merge в `main`.
- Вручную: **Actions → Deploy → Run workflow**.

Шаги пайплайна: `npm ci` → `npm run build` → загрузка архива в `releases/` → переключение
`current` → `systemctl restart azimut` → проверка, что сайт отвечает на `127.0.0.1:3000`.
Если проверка не прошла, джоб падает и выводит последние строки лога сервиса.

## Откат

На сервере, под пользователем `deploy`:

```bash
ls -1t /var/www/azimut/releases          # список релизов, новые сверху
ln -sfn /var/www/azimut/releases/<нужный> /var/www/azimut/current
sudo systemctl restart azimut
```

Или сделайте `git revert` и запушьте в `main`, CI задеплоит предыдущую версию сам.

## Диагностика

```bash
systemctl status azimut
journalctl -u azimut -f                  # логи приложения
sudo tail -f /var/log/nginx/error.log
curl -I http://127.0.0.1:3000            # отвечает ли Node напрямую
```

| Симптом                                    | Куда смотреть                                                      |
|--------------------------------------------|--------------------------------------------------------------------|
| `Permission denied (publickey)` в Actions  | ключ в `authorized_keys`, права на `~/.ssh`, `SSH_USER`             |
| `Host key verification failed`             | `SSH_KNOWN_HOSTS` пустой или устарел, пересоздать через `ssh-keyscan` |
| `sudo: a password is required`             | файл `/etc/sudoers.d/azimut-deploy`, путь `/usr/bin/systemctl`      |
| 502 Bad Gateway                            | сервис упал: `journalctl -u azimut`                                 |
| Health check не проходит, порт другой      | `PORT` в unit-файле и `127.0.0.1:3000` в `deploy.yml` должны совпадать |
