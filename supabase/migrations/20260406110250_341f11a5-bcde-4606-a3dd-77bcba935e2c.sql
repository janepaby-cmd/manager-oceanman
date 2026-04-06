
-- budget_categories
CREATE TABLE public.budget_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('income','expense')),
  budgeted_amount numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.budget_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmins manage budget categories" ON public.budget_categories
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Admins manage assigned budget categories" ON public.budget_categories
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role) AND is_user_in_project(auth.uid(), project_id));

CREATE POLICY "Managers manage assigned budget categories" ON public.budget_categories
  FOR ALL TO public
  USING (has_role(auth.uid(), 'manager'::app_role) AND is_user_in_project(auth.uid(), project_id));

CREATE POLICY "Assigned users view budget categories" ON public.budget_categories
  FOR SELECT TO authenticated
  USING (is_user_in_project(auth.uid(), project_id));

-- budget_entries
CREATE TABLE public.budget_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.budget_categories(id) ON DELETE SET NULL,
  date date NOT NULL,
  concept text NOT NULL,
  amount numeric NOT NULL,
  type text NOT NULL CHECK (type IN ('income','expense')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','paid')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.budget_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmins manage budget entries" ON public.budget_entries
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Admins manage assigned budget entries" ON public.budget_entries
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role) AND is_user_in_project(auth.uid(), project_id));

CREATE POLICY "Managers manage assigned budget entries" ON public.budget_entries
  FOR ALL TO public
  USING (has_role(auth.uid(), 'manager'::app_role) AND is_user_in_project(auth.uid(), project_id));

CREATE POLICY "Assigned users view budget entries" ON public.budget_entries
  FOR SELECT TO authenticated
  USING (is_user_in_project(auth.uid(), project_id));
