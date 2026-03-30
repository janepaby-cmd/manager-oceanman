
-- 1. projects: Eliminar política que da acceso total a admins
DROP POLICY IF EXISTS "Admins view all projects" ON public.projects;
DROP POLICY IF EXISTS "Admins update all projects" ON public.projects;
DROP POLICY IF EXISTS "Admins delete projects" ON public.projects;

-- 2. Superadmins ven todo
CREATE POLICY "Superadmins view all projects"
ON public.projects FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Superadmins update all projects"
ON public.projects FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Superadmins delete all projects"
ON public.projects FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'superadmin'::app_role));

-- 3. Admins solo proyectos asignados
CREATE POLICY "Admins view assigned projects"
ON public.projects FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) AND EXISTS (SELECT 1 FROM public.project_users pu WHERE pu.project_id = projects.id AND pu.user_id = auth.uid()));

CREATE POLICY "Admins update assigned projects"
ON public.projects FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) AND EXISTS (SELECT 1 FROM public.project_users pu WHERE pu.project_id = projects.id AND pu.user_id = auth.uid()));

CREATE POLICY "Admins delete assigned projects"
ON public.projects FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) AND EXISTS (SELECT 1 FROM public.project_users pu WHERE pu.project_id = projects.id AND pu.user_id = auth.uid()));

-- 4. Actualizar INSERT: solo superadmin puede crear sin restricción, admin y manager pueden crear
DROP POLICY IF EXISTS "Managers+ insert projects" ON public.projects;
CREATE POLICY "Auth insert projects"
ON public.projects FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- 5. Cascada: project_phases - admins solo asignados
DROP POLICY IF EXISTS "Admins manage phases" ON public.project_phases;

CREATE POLICY "Superadmins manage phases"
ON public.project_phases FOR ALL
USING (has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Admins manage assigned phases"
ON public.project_phases FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) AND EXISTS (SELECT 1 FROM public.project_users pu WHERE pu.project_id = project_phases.project_id AND pu.user_id = auth.uid()));

-- 6. phase_items - admins solo asignados
DROP POLICY IF EXISTS "Admins manage items" ON public.phase_items;

CREATE POLICY "Superadmins manage items"
ON public.phase_items FOR ALL
USING (has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Admins manage assigned items"
ON public.phase_items FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) AND EXISTS (SELECT 1 FROM public.project_phases pp JOIN public.project_users pu ON pu.project_id = pp.project_id WHERE pp.id = phase_items.phase_id AND pu.user_id = auth.uid()));

-- 7. project_expenses - admins solo asignados
DROP POLICY IF EXISTS "Admins manage expenses" ON public.project_expenses;

CREATE POLICY "Superadmins manage expenses"
ON public.project_expenses FOR ALL
USING (has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Admins manage assigned expenses"
ON public.project_expenses FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) AND EXISTS (SELECT 1 FROM public.project_users pu WHERE pu.project_id = project_expenses.project_id AND pu.user_id = auth.uid()));

-- 8. project_users - admins solo asignados
DROP POLICY IF EXISTS "Admins manage project users" ON public.project_users;

CREATE POLICY "Superadmins manage project users"
ON public.project_users FOR ALL
USING (has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Admins manage assigned project users"
ON public.project_users FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) AND EXISTS (SELECT 1 FROM public.project_users pu WHERE pu.project_id = project_users.project_id AND pu.user_id = auth.uid()));
