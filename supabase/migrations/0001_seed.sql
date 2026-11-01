-- Reference data and safe defaults.
INSERT INTO "competitions" ("id", "name") VALUES
  ('primera', 'LALIGA EA SPORTS'),
  ('hypermotion', 'LALIGA HYPERMOTION')
ON CONFLICT ("id") DO NOTHING;--> statement-breakpoint
-- Kill switch for the unofficial LALIGA Fantasy provider (ADR 0003). Off until Phase 2B.
INSERT INTO "remote_config" ("key", "value") VALUES
  ('fantasy_provider_enabled', 'false'::jsonb)
ON CONFLICT ("key") DO NOTHING;
