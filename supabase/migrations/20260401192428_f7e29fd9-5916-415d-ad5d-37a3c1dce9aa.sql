ALTER TABLE public.role_permissions ADD COLUMN can_complete boolean NOT NULL DEFAULT false;

-- Set can_complete = true for superadmin on phases module
UPDATE public.role_permissions SET can_complete = true WHERE module = 'phases';