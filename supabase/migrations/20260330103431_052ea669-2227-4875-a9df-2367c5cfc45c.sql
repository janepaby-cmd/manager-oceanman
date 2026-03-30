-- Evitar recursión infinita en RLS usando función SECURITY DEFINER para membresía por proyecto
CREATE OR REPLACE FUNCTION public.is_user_in_project(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.project_users
    WHERE user_id = _user_id
      AND project_id = _project_id
  );
$$;

-- Reemplazar políticas de projects para usar función (evita evaluar RLS recursiva de project_users)
DROP POLICY IF EXISTS "Assigned users view projects" ON public.projects;
DROP POLICY IF EXISTS "Managers view assigned projects" ON public.projects;
DROP POLICY IF EXISTS "Managers update assigned projects" ON public.projects;
DROP POLICY IF EXISTS "Managers delete assigned projects" ON public.projects;
DROP POLICY IF EXISTS "Admins view assigned projects" ON public.projects;
DROP POLICY IF EXISTS "Admins update assigned projects" ON public.projects;
DROP POLICY IF EXISTS "Admins delete assigned projects" ON public.projects;

CREATE POLICY "Assigned users view projects"
ON public.projects
FOR SELECT TO authenticated
USING (public.is_user_in_project(auth.uid(), id));

CREATE POLICY "Managers view assigned projects"
ON public.projects
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'manager'::app_role) AND public.is_user_in_project(auth.uid(), id));

CREATE POLICY "Managers update assigned projects"
ON public.projects
FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'manager'::app_role) AND public.is_user_in_project(auth.uid(), id));

CREATE POLICY "Managers delete assigned projects"
ON public.projects
FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'manager'::app_role) AND public.is_user_in_project(auth.uid(), id));

CREATE POLICY "Admins view assigned projects"
ON public.projects
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) AND public.is_user_in_project(auth.uid(), id));

CREATE POLICY "Admins update assigned projects"
ON public.projects
FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) AND public.is_user_in_project(auth.uid(), id));

CREATE POLICY "Admins delete assigned projects"
ON public.projects
FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) AND public.is_user_in_project(auth.uid(), id));

-- project_phases
DROP POLICY IF EXISTS "Assigned users view phases" ON public.project_phases;
DROP POLICY IF EXISTS "Managers manage assigned project phases" ON public.project_phases;
DROP POLICY IF EXISTS "Admins manage assigned phases" ON public.project_phases;

CREATE POLICY "Assigned users view phases"
ON public.project_phases
FOR SELECT TO authenticated
USING (public.is_user_in_project(auth.uid(), project_id));

CREATE POLICY "Managers manage assigned project phases"
ON public.project_phases
FOR ALL TO public
USING (has_role(auth.uid(), 'manager'::app_role) AND public.is_user_in_project(auth.uid(), project_id));

CREATE POLICY "Admins manage assigned phases"
ON public.project_phases
FOR ALL TO public
USING (has_role(auth.uid(), 'admin'::app_role) AND public.is_user_in_project(auth.uid(), project_id));

-- phase_items
DROP POLICY IF EXISTS "Assigned users view items" ON public.phase_items;
DROP POLICY IF EXISTS "Assigned users update items" ON public.phase_items;
DROP POLICY IF EXISTS "Managers manage assigned project items" ON public.phase_items;
DROP POLICY IF EXISTS "Admins manage assigned items" ON public.phase_items;

CREATE POLICY "Assigned users view items"
ON public.phase_items
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.project_phases pp
    WHERE pp.id = phase_items.phase_id
      AND public.is_user_in_project(auth.uid(), pp.project_id)
  )
);

CREATE POLICY "Assigned users update items"
ON public.phase_items
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.project_phases pp
    WHERE pp.id = phase_items.phase_id
      AND public.is_user_in_project(auth.uid(), pp.project_id)
  )
);

CREATE POLICY "Managers manage assigned project items"
ON public.phase_items
FOR ALL TO public
USING (
  has_role(auth.uid(), 'manager'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.project_phases pp
    WHERE pp.id = phase_items.phase_id
      AND public.is_user_in_project(auth.uid(), pp.project_id)
  )
);

CREATE POLICY "Admins manage assigned items"
ON public.phase_items
FOR ALL TO public
USING (
  has_role(auth.uid(), 'admin'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.project_phases pp
    WHERE pp.id = phase_items.phase_id
      AND public.is_user_in_project(auth.uid(), pp.project_id)
  )
);

-- project_expenses
DROP POLICY IF EXISTS "Assigned users view expenses" ON public.project_expenses;
DROP POLICY IF EXISTS "Managers manage assigned project expenses" ON public.project_expenses;
DROP POLICY IF EXISTS "Admins manage assigned expenses" ON public.project_expenses;

CREATE POLICY "Assigned users view expenses"
ON public.project_expenses
FOR SELECT TO authenticated
USING (public.is_user_in_project(auth.uid(), project_id));

CREATE POLICY "Managers manage assigned project expenses"
ON public.project_expenses
FOR ALL TO public
USING (has_role(auth.uid(), 'manager'::app_role) AND public.is_user_in_project(auth.uid(), project_id));

CREATE POLICY "Admins manage assigned expenses"
ON public.project_expenses
FOR ALL TO public
USING (has_role(auth.uid(), 'admin'::app_role) AND public.is_user_in_project(auth.uid(), project_id));

-- project_users (origen de la recursión)
DROP POLICY IF EXISTS "Managers manage assigned project users" ON public.project_users;
DROP POLICY IF EXISTS "Admins manage assigned project users" ON public.project_users;

CREATE POLICY "Managers manage assigned project users"
ON public.project_users
FOR ALL TO public
USING (has_role(auth.uid(), 'manager'::app_role) AND public.is_user_in_project(auth.uid(), project_id));

CREATE POLICY "Admins manage assigned project users"
ON public.project_users
FOR ALL TO public
USING (has_role(auth.uid(), 'admin'::app_role) AND public.is_user_in_project(auth.uid(), project_id));