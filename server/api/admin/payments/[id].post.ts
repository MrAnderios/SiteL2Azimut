// Подтверждение ({ action: 'confirm' }) или отмена ({ action: 'cancel' }) СБП-платежа
export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  const id = int(getRouterParam(event, 'id'))
  const action = (await readJson(event)).action === 'cancel' ? 'cancel' : 'confirm'
  if (!(id > 0)) fail(404, 'payment_not_found')

  const ok = action === 'confirm' ? await markPaymentPaid(id, admin.login) : await cancelPayment(id)
  if (!ok) fail(409, 'payment_processed')
  return { id, action }
})
