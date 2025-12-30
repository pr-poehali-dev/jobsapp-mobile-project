ALTER TABLE "t_p41246523_jobsapp_mobile_proje".sessions 
ALTER COLUMN user_id TYPE uuid USING user_id::text::uuid;