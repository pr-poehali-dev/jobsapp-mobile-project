-- Добавляем поле role в таблицу users
ALTER TABLE "t_p41246523_jobsapp_mobile_proje".users 
ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'seeker' CHECK (role IN ('seeker', 'employer'));