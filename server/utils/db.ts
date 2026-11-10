// Подключения к MySQL.
// cmsDb()  — база логин-сервера (la2): accounts, master_accounts, платежи, рефералы.
// gameDb() — база игрового сервера (la2x3): персонажи, items_delayed и т.д.
import mysql from 'mysql2/promise'
import type { Pool, PoolConnection, ResultSetHeader } from 'mysql2/promise'
import type { GameServerId } from '#shared/cabinet'

export type Db = Pool | PoolConnection

let cmsPool: Pool | undefined
const gamePools = new Map<string, Pool>()

function createPool(opts: { host: string, port: number, user: string, password: string, database: string }): Pool {
  return mysql.createPool({
    ...opts,
    port: Number(opts.port) || 3306,
    charset: 'UTF8_GENERAL_CI',
    connectionLimit: 10,
    waitForConnections: true,
    enableKeepAlive: true,
    // BIGINT возвращаем числом, пока он помещается в Number
    supportBigNumbers: true,
    bigNumberStrings: false,
  })
}

export function cmsDb(): Pool {
  if (!cmsPool) {
    const { db } = useRuntimeConfig()
    if (!db.host || !db.user) {
      throw new Error('Не заданы доступы к БД: NUXT_DB_HOST, NUXT_DB_USER, NUXT_DB_PASSWORD (см. .env.example)')
    }
    cmsPool = createPool(db)
  }
  return cmsPool
}

export function gameDb(serverId: GameServerId): Pool {
  let pool = gamePools.get(serverId)
  if (!pool) {
    const { db, gameDb: game } = useRuntimeConfig()
    pool = createPool({
      host: game.host || db.host,
      port: game.port || db.port,
      user: game.user || db.user,
      password: game.user ? game.password : db.password,
      database: serverId,
    })
    gamePools.set(serverId, pool)
  }
  return pool
}

export async function rows<T>(db: Db, sql: string, params: unknown[] = []): Promise<T[]> {
  const [result] = await db.query(sql, params)
  return result as T[]
}

export async function row<T>(db: Db, sql: string, params: unknown[] = []): Promise<T | undefined> {
  return (await rows<T>(db, sql, params))[0]
}

export async function exec(db: Db, sql: string, params: unknown[] = []): Promise<ResultSetHeader> {
  const [result] = await db.query(sql, params)
  return result as ResultSetHeader
}

/** Выполняет fn в транзакции; при исключении откатывает её. */
export async function transaction<T>(pool: Pool, fn: (conn: PoolConnection) => Promise<T>): Promise<T> {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const result = await fn(conn)
    await conn.commit()
    return result
  }
  catch (e) {
    await conn.rollback().catch(() => {})
    throw e
  }
  finally {
    conn.release()
  }
}

export function isDuplicateKey(e: unknown): boolean {
  return (e as { code?: string })?.code === 'ER_DUP_ENTRY'
}

/** Текущее время в секундах — в БД все даты хранятся unix-временем. */
export function now(): number {
  return Math.floor(Date.now() / 1000)
}
