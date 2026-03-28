
CREATE TABLE public.app_settings (
  key text PRIMARY KEY,
  value text,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read settings
CREATE POLICY "Auth can view settings"
ON public.app_settings FOR SELECT
TO authenticated
USING (true);

-- Only superadmin/admin can modify settings
CREATE POLICY "Admins manage settings"
ON public.app_settings FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'superadmin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'superadmin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Insert default values
INSERT INTO public.app_settings (key, value) VALUES
  ('app_name', 'OceanMan'),
  ('logo_url', NULL),
  ('brevo_sender_email', NULL),
  ('brevo_sender_name', NULL);
