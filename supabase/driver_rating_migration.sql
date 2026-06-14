-- ════════════════════════════════════════════════════════════════════
-- Migration: ratings table + driver rating stats
-- Run once in Supabase SQL Editor (safe to re-run)
-- ════════════════════════════════════════════════════════════════════

-- 1. Create ratings table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS ratings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id     UUID NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
  rater_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rated_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  score       SMALLINT NOT NULL CHECK (score BETWEEN 1 AND 5),
  comment     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (ride_id, rater_id)
);

ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ratings_read_own" ON ratings;
DROP POLICY IF EXISTS "ratings_insert"   ON ratings;

CREATE POLICY "ratings_read_own"
  ON ratings FOR SELECT
  USING (rater_id = auth.uid() OR rated_id = auth.uid());

CREATE POLICY "ratings_insert"
  ON ratings FOR INSERT
  WITH CHECK (rater_id = auth.uid());

-- 2. Add avg_rating + total_trips columns to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS avg_rating   NUMERIC(3,1),
  ADD COLUMN IF NOT EXISTS total_trips  INTEGER NOT NULL DEFAULT 0;

-- 3. Trigger: recompute driver stats after each new rating
CREATE OR REPLACE FUNCTION update_driver_rating()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_avg NUMERIC(3,1);
  v_cnt INTEGER;
BEGIN
  SELECT ROUND(AVG(score)::NUMERIC, 1), COUNT(*)
  INTO v_avg, v_cnt
  FROM ratings WHERE rated_id = NEW.rated_id;
  UPDATE profiles SET avg_rating = v_avg, total_trips = v_cnt WHERE id = NEW.rated_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_rating_inserted ON ratings;
CREATE TRIGGER on_rating_inserted
  AFTER INSERT ON ratings
  FOR EACH ROW EXECUTE FUNCTION update_driver_rating();
