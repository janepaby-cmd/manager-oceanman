
-- ========================================
-- MESSAGING SYSTEM - Complete Schema
-- ========================================

-- 1. Core tables

CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_message_id uuid REFERENCES public.messages(id) ON DELETE SET NULL,
  sender_user_id uuid NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  message_type text NOT NULL DEFAULT 'private',
  priority text NOT NULL DEFAULT 'normal',
  requires_read_confirmation boolean NOT NULL DEFAULT false,
  scope_type text NOT NULL DEFAULT 'user',
  status text NOT NULL DEFAULT 'active',
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.message_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  recipient_user_id uuid NOT NULL,
  recipient_role text,
  recipient_project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  delivery_type text NOT NULL DEFAULT 'to',
  is_visible boolean NOT NULL DEFAULT true,
  viewed_at timestamptz,
  read_at timestamptz,
  responded_at timestamptz,
  archived_at timestamptz,
  email_status text NOT NULL DEFAULT 'pending',
  email_sent_at timestamptz,
  email_error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.message_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  uploaded_by_user_id uuid NOT NULL,
  original_name text NOT NULL,
  stored_name text NOT NULL,
  storage_key text NOT NULL,
  mime_type text NOT NULL,
  extension text NOT NULL DEFAULT '',
  file_size bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.message_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  UNIQUE(message_id, project_id)
);

CREATE TABLE public.message_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES public.messages(id) ON DELETE SET NULL,
  user_id uuid NOT NULL,
  action text NOT NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Trigger
CREATE TRIGGER messages_updated_at
  BEFORE UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Security definer helpers
CREATE OR REPLACE FUNCTION public.is_message_sender(_message_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.messages WHERE id = _message_id AND sender_user_id = _user_id) $$;

CREATE OR REPLACE FUNCTION public.is_message_recipient(_message_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.message_recipients WHERE message_id = _message_id AND recipient_user_id = _user_id) $$;

CREATE OR REPLACE FUNCTION public.is_message_participant(_message_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT public.is_message_sender(_message_id, _user_id) OR public.is_message_recipient(_message_id, _user_id) $$;

-- 4. Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_audit_logs ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies: messages
CREATE POLICY "Sender views own messages" ON public.messages FOR SELECT TO authenticated
  USING (sender_user_id = auth.uid() AND deleted_at IS NULL);
CREATE POLICY "Recipient views messages" ON public.messages FOR SELECT TO authenticated
  USING (public.is_message_recipient(id, auth.uid()) AND deleted_at IS NULL);
CREATE POLICY "Auth inserts messages" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (sender_user_id = auth.uid());
CREATE POLICY "Sender updates own messages" ON public.messages FOR UPDATE TO authenticated
  USING (sender_user_id = auth.uid());
CREATE POLICY "Admin manages all messages" ON public.messages FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'superadmin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies: message_recipients
CREATE POLICY "Recipient views own" ON public.message_recipients FOR SELECT TO authenticated
  USING (recipient_user_id = auth.uid());
CREATE POLICY "Sender views recipients" ON public.message_recipients FOR SELECT TO authenticated
  USING (public.is_message_sender(message_id, auth.uid()));
CREATE POLICY "Sender inserts recipients" ON public.message_recipients FOR INSERT TO authenticated
  WITH CHECK (public.is_message_sender(message_id, auth.uid()));
CREATE POLICY "Recipient updates own" ON public.message_recipients FOR UPDATE TO authenticated
  USING (recipient_user_id = auth.uid());
CREATE POLICY "Admin manages recipients" ON public.message_recipients FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'superadmin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies: message_attachments
CREATE POLICY "Participant views attachments" ON public.message_attachments FOR SELECT TO authenticated
  USING (public.is_message_participant(message_id, auth.uid()));
CREATE POLICY "Uploader inserts attachments" ON public.message_attachments FOR INSERT TO authenticated
  WITH CHECK (uploaded_by_user_id = auth.uid());
CREATE POLICY "Admin manages attachments" ON public.message_attachments FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'superadmin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies: message_projects
CREATE POLICY "Participant views msg projects" ON public.message_projects FOR SELECT TO authenticated
  USING (public.is_message_participant(message_id, auth.uid()));
CREATE POLICY "Sender inserts msg projects" ON public.message_projects FOR INSERT TO authenticated
  WITH CHECK (public.is_message_sender(message_id, auth.uid()));
CREATE POLICY "Admin manages msg projects" ON public.message_projects FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'superadmin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies: message_audit_logs
CREATE POLICY "Admin views audit logs" ON public.message_audit_logs FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'superadmin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Auth inserts audit logs" ON public.message_audit_logs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 6. Storage bucket for attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'message-attachments', 'message-attachments', false, 10485760,
  ARRAY['image/jpeg','image/png','image/gif','image/webp','application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','text/plain','text/csv','application/zip']
);

CREATE POLICY "Auth upload msg attachments" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'message-attachments');
CREATE POLICY "Auth read msg attachments" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'message-attachments');
CREATE POLICY "Owner delete msg attachments" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'message-attachments' AND (auth.uid())::text = (storage.foldername(name))[1]);

-- 7. Performance indexes
CREATE INDEX idx_messages_sender ON public.messages(sender_user_id);
CREATE INDEX idx_messages_parent ON public.messages(parent_message_id) WHERE parent_message_id IS NOT NULL;
CREATE INDEX idx_messages_type ON public.messages(message_type);
CREATE INDEX idx_messages_created ON public.messages(created_at DESC);
CREATE INDEX idx_msg_recipients_user ON public.message_recipients(recipient_user_id);
CREATE INDEX idx_msg_recipients_message ON public.message_recipients(message_id);
CREATE INDEX idx_msg_recipients_unread ON public.message_recipients(recipient_user_id) WHERE read_at IS NULL;
CREATE INDEX idx_msg_attachments_message ON public.message_attachments(message_id);
CREATE INDEX idx_msg_projects_message ON public.message_projects(message_id);
CREATE INDEX idx_msg_projects_project ON public.message_projects(project_id);
