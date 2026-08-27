ALTER TABLE supplements ADD COLUMN ingredient_form TEXT NOT NULL DEFAULT '';

ALTER TABLE supplements ADD COLUMN interaction_notes TEXT NOT NULL DEFAULT '';

ALTER TABLE supplements
ADD COLUMN contraindication_notes TEXT NOT NULL DEFAULT '';

ALTER TABLE supplements ADD COLUMN clinician_review TEXT NOT NULL DEFAULT '';
