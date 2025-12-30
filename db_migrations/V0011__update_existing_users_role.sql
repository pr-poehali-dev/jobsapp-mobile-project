-- Обновляем существующую таблицу users для OTP-авторизации
-- Убираем constraint если есть
ALTER TABLE "t_p41246523_jobsapp_mobile_proje".users 
DROP CONSTRAINT IF EXISTS users_role_check;

-- Устанавливаем default для role
ALTER TABLE "t_p41246523_jobsapp_mobile_proje".users 
ALTER COLUMN role SET DEFAULT 'seeker';

-- Обновляем NULL значения
UPDATE "t_p41246523_jobsapp_mobile_proje".users 
SET role = 'seeker' 
WHERE role IS NULL OR role NOT IN ('seeker', 'employer');

-- Добавляем constraint
ALTER TABLE "t_p41246523_jobsapp_mobile_proje".users 
ADD CONSTRAINT users_role_check CHECK (role IN ('seeker', 'employer'));