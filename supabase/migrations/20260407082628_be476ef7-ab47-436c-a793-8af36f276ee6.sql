CREATE OR REPLACE FUNCTION public.is_project_creator(_project_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.projects
    WHERE id = _project_id
      AND created_by = _user_id
  );
$$;

DROP POLICY IF EXISTS "Creator can add self to project" ON public.project_users;

CREATE POLICY "Creator can add self to project"
ON public.project_users
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND public.is_project_creator(project_id, auth.uid())
);

CREATE OR REPLACE FUNCTION public.assign_project_creator_membership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.created_by IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM public.project_users pu
       WHERE pu.project_id = NEW.id
         AND pu.user_id = NEW.created_by
     ) THEN
    INSERT INTO public.project_users (project_id, user_id)
    VALUES (NEW.id, NEW.created_by);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS assign_project_creator_membership_trigger ON public.projects;

CREATE TRIGGER assign_project_creator_membership_trigger
AFTER INSERT ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.assign_project_creator_membership();