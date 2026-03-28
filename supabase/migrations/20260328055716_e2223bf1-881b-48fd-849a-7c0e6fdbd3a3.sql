
-- Master checklist templates
CREATE TABLE public.checklist_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.checklist_template_phases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.checklist_templates(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.checklist_template_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id uuid NOT NULL REFERENCES public.checklist_template_phases(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  item_type_code text NOT NULL DEFAULT 'checkbox',
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_template_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_template_items ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read templates
CREATE POLICY "Auth can view templates" ON public.checklist_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth can view template phases" ON public.checklist_template_phases FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth can view template items" ON public.checklist_template_items FOR SELECT TO authenticated USING (true);

-- Only superadmin/admin can manage
CREATE POLICY "Admins manage templates" ON public.checklist_templates FOR ALL USING (has_role(auth.uid(), 'superadmin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins manage template phases" ON public.checklist_template_phases FOR ALL USING (has_role(auth.uid(), 'superadmin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins manage template items" ON public.checklist_template_items FOR ALL USING (has_role(auth.uid(), 'superadmin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Updated at trigger
CREATE TRIGGER update_checklist_templates_updated_at BEFORE UPDATE ON public.checklist_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
