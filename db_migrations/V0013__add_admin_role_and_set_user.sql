ALTER TABLE "t_p41246523_jobsapp_mobile_proje".users DROP CONSTRAINT users_role_check;
ALTER TABLE "t_p41246523_jobsapp_mobile_proje".users ADD CONSTRAINT users_role_check CHECK (role IN ('seeker', 'employer', 'admin'));
UPDATE "t_p41246523_jobsapp_mobile_proje".users SET role = 'admin' WHERE id = '9f01509f-a097-46d9-aa28-7a28f172d053';