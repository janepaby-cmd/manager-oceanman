
-- 1. Create ALL tables first
CREATE TABLE public.project_statuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  color text DEFAULT '#6b7280',
  position int DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.phase_item_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  code text NOT NULL UNIQUE,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  fiscal_year int NOT NULL DEFAULT EXTRACT(YEAR FROM now())::int,
  status_id uuid REFERENCES public.project_statuses(id),
  start_date timestamptz NOT NULL DEFAULT now(),
  estimated_end_date timestamptz,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.project_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, user_id)
);

CREATE TABLE public.project_phases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  position int DEFAULT 0,
  is_completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.phase_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id uuid REFERENCES public.project_phases(id) ON DELETE CASCADE NOT NULL,
  item_type_id uuid REFERENCES public.phase_item_types(id) NOT NULL,
  title text NOT NULL,
  description text,
  position int DEFAULT 0,
  is_completed boolean NOT NULL DEFAULT false,
  completed_by uuid,
  completed_at timestamptz,
  file_url text,
  signature_data text,
  signature_confirmed boolean NOT NULL DEFAULT false,
  signature_confirmed_by uuid,
  signature_confirmed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Seed data
INSERT INTO public.phase_item_types (name, code, description) VALUES
  ('Checkbox', 'checkbox', 'Tarea de verificación simple'),
  ('Adjuntar fichero', 'file', 'Requiere adjuntar un archivo'),
  ('Firma de documento', 'signature', 'Requiere firma digital y confirmación');

INSERT INTO public.project_statuses (name, color, position) VALUES
  ('Planificación', '#3b82f6', 0),
  ('En progreso', '#f59e0b', 1),
  ('Pausado', '#6b7280', 2),
  ('Completado', '#10b981', 3),
  ('Cancelado', '#ef4444', 4);

-- 3. Enable RLS
ALTER TABLE public.project_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phase_item_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phase_items ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
CREATE POLICY "Auth can view statuses" ON public.project_statuses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Superadmins manage statuses" ON public.project_statuses FOR ALL USING (public.has_role(auth.uid(), 'superadmin'));
CREATE POLICY "Admins manage statuses" ON public.project_statuses FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Auth can view item types" ON public.phase_item_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "Superadmins manage item types" ON public.phase_item_types FOR ALL USING (public.has_role(auth.uid(), 'superadmin'));
CREATE POLICY "Admins manage item types" ON public.phase_item_types FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Managers+ manage projects" ON public.projects FOR ALL USING (
  public.has_role(auth.uid(), 'superadmin') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')
);
CREATE POLICY "Assigned users view projects" ON public.projects FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.project_users pu WHERE pu.project_id = id AND pu.user_id = auth.uid())
);

CREATE POLICY "Managers+ manage project users" ON public.project_users FOR ALL USING (
  public.has_role(auth.uid(), 'superadmin') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')
);
CREATE POLICY "Users view own assignments" ON public.project_users FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Managers+ manage phases" ON public.project_phases FOR ALL USING (
  public.has_role(auth.uid(), 'superadmin') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')
);
CREATE POLICY "Assigned users view phases" ON public.project_phases FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.project_users pu WHERE pu.project_id = project_phases.project_id AND pu.user_id = auth.uid())
);

CREATE POLICY "Managers+ manage items" ON public.phase_items FOR ALL USING (
  public.has_role(auth.uid(), 'superadmin') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')
);
CREATE POLICY "Assigned users view items" ON public.phase_items FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.project_phases pp JOIN public.project_users pu ON pu.project_id = pp.project_id WHERE pp.id = phase_items.phase_id AND pu.user_id = auth.uid())
);
CREATE POLICY "Assigned users update items" ON public.phase_items FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.project_phases pp JOIN public.project_users pu ON pu.project_id = pp.project_id WHERE pp.id = phase_items.phase_id AND pu.user_id = auth.uid())
);

-- 5. Triggers
CREATE TRIGGER update_project_statuses_updated_at BEFORE UPDATE ON public.project_statuses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_project_phases_updated_at BEFORE UPDATE ON public.project_phases FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_phase_items_updated_at BEFORE UPDATE ON public.phase_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Storage
INSERT INTO storage.buckets (id, name, public) VALUES ('project-files', 'project-files', false);
CREATE POLICY "Auth upload project files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'project-files');
CREATE POLICY "Auth view project files" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'project-files');
CREATE POLICY "Managers+ delete project files" ON storage.objects FOR DELETE USING (
  bucket_id = 'project-files' AND (public.has_role(auth.uid(), 'superadmin') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
);
