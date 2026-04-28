ALTER TABLE ride_shares
ADD COLUMN IF NOT EXISTS return_ride_share_id uuid REFERENCES ride_shares(id);
