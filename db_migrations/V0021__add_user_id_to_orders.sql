ALTER TABLE orders ADD COLUMN IF NOT EXISTS user_id VARCHAR(255);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);