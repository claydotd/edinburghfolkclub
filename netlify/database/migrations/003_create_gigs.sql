CREATE TABLE gigs (
  id TEXT PRIMARY KEY,
  gig_date DATE NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  tickets TEXT NOT NULL DEFAULT '',
  tickets_available BOOLEAN NOT NULL DEFAULT TRUE,
  website TEXT NOT NULL DEFAULT '',
  imagepath TEXT NOT NULL DEFAULT '',
  body_markdown TEXT NOT NULL DEFAULT '',
  venue TEXT NOT NULL DEFAULT '',
  doors TEXT NOT NULL DEFAULT '',
  music TEXT NOT NULL DEFAULT '',
  price_standard TEXT NOT NULL DEFAULT '',
  price_unwaged TEXT NOT NULL DEFAULT '',
  price_members TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX gigs_gig_date_idx ON gigs (gig_date);
