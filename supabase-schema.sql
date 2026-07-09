-- Run this in your Supabase SQL Editor

CREATE TABLE reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  diff_content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  file text NOT NULL,
  line integer NOT NULL,
  category text NOT NULL,
  severity text NOT NULL,
  confidence integer NOT NULL DEFAULT 50,
  description text NOT NULL,
  suggestion text NOT NULL DEFAULT ''
);

CREATE TABLE feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id uuid NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_helpful boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (issue_id, user_id)
);

-- Enable RLS
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Reviews: users can only see/insert their own
CREATE POLICY "users can insert own reviews"
  ON reviews FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users can view own reviews"
  ON reviews FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "users can delete own reviews"
  ON reviews FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Issues: access via review ownership
CREATE POLICY "users can insert issues for own reviews"
  ON issues FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM reviews
      WHERE reviews.id = issues.review_id
        AND reviews.user_id = auth.uid()
    )
  );

CREATE POLICY "users can view issues for own reviews"
  ON issues FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM reviews
      WHERE reviews.id = issues.review_id
        AND reviews.user_id = auth.uid()
    )
  );

CREATE POLICY "users can delete issues for own reviews"
  ON issues FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM reviews
      WHERE reviews.id = issues.review_id
        AND reviews.user_id = auth.uid()
    )
  );

-- Feedback: users can only see/insert their own
CREATE POLICY "users can insert own feedback"
  ON feedback FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users can update own feedback"
  ON feedback FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users can view own feedback"
  ON feedback FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
