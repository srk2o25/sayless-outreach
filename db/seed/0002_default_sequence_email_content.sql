-- Fills in subject/body_template for the default template's two email steps.
-- An UPDATE rather than an INSERT, but idempotent-safe the same way the rest
-- of seed/ is — running it twice just sets the same values again.

UPDATE sequence_steps
SET subject = 'Quick question, {{full_name}}',
    body_template = '<p>Hi {{full_name}},</p><p>Saw your work at {{company}} and wanted to reach out directly — worth a quick chat?</p>'
WHERE campaign_id IS NULL AND action_type = 'email';

UPDATE sequence_steps
SET subject = 'Following up, {{full_name}}',
    body_template = '<p>Hi {{full_name}},</p><p>Circling back on my last note — still worth a quick chat about {{company}}?</p>'
WHERE campaign_id IS NULL AND action_type = 'email_followup';
