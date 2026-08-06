-- daily-scheduler now polls hourly instead of once a day, so a 'minutes' delay
-- unit was false precision — a step waiting 10 minutes and one waiting 55
-- minutes both just sit until the same next hourly tick regardless. Round any
-- existing minute-based delays up to the nearest hour (0 stays 0 — "fire on
-- the next tick" — everything else becomes at least 1 hour) and drop
-- 'minutes' from the allowed delay_unit values.

UPDATE sequence_steps
SET delay_value = CEIL(delay_value::numeric / 60)::int,
    delay_unit = 'hours'
WHERE delay_unit = 'minutes';

ALTER TABLE sequence_steps DROP CONSTRAINT sequence_steps_delay_unit_check;
ALTER TABLE sequence_steps ADD CONSTRAINT sequence_steps_delay_unit_check
    CHECK (delay_unit IN ('hours', 'days'));
