// Периодическая проверка реферальных наград (замена cron_referrals.php).
// Расписание — nitro.scheduledTasks в nuxt.config.ts.
export default defineTask({
  meta: {
    name: 'referrals:check',
    description: 'Проверить этапы приглашённых игроков и выдать реферальные награды',
  },
  async run() {
    const result = await scanAllReferralRewards()
    if (result) console.info(`[referrals] проверено мастеров: ${result.checked}, выдано наград: ${result.awarded}`)
    return { result: result ?? 'already running' }
  },
})
