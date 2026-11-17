# API статистики сервера

Публичные read-only эндпоинты для сайта. Отдают JSON, доступны с любого домена
(CORS: `Access-Control-Allow-Origin: *`), кешируются на стороне сервера.

Базовый адрес — домен сайта, например `https://l2azimut.ru`.

## GET /api/status

Статус игрового сервера и количество игроков в игре.

```json
{
  "server": "Azimut",
  "online": true,
  "status": "online",
  "playersOnline": 42,
  "updatedAt": "2026-11-08T12:34:56.000Z"
}
```

| Поле            | Тип                | Описание                                                     |
|-----------------|--------------------|--------------------------------------------------------------|
| `server`        | string             | Название сервера                                             |
| `online`        | boolean            | Сервер онлайн (принимает подключения на игровом порту)       |
| `status`        | `online`/`offline` | То же в виде строки для удобства отображения                 |
| `playersOnline` | number \| null     | Игроков в игре; `null`, если база временно недоступна         |
| `updatedAt`     | string (ISO 8601)  | Время формирования ответа                                    |

Кеш: 15 секунд. Опрашивать лучше раз в 30–60 секунд.

Пример:

```js
const res = await fetch('https://l2azimut.ru/api/status')
const status = await res.json()

document.querySelector('#online').textContent =
  status.online ? `${status.playersOnline} игроков` : 'Сервер офлайн'
```

## GET /api/top

Топ игроков. По умолчанию — топ-10 по уровню и опыту.

Параметры:

| Параметр | Значения             | По умолчанию | Описание            |
|----------|----------------------|--------------|---------------------|
| `limit`  | 1–100                | `10`         | Сколько игроков вернуть |
| `type`   | `level`, `pvp`, `pk` | `level`      | По чему строить топ |

```json
{
  "type": "level",
  "limit": 10,
  "updatedAt": "2026-11-08T12:34:56.000Z",
  "players": [
    {
      "rank": 1,
      "name": "Dastish",
      "level": 17,
      "exp": 519240,
      "classId": 18,
      "className": "Elven Fighter",
      "pvp": 0,
      "pk": 0,
      "online": false
    }
  ]
}
```

| Поле        | Тип     | Описание                            |
|-------------|---------|-------------------------------------|
| `rank`      | number  | Место в топе                        |
| `name`      | string  | Имя персонажа                       |
| `level`     | number  | Уровень                             |
| `exp`       | number  | Опыт (для сортировки внутри уровня) |
| `classId`   | number  | ID класса                           |
| `className` | string  | Название класса                     |
| `pvp`       | number  | PvP-убийства                        |
| `pk`        | number  | PK-убийства                         |
| `online`    | boolean | Персонаж сейчас в игре              |

Особенности:

- GM-персонажи (`accesslevel != 0`) и персонажи, помеченные на удаление, в топ не попадают.
- Кеш: 60 секунд.
- При недоступной базе возвращается HTTP `503` и `{ "error": "database_unavailable" }`.

Примеры:

```
GET /api/top
GET /api/top?limit=10
GET /api/top?type=pvp&limit=10
GET /api/top?type=pk&limit=5
```

```js
const res = await fetch('https://l2azimut.ru/api/top?limit=10')
const { players } = await res.json()

console.table(players.map((p) => ({
  'Место': p.rank,
  'Ник': p.name,
  'Уровень': p.level,
  'Класс': p.className,
  'PvP': p.pvp,
  'Онлайн': p.online ? 'да' : 'нет',
})))
```

## GET /api/castles

Владение замками: клан-владелец, лидер, альянс, налог и дата ближайшей осады.

```json
{
  "updatedAt": "2026-11-08T12:34:56.000Z",
  "castles": [
    {
      "id": 1,
      "name": "Gludio",
      "owner": "PRIME",
      "ally": null,
      "leader": "kiska2",
      "tax": 15,
      "siegeAt": "2026-11-22T13:00:00.000Z"
    }
  ]
}
```

| Поле        | Тип              | Описание                                              |
|-------------|------------------|-------------------------------------------------------|
| `id`        | number           | ID замка                                              |
| `name`      | string           | Название замка                                        |
| `owner`     | string \| null   | Клан-владелец; `null` — замок свободен                |
| `ally`      | string \| null   | Альянс клана-владельца                                |
| `leader`    | string \| null   | Лидер клана-владельца                                 |
| `tax`       | number           | Налог замка, %                                        |
| `siegeAt`   | string \| null   | Ближайшая осада (ISO 8601); `null` — дата не назначена |
| `updatedAt` | string (ISO 8601)| Время формирования ответа                             |

Особенности: отдаются все 9 замков, включая свободные; кеш — 60 секунд;
при недоступной базе HTTP `503` и `{ "error": "database_unavailable" }`.

## GET /api/heroes

Текущие герои сервера (персонажи со статусом героя в этом периоде).

```json
{
  "updatedAt": "2026-11-08T12:34:56.000Z",
  "heroes": [
    {
      "name": "RD",
      "level": 84,
      "classId": 131,
      "className": "Doombringer",
      "clan": "Night",
      "ally": null,
      "online": false,
      "count": 2
    }
  ]
}
```

| Поле        | Тип             | Описание                                       |
|-------------|-----------------|------------------------------------------------|
| `name`      | string          | Имя персонажа                                  |
| `level`     | number          | Уровень активного сабкласса                    |
| `classId`   | number          | ID класса                                      |
| `className` | string          | Название класса                                |
| `clan`      | string \| null  | Клан персонажа                                 |
| `ally`      | string \| null  | Альянс клана                                   |
| `online`    | boolean         | Персонаж сейчас в игре                         |
| `count`     | number          | Сколько раз подряд персонаж становился героем  |

Особенности: берутся только текущие герои (`heroes.played = 1`), отсортированы
по уровню; кеш — 60 секунд; при недоступной базе HTTP `503` и
`{ "error": "database_unavailable" }`.

## GET /api/clans

Топ кланов сервера: уровень, репутация, состав, альянс, замок и суммарный PvP.

```json
{
  "type": "level",
  "limit": 20,
  "updatedAt": "2026-11-08T12:34:56.000Z",
  "clans": [
    {
      "rank": 1,
      "id": 268491552,
      "name": "Скверна",
      "level": 7,
      "reputation": 29368,
      "leader": "Voin",
      "members": 84,
      "ally": "Скверна",
      "castle": "Aden",
      "pvp": 153
    }
  ]
}
```

| Поле         | Тип             | Описание                                              |
|--------------|-----------------|-------------------------------------------------------|
| `type`       | string          | Срез рейтинга, по которому построен ответ             |
| `limit`      | number          | Сколько кланов запрошено (1–100)                      |
| `updatedAt`  | string (ISO 8601)| Время формирования ответа                            |
| `rank`       | number          | Место в рейтинге                                      |
| `id`         | number          | ID клана                                              |
| `name`       | string          | Название клана                                        |
| `level`      | number          | Уровень клана                                         |
| `reputation` | number          | Репутация клана                                       |
| `leader`     | string \| null  | Ник лидера клана                                      |
| `members`    | number          | Количество персонажей в клане (без помеченных на удаление) |
| `ally`       | string \| null  | Название альянса; `null` — клан без альянса            |
| `castle`     | string \| null  | Название замка во владении; `null` — замка нет         |
| `pvp`        | number          | Суммарные PvP-убийства всех участников клана          |

Параметры запроса:

| Параметр | Значения                              | По умолчанию |
|----------|---------------------------------------|--------------|
| `type`   | `level`, `reputation`, `members`, `pvp` | `level`    |
| `limit`  | 1–100                                 | 20           |

Особенности: считается по таблицам `clan_data`, `clan_subpledges` (`type = 0`),
`ally_data`, `castle` и `characters` (`deletetime = 0`); кеш — 60 секунд
отдельно для каждого среза; при недоступной базе HTTP `503` и
`{ "error": "database_unavailable" }`.

Примеры:

```
GET /api/clans
GET /api/clans?type=reputation&limit=10
GET /api/clans?type=pvp&limit=5
```

```js
const res = await fetch('https://l2azimut.ru/api/clans?type=reputation&limit=10')
const { clans } = await res.json()

console.table(clans.map((c) => ({
  'Место': c.rank,
  'Клан': c.name,
  'Уровень': c.level,
  'Репутация': c.reputation,
  'Состав': c.members,
  'PvP': c.pvp,
})))
```
