
-- Create role_permissions table
CREATE TABLE public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role public.app_role NOT NULL,
  module text NOT NULL,
  can_create boolean NOT NULL DEFAULT false,
  can_read boolean NOT NULL DEFAULT true,
  can_update boolean NOT NULL DEFAULT false,
  can_delete boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (role, module)
);

-- Enable RLS
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Superadmins can manage all permissions
CREATE POLICY "Superadmins manage permissions"
ON public.role_permissions FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'superadmin'))
WITH CHECK (public.has_role(auth.uid(), 'superadmin'));

-- All authenticated users can read permissions (needed to check their own)
CREATE POLICY "Auth can view permissions"
ON public.role_permissions FOR SELECT
TO authenticated
USING (true);

-- Seed default permissions
-- superadmin: full CRUD on everything
INSERT INTO public.role_permissions (role, module, can_create, can_read, can_update, can_delete) VALUES
  ('superadmin', 'projects', true, true, true, true),
  ('superadmin', 'phases', true, true, true, true),
  ('superadmin', 'expenses', true, true, true, true),
  ('superadmin', 'messages', true, true, true, true),
  -- admin: full CRUD
  ('admin', 'projects', true, true, true, true),
  ('admin', 'phases', true, true, true, true),
  ('admin', 'expenses', true, true, true, true),
  ('admin', 'messages', true, true, true, true),
  -- manager: full CRUD
  ('manager', 'projects', true, true, true, true),
  ('manager', 'phases', true, true, true, true),
  ('manager', 'expenses', true, true, true, true),
  ('manager', 'messages', true, true, true, true),
  -- user: limited CRUD
  ('user', 'projects', false, true, false, false),
  ('user', 'phases', false, true, true, false),
  ('user', 'expenses', true, true, false, false),
  ('user', 'messages', true, true, false, false);

-- Updated_at trigger
CREATE TRIGGER update_role_permissions_updated_at
  BEFORE UPDATE ON public.role_permissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
