CREATE POLICY "Creator can add self to project"
ON public.project_users
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = project_users.project_id
    AND created_by = auth.uid()
  )
);