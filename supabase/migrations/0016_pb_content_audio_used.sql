-- Adds the audio/sound track used for a piece of content — a distinct
-- concept from `format_id` (the structural template) and `topic`, and
-- one of the most commonly tracked variables when logging Reels/TikToks
-- for performance analysis. Free text, not a lookup table: audio tracks
-- don't have reusable structure the way pb_formats rows do, so there's
-- nothing to normalize.

alter table public.pb_content_items
  add column if not exists audio_used text null;
