import type { ReferralLogEntry } from '#shared/cabinet'

export interface ReferralLogRow {
  id: number
  kind: ReferralLogEntry['kind']
  type: ReferralLogEntry['type']
  item_id: number
  item_count: number
  coin_amount: number
  created_at: number
}

export function toReferralLogEntry(r: ReferralLogRow): ReferralLogEntry {
  return {
    id: r.id,
    kind: r.kind,
    type: r.type,
    itemId: Number(r.item_id),
    itemCount: Number(r.item_count),
    coinAmount: Number(r.coin_amount),
    createdAt: Number(r.created_at),
  }
}
