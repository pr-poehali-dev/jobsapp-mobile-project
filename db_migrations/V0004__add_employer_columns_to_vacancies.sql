-- Добавление недостающих колонок в таблицу vacancies
ALTER TABLE vacancies 
ADD COLUMN IF NOT EXISTS employer_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS employer_tier VARCHAR(20) DEFAULT 'ECONOM' CHECK (employer_tier IN ('ECONOM', 'VIP', 'PREMIUM'));