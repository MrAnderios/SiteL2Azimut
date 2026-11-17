# Оплата Coin of Luck

Страница пополнения: `/cabinet/donate` (исходник — `app/pages/cabinet/donate.vue`).
Сумма всегда вводится в рублях, монеты начисляются по курсу `payment.coinPrice` из `shared/cabinet.ts`.

## Способы оплаты

| Ключ        | Что на кнопке            | Валюта счёта | `payments.provider`  |
|-------------|--------------------------|--------------|----------------------|
| `card_intl` | Visa / Mastercard        | RUB          | `manual_card_intl` / `gw_card_intl` |
| `card_ru`   | Visa / Mastercard / Мир  | RUB          | `manual_card_ru` / `gw_card_ru`     |
| `sbp`       | СБП                      | RUB          | `manual_sbp` / `gw_sbp`             |
| `erip`      | ЕРИП                     | BYN          | `manual_erip` / `gw_erip`           |

- `manual_*` — оплату подтверждает администратор в `/admin` (рабочий резервный вариант).
- `gw_*` — счёт создан в платёжном шлюзе, статус приходит в callback.
- Старые записи с `provider = 'manual'` считаются оплатой по СБП.

Схема БД не меняется: у пользователя `cms_register` нет прав `ALTER`. Способ хранится в
`payments.provider`, сумма в валюте способа и ссылка на оплату — в `payments.qr_data` (JSON).

## Настройка шлюза

Переменные окружения (см. `.env.example`):

```dotenv
NUXT_PAYMENTS_GATEWAY_URL=https://gateway.example/payments
NUXT_PAYMENTS_MERCHANT_ID=
NUXT_PAYMENTS_SECRET=
NUXT_PAYMENTS_CALLBACK_URL=https://l2azimut.ru/api/payments/callback

# 1 терминал = 1 касса: у каждого способа своя пара
NUXT_PAYMENTS_CARD_INTL_TERMINAL_ID=
NUXT_PAYMENTS_CARD_INTL_CASHBOX_ID=
NUXT_PAYMENTS_CARD_RU_TERMINAL_ID=
NUXT_PAYMENTS_CARD_RU_CASHBOX_ID=
NUXT_PAYMENTS_SBP_TERMINAL_ID=
NUXT_PAYMENTS_SBP_CASHBOX_ID=
NUXT_PAYMENTS_ERIP_TERMINAL_ID=
NUXT_PAYMENTS_ERIP_CASHBOX_ID=

# Сколько рублей стоит 1 BYN для счетов ЕРИП (по умолчанию 28)
NUXT_PAYMENTS_ERIP_RUB_PER_BYN=28
```

Шлюз считается настроенным для способа, когда заданы `GATEWAY_URL`, `MERCHANT_ID`,
`SECRET` и пара `*_TERMINAL_ID` / `*_CASHBOX_ID`. Пока чего-то не хватает, счёт создаётся
с `manual_<ключ>` и подтверждается оператором.

## Контракт шлюза (заготовка)

Всё общение с шлюзом собрано в `server/utils/payment-gateway.ts`. После получения
документации правится только этот файл.

Создание платежа — `POST NUXT_PAYMENTS_GATEWAY_URL`, JSON:

```json
{
  "merchant_id": "...",
  "terminal_id": "...",
  "cashbox_id": "...",
  "order_id": "COIN-ABCD-2345",
  "amount": "500.00",
  "currency": "RUB",
  "description": "Пополнение Coin of Luck: 500 RUB",
  "callback_url": "https://l2azimut.ru/api/payments/callback"
}
```

Подпись: `X-Signature: HMAC-SHA256(сырое тело запроса, NUXT_PAYMENTS_SECRET)` в hex.

Ожидаемый ответ:

```json
{ "payment_id": "...", "pay_url": "https://gateway.example/pay/..." }
```

Callback — `POST /api/payments/callback`, JSON:

```json
{
  "order_id": "COIN-ABCD-2345",
  "payment_id": "...",
  "status": "paid",
  "amount": "500.00",
  "currency": "RUB"
}
```

- Подпись проверяется по сырому телу (`X-Signature` или `X-Callback-Signature`).
- Статусы `paid/success/succeeded/completed/ok` → оплачен, `canceled/cancelled/failed/declined/error` → отменён.
- Проверяются способ (`gw_*`), сумма и валюта счёта.
- Повторный callback идемпотентен: баланс начисляется один раз (`markPaymentPaid`).

## ЕРИП и BYN

Сумма счёта хранится в рублях (`payments.amount_rub`) — от неё считаются монеты.
Для ЕРИП сервер пересчитывает её в BYN по курсу `NUXT_PAYMENTS_ERIP_RUB_PER_BYN`
и сохраняет в `qr_data`. В шлюз уходит `currency: "BYN"` и сумма в BYN, в callback
сумма сверяется уже в BYN.

Если шлюз конвертирует рубли в BYN сам, заготовку нужно поправить: отправлять
`currency: "RUB"` и рублёвую сумму, а в callback сверять рубли. Сейчас код отправляет
BYN и уже пересчитанную сумму — так проще, если курс задаёт сайт.

## White-label

Логотипы способов лежат в `public/images/pay/` под нейтральными именами:
`card-visa-mastercard.png`, `card-visa-mastercard-mir.png`, `sbp.png`, `erip.png`.
В коде, `title`/`alt` и именах файлов нет названий платёжных систем и брендов провайдера.

## Проверки перед включением шлюза

1. `NUXT_PAYMENTS_*` заданы на сервере, `.env` не попал в git.
2. Для каждого способа свои `terminal_id` и `cashbox_id`.
3. `NUXT_PAYMENTS_CALLBACK_URL` доступен снаружи по HTTPS и отвечает на POST.
4. Callback с неверной подписью → `403`, с чужой суммой → `400`.
5. Повторный callback `paid` не начисляет монеты второй раз.
6. Счёт ЕРИП: сумма в BYN совпадает в интерфейсе, запросе к шлюзу и callback.
7. Ручной режим (`manual_*`) по-прежнему подтверждается в `/admin`.
