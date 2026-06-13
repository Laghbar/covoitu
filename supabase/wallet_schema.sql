-- ════════════════════════════════════════════════════════════════════
-- HARIZANA — Driver Wallet & Commission System
-- Run this entire script once in Supabase SQL Editor
-- ════════════════════════════════════════════════════════════════════

-- 1. Add commission column to rides
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE rides
  ADD COLUMN IF NOT EXISTS platform_commission DECIMAL(10,2) NOT NULL DEFAULT 0;

-- 2. driver_wallets table
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS driver_wallets (
  driver_id  UUID        PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  balance    DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (balance  >= 0),
  reserved   DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (reserved >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE driver_wallets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "driver_wallet_self" ON driver_wallets;
CREATE POLICY "driver_wallet_self"
  ON driver_wallets FOR ALL
  USING (driver_id = auth.uid());

-- 3. wallet_transactions table
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id   UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type        TEXT        NOT NULL CHECK (type IN (
                'recharge',
                'commission_reserve',
                'commission_release',
                'commission_transfer'
              )),
  amount      DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  ride_id     UUID        REFERENCES rides(id) ON DELETE SET NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wallet_tx_self" ON wallet_transactions;
CREATE POLICY "wallet_tx_self"
  ON wallet_transactions FOR SELECT
  USING (driver_id = auth.uid());

-- 4. Recharge function (call from app after payment confirmation)
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION recharge_driver_wallet(p_driver_id UUID, p_amount DECIMAL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  -- Create wallet if not exists, otherwise top up
  INSERT INTO driver_wallets (driver_id, balance)
    VALUES (p_driver_id, p_amount)
    ON CONFLICT (driver_id) DO UPDATE
      SET balance    = driver_wallets.balance + p_amount,
          updated_at = now();

  INSERT INTO wallet_transactions (driver_id, type, amount, description)
    VALUES (p_driver_id, 'recharge', p_amount, 'Wallet recharged');
END;
$$;

-- 5. Commission reservation trigger (BEFORE INSERT on rides)
-- Formula: commission = MAX(10, ROUND(price * 0.10))
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION reserve_ride_commission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_commission DECIMAL(10,2);
  v_available  DECIMAL(10,2);
BEGIN
  v_commission := GREATEST(10, ROUND(NEW.price * 0.10));

  SELECT balance INTO v_available
    FROM driver_wallets
    WHERE driver_id = NEW.driver_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'wallet_not_found: Driver wallet does not exist. Please visit the Wallet tab.';
  END IF;

  IF v_available < v_commission THEN
    RAISE EXCEPTION 'insufficient_balance:% MAD required as platform commission.', v_commission;
  END IF;

  -- Deduct from balance, add to reserved
  UPDATE driver_wallets
    SET balance    = balance    - v_commission,
        reserved   = reserved   + v_commission,
        updated_at = now()
    WHERE driver_id = NEW.driver_id;

  INSERT INTO wallet_transactions (driver_id, type, amount, ride_id, description)
    VALUES (
      NEW.driver_id,
      'commission_reserve',
      v_commission,
      NEW.id,
      'Commission reserved — ' || NEW.from_city || ' → ' || NEW.to_city
    );

  NEW.platform_commission := v_commission;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS rides_reserve_commission ON rides;
CREATE TRIGGER rides_reserve_commission
  BEFORE INSERT ON rides
  FOR EACH ROW
  EXECUTE FUNCTION reserve_ride_commission();

-- 6. Commission release/transfer trigger (AFTER UPDATE status on rides)
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION handle_ride_commission_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Skip if status didn't change or no commission was reserved
  IF OLD.status = NEW.status OR NEW.platform_commission <= 0 THEN
    RETURN NEW;
  END IF;

  -- Cancellation: return reserved commission to available balance
  IF NEW.status = 'cancelled' THEN
    UPDATE driver_wallets
      SET balance    = balance  + NEW.platform_commission,
          reserved   = GREATEST(0, reserved - NEW.platform_commission),
          updated_at = now()
      WHERE driver_id = NEW.driver_id;

    INSERT INTO wallet_transactions (driver_id, type, amount, ride_id, description)
      VALUES (
        NEW.driver_id,
        'commission_release',
        NEW.platform_commission,
        NEW.id,
        'Commission refunded — ride cancelled'
      );
  END IF;

  -- Completion: commission goes to platform (removed from reserved, not returned to balance)
  IF NEW.status = 'completed' THEN
    UPDATE driver_wallets
      SET reserved   = GREATEST(0, reserved - NEW.platform_commission),
          updated_at = now()
      WHERE driver_id = NEW.driver_id;

    INSERT INTO wallet_transactions (driver_id, type, amount, ride_id, description)
      VALUES (
        NEW.driver_id,
        'commission_transfer',
        NEW.platform_commission,
        NEW.id,
        'Commission paid to platform — ride completed'
      );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS rides_commission_status_change ON rides;
CREATE TRIGGER rides_commission_status_change
  AFTER UPDATE OF status ON rides
  FOR EACH ROW
  EXECUTE FUNCTION handle_ride_commission_change();

-- 7. Seed wallets for existing drivers (run once)
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO driver_wallets (driver_id)
  SELECT id FROM profiles WHERE role = 'driver'
  ON CONFLICT DO NOTHING;
