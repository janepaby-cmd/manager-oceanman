
-- Allow anonymous/public read access to app_settings (needed for login page)
DROP POLICY IF EXISTS "Auth can view settings" ON public.app_settings;
CREATE POLICY "Anyone can view settings"
ON public.app_settings FOR SELECT
TO anon, authenticated
USING (true);
