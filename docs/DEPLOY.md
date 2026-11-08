# Деплой (CI/CD)

Деплой запускается при пуше в `main` (`.github/workflows/deploy.yml`). Куда именно, задаёт
переменная репозитория **`DEPLOY_TARGET`**:

| `DEPLOY_TARGET`        | Что деплоится                                           | Личный кабинет                      |
|------------------------|---------------------------------------------------------|-------------------------------------|
| не задана или `server` | Node-приложение (`npm run build`) на свой сервер по SSH | работает                            |
| `ftp`                  | статика (`npm run generate`) по FTP на хостинг          | выключен, ссылки ведут в старую CMS |

По умолчанию сайт деплоится на свой сервер. Как его подготовить — раздел
[«Свой сервер»](#свой-сервер-ubuntu): два скрипта и заполнение `.env`. FTP оставлен запасным
вариантом: `gh variable set DEPLOY_TARGET --body ftp`, вернуться на сервер — `gh variable delete DEPLOY_TARGET`.

Задать или посмотреть переменную: **Settings → Secrets and variables → Actions → Variables** или
`gh variable list`.

Если во время деплоя пришёл новый пуш, новый деплой ждёт окончания текущего
(`cancel-in-progress: false`): прерванная посередине заливка оставила бы смесь старых и новых файлов.

Вручную деплой запускается так: **Actions → Deploy → Run workflow** или `gh workflow run deploy.yml`.

---

## Статика по FTP (запасной вариант)

Работает при `DEPLOY_TARGET=ftp`.

```
GitHub Actions ──npm run generate──▶ .output/public/ ──FTP──▶ хостинг: /www/l2azimut.ru/
```

1. `npm ci`;
2. `npm run generate` с `NUXT_PUBLIC_CABINET_ENABLED=false` в `.output/public/`;
3. проверка, что в сборке есть `index.html`;
4. заливка по FTP ([SamKirkland/FTP-Deploy-Action](https://github.com/SamKirkland/FTP-Deploy-Action)).

Заливаются только изменённые файлы. Action хранит на хостинге файл `.ftp-deploy-sync-state.json`
со списком загруженного и по нему же удаляет файлы, которых больше нет в сборке. Этот файл
удалять не нужно, иначе следующий деплой зальёт всё заново.

### Секреты

**Settings → Secrets and variables → Actions → Secrets** (секреты репозитория):

| Секрет         | Значение                                                       |
|----------------|----------------------------------------------------------------|
| `FTP_SERVER`   | адрес FTP-сервера хостинга                                     |
| `FTP_USERNAME` | логин FTP                                                      |
| `FTP_PASSWORD` | пароль FTP                                                     |
| `FTP_PORT`     | порт (можно не задавать, по умолчанию `21`)                     |
| `FTP_DIR`      | папка сайта на хостинге, со слешем в конце (по умолчанию `/www/l2azimut.ru/`) |
| `FTP_PROTOCOL` | `ftp` или `ftps` (можно не задавать, по умолчанию `ftp`)        |

По `ftp` пароль и файлы передаются открытым текстом. Если хостинг поддерживает FTPS, задайте
секрет `FTP_PROTOCOL=ftps`.

### Проверка и откат

Проверить сборку локально: `npm run generate && npx serve .output/public`.
Откат: `git revert` нужного коммита и пуш в `main`, CI зальёт предыдущую версию.

### Ограничения статики

- **Нет бэкенда.** Маршруты `server/` (`/api/*`, задачи по расписанию) в статику не попадают.
  Поэтому сборка идёт с `NUXT_PUBLIC_CABINET_ENABLED=false`: кнопка «Войти» и шаг «Регистрация»
  ведут в старую CMS (`links.legacyCabinet` в `app/data/site.ts`), а страницы `/login`, `/register`,
  `/cabinet`, `/admin` собираются как редирект туда же.
- **`robots.txt` и `sitemap.xml`** генерируются серверными маршрутами (`server/routes/`). На них нет
  ссылок со страниц, поэтому они явно добавлены в пререндер (`nitro.prerender.routes` в
  `nuxt.config.ts`) и попадают в `.output/public/` при сборке.
- **Переменные окружения** (`NUXT_PUBLIC_I18N_BASE_URL` и т.п.) подставляются один раз при сборке
  на GitHub. Задать их на хостинге нельзя.
- **Страница 404.** В сборке есть `404.html`. Если хостинг на Apache, укажите её в `.htaccess`:
  `ErrorDocument 404 /404.html`.

### Диагностика

| Симптом                                   | Куда смотреть                                                     |
|-------------------------------------------|-------------------------------------------------------------------|
| `Error: Timeout` / не подключается к FTP  | `FTP_SERVER`, `FTP_PORT`; не блокирует ли хостинг внешние IP       |
| `530 Login authentication failed`         | `FTP_USERNAME`, `FTP_PASSWORD`                                     |
| Файлы легли не в ту папку                 | `FTP_DIR`: путь от корня FTP-аккаунта, со слешем в конце          |
| Деплой заливает всё заново                | удалён `.ftp-deploy-sync-state.json` на хостинге, это нормально, один раз |
| Падает шаг `Check build output`           | `npm run generate` не создал `index.html`, смотрите лог шага сборки |
| На сайте старая версия                    | кеш браузера/CDN; `_nuxt/*` с хешами в именах, кешируются безопасно |

---

## Свой сервер (Ubuntu)

Нужен для личного кабинета (`server/api`, MySQL, сессии, задача проверки рефералов).
Сайт работает как Node-приложение, nginx проксирует к нему запросы и отдаёт HTTPS.

```
GitHub Actions ──ssh──▶ /var/www/azimut/
                          ├─ releases/<sha>-<дата>/   ← последние 5 сборок
                          ├─ current → releases/…     ← то, что запущено
                          └─ .env                     ← секреты кабинета
Интернет ──443──▶ nginx ──▶ 127.0.0.1:3000 (systemd: azimut)
```

Сборка идёт на стороне GitHub, поэтому на сервере не нужны ни исходники, ни `npm install`:
`.output/` у Nuxt самодостаточна, ей нужен только Node.js.

### Что нужно заранее

- Сервер с Ubuntu 22.04 / 24.04 и доступом `root` по SSH (или пользователь с `sudo`).
- DNS-запись домена (и `www`, если нужен) указывает на IP сервера — иначе не выдастся сертификат.
- На вашем компьютере: [GitHub CLI](https://cli.github.com) после `gh auth login`.
- MySQL логин-сервера, к которому можно открыть доступ с IP сервера.

### Шаг 1. GitHub: ключ и секреты

Из папки репозитория:

```bash
scripts/server/github-setup.sh <IP сервера> [порт SSH]
```

Скрипт:
- создаёт окружение `production` и записывает в него секреты `SSH_HOST`, `SSH_PORT`, `SSH_USER`
  (`deploy`), `SSH_KNOWN_HOSTS` (через `ssh-keyscan`, отпечатки печатаются — сверьте их с сервером),
  `SSH_PRIVATE_KEY`;
- генерирует отдельный ключ для GitHub Actions. Закрытая часть уходит только в секреты GitHub, на
  диске не остаётся;
- печатает публичный ключ и готовую команду для шага 2.

### Шаг 2. Подготовка сервера

Команду печатает шаг 1, подставьте домен и почту:

```bash
ssh root@<IP> "DOMAIN=l2azimut.ru CERTBOT_EMAIL=you@example.com DEPLOY_PUBKEY='ssh-ed25519 AAAA…' bash -s" \
  < scripts/server/setup.sh
```

[`scripts/server/setup.sh`](../scripts/server/setup.sh) можно запускать повторно, он ничего не
ломает. Что он делает:

| Что                     | Подробности                                                                 |
|-------------------------|-----------------------------------------------------------------------------|
| Пакеты                  | nginx, certbot, ufw; Node.js 22 из NodeSource, если версия ниже 22.21        |
| Пользователь `deploy`   | владелец `/var/www/azimut`, ключ GitHub Actions в `authorized_keys`, доступ к журналу |
| sudo                    | `deploy` может только `systemctl restart azimut`                             |
| `/var/www/azimut/.env`  | заготовка с уже сгенерированным `NUXT_SESSION_PASSWORD`; существующий файл не трогает |
| systemd `azimut`        | `node current/server/index.mjs` на `127.0.0.1:3000`, переменные из `.env`     |
| nginx                   | прокси на Node, `X-Real-IP`, кеш `/_nuxt/`; конфиг, уже дополненный certbot, не перезаписывает |
| HTTPS                   | `certbot --nginx --redirect`, если задан `CERTBOT_EMAIL`; автопродление      |
| Фаервол                 | открыты порт SSH (берётся из конфига sshd) и 80/443                          |
| `azimut-rollback`       | команда отката на предыдущий релиз (см. ниже)                                |

Параметры: `DOMAIN` (обязательно), `CERTBOT_EMAIL`, `DEPLOY_PUBKEY`, `WWW=0` — без `www.`-домена,
`SKIP_UFW=1` — не трогать фаервол.

### Шаг 3. Доступ к базе

1. На сервере заполните доступы к БД (ключ сессии уже сгенерирован):
   ```bash
   sudo -u deploy nano /var/www/azimut/.env
   ```
   Полный список переменных — [`.env.example`](../.env.example). Если игровые БД на другом
   MySQL, заполните `NUXT_GAME_DB_*`.
2. В MySQL выдайте права пользователю `cms_register` по
   [`server/database/install.sql`](../server/database/install.sql), заменив `'%'` на IP сервера
   (`setup.sh` печатает его в конце). Порт 3306 откройте только для этого IP.

### Шаг 4. Первый деплой

Деплой на сервер включён по умолчанию, поэтому достаточно запустить его заново:
**Actions → Deploy → Run workflow** или `gh workflow run deploy.yml`. Дальше каждый пуш в `main`
деплоится сам. Если раньше переменная `DEPLOY_TARGET` была выставлена в `ftp`, удалите её:
`gh variable delete DEPLOY_TARGET`.

Пока шаги 1–3 не сделаны, деплой на сервер будет падать на шаге `Configure SSH` или `Upload release`.

Затем — переезд со старой CMS: DNS, редиректы старых адресов, смена пароля `cms_register`
([CABINET.md → «Переход со старой CMS»](CABINET.md#переход-со-старой-cms)).

### Как проходит деплой

`npm ci` → `npm run build` → архив в `releases/<sha>-<дата>/` → `current` переключается на него →
`systemctl restart azimut`, затем две проверки:

1. **Сайт отвечает** на `127.0.0.1:3000` (до 30 секунд). Если нет — CI выводит лог сервиса,
   **сам откатывает** `current` на предыдущий релиз, удаляет неудачный и падает.
2. **Кабинет готов**: `GET /api/health` проверяет, что задан ключ сессии и доступна база
   логин-сервера. Если нет — джоб падает с подсказкой, но без отката: лендинг при этом работает,
   чинить нужно `.env` или права MySQL, а не код. `/api/health` отвечает только запросам с самого
   сервера; через nginx он возвращает 404.

Хранятся последние 5 релизов.

### Откат

Автоматический — при неудачной проверке, см. выше. Вручную, на сервере под `deploy`:

```bash
azimut-rollback              # на предыдущий релиз
azimut-rollback <папка>      # на конкретный; без аргумента при ошибке выведет список
```

Или `git revert` нужного коммита и пуш в `main`.

### Диагностика

```bash
systemctl status azimut
journalctl -u azimut -f                      # логи приложения
sudo tail -f /var/log/nginx/error.log
curl -s http://127.0.0.1:3000/api/health     # {"ok":true,"session":true,"db":true}
```

| Симптом                                    | Куда смотреть                                                      |
|--------------------------------------------|--------------------------------------------------------------------|
| Запускается FTP вместо сервера             | `gh variable list`: `DEPLOY_TARGET` должна быть не задана или `server` |
| `Permission denied (publickey)` в Actions  | ключ в `~deploy/.ssh/authorized_keys`; перезапустите шаги 1–2       |
| `Host key verification failed`             | ключ сервера сменился: перезапустите `github-setup.sh`              |
| `sudo: a password is required`             | `/etc/sudoers.d/azimut-deploy`; перезапустите `setup.sh`            |
| «Сайт не ответил после рестарта»           | лог в выводе джоба или `journalctl -u azimut`; CI уже откатился     |
| «Личный кабинет не готов», `session: false`| `NUXT_SESSION_PASSWORD` в `.env` пустой или короче 32 символов      |
| «Личный кабинет не готов», `db: false`     | доступы в `.env`, права `cms_register`, порт 3306 открыт для IP сервера |
| 502 Bad Gateway                            | сервис упал: `journalctl -u azimut`                                 |
| Вход в кабинет не сохраняется              | сайт открыт по HTTP: cookie сессии `Secure`, нужен HTTPS            |

`APP_DIR`, `SERVICE` и `PORT` заданы и в `scripts/server/setup.sh`, и в `deploy.yml` — менять их
можно только в обоих местах сразу.
