
-- Drop existing foreign keys and recreate with CASCADE
ALTER TABLE public.project_phases DROP CONSTRAINT IF EXISTS project_phases_project_id_fkey;
ALTER TABLE public.project_phases ADD CONSTRAINT project_phases_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

ALTER TABLE public.phase_items DROP CONSTRAINT IF EXISTS phase_items_phase_id_fkey;
ALTER TABLE public.phase_items ADD CONSTRAINT phase_items_phase_id_fkey
  FOREIGN KEY (phase_id) REFERENCES public.project_phases(id) ON DELETE CASCADE;

ALTER TABLE public.project_users DROP CONSTRAINT IF EXISTS project_users_project_id_fkey;
ALTER TABLE public.project_users ADD CONSTRAINT project_users_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

ALTER TABLE public.project_expenses DROP CONSTRAINT IF EXISTS project_expenses_project_id_fkey;
ALTER TABLE public.project_expenses ADD CONSTRAINT project_expenses_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;
