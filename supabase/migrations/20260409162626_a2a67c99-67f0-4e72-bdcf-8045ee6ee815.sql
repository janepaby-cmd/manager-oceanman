ALTER TABLE public.profiles
ADD COLUMN email_comment_notifications_enabled boolean NOT NULL DEFAULT true;