-- events.step_id had no ON DELETE action, so deleting a campaign (which
-- cascades into sequence_steps) failed with a FK violation whenever any
-- event still referenced one of those steps — even though the same event
-- rows were also being removed via events.prospect_id's cascade in the same
-- statement. Campaign deletion needs to fully cascade without a partial
-- failure, so this FK gets the same ON DELETE CASCADE treatment.

ALTER TABLE events DROP CONSTRAINT events_step_id_fkey;
ALTER TABLE events ADD CONSTRAINT events_step_id_fkey
    FOREIGN KEY (step_id) REFERENCES sequence_steps(id) ON DELETE CASCADE;
