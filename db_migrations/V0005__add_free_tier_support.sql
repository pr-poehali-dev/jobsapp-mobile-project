-- Обновление CHECK constraint для поддержки FREE тарифа
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_tier_check;
ALTER TABLE users ADD CONSTRAINT users_tier_check CHECK (tier IN ('FREE', 'ECONOM', 'VIP', 'PREMIUM'));

ALTER TABLE vacancies DROP CONSTRAINT IF EXISTS vacancies_employer_tier_check;
ALTER TABLE vacancies ADD CONSTRAINT vacancies_employer_tier_check CHECK (employer_tier IN ('FREE', 'ECONOM', 'VIP', 'PREMIUM'));