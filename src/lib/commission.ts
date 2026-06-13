export const COMMISSION_RATE = 0.10;
export const COMMISSION_MIN  = 10; // MAD

export function calcCommission(pricePerSeat: number): number {
  return Math.max(COMMISSION_MIN, Math.round(pricePerSeat * COMMISSION_RATE));
}
