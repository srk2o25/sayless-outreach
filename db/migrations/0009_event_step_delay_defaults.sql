-- admin-ui now lets every step — event-triggered included — carry an editable
-- Time value: an event step waits delay_value/delay_unit after its
-- qualifying event before daily-scheduler considers it due, same as a time
-- step waits after the previous step. Existing event-trigger rows predate
-- this and still have NULL delay_value/delay_unit; backfill them to a
-- neutral "fire immediately on event" default so they behave exactly as
-- before until someone edits the value in admin-ui.

UPDATE sequence_steps
SET delay_value = 0, delay_unit = 'minutes'
WHERE trigger_type = 'event' AND delay_value IS NULL;
