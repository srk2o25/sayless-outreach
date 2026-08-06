-- Sample template categories with clearly-placeholder content — real Sayless
-- copy to replace this comes later. {{full_name}}/{{company}} are the same
-- placeholders daily-scheduler's fillTemplate() already substitutes.

INSERT INTO template_categories (name) VALUES
    ('Lettings & Property Management'),
    ('General / Other');

INSERT INTO templates (category_id, action_type, subject, body_template)
SELECT id, 'li_message', NULL,
    '<p>Hi {{full_name}}, thanks for connecting! [PLACEHOLDER — replace with real copy for {{company}} and the lettings/property sector.]</p>'
FROM template_categories WHERE name = 'Lettings & Property Management';

INSERT INTO templates (category_id, action_type, subject, body_template)
SELECT id, 'email', 'Quick question, {{full_name}} [PLACEHOLDER]',
    '<p>Hi {{full_name}},</p><p>[PLACEHOLDER — intro email for lettings/property management prospects at {{company}}.]</p>'
FROM template_categories WHERE name = 'Lettings & Property Management';

INSERT INTO templates (category_id, action_type, subject, body_template)
SELECT id, 'email_followup', 'Following up, {{full_name}} [PLACEHOLDER]',
    '<p>Hi {{full_name}},</p><p>[PLACEHOLDER — follow-up email for lettings/property management prospects at {{company}}.]</p>'
FROM template_categories WHERE name = 'Lettings & Property Management';

INSERT INTO templates (category_id, action_type, subject, body_template)
SELECT id, 'li_message', NULL,
    '<p>Hi {{full_name}}, thanks for connecting! [PLACEHOLDER — generic copy, replace per {{company}}.]</p>'
FROM template_categories WHERE name = 'General / Other';

INSERT INTO templates (category_id, action_type, subject, body_template)
SELECT id, 'email', 'Quick question, {{full_name}} [PLACEHOLDER]',
    '<p>Hi {{full_name}},</p><p>[PLACEHOLDER — generic intro email, replace per {{company}}.]</p>'
FROM template_categories WHERE name = 'General / Other';

INSERT INTO templates (category_id, action_type, subject, body_template)
SELECT id, 'email_followup', 'Following up, {{full_name}} [PLACEHOLDER]',
    '<p>Hi {{full_name}},</p><p>[PLACEHOLDER — generic follow-up email, replace per {{company}}.]</p>'
FROM template_categories WHERE name = 'General / Other';
