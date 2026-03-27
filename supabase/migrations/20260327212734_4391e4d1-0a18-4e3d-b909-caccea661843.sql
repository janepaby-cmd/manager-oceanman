
-- Expense types table
CREATE TABLE public.expense_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.expense_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth can view expense types" ON public.expense_types
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Superadmins manage expense types" ON public.expense_types
  FOR ALL USING (has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Admins manage expense types" ON public.expense_types
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Seed default expense types
INSERT INTO public.expense_types (name, code) VALUES
  ('Material', 'material'),
  ('Transporte', 'transport'),
  ('Servicios', 'services'),
  ('Personal', 'personnel'),
  ('Otros', 'other');

-- Project expenses table
CREATE TABLE public.project_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  expense_type_id uuid NOT NULL REFERENCES public.expense_types(id),
  expense_date date NOT NULL,
  amount numeric(12,2) NOT NULL,
  description text,
  ticket_url text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.project_expenses ENABLE ROW LEVEL SECURITY;

-- Managers+ can fully manage expenses
CREATE POLICY "Managers+ manage expenses" ON public.project_expenses
  FOR ALL USING (
    has_role(auth.uid(), 'superadmin'::app_role) OR
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'manager'::app_role)
  );

-- Assigned users can view expenses
CREATE POLICY "Assigned users view expenses" ON public.project_expenses
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM project_users pu
      WHERE pu.project_id = project_expenses.project_id
      AND pu.user_id = auth.uid()
    )
  );

-- Update trigger
CREATE TRIGGER update_project_expenses_updated_at
  BEFORE UPDATE ON public.project_expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
