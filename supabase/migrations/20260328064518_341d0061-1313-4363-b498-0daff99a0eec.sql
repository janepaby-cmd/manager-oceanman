-- Drop the broad "Managers+ manage projects" ALL policy
DROP POLICY IF EXISTS "Managers+ manage projects" ON public.projects;

-- Managers+ can INSERT new projects
CREATE POLICY "Managers+ insert projects"
ON public.projects FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'superadmin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'manager'::app_role)
);

-- Managers+ can UPDATE projects they're assigned to (or superadmin/admin all)
CREATE POLICY "Managers+ update projects"
ON public.projects FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'superadmin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'manager'::app_role)
);

-- Managers+ can DELETE projects
CREATE POLICY "Managers+ delete projects"
ON public.projects FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'superadmin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'manager'::app_role)
);