-- Replace the free-form INTERVAL column with an explicit value+unit pair so
-- admin-ui has something direct to bind a number input + unit dropdown to.
-- admin-update-step previously only ever wrote/read whole days via
-- make_interval(days => ...) / EXTRACT(DAY FROM ...) despite the column being
-- a full INTERVAL — this makes the actual supported granularity explicit.

ALTER TABLE sequence_steps ADD COLUMN delay_value INTEGER;
ALTER TABLE sequence_steps ADD COLUMN delay_unit TEXT CHECK (delay_unit IN ('minutes', 'hours', 'days'));

UPDATE sequence_steps
SET delay_value = EXTRACT(DAY FROM delay_interval)::int, delay_unit = 'days'
WHERE trigger_type = 'time';

ALTER TABLE sequence_steps DROP COLUMN delay_interval;
