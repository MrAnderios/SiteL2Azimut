# Оплата Coin of Luck (SeverPay)

Страница пополнения: `/cabinet/donate` (исходник — `app/pages/cabinet/donate.vue`).
Сумма всегда вводится в рублях, монеты начисляются по курсу `payment.coinPrice` из `shared/cabinet.ts`.

Интеграция реализована под [SeverPay API](https://docs.severpay.io/ru/). Вся работа со шлюзом — в `server/utils/payment-gateway.ts`, приём уведомлений — `server/api/payments/callback.post.ts`.

## Способы оплаты

| Ключ        | Способ на сайте          | Валюта счёта | Доступ     | `payments.provider`  |
|-------------|--------------------------|--------------|------------|----------------------|
| `card_intl` | Visa / Mastercard        | RUB          | всем       | `manual_card_intl` / `gw_card_intl` |
| `sbp`       | СБП                      | RUB          | с условием | `manual_sbp` / `gw_sbp`             |
| `card_ru`   | Visa / Mastercard / Мир  | RUB          | с условием | `manual_card_ru` / `gw_card_ru`     |
| `erip`      | ЕРИП                     | BYN          | всем       | `manual_erip` / `gw_erip`           |

- `gw_*` — счёт создан в SeverPay, статус приходит webhook-уведомлением.
- `manual_*` — резерв: оплату подтверждает администратор в `/admin` (если для способа не заданы MID/токен).
- Старые записи с `provider = 'manual'` считаются оплатой по СБП.

**1 терминал = 1 касса = 1 способ оплаты.** В SeverPay для каждого способа создаётся отдельный терминал со своим `mid` (Merchant/Terminal ID) и `token` (секретный ключ подписи).

Схема БД не меняется: способ хранится в `payments.provider`, сумма в валюте способа и ссылка на оплату — в `payments.qr_data` (JSON).

## Условия доступа

Способы с `requiresProgress: true` (СБП и `card_ru` — Visa/Mastercard/Мир) доступны, если выполняется хотя бы одно условие (`paymentAccessRules` в `shared/cabinet.ts`):

- есть персонаж **≥ 3 уровня** на любом игровом аккаунте мастера (на всех серверах из `gameServers`);
- **или** сумма всех прошлых оплаченных пополнений (`payments.status = 'paid'`) **≥ 500 ₽**.

Проверка — `paymentAccess()` в `server/utils/payments.ts`: `GET /api/payments` отдаёт `allowed`, `POST /api/payments` отклоняет недоступный способ с `403 payment_method_locked`. Visa/Mastercard (международные) и ЕРИП доступны всем. Если игровая БД недоступна, уровень считается 0.

## Настройка (переменные окружения)

См. `.env.example`. На сервере значения задаются в `/var/www/azimut/.env` (секреты не коммитить).

```dotenv
NUXT_PAYMENTS_BASE_URL=https://severpay.io/api/merchant
NUXT_PAYMENTS_CALLBACK_URL=https://l2azimut.ru/api/payments/callback
NUXT_PAYMENTS_RETURN_URL=https://l2azimut.ru/cabinet/donate

# 1 терминал = 1 касса = 1 способ: у каждого свой MID и токен
NUXT_PAYMENTS_CARD_INTL_MID=
NUXT_PAYMENTS_CARD_INTL_TOKEN=
NUXT_PAYMENTS_SBP_MID=
NUXT_PAYMENTS_SBP_TOKEN=
NUXT_PAYMENTS_CARD_RU_MID=
NUXT_PAYMENTS_CARD_RU_TOKEN=
NUXT_PAYMENTS_ERIP_MID=
NUXT_PAYMENTS_ERIP_TOKEN=

# Курс для ЕРИП: сколько ₽ стоит 1 BYN (по умолчанию 28)
NUXT_PAYMENTS_ERIP_RUB_PER_BYN=28
```

Шлюз включается для способа, когда заданы оба значения: `*_MID` и `*_TOKEN`. Если чего-то нет — для этого способа создаётся ручной счёт (`manual_*`).

## Что настроить в кабинете SeverPay (на каждый терминал)

1. Получить **MID** и **token** (секретный ключ) терминала и прописать в соответствующую пару `NUXT_PAYMENTS_*_MID` / `NUXT_PAYMENTS_*_TOKEN`.
2. Указать **Webhook URL**: `https://l2azimut.ru/api/payments/callback`.
3. Добавить в whitelist IP-адреса SeverPay, с которых приходят webhook (и разрешить им доступ к callback):
   - `45.76.81.14`
   - `2001:19f0:6c01:878:5400:5ff:fe38:50d1`
   - `207.148.69.64`
   - `2401:c080:1400:109b:5400:5ff:fe95:20d3`
4. Для терминала ЕРИП убедиться, что расчёты ведутся в **BYN** (см. раздел ниже).

## Как работает интеграция

### Создание платежа — `POST /payin/create`

Запрос подписывается HMAC-SHA256: тело содержит `mid`, `salt`, все параметры платежа и `sign`. Подпись считается от JSON объекта с ключами, отсортированными по возрастанию (ksort), без поля `sign`.

Отправляемые поля: `order_id` (наш `payment_code`, например `COIN-ABCD-2345`), `amount`, `currency`, `client_email`, `client_id`, `url_return`.

В ответе берём `data.id` (ID платежа в SeverPay) и `data.url` (ссылка на оплату) — ссылку показываем пользователю и кодируем в QR.

### Уведомления (webhook) — `POST /api/payments/callback`

SeverPay присылает JSON: `{ "type": "payin" | "test", "data": { ... }, "salt": "...", "sign": "..." }`.

- Подпись проверяется HMAC-SHA256 от JSON тела без поля `sign` токеном терминала этого платежа (порядок ключей — как в полученном запросе). Для `type: "test"` подпись сверяется с токенами настроенных терминалов.
- Ответ для успешной обработки: HTTP 200, `Content-Type: application/json`, тело `{"status": true}`. Иначе SeverPay повторяет доставку (до 100 попыток).
- Статусы `payin`: `success` → счёт оплачен (начисляем монеты), `decline`/`fail` → отменён, `new`/`process` → ожидает (промежуточные).
- Проверяются: принадлежность счёта шлюзу (`gw_*`), валюта и сумма. Повторный callback идемпотентен — монеты начисляются один раз.

### ЕРИП и BYN

Пользователь вводит сумму в рублях; монеты считаются от рублёвой суммы (`payments.amount_rub`). Для ЕРИП сервер пересчитывает сумму в BYN по курсу `NUXT_PAYMENTS_ERIP_RUB_PER_BYN` (по умолчанию 28 ₽ = 1 BYN), округляет до копеек и отправляет в SeverPay `currency: "BYN"` и сумму в BYN. Callback по ЕРИП сверяется по сумме/валюте BYN. Поэтому терминал ЕРИП в SeverPay должен принимать платежи в **BYN**.

Если понадобится конвертация на стороне шлюза — нужно будет отправлять RUB-сумму/валюту и изменить сверку в `server/utils/payment-gateway.ts` и `server/utils/payments.ts`.

## Проверка

1. На сервере в `/var/www/azimut/.env` заданы `*_MID`/`*_TOKEN` для нужных способов, `NUXT_PAYMENTS_CALLBACK_URL` и `NUXT_PAYMENTS_RETURN_URL` указывают на `https://l2azimut.ru/...`.
2. Webhook URL `https://l2azimut.ru/api/payments/callback` зарегистрирован в SeverPay для каждого терминала и доступен по HTTPS.
3. Тестовый webhook (`type: "test"`) получает ответ `{"status": true}`.
4. Создание счёта возвращает ссылку `data.url` SeverPay и QR на неё.
5. Успешная оплата (`status: success`) начисляет монеты один раз; повторный callback не дублирует начисление.
6. ЕРИП: сумма в BYN совпадает в интерфейсе, в запросе к SeverPay и в callback.
7. Ручной режим (`manual_*`) по-прежнему работает для способов без настроенного терминала.

## White-label

Логотипы способов лежат в `public/images/pay/` под нейтральными именами:
`card-visa-mastercard.png`, `card-visa-mastercard-mir.png`, `sbp.png`, `erip.png`.
В коде, `title`/`alt` и именах файлов нет названий платёжных систем и брендов провайдера.
