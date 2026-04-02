
-- Remove admin and manager delete policies on projects (only superadmin should delete)
DROP POLICY IF EXISTS "Admins delete assigned projects" ON public.projects;
DROP POLICY IF EXISTS "Managers delete assigned projects" ON public.projects;

-- Also set message_recipients.recipient_project_id to CASCADE instead of SET NULL
ALTER TABLE public.message_recipients
  DROP CONSTRAINT IF EXISTS message_recipients_recipient_project_id_fkey,
  ADD CONSTRAINT message_recipients_recipient_project_id_fkey
    FOREIGN KEY (recipient_project_id) REFERENCES public.projects(id) ON DELETE SET NULL;
