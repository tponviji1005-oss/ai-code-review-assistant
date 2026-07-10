-- Phase 6: Benchmarks table for manual CodeRabbit/Copilot comparison
-- Run this in your Supabase SQL Editor

CREATE TABLE benchmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  review_id uuid REFERENCES reviews(id) ON DELETE SET NULL,
  test_diff_name text NOT NULL,
  my_tool_bugs_found integer NOT NULL DEFAULT 0,
  my_tool_false_positives integer NOT NULL DEFAULT 0,
  my_tool_time_seconds numeric,
  coderabbit_bugs_found integer,
  coderabbit_false_positives integer,
  coderabbit_time_seconds numeric,
  copilot_bugs_found integer,
  copilot_false_positives integer,
  copilot_time_seconds numeric,
  known_actual_bugs integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE benchmarks ENABLE ROW LEVEL SECURITY;

-- Users can only see their own benchmarks
CREATE POLICY "users can insert own benchmarks"
  ON benchmarks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users can view own benchmarks"
  ON benchmarks FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "users can update own benchmarks"
  ON benchmarks FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users can delete own benchmarks"
  ON benchmarks FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
