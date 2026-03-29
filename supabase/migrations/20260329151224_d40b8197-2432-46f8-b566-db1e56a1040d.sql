
-- Fix 1: Add admin role check to WITH CHECK on update policy
DROP POLICY IF EXISTS "Admins can update non-superadmin roles" ON public.user_roles;
CREATE POLICY "Admins can update non-superadmin roles"
  ON public.user_roles
  FOR UPDATE
  TO public
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    AND role <> 'superadmin'::app_role
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    AND role <> 'superadmin'::app_role
  );

-- Fix 2: Add SELECT policy for managers+ on projects table
CREATE POLICY "Managers+ view all projects"
  ON public.projects
  FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'superadmin'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'manager'::app_role)
  );
