
CREATE TABLE promo_codes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    bonus_balance NUMERIC(10,2) NOT NULL DEFAULT 0,
    bonus_vacancies INTEGER NOT NULL DEFAULT 0,
    max_activations INTEGER NOT NULL DEFAULT 1,
    current_activations INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    expires_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE promo_activations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    promo_code_id uuid NOT NULL REFERENCES promo_codes(id),
    user_id uuid NOT NULL REFERENCES users(id),
    activated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(promo_code_id, user_id)
);

CREATE INDEX idx_promo_codes_code ON promo_codes(code);
CREATE INDEX idx_promo_activations_user ON promo_activations(user_id);
