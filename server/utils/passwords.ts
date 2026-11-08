// Хеши паролей совместимы со старой PHP-CMS:
// мастер-аккаунт — bcrypt (PHP password_hash/password_verify понимают $2b$ и $2y$),
// игровой аккаунт — base64(whirlpool(пароль)), как ждёт логин-сервер L2.
import bcrypt from 'bcryptjs'
import { whirlpool } from 'hash-wasm'

const BCRYPT_COST = 10
// Хеш-заглушка: сравниваем с ней, когда логина нет, чтобы время ответа не выдавало существование логина
const DUMMY_HASH = '$2b$10$ka9dTOkPHqikNrzhMxBU8..pHQnz1HVGDUTYdnM/dwxLDbk9AURQC'

export function hashMasterPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST)
}

export async function verifyMasterPassword(password: string, hash: string | undefined): Promise<boolean> {
  const ok = await bcrypt.compare(password, hash || DUMMY_HASH)
  return ok && !!hash
}

export async function hashGamePassword(password: string): Promise<string> {
  return Buffer.from(await whirlpool(password), 'hex').toString('base64')
}
