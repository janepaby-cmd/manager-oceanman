
-- 1. Create roles table
CREATE TABLE public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- RLS: everyone authenticated can read roles
CREATE POLICY "Authenticated users can view roles" ON public.roles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Superadmins can manage roles" ON public.roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'superadmin'
    )
  );

CREATE POLICY "Admins can manage roles" ON public.roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

-- Seed existing enum roles into table
INSERT INTO public.roles (name, description) VALUES
  ('superadmin', 'Control total del sistema. Gestión de usuarios, roles y configuración.'),
  ('admin', 'Administración de usuarios y proyectos.'),
  ('manager', 'Gestión de proyectos asignados y equipos.'),
  ('user', 'Acceso básico a proyectos asignados.');

-- Trigger for updated_at
CREATE TRIGGER update_roles_updated_at
  BEFORE UPDATE ON public.roles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
