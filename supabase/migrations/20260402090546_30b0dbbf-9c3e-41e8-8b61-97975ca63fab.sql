
-- Table for item comments
CREATE TABLE public.phase_item_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES public.phase_items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  body TEXT NOT NULL,
  parent_comment_id UUID REFERENCES public.phase_item_comments(id) ON DELETE CASCADE,
  mentioned_user_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookup
CREATE INDEX idx_phase_item_comments_item_id ON public.phase_item_comments(item_id);
CREATE INDEX idx_phase_item_comments_parent ON public.phase_item_comments(parent_comment_id);

-- Enable RLS
ALTER TABLE public.phase_item_comments ENABLE ROW LEVEL SECURITY;

-- Superadmins manage all
CREATE POLICY "Superadmins manage item comments"
  ON public.phase_item_comments FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'superadmin'::app_role));

-- Project members can view comments
CREATE POLICY "Project members view item comments"
  ON public.phase_item_comments FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM phase_items pi
    JOIN project_phases pp ON pp.id = pi.phase_id
    WHERE pi.id = phase_item_comments.item_id
    AND is_user_in_project(auth.uid(), pp.project_id)
  ));

-- Project members can insert comments
CREATE POLICY "Project members insert item comments"
  ON public.phase_item_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM phase_items pi
      JOIN project_phases pp ON pp.id = pi.phase_id
      WHERE pi.id = phase_item_comments.item_id
      AND is_user_in_project(auth.uid(), pp.project_id)
    )
  );

-- Authors can update their own comments
CREATE POLICY "Authors update own comments"
  ON public.phase_item_comments FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Authors can delete their own comments
CREATE POLICY "Authors delete own comments"
  ON public.phase_item_comments FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
