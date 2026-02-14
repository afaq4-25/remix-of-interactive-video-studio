
-- Create saved_videos table
CREATE TABLE public.saved_videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  youtube_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT 'Untitled Project',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create saved_overlays table
CREATE TABLE public.saved_overlays (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  saved_video_id UUID NOT NULL REFERENCES public.saved_videos(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  html_code TEXT NOT NULL,
  x DOUBLE PRECISION NOT NULL DEFAULT 10,
  y DOUBLE PRECISION NOT NULL DEFAULT 10,
  width DOUBLE PRECISION NOT NULL DEFAULT 25,
  height DOUBLE PRECISION NOT NULL DEFAULT 20,
  rotation DOUBLE PRECISION NOT NULL DEFAULT 0,
  start_time DOUBLE PRECISION NOT NULL DEFAULT 0,
  end_time DOUBLE PRECISION NOT NULL DEFAULT 10,
  sort_order INT NOT NULL DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.saved_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_overlays ENABLE ROW LEVEL SECURITY;

-- Helper function
CREATE OR REPLACE FUNCTION public.is_owner_of_saved_video(_video_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.saved_videos
    WHERE id = _video_id AND user_id = auth.uid()
  );
$$;

-- RLS for saved_videos
CREATE POLICY "Users can view own videos" ON public.saved_videos FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own videos" ON public.saved_videos FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own videos" ON public.saved_videos FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own videos" ON public.saved_videos FOR DELETE USING (user_id = auth.uid());

-- RLS for saved_overlays
CREATE POLICY "Users can view own overlays" ON public.saved_overlays FOR SELECT USING (public.is_owner_of_saved_video(saved_video_id));
CREATE POLICY "Users can insert own overlays" ON public.saved_overlays FOR INSERT WITH CHECK (public.is_owner_of_saved_video(saved_video_id));
CREATE POLICY "Users can update own overlays" ON public.saved_overlays FOR UPDATE USING (public.is_owner_of_saved_video(saved_video_id));
CREATE POLICY "Users can delete own overlays" ON public.saved_overlays FOR DELETE USING (public.is_owner_of_saved_video(saved_video_id));

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_saved_videos_updated_at
BEFORE UPDATE ON public.saved_videos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
