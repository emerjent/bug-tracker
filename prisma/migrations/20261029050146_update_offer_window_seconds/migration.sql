-- #647: Extend offer-accept window from 60 seconds to 10 minutes.
-- Update default and set existing project's workflow to 600 seconds.

ALTER TABLE "ProjectWorkflow"
  ALTER COLUMN "offerWindowSeconds" SET DEFAULT 600;

UPDATE "ProjectWorkflow"
  SET "offerWindowSeconds" = 600
  WHERE "offerWindowSeconds" <> 600;
