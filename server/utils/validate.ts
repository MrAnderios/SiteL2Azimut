import { limits, loginPattern } from '#shared/cabinet'

export function validateLogin(login: string): void {
  if (login.length < limits.loginMin || login.length > limits.loginMax || !loginPattern.test(login)) {
    fail(400, 'invalid_login', { min: limits.loginMin, max: limits.loginMax })
  }
}

// Упрощённая проверка, близкая к PHP FILTER_VALIDATE_EMAIL
const emailPattern = /^[\w.!#$%&'*+/=?^`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i

export function validateEmail(email: string): void {
  if (email.length > limits.emailMax || !emailPattern.test(email)) {
    fail(400, 'invalid_email', { max: limits.emailMax })
  }
}

export function validateNewPassword(password: string, confirm: string): void {
  if (password.length < limits.passwordMin || password.length > limits.passwordMax) {
    fail(400, 'invalid_password', { min: limits.passwordMin, max: limits.passwordMax })
  }
  if (password !== confirm) {
    fail(400, 'password_mismatch')
  }
}
