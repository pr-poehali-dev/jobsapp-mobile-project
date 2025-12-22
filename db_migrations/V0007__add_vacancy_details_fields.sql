-- Добавление новых полей в таблицу вакансий для детальной информации
ALTER TABLE vacancies 
ADD COLUMN IF NOT EXISTS requirements TEXT,
ADD COLUMN IF NOT EXISTS responsibilities TEXT,
ADD COLUMN IF NOT EXISTS experience TEXT,
ADD COLUMN IF NOT EXISTS schedule TEXT;

-- Создаем индекс для поиска по графику работы
CREATE INDEX IF NOT EXISTS idx_vacancies_schedule ON vacancies(schedule);