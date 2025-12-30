-- Таблица пользователей в схеме проекта
CREATE TABLE IF NOT EXISTS "t_p41246523_jobsapp_mobile_proje".users (
    id SERIAL PRIMARY KEY,
    phone VARCHAR(20) UNIQUE,
    email VARCHAR(255) UNIQUE,
    full_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    is_verified BOOLEAN DEFAULT FALSE,
    CONSTRAINT check_contact CHECK (phone IS NOT NULL OR email IS NOT NULL)
);

-- Таблица OTP кодов
CREATE TABLE IF NOT EXISTS "t_p41246523_jobsapp_mobile_proje".otp_codes (
    id SERIAL PRIMARY KEY,
    contact VARCHAR(255) NOT NULL,
    contact_type VARCHAR(10) NOT NULL CHECK (contact_type IN ('phone', 'email')),
    code VARCHAR(6) NOT NULL,
    purpose VARCHAR(20) NOT NULL CHECK (purpose IN ('login', 'register', 'reset')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    attempts INTEGER DEFAULT 0
);

-- Таблица сессий
CREATE TABLE IF NOT EXISTS "t_p41246523_jobsapp_mobile_proje".sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    token VARCHAR(64) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_otp_contact ON "t_p41246523_jobsapp_mobile_proje".otp_codes(contact, code, is_used);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON "t_p41246523_jobsapp_mobile_proje".sessions(token, is_active);
CREATE INDEX IF NOT EXISTS idx_users_phone ON "t_p41246523_jobsapp_mobile_proje".users(phone);
CREATE INDEX IF NOT EXISTS idx_users_email ON "t_p41246523_jobsapp_mobile_proje".users(email);