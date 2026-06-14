export const COMMISSION_RATE    = 0.10;   // 10% charged to driver
export const COMMISSION_MIN     = 10;     // minimum 10 MAD
export const PASSENGER_FEE_INAPP = 5;    // flat fee added to passenger price for in-app payments

/** Commission the platform charges the driver per seat booked */
export function calcDriverCommission(pricePerSeat: number): number {
  return Math.max(COMMISSION_MIN, Math.round(pricePerSeat * COMMISSION_RATE));
}

/** Price the passenger actually pays per seat */
export function calcPassengerPrice(pricePerSeat: number, method: 'cash' | 'in_app'): number {
  if (method === 'cash') {
    // Commission is added on top — passenger effectively covers it
    return pricePerSeat + calcDriverCommission(pricePerSeat);
  }
  // In-app: small flat service fee added to passenger price
  return pricePerSeat + PASSENGER_FEE_INAPP;
}

/** What the driver nets per seat after platform fees */
export function calcDriverNet(pricePerSeat: number, method: 'cash' | 'in_app'): number {
  if (method === 'cash') {
    // Driver collects full passenger price in cash, pays commission separately from wallet
    return pricePerSeat;
  }
  // In-app: platform deducts driver commission from payout
  return pricePerSeat - calcDriverCommission(pricePerSeat);
}

// Keep old export name so existing wallet trigger code doesn't break
export const calcCommission = calcDriverCommission;
