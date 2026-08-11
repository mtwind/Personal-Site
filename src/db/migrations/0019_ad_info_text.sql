-- ─────────────────────────────────────────────────────────────────────
-- Per-ad disclosure text.
--
-- The ⓘ behind "Sponsored" explains that nobody paid for these. That
-- explanation was one hard-coded sentence for every ad; now each ad can
-- carry its own, and an empty string means "say the usual thing".
--
-- Empty rather than null: the column is a piece of copy, and every read
-- of it falls back to the shared default anyway, so a second way of
-- saying "nothing here" would buy nothing.
-- ─────────────────────────────────────────────────────────────────────

ALTER TABLE "ads" ADD COLUMN "info_text" text DEFAULT '' NOT NULL;
