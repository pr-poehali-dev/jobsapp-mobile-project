ALTER TABLE "t_p41246523_jobsapp_mobile_proje".users ADD COLUMN IF NOT EXISTS vk_id VARCHAR(50);
ALTER TABLE "t_p41246523_jobsapp_mobile_proje".users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE "t_p41246523_jobsapp_mobile_proje".users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP;
CREATE INDEX IF NOT EXISTS idx_users_vk_id ON "t_p41246523_jobsapp_mobile_proje".users(vk_id);