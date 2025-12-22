-- Добавляем поле rejection_reason в таблицу vacancies
ALTER TABLE vacancies ADD COLUMN IF NOT EXISTS rejection_reason TEXT DEFAULT NULL;

-- Добавляем комментарий к полю
COMMENT ON COLUMN vacancies.rejection_reason IS 'Причина отклонения вакансии (заполняется при модерации)';