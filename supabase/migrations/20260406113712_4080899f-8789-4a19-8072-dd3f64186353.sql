
-- Global tables
CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  tax_id text,
  address text,
  city text,
  zip text,
  country text,
  email text,
  phone text,
  bank_account text,
  payment_terms integer DEFAULT 30,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  tax_id text,
  address text,
  city text,
  zip text,
  country text,
  email text,
  phone text,
  bank_account text,
  payment_terms integer DEFAULT 30,
  supplier_type text DEFAULT 'supplier',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Per-project config
CREATE TABLE public.invoice_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  fiscal_year integer NOT NULL DEFAULT (EXTRACT(year FROM now()))::integer,
  series_prefix text DEFAULT 'F-',
  number_digits integer DEFAULT 3,
  next_number integer DEFAULT 1,
  company_name text,
  company_tax_id text,
  company_address text,
  company_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, fiscal_year)
);

CREATE TABLE public.invoice_taxes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  rate numeric NOT NULL,
  type text NOT NULL,
  active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Issued invoices
CREATE TABLE public.invoices_issued (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  number text NOT NULL,
  issue_date date NOT NULL,
  due_date date,
  subtotal numeric DEFAULT 0,
  tax_total numeric DEFAULT 0,
  total numeric DEFAULT 0,
  status text DEFAULT 'draft',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, number)
);

CREATE TABLE public.invoice_issued_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES public.invoices_issued(id) ON DELETE CASCADE NOT NULL,
  concept text NOT NULL,
  quantity numeric DEFAULT 1,
  unit_price numeric DEFAULT 0,
  tax_id uuid REFERENCES public.invoice_taxes(id) ON DELETE SET NULL,
  line_total numeric DEFAULT 0
);

-- Received invoices
CREATE TABLE public.invoices_received (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  ext_number text NOT NULL,
  receipt_date date NOT NULL,
  due_date date,
  subtotal numeric DEFAULT 0,
  tax_total numeric DEFAULT 0,
  total numeric DEFAULT 0,
  status text DEFAULT 'received',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.invoice_received_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES public.invoices_received(id) ON DELETE CASCADE NOT NULL,
  concept text NOT NULL,
  quantity numeric DEFAULT 1,
  unit_price numeric DEFAULT 0,
  tax_id uuid REFERENCES public.invoice_taxes(id) ON DELETE SET NULL,
  line_total numeric DEFAULT 0
);

-- Validation triggers for supplier_type
CREATE OR REPLACE FUNCTION public.validate_supplier_type()
RETURNS trigger LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  IF NEW.supplier_type NOT IN ('supplier', 'creditor') THEN
    RAISE EXCEPTION 'supplier_type must be supplier or creditor';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_supplier_type
  BEFORE INSERT OR UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.validate_supplier_type();

-- Validation triggers for invoice_taxes type
CREATE OR REPLACE FUNCTION public.validate_invoice_tax_type()
RETURNS trigger LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  IF NEW.type NOT IN ('addition', 'deduction') THEN
    RAISE EXCEPTION 'type must be addition or deduction';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_invoice_tax_type
  BEFORE INSERT OR UPDATE ON public.invoice_taxes
  FOR EACH ROW EXECUTE FUNCTION public.validate_invoice_tax_type();

-- Validation triggers for issued invoice status
CREATE OR REPLACE FUNCTION public.validate_issued_invoice_status()
RETURNS trigger LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  IF NEW.status NOT IN ('draft', 'issued', 'paid', 'overdue') THEN
    RAISE EXCEPTION 'status must be draft, issued, paid, or overdue';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_issued_invoice_status
  BEFORE INSERT OR UPDATE ON public.invoices_issued
  FOR EACH ROW EXECUTE FUNCTION public.validate_issued_invoice_status();

-- Validation triggers for received invoice status
CREATE OR REPLACE FUNCTION public.validate_received_invoice_status()
RETURNS trigger LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  IF NEW.status NOT IN ('received', 'booked', 'paid') THEN
    RAISE EXCEPTION 'status must be received, booked, or paid';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_received_invoice_status
  BEFORE INSERT OR UPDATE ON public.invoices_received
  FOR EACH ROW EXECUTE FUNCTION public.validate_received_invoice_status();

-- Atomic invoice number generator
CREATE OR REPLACE FUNCTION public.get_next_invoice_number(
  p_project_id uuid,
  p_fiscal_year integer DEFAULT (EXTRACT(year FROM now()))::integer
)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
DECLARE
  v_config invoice_config%rowtype;
  v_result text;
  v_prefix text;
  v_digits integer;
BEGIN
  SELECT * INTO v_config
  FROM invoice_config
  WHERE project_id = p_project_id AND fiscal_year = p_fiscal_year
  FOR UPDATE;

  IF NOT FOUND THEN
    SELECT series_prefix, number_digits INTO v_prefix, v_digits
    FROM invoice_config
    WHERE project_id = p_project_id
    ORDER BY fiscal_year DESC LIMIT 1;

    v_prefix := COALESCE(v_prefix, 'F-');
    v_digits := COALESCE(v_digits, 3);

    INSERT INTO invoice_config (project_id, fiscal_year, series_prefix, number_digits, next_number)
    VALUES (p_project_id, p_fiscal_year, v_prefix, v_digits, 1)
    RETURNING * INTO v_config;
  END IF;

  v_result := v_config.series_prefix || p_fiscal_year::text || '-' ||
              lpad(v_config.next_number::text, v_config.number_digits, '0');

  UPDATE invoice_config SET next_number = next_number + 1 WHERE id = v_config.id;

  RETURN v_result;
END;
$$;

-- RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_taxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices_issued ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_issued_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices_received ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_received_lines ENABLE ROW LEVEL SECURITY;

-- clients & suppliers: global, any authenticated can read
CREATE POLICY "Auth can view clients" ON public.clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth can manage clients" ON public.clients FOR ALL TO authenticated USING (
  has_role(auth.uid(), 'superadmin'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role)
) WITH CHECK (
  has_role(auth.uid(), 'superadmin'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "Auth can view suppliers" ON public.suppliers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth can manage suppliers" ON public.suppliers FOR ALL TO authenticated USING (
  has_role(auth.uid(), 'superadmin'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role)
) WITH CHECK (
  has_role(auth.uid(), 'superadmin'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role)
);

-- invoice_config: project-scoped
CREATE POLICY "Assigned users view invoice config" ON public.invoice_config FOR SELECT TO authenticated USING (is_user_in_project(auth.uid(), project_id));
CREATE POLICY "Superadmins manage invoice config" ON public.invoice_config FOR ALL TO authenticated USING (has_role(auth.uid(), 'superadmin'::app_role));
CREATE POLICY "Admins manage assigned invoice config" ON public.invoice_config FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role) AND is_user_in_project(auth.uid(), project_id));
CREATE POLICY "Managers manage assigned invoice config" ON public.invoice_config FOR ALL TO public USING (has_role(auth.uid(), 'manager'::app_role) AND is_user_in_project(auth.uid(), project_id));

-- invoice_taxes: project-scoped
CREATE POLICY "Assigned users view invoice taxes" ON public.invoice_taxes FOR SELECT TO authenticated USING (is_user_in_project(auth.uid(), project_id));
CREATE POLICY "Superadmins manage invoice taxes" ON public.invoice_taxes FOR ALL TO authenticated USING (has_role(auth.uid(), 'superadmin'::app_role));
CREATE POLICY "Admins manage assigned invoice taxes" ON public.invoice_taxes FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role) AND is_user_in_project(auth.uid(), project_id));
CREATE POLICY "Managers manage assigned invoice taxes" ON public.invoice_taxes FOR ALL TO public USING (has_role(auth.uid(), 'manager'::app_role) AND is_user_in_project(auth.uid(), project_id));

-- invoices_issued: project-scoped
CREATE POLICY "Assigned users view issued invoices" ON public.invoices_issued FOR SELECT TO authenticated USING (is_user_in_project(auth.uid(), project_id));
CREATE POLICY "Superadmins manage issued invoices" ON public.invoices_issued FOR ALL TO authenticated USING (has_role(auth.uid(), 'superadmin'::app_role));
CREATE POLICY "Admins manage assigned issued invoices" ON public.invoices_issued FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role) AND is_user_in_project(auth.uid(), project_id));
CREATE POLICY "Managers manage assigned issued invoices" ON public.invoices_issued FOR ALL TO public USING (has_role(auth.uid(), 'manager'::app_role) AND is_user_in_project(auth.uid(), project_id));

-- invoice_issued_lines: via invoice join
CREATE POLICY "View issued lines" ON public.invoice_issued_lines FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM invoices_issued ii WHERE ii.id = invoice_id AND is_user_in_project(auth.uid(), ii.project_id))
);
CREATE POLICY "Superadmins manage issued lines" ON public.invoice_issued_lines FOR ALL TO authenticated USING (has_role(auth.uid(), 'superadmin'::app_role));
CREATE POLICY "Admins manage issued lines" ON public.invoice_issued_lines FOR ALL TO public USING (
  has_role(auth.uid(), 'admin'::app_role) AND EXISTS (SELECT 1 FROM invoices_issued ii WHERE ii.id = invoice_id AND is_user_in_project(auth.uid(), ii.project_id))
);
CREATE POLICY "Managers manage issued lines" ON public.invoice_issued_lines FOR ALL TO public USING (
  has_role(auth.uid(), 'manager'::app_role) AND EXISTS (SELECT 1 FROM invoices_issued ii WHERE ii.id = invoice_id AND is_user_in_project(auth.uid(), ii.project_id))
);

-- invoices_received: project-scoped
CREATE POLICY "Assigned users view received invoices" ON public.invoices_received FOR SELECT TO authenticated USING (is_user_in_project(auth.uid(), project_id));
CREATE POLICY "Superadmins manage received invoices" ON public.invoices_received FOR ALL TO authenticated USING (has_role(auth.uid(), 'superadmin'::app_role));
CREATE POLICY "Admins manage assigned received invoices" ON public.invoices_received FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role) AND is_user_in_project(auth.uid(), project_id));
CREATE POLICY "Managers manage assigned received invoices" ON public.invoices_received FOR ALL TO public USING (has_role(auth.uid(), 'manager'::app_role) AND is_user_in_project(auth.uid(), project_id));

-- invoice_received_lines: via invoice join
CREATE POLICY "View received lines" ON public.invoice_received_lines FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM invoices_received ir WHERE ir.id = invoice_id AND is_user_in_project(auth.uid(), ir.project_id))
);
CREATE POLICY "Superadmins manage received lines" ON public.invoice_received_lines FOR ALL TO authenticated USING (has_role(auth.uid(), 'superadmin'::app_role));
CREATE POLICY "Admins manage received lines" ON public.invoice_received_lines FOR ALL TO public USING (
  has_role(auth.uid(), 'admin'::app_role) AND EXISTS (SELECT 1 FROM invoices_received ir WHERE ir.id = invoice_id AND is_user_in_project(auth.uid(), ir.project_id))
);
CREATE POLICY "Managers manage received lines" ON public.invoice_received_lines FOR ALL TO public USING (
  has_role(auth.uid(), 'manager'::app_role) AND EXISTS (SELECT 1 FROM invoices_received ir WHERE ir.id = invoice_id AND is_user_in_project(auth.uid(), ir.project_id))
);
