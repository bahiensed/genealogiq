-- "blood" was the implicit default for PARENT_OF and SIBLING relations;
-- we now represent regular blood relations with a NULL subtype. Clear any
-- existing rows so the app reads a single canonical form.
UPDATE "app_family_relations" SET "subtype" = NULL WHERE "subtype" = 'blood';
