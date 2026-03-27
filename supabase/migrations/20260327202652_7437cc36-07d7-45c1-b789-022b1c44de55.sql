
DROP POLICY IF EXISTS "Assigned users view projects" ON public.projects;
CREATE POLICY "Assigned users view projects"
  ON public.projects FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_users pu
      WHERE pu.project_id = projects.id AND pu.user_id = auth.uid()
    )
  );
