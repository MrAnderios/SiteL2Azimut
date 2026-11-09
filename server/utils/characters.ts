import type { Character, GameServerId } from '#shared/cabinet'

/** Логины игровых аккаунтов мастера: в логин-сервере они связаны с мастером по e-mail. */
export async function gameAccountLogins(email: string): Promise<string[]> {
  const list = await rows<{ login: string }>(cmsDb(), 'SELECT login FROM accounts WHERE email = ? ORDER BY login', [email])
  return list.map(a => a.login)
}

/**
 * Сравнение логинов так же, как в MySQL (collation utf8_general_ci): без учёта регистра и пробелов в конце.
 * Игровой сервер обычно хранит characters.account_name в нижнем регистре, а accounts.login — как ввёл игрок,
 * поэтому строгое === теряет персонажей (в PHP сравнение было в SQL и этой проблемы не было).
 */
export function sameLogin(a: string, b: string): boolean {
  return a.trimEnd().toLowerCase() === b.trimEnd().toLowerCase()
}

export interface CharacterRow extends Character {
  account: string
}

/** Персонажи указанных игровых аккаунтов на сервере (класс и уровень — активного сабкласса). */
export async function charactersOf(serverId: GameServerId, logins: string[]): Promise<CharacterRow[]> {
  if (!logins.length) return []
  const list = await rows<{ id: number, name: string, account: string, online: number, level: number | null, classId: number | null }>(
    gameDb(serverId),
    `SELECT c.obj_Id AS id, c.char_name AS name, c.account_name AS account, c.online,
            sc.level, sc.class_id AS classId
       FROM characters c
       LEFT JOIN character_subclasses sc ON sc.char_obj_id = c.obj_Id AND sc.active = 1
      WHERE c.account_name IN (?)
      ORDER BY c.char_name`,
    [logins],
  )
  return list.map(c => ({
    id: Number(c.id),
    name: c.name,
    account: c.account,
    online: Number(c.online) === 1,
    level: c.level === null ? null : Number(c.level),
    classId: c.classId === null ? null : Number(c.classId),
  }))
}
