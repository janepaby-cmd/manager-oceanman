
-- External users table
CREATE TABLE public.external_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  company TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Unique email per project (only non-deleted)
CREATE UNIQUE INDEX idx_external_users_email_project ON public.external_users (project_id, lower(email)) WHERE deleted_at IS NULL;

-- Performance indexes
CREATE INDEX idx_external_users_project ON public.external_users (project_id);
CREATE INDEX idx_external_users_active ON public.external_users (project_id, is_active) WHERE deleted_at IS NULL;

-- Updated_at trigger
CREATE TRIGGER update_external_users_updated_at
  BEFORE UPDATE ON public.external_users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.external_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project members can view external users"
  ON public.external_users FOR SELECT
  TO authenticated
  USING (public.is_user_in_project(auth.uid(), project_id) OR public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Project members can create external users"
  ON public.external_users FOR INSERT
  TO authenticated
  WITH CHECK (public.is_user_in_project(auth.uid(), project_id) OR public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Project members can update external users"
  ON public.external_users FOR UPDATE
  TO authenticated
  USING (public.is_user_in_project(auth.uid(), project_id) OR public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Project members can delete external users"
  ON public.external_users FOR DELETE
  TO authenticated
  USING (public.is_user_in_project(auth.uid(), project_id) OR public.has_role(auth.uid(), 'superadmin'));


-- External notification logs table
CREATE TABLE public.external_notification_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.phase_items(id) ON DELETE CASCADE,
  phase_id UUID NOT NULL REFERENCES public.project_phases(id) ON DELETE CASCADE,
  sender_user_id UUID NOT NULL,
  external_user_id UUID NOT NULL REFERENCES public.external_users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  html_content_snapshot TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent',
  error_message TEXT,
  additional_message TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Performance indexes
CREATE INDEX idx_ext_notif_logs_project ON public.external_notification_logs (project_id);
CREATE INDEX idx_ext_notif_logs_ext_user ON public.external_notification_logs (external_user_id);
CREATE INDEX idx_ext_notif_logs_item ON public.external_notification_logs (item_id);
CREATE INDEX idx_ext_notif_logs_phase ON public.external_notification_logs (phase_id);
CREATE INDEX idx_ext_notif_logs_status ON public.external_notification_logs (status);
CREATE INDEX idx_ext_notif_logs_sent_at ON public.external_notification_logs (sent_at);
CREATE INDEX idx_ext_notif_logs_sender ON public.external_notification_logs (sender_user_id);

-- RLS
ALTER TABLE public.external_notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project members can view notification logs"
  ON public.external_notification_logs FOR SELECT
  TO authenticated
  USING (public.is_user_in_project(auth.uid(), project_id) OR public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Project members can insert notification logs"
  ON public.external_notification_logs FOR INSERT
  TO authenticated
  WITH CHECK (public.is_user_in_project(auth.uid(), project_id) OR public.has_role(auth.uid(), 'superadmin'));
