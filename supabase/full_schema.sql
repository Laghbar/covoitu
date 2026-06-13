-- ════════════════════════════════════════════════════════════════════
-- HARIZANA — Full Database Schema
-- Run once in Supabase SQL Editor (safe to re-run, uses IF NOT EXISTS)
-- ════════════════════════════════════════════════════════════════════

-- ── 1. profiles (extend existing table) ─────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS phone             TEXT,
  ADD COLUMN IF NOT EXISTS phone_verified    BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS bio              TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url       TEXT,
  ADD COLUMN IF NOT EXISTS created_at       TIMESTAMPTZ NOT NULL DEFAULT now();

-- Keep existing doc columns for backward compat
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS doc_national_id_url  TEXT,
  ADD COLUMN IF NOT EXISTS doc_license_url      TEXT,
  ADD COLUMN IF NOT EXISTS doc_registration_url TEXT,
  ADD COLUMN IF NOT EXISTS documents_verified   BOOLEAN NOT NULL DEFAULT FALSE;

-- ── 2. driver_verifications ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS driver_verifications (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id         UUID        NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  status            TEXT        NOT NULL DEFAULT 'unsubmitted'
                                CHECK (status IN ('unsubmitted','pending_review','verified','rejected')),
  national_id_url   TEXT,
  license_url       TEXT,
  registration_url  TEXT,
  selfie_url        TEXT,
  rejection_reason  TEXT,
  submitted_at      TIMESTAMPTZ,
  reviewed_at       TIMESTAMPTZ,
  reviewed_by       UUID        REFERENCES profiles(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE driver_verifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "driver_verif_self_read"   ON driver_verifications;
DROP POLICY IF EXISTS "driver_verif_self_update"  ON driver_verifications;
DROP POLICY IF EXISTS "driver_verif_admin_all"    ON driver_verifications;

CREATE POLICY "driver_verif_self_read"
  ON driver_verifications FOR SELECT
  USING (driver_id = auth.uid());

CREATE POLICY "driver_verif_self_update"
  ON driver_verifications FOR UPDATE
  USING (driver_id = auth.uid())
  WITH CHECK (
    driver_id = auth.uid()
    AND status IN ('unsubmitted', 'pending_review')
  );

CREATE POLICY "driver_verif_admin_all"
  ON driver_verifications FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE));

-- Trigger: auto-create verification record for new drivers
CREATE OR REPLACE FUNCTION create_driver_verification()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.role = 'driver' THEN
    INSERT INTO driver_verifications (driver_id)
      VALUES (NEW.id)
      ON CONFLICT (driver_id) DO NOTHING;
    INSERT INTO driver_wallets (driver_id)
      VALUES (NEW.id)
      ON CONFLICT (driver_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_driver_profile_created ON profiles;
CREATE TRIGGER on_driver_profile_created
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION create_driver_verification();

-- Trigger: sync documents_verified when verification status changes
CREATE OR REPLACE FUNCTION sync_verification_status()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE profiles
    SET documents_verified = (NEW.status = 'verified')
    WHERE id = NEW.driver_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_verification_status_change ON driver_verifications;
CREATE TRIGGER on_verification_status_change
  AFTER UPDATE OF status ON driver_verifications
  FOR EACH ROW EXECUTE FUNCTION sync_verification_status();

-- ── 3. vehicles ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vehicles (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  make         TEXT NOT NULL,
  model        TEXT NOT NULL,
  year         TEXT,
  color        TEXT,
  plate        TEXT NOT NULL,
  is_primary   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vehicles_self" ON vehicles;
DROP POLICY IF EXISTS "vehicles_admin" ON vehicles;

CREATE POLICY "vehicles_self"
  ON vehicles FOR ALL
  USING (driver_id = auth.uid());

CREATE POLICY "vehicles_admin"
  ON vehicles FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE));

-- ── 4. ratings ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ratings (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id      UUID NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
  rater_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rated_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  score        SMALLINT NOT NULL CHECK (score BETWEEN 1 AND 5),
  comment      TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (ride_id, rater_id)
);

ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ratings_read_own"  ON ratings;
DROP POLICY IF EXISTS "ratings_insert"    ON ratings;

CREATE POLICY "ratings_read_own"
  ON ratings FOR SELECT
  USING (rater_id = auth.uid() OR rated_id = auth.uid());

CREATE POLICY "ratings_insert"
  ON ratings FOR INSERT
  WITH CHECK (rater_id = auth.uid());

-- ── 5. audit_logs ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id     UUID NOT NULL REFERENCES profiles(id),
  action       TEXT NOT NULL,
  target_table TEXT,
  target_id    UUID,
  details      JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_logs_admin" ON audit_logs;
CREATE POLICY "audit_logs_admin"
  ON audit_logs FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE));

-- ── 6. Convenience views ─────────────────────────────────────────────

-- ride_passengers (alias for bookings)
CREATE OR REPLACE VIEW ride_passengers AS
  SELECT
    id,
    ride_id,
    passenger_id,
    status,
    seats_requested,
    created_at
  FROM bookings;

-- wallets (alias for driver_wallets)
CREATE OR REPLACE VIEW wallets AS
  SELECT
    driver_id,
    balance    AS available_balance,
    reserved   AS reserved_balance,
    balance + reserved AS total_balance,
    updated_at
  FROM driver_wallets;

-- reserved_commissions (filter wallet_transactions)
CREATE OR REPLACE VIEW reserved_commissions AS
  SELECT
    wt.id,
    wt.driver_id,
    wt.amount     AS commission_amount,
    wt.ride_id,
    r.from_city,
    r.to_city,
    r.departure_date,
    wt.created_at AS reserved_at
  FROM wallet_transactions wt
  JOIN rides r ON r.id = wt.ride_id
  WHERE wt.type = 'commission_reserve';

-- ── 7. Storage bucket policies ───────────────────────────────────────
-- Run AFTER creating the 'driver-docs' and 'avatars' buckets in
-- Supabase Storage → New Bucket (make them PRIVATE)

-- driver-docs: drivers can upload their own docs, admins can read all
INSERT INTO storage.buckets (id, name, public)
  VALUES ('driver-docs', 'driver-docs', false)
  ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "driver_docs_upload" ON storage.objects;
DROP POLICY IF EXISTS "driver_docs_read_own" ON storage.objects;
DROP POLICY IF EXISTS "driver_docs_admin_read" ON storage.objects;

CREATE POLICY "driver_docs_upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'driver-docs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "driver_docs_read_own"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'driver-docs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "driver_docs_replace"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'driver-docs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "driver_docs_admin_read"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'driver-docs'
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- avatars: public read, owner write
INSERT INTO storage.buckets (id, name, public)
  VALUES ('avatars', 'avatars', true)
  ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "avatars_upload" ON storage.objects;
DROP POLICY IF EXISTS "avatars_replace" ON storage.objects;

CREATE POLICY "avatars_upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "avatars_replace"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ── 8. Seed verification records for existing drivers ────────────────
INSERT INTO driver_verifications (driver_id)
  SELECT id FROM profiles WHERE role = 'driver'
  ON CONFLICT (driver_id) DO NOTHING;
