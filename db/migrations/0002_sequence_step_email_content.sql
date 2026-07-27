-- Email steps had nowhere to store what the email actually says. subject/body_template
-- only apply to action_type IN ('email', 'email_followup') — NULL for LI steps.
-- Placeholders like {{full_name}} are plain string substitution done by daily-scheduler
-- before handing content to email-send, not n8n expressions.

ALTER TABLE sequence_steps
    ADD COLUMN subject TEXT,
    ADD COLUMN body_template TEXT;
