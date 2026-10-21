CREATE TABLE gig_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  gig_id TEXT NOT NULL REFERENCES gigs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (member_id, gig_id)
);

CREATE INDEX gig_reservations_gig_id_idx ON gig_reservations (gig_id);
