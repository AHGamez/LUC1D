ALTER TABLE public.discard_chat_tags DROP CONSTRAINT discard_chat_tags_tag_check;
ALTER TABLE public.discard_chat_tags ADD CONSTRAINT discard_chat_tags_tag_check CHECK (tag IN ('owner','modmgmt'));