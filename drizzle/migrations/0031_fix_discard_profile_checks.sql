ALTER TABLE public.discard_profiles DROP CONSTRAINT discard_avatar_decoration_valid;
ALTER TABLE public.discard_profiles ADD CONSTRAINT discard_avatar_decoration_valid CHECK (avatar_decoration IN ('none','galaxy','aurora','stardust') OR avatar_decoration ~ '^ring-[a-z]+$');
ALTER TABLE public.discard_profiles DROP CONSTRAINT discard_avatar_own_path;
ALTER TABLE public.discard_profiles ADD CONSTRAINT discard_avatar_own_path CHECK (avatar_path IS NULL OR (split_part(avatar_path,'/',1) = user_id::text AND avatar_path ~ '\.(png|jpg|jpeg|webp|gif)$'));