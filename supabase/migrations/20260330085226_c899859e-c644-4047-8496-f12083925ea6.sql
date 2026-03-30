
-- 1. Eliminar políticas antiguas de projects
DROP POLICY IF EXISTS "Managers+ view all projects" ON public.projects;
DROP POLICY IF EXISTS "Managers+ insert projects" ON public.projects;
DROP POLICY IF EXISTS "Managers+ update projects" ON public.projects;
DROP POLICY IF EXISTS "Managers+ delete projects" ON public.projects;

-- 2. Nuevas políticas SELECT para projects
CREATE POLICY "Admins view all projects"
ON public.projects FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'superadmin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers view assigned projects"
ON public.projects FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'manager'::app_role) AND EXISTS (SELECT 1 FROM public.project_users pu WHERE pu.project_id = projects.id AND pu.user_id = auth.uid()));

-- 3. INSERT projects (managers pueden crear)
CREATE POLICY "Managers+ insert projects"
ON public.projects FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- 4. UPDATE projects
CREATE POLICY "Admins update all projects"
ON public.projects FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'superadmin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers update assigned projects"
ON public.projects FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'manager'::app_role) AND EXISTS (SELECT 1 FROM public.project_users pu WHERE pu.project_id = projects.id AND pu.user_id = auth.uid()));

-- 5. DELETE projects
CREATE POLICY "Admins delete projects"
ON public.projects FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'superadmin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers delete assigned projects"
ON public.projects FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'manager'::app_role) AND EXISTS (SELECT 1 FROM public.project_users pu WHERE pu.project_id = projects.id AND pu.user_id = auth.uid()));

-- 6. project_phases
DROP POLICY IF EXISTS "Managers+ manage phases" ON public.project_phases;

CREATE POLICY "Admins manage phases"
ON public.project_phases FOR ALL
USING (has_role(auth.uid(), 'superadmin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers manage assigned project phases"
ON public.project_phases FOR ALL
USING (has_role(auth.uid(), 'manager'::app_role) AND EXISTS (SELECT 1 FROM public.project_users pu WHERE pu.project_id = project_phases.project_id AND pu.user_id = auth.uid()));

-- 7. phase_items
DROP POLICY IF EXISTS "Managers+ manage items" ON public.phase_items;

CREATE POLICY "Admins manage items"
ON public.phase_items FOR ALL
USING (has_role(auth.uid(), 'superadmin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers manage assigned project items"
ON public.phase_items FOR ALL
USING (has_role(auth.uid(), 'manager'::app_role) AND EXISTS (SELECT 1 FROM public.project_phases pp JOIN public.project_users pu ON pu.project_id = pp.project_id WHERE pp.id = phase_items.phase_id AND pu.user_id = auth.uid()));

-- 8. project_expenses
DROP POLICY IF EXISTS "Managers+ manage expenses" ON public.project_expenses;

CREATE POLICY "Admins manage expenses"
ON public.project_expenses FOR ALL
USING (has_role(auth.uid(), 'superadmin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers manage assigned project expenses"
ON public.project_expenses FOR ALL
USING (has_role(auth.uid(), 'manager'::app_role) AND EXISTS (SELECT 1 FROM public.project_users pu WHERE pu.project_id = project_expenses.project_id AND pu.user_id = auth.uid()));

-- 9. project_users
DROP POLICY IF EXISTS "Managers+ manage project users" ON public.project_users;

CREATE POLICY "Admins manage project users"
ON public.project_users FOR ALL
USING (has_role(auth.uid(), 'superadmin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers manage assigned project users"
ON public.project_users FOR ALL
USING (has_role(auth.uid(), 'manager'::app_role) AND EXISTS (SELECT 1 FROM public.project_users pu WHERE pu.project_id = project_users.project_id AND pu.user_id = auth.uid()));
