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
