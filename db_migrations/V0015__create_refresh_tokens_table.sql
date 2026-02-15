CREATE TABLE IF NOT EXISTS "t_p41246523_jobsapp_mobile_proje".refresh_tokens (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    token_hash VARCHAR(64) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON "t_p41246523_jobsapp_mobile_proje".refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON "t_p41246523_jobsapp_mobile_proje".refresh_tokens(user_id);