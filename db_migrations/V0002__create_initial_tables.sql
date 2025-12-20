-- Создание таблицы пользователей
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    phone TEXT UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('seeker', 'employer', 'admin')),
    balance INTEGER DEFAULT 0,
    tier TEXT NOT NULL DEFAULT 'FREE' CHECK (tier IN ('FREE', 'ECONOM', 'VIP', 'PREMIUM')),
    vacancies_this_month INTEGER DEFAULT 0,
    email_verified BOOLEAN DEFAULT FALSE,
    phone_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Создание таблицы вакансий
CREATE TABLE IF NOT EXISTS vacancies (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    salary TEXT NOT NULL,
    city TEXT NOT NULL,
    phone TEXT NOT NULL,
    employer_name TEXT NOT NULL,
    employer_tier TEXT NOT NULL CHECK (employer_tier IN ('FREE', 'ECONOM', 'VIP', 'PREMIUM')),
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    image TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'published', 'rejected')),
    source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'avito')),
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    published_at TIMESTAMP
);

-- Создание таблицы транзакций
CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    amount INTEGER NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'tier_purchase', 'vacancy_purchase')),
    description TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Создание индексов для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_vacancies_user_id ON vacancies(user_id);
CREATE INDEX IF NOT EXISTS idx_vacancies_status ON vacancies(status);
CREATE INDEX IF NOT EXISTS idx_vacancies_created_at ON vacancies(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
