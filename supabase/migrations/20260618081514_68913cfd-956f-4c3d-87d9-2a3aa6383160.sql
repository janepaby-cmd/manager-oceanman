-- Helper: resolve whether a user may access a given project-files object path.
-- Supports new layout ({projectId}/...), legacy expense layout (expenses/{projectId}/...)
-- and legacy phase-item layout ({phaseId}/{itemId}/...).
CREATE OR REPLACE FUNCTION public.can_access_project_file(_user_id uuid, _path text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  seg text[] := string_to_array(_path, '/');
  v_project uuid;
BEGIN
  IF _path IS NULL OR array_length(seg, 1) IS NULL THEN
    RETURN false;
  END IF;

  -- New layout: first segment is the project id
  BEGIN
    v_project := seg[1]::uuid;
    IF public.is_user_in_project(_user_id, v_project) THEN
      RETURN true;
    END IF;
  EXCEPTION WHEN invalid_text_representation THEN
    v_project := NULL;
  END;

  -- Legacy expense layout: expenses/{projectId}/...
  IF seg[1] = 'expenses' AND array_length(seg, 1) >= 2 THEN
    BEGIN
      v_project := seg[2]::uuid;
      IF public.is_user_in_project(_user_id, v_project) THEN
        RETURN true;
      END IF;
    EXCEPTION WHEN invalid_text_representation THEN
      NULL;
    END;
  END IF;

  -- Legacy phase-item layout: {phaseId}/{itemId}/...
  BEGIN
    SELECT pp.project_id INTO v_project
    FROM public.project_phases pp
    WHERE pp.id = seg[1]::uuid;
    IF v_project IS NOT NULL AND public.is_user_in_project(_user_id, v_project) THEN
      RETURN true;
    END IF;
  EXCEPTION WHEN invalid_text_representation THEN
    NULL;
  END;

  RETURN false;
END;
$$;

-- Remove the overly-permissive policies
DROP POLICY IF EXISTS "Auth view project files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read project files" ON storage.objects;
DROP POLICY IF EXISTS "Auth upload project files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload project files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update project files" ON storage.objects;
DROP POLICY IF EXISTS "Managers+ delete project files" ON storage.objects;

-- Membership-scoped policies
CREATE POLICY "Members read project files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'project-files' AND public.can_access_project_file(auth.uid(), name));

CREATE POLICY "Members upload project files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'project-files' AND public.can_access_project_file(auth.uid(), name));

CREATE POLICY "Members update project files"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'project-files' AND public.can_access_project_file(auth.uid(), name))
WITH CHECK (bucket_id = 'project-files' AND public.can_access_project_file(auth.uid(), name));

CREATE POLICY "Managers delete project files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'project-files'
  AND public.can_access_project_file(auth.uid(), name)
  AND (
    has_role(auth.uid(), 'superadmin'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'manager'::app_role)
  )
);