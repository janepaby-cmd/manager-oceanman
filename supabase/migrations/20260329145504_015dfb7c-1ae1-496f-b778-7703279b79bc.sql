
-- Fix 1: Restrict app_settings SELECT to authenticated users only (remove anon access)
DROP POLICY IF EXISTS "Anyone can view settings" ON public.app_settings;
CREATE POLICY "Authenticated users can view settings"
  ON public.app_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- Fix 2: Replace "Admins can manage roles" on user_roles to prevent superadmin escalation
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

-- Admins can SELECT all roles
CREATE POLICY "Admins can view all roles"
  ON public.user_roles
  FOR SELECT
  TO public
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can INSERT roles except superadmin
CREATE POLICY "Admins can insert non-superadmin roles"
  ON public.user_roles
  FOR INSERT
  TO public
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    AND role <> 'superadmin'::app_role
  );

-- Admins can UPDATE roles but cannot set superadmin
CREATE POLICY "Admins can update non-superadmin roles"
  ON public.user_roles
  FOR UPDATE
  TO public
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    AND role <> 'superadmin'::app_role
  )
  WITH CHECK (
    role <> 'superadmin'::app_role
  );

-- Admins can DELETE roles except superadmin
CREATE POLICY "Admins can delete non-superadmin roles"
  ON public.user_roles
  FOR DELETE
  TO public
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    AND role <> 'superadmin'::app_role
  );
