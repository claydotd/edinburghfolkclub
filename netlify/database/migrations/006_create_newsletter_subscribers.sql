CREATE TABLE newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  consented_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unsubscribed_at TIMESTAMPTZ,
  source TEXT NOT NULL DEFAULT 'signup',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX newsletter_subscribers_email_idx ON newsletter_subscribers (email);
CREATE INDEX newsletter_subscribers_active_idx ON newsletter_subscribers (unsubscribed_at)
  WHERE unsubscribed_at IS NULL;
