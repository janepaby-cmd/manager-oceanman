
-- Replace broad SELECT policy with granular ones
DROP POLICY IF EXISTS "Authenticated users can view settings" ON public.app_settings;

-- Public brand settings visible to everyone (needed for login page)
CREATE POLICY "Anyone can view brand settings"
  ON public.app_settings
  FOR SELECT
  TO anon, authenticated
  USING (key IN ('app_name', 'logo_url'));

-- Sensitive settings only visible to admins
CREATE POLICY "Admins can view all settings"
  ON public.app_settings
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'superadmin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
