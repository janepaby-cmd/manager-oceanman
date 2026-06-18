-- 1. Restrict clients SELECT to privileged roles (was: true)
DROP POLICY IF EXISTS "Auth can view clients" ON public.clients;
CREATE POLICY "Privileged users can view clients"
ON public.clients FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'superadmin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'manager'::app_role)
);

-- 2. Restrict suppliers SELECT to privileged roles (was: true)
DROP POLICY IF EXISTS "Auth can view suppliers" ON public.suppliers;
CREATE POLICY "Privileged users can view suppliers"
ON public.suppliers FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'superadmin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'manager'::app_role)
);

-- 3. Restrict invoice_config SELECT to managers and above assigned to the project
DROP POLICY IF EXISTS "Assigned users view invoice config" ON public.invoice_config;
CREATE POLICY "Privileged assigned users view invoice config"
ON public.invoice_config FOR SELECT TO authenticated
USING (
  is_user_in_project(auth.uid(), project_id) AND (
    has_role(auth.uid(), 'superadmin'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'manager'::app_role)
  )
);

-- 4. message-attachments: restrict SELECT to message participants
DROP POLICY IF EXISTS "Auth read msg attachments" ON storage.objects;
CREATE POLICY "Participants read msg attachments"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'message-attachments'
  AND EXISTS (
    SELECT 1 FROM public.message_attachments ma
    WHERE ma.storage_key = storage.objects.name
      AND is_message_participant(ma.message_id, auth.uid())
  )
);

-- 5. message-attachments: restrict INSERT to the user's own folder
DROP POLICY IF EXISTS "Auth upload msg attachments" ON storage.objects;
CREATE POLICY "Users upload own msg attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'message-attachments'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);