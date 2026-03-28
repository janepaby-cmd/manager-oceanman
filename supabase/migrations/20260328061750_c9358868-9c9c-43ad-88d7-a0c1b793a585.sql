
ALTER TABLE public.phase_items ADD COLUMN requires_file boolean NOT NULL DEFAULT false;
ALTER TABLE public.projects ADD COLUMN is_restrictive boolean NOT NULL DEFAULT false;
