INSERT INTO public.app_settings (key, value) VALUES 
  ('email_sender_name', 'OceanMan'),
  ('email_sender_address', 'noreply@manager.oceanmanswim.com'),
  ('email_reply_to', NULL)
ON CONFLICT (key) DO NOTHING;