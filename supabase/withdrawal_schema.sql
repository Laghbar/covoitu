-- ════════════════════════════════════════════════════════════════════
-- Migration: withdrawal_requests table
-- Run once in Supabase SQL Editor
-- ════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id       UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount          DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  status          TEXT        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending', 'approved', 'rejected')),
  -- Payment details filled by driver
  bank_name       TEXT,
  account_name    TEXT,
  account_number  TEXT,
  rib             TEXT,
  -- Admin
  admin_note      TEXT,
  reviewed_by     UUID        REFERENCES profiles(id),
  reviewed_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE withdrawal_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wr_self"  ON withdrawal_requests;
DROP POLICY IF EXISTS "wr_admin" ON withdrawal_requests;

CREATE POLICY "wr_self"
  ON withdrawal_requests FOR ALL
  USING (driver_id = auth.uid());

CREATE POLICY "wr_admin"
  ON withdrawal_requests FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE));

-- Add withdrawal transaction type to wallet_transactions if not already there
-- (the CHECK constraint may need updating — run this only if it fails)
-- ALTER TABLE wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_type_check;
-- ALTER TABLE wallet_transactions ADD CONSTRAINT wallet_transactions_type_check
--   CHECK (type IN ('recharge','commission_reserve','commission_release','commission_transfer','withdrawal'));
