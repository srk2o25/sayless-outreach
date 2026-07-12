-- Default sequence template (campaign_id NULL). Cloned onto each campaign at upload time
-- so editing the default never mutates an already-running batch.

INSERT INTO sequence_steps (campaign_id, step_order, name, action_type, trigger_type, delay_interval, event_condition, enabled) VALUES
    (NULL, 1, 'LI connection request', 'li_connect',     'time',  INTERVAL '0 days', NULL,          true),
    (NULL, 2, 'LI message',            'li_message',     'event', NULL,               'on_accept',   true),
    (NULL, 3, 'Email',                 'email',          'time',  INTERVAL '1 day',   NULL,          true),
    -- Base offset only — linkedin-worker applies its own randomized jitter on top at dispatch time.
    (NULL, 4, 'Profile visit',         'li_visit',       'time',  INTERVAL '1 day',   NULL,          true),
    (NULL, 5, 'Invite to page',        'li_invite',      'event', NULL,               'on_reply',    false),
    (NULL, 6, 'Follow-up email',       'email_followup', 'time',  INTERVAL '4 days',  NULL,          true);
