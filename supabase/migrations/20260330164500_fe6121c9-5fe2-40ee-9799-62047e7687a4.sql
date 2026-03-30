
-- 1) Create phase_item_files table for multiple files per item
CREATE TABLE public.phase_item_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.phase_items(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  file_name text NOT NULL,
  file_extension text NOT NULL DEFAULT '',
  file_size bigint NOT NULL DEFAULT 0,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2) Add project-level file configuration columns
ALTER TABLE public.projects
  ADD COLUMN max_files_per_item integer NOT NULL DEFAULT 5,
  ADD COLUMN allowed_file_extensions text[] NOT NULL DEFAULT ARRAY[
    'pdf','doc','docx','xls','xlsx','ppt','pptx',
    'kml','kmz','gpx',
    'jpg','jpeg','png','gif','webp','bmp','tiff','svg',
    'zip'
  ]::text[];

-- 3) Enable RLS on phase_item_files
ALTER TABLE public.phase_item_files ENABLE ROW LEVEL SECURITY;

-- Superadmins manage all
CREATE POLICY "Superadmins manage item files" ON public.phase_item_files
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'superadmin'::app_role));

-- Assigned users can view files
CREATE POLICY "Assigned users view item files" ON public.phase_item_files
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.phase_items pi
    JOIN public.project_phases pp ON pp.id = pi.phase_id
    WHERE pi.id = phase_item_files.item_id
      AND is_user_in_project(auth.uid(), pp.project_id)
  ));

-- Assigned users can insert files
CREATE POLICY "Assigned users insert item files" ON public.phase_item_files
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.phase_items pi
    JOIN public.project_phases pp ON pp.id = pi.phase_id
    WHERE pi.id = phase_item_files.item_id
      AND is_user_in_project(auth.uid(), pp.project_id)
  ));

-- Assigned users can delete files
CREATE POLICY "Assigned users delete item files" ON public.phase_item_files
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.phase_items pi
    JOIN public.project_phases pp ON pp.id = pi.phase_id
    WHERE pi.id = phase_item_files.item_id
      AND is_user_in_project(auth.uid(), pp.project_id)
  ));

-- 4) Migrate existing file_url data to phase_item_files
INSERT INTO public.phase_item_files (item_id, file_url, file_name, file_extension, uploaded_by)
SELECT
  id,
  file_url,
  COALESCE(
    reverse(split_part(reverse(file_url), '/', 1)),
    'file'
  ),
  COALESCE(
    lower(reverse(split_part(reverse(split_part(file_url, '?', 1)), '.', 1))),
    ''
  ),
  completed_by
FROM public.phase_items
WHERE file_url IS NOT NULL AND file_url <> '';
