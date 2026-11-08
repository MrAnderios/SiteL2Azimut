# Деплой (CI/CD)

Сейчас сайт деплоится как **статика по FTP** на хостинг. Ниже, в разделе
[«Деплой с Node-сервером»](#деплой-с-node-сервером-ubuntu), описан вариант с собственным сервером
Ubuntu. Он понадобится, когда заработает личный кабинет: кабинету нужен бэкенд (`server/api`), а
статический хостинг его не запускает.

## Как устроено сейчас

При пуше в `main` GitHub Actions (`.github/workflows/deploy.yml`):

1. ставит зависимости (`npm ci`);
2. собирает статический сайт (`npm run generate`) в `.output/public/`;
3. проверяет, что в сборке есть `index.html`;
4. заливает `.output/public/` на хостинг по FTP
   ([SamKirkland/FTP-Deploy-Action](https://github.com/SamKirkland/FTP-Deploy-Action)).

```
GitHub Actions ──npm run generate──▶ .output/public/ ──FTP──▶ хостинг: /www/l2azimut.ru/
```

Заливаются только изменённые файлы. Action хранит на хостинге файл `.ftp-deploy-sync-state.json`
со списком загруженного и по нему же удаляет файлы, которых больше нет в сборке. Этот файл
удалять не нужно, иначе следующий деплой зальёт всё заново.

Если во время деплоя пришёл новый пуш, текущий деплой отменяется и запускается новый
(`cancel-in-progress: true`).

## Настройка GitHub

**Settings → Secrets and variables → Actions → New repository secret**:

| Секрет         | Значение                                                       |
|----------------|----------------------------------------------------------------|
| `FTP_SERVER`   | адрес FTP-сервера хостинга                                     |
| `FTP_USERNAME` | логин FTP                                                      |
| `FTP_PASSWORD` | пароль FTP                                                     |
| `FTP_PORT`     | порт (можно не задавать, по умолчанию `21`)                     |
| `FTP_DIR`      | папка сайта на хостинге, со слешем в конце (по умолчанию `/www/l2azimut.ru/`) |

Протокол в workflow указан `ftp`, пароль при этом передаётся открытым текстом. Если хостинг
поддерживает FTPS, лучше поменять в `deploy.yml` значение на `protocol: ftps`.

## Деплой

- Автоматически: любой пуш/merge в `main`.
- Вручную: **Actions → Deploy → Run workflow**.

Проверить сборку локально перед пушем:

```bash
npm run generate
npx serve .output/public    # или: npm run preview
```

## Откат

Сделайте `git revert` нужного коммита и запушьте в `main`, CI зальёт предыдущую версию.

## Ограничения статического деплоя

- **Нет бэкенда.** Маршруты `server/` (`/api/*`, задачи по расписанию) в статику не попадают.
  Страницы `/login`, `/register`, `/cabinet`, `/admin` при этом соберутся, но работать не будут.
  Для кабинета нужен Node-сервер, см. ниже.
- **`robots.txt` и `sitemap.xml`** генерируются серверными маршрутами (`server/routes/`), и сами по
  себе в статическую сборку не попадают, потому что на них нет ссылок со страниц. Чтобы они
  появились в `.output/public/`, их нужно явно добавить в пререндер в `nuxt.config.ts`:
  `nitro: { prerender: { routes: ['/robots.txt', '/sitemap.xml'] } }`.
- **Переменные окружения** (`NUXT_PUBLIC_I18N_BASE_URL` и т.п.) подставляются один раз при сборке
  на GitHub. Задать их на хостинге нельзя.
- **Страница 404.** В сборке есть `404.html`. Если хостинг на Apache, укажите её в `.htaccess`:
  `ErrorDocument 404 /404.html`.

## Диагностика

| Симптом                                   | Куда смотреть                                                     |
|-------------------------------------------|-------------------------------------------------------------------|
| `Error: Timeout` / не подключается к FTP  | `FTP_SERVER`, `FTP_PORT`; не блокирует ли хостинг внешние IP       |
| `530 Login authentication failed`         | `FTP_USERNAME`, `FTP_PASSWORD`                                     |
| Файлы легли не в ту папку                 | `FTP_DIR`: путь от корня FTP-аккаунта, со слешем в конце          |
| Деплой заливает всё заново                | удалён `.ftp-deploy-sync-state.json` на хостинге, это нормально, один раз |
| Падает шаг `Check build output`           | `npm run generate` не создал `index.html`, смотрите лог шага сборки |
| На сайте старая версия                    | кеш браузера/CDN; `_nuxt/*` с хешами в именах, кешируются безопасно |

---

## Деплой с Node-сервером (Ubuntu)

Этот вариант нужен для личного кабинета (`server/api`, MySQL, сессии, задача проверки
рефералов). Сайт работает как Node-приложение (`npm run build`), nginx проксирует к нему запросы и
отдаёт HTTPS.

> В `34a531b` workflow был переключён на FTP. Чтобы вернуться к деплою на свой сервер, восстановите
> SSH-версию: `git show 25014a6:.github/workflows/deploy.yml > .github/workflows/deploy.yml`.
> Настройка ниже рассчитана на неё.

```
GitHub Actions ──ssh──▶ /var/www/azimut/
                          ├─ releases/<sha>-<дата>/   ← последние 5 сборок
                          ├─ current → releases/…     ← то, что запущено
                          └─ .env                     ← секреты кабинета
Интернет ──443──▶ nginx ──▶ 127.0.0.1:3000 (systemd: azimut)
```

Сборка идёт на стороне GitHub, поэтому на сервере не нужны ни исходники, ни `npm install`:
`.output/` у Nuxt самодостаточна, ей нужен только Node.js.

Проверено на Ubuntu 22.04 / 24.04. Команды ниже выполняются от пользователя с `sudo`.
Вместо `azimut.example.com` подставьте свой домен.

### 1. Подготовка сервера

#### Node.js 22

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs nginx
node -v   # v22.x
```

#### Пользователь для деплоя

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

#### SSH-ключ для GitHub Actions

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

#### systemd-сервис

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
# Доступы к БД и ключ сессии личного кабинета (см. «Переменные окружения» ниже)
EnvironmentFile=/var/www/azimut/.env
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

#### Переменные окружения (личный кабинет)

Личному кабинету нужны доступы к MySQL логин-сервера и ключ шифрования cookie. Они лежат в файле
`/var/www/azimut/.env` вне папок релизов, поэтому переживают деплой. В git этот файл не попадает.

```bash
sudo -u deploy tee /var/www/azimut/.env > /dev/null <<'EOF'
NUXT_SESSION_PASSWORD=<вывод openssl rand -base64 48>
NUXT_DB_HOST=<IP MySQL>
NUXT_DB_PORT=3306
NUXT_DB_USER=cms_register
NUXT_DB_PASSWORD=<пароль>
NUXT_DB_DATABASE=la2
NUXT_ADMIN_LOGINS=admin
EOF
sudo chmod 600 /var/www/azimut/.env
```

Полный список переменных — в [`.env.example`](../.env.example). После изменения файла:
`sudo systemctl restart azimut`.

- `NUXT_SESSION_PASSWORD` не меняйте без причины: при смене все игроки будут разлогинены.
- MySQL должен принимать подключения с IP этого сервера; пользователю `cms_register` достаточно прав
  из [`server/database/install.sql`](../server/database/install.sql). Порт 3306 лучше открыть только для IP сайта.
- Cookie сессии ставится с флагом `Secure`, поэтому кабинет работает только по HTTPS (см. certbot ниже).
- Nginx должен передавать `X-Real-IP` (он уже есть в конфиге ниже): по нему работают ограничение
  попыток входа и защита реферальной программы от регистраций с одного IP.

#### Nginx

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

#### HTTPS и фаервол

DNS-запись домена должна уже указывать на сервер.

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d azimut.example.com -d www.azimut.example.com

sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

Certbot сам допишет HTTPS в конфиг nginx и настроит автопродление.

### 2. Настройка GitHub

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

### 3. Деплой и откат

Шаги пайплайна: `npm ci` → `npm run build` → загрузка архива в `releases/` → переключение
`current` → `systemctl restart azimut` → проверка, что сайт отвечает на `127.0.0.1:3000`.
Если проверка не прошла, джоб падает и выводит последние строки лога сервиса.

Откат на сервере, под пользователем `deploy`:

```bash
ls -1t /var/www/azimut/releases          # список релизов, новые сверху
ln -sfn /var/www/azimut/releases/<нужный> /var/www/azimut/current
sudo systemctl restart azimut
```

### Диагностика

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
