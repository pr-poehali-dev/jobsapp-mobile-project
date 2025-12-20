-- Обновление роли для администратора
UPDATE t_p41246523_jobsapp_mobile_proje.users 
SET role = 'admin', tier = 'PREMIUM'
WHERE phone = '+79992255109' OR email = 'ad.alex1995@yandex.ru';
