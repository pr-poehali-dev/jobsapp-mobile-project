# API Документация для управления Jobs-App

**Base URL**: `https://functions.poehali.dev/0d65638b-a8d6-40af-971b-31d0f9e356d0`

## 📊 Статистика (GET ?path=stats)

Получить общую статистику по платформе.

```bash
curl "https://functions.poehali.dev/0d65638b-a8d6-40af-971b-31d0f9e356d0?path=stats"
```

**Ответ:**
```json
{
  "success": true,
  "stats": {
    "users": {
      "total_seekers": 10,
      "total_employers": 5,
      "total_admins": 1,
      "total_balance": 15000
    },
    "vacancies": {
      "pending": 3,
      "published": 20,
      "rejected": 2,
      "total": 25
    },
    "transactions": {
      "total_transactions": 50,
      "total_amount": 25000
    },
    "tier_distribution": [
      {"tier": "FREE", "count": 3},
      {"tier": "ECONOM", "count": 1},
      {"tier": "VIP", "count": 1}
    ]
  }
}
```

---

## 👤 Управление пользователями

### Получить данные пользователя (GET ?path=users&user_id=...)

```bash
curl "https://functions.poehali.dev/0d65638b-a8d6-40af-971b-31d0f9e356d0?path=users&user_id=USER_ID"
```

**Ответ:**
```json
{
  "success": true,
  "user": {
    "id": "user_123",
    "name": "Иван Иванов",
    "email": "ivan@example.com",
    "phone": "+79991234567",
    "role": "employer",
    "balance": 1000,
    "tier": "VIP",
    "vacancies_this_month": 5,
    "email_verified": true,
    "phone_verified": true,
    "created_at": "2025-01-15T10:00:00",
    "updated_at": "2025-01-20T14:30:00"
  }
}
```

### Обновить пользователя (PUT ?path=users)

Изменить баланс, тариф или количество вакансий пользователя.

```bash
curl -X PUT "https://functions.poehali.dev/0d65638b-a8d6-40af-971b-31d0f9e356d0?path=users" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user_123",
    "balance": 5000,
    "tier": "PREMIUM",
    "vacancies_this_month": 0,
    "add_transaction": true,
    "transaction_amount": 3000,
    "transaction_type": "deposit",
    "transaction_description": "Пополнение баланса администратором"
  }'
```

**Параметры:**
- `user_id` (обязательно) - ID пользователя
- `balance` - новый баланс
- `tier` - новый тариф (FREE, ECONOM, VIP, PREMIUM)
- `vacancies_this_month` - количество вакансий в месяце
- `add_transaction` - создать запись в транзакциях (true/false)

---

## 📋 Управление вакансиями

### Получить список вакансий (GET ?path=vacancies)

```bash
# Все опубликованные вакансии
curl "https://functions.poehali.dev/0d65638b-a8d6-40af-971b-31d0f9e356d0?path=vacancies&status=published&limit=50"

# Вакансии на модерации
curl "https://functions.poehali.dev/0d65638b-a8d6-40af-971b-31d0f9e356d0?path=vacancies&status=pending"

# Вакансии конкретного пользователя
curl "https://functions.poehali.dev/0d65638b-a8d6-40af-971b-31d0f9e356d0?path=vacancies&user_id=user_123"
```

**Параметры:**
- `status` - статус вакансий (pending, published, rejected). По умолчанию: published
- `user_id` - ID пользователя (показать только его вакансии)
- `limit` - количество вакансий (по умолчанию: 100)

### Создать вакансию (POST ?path=vacancies)

```bash
curl -X POST "https://functions.poehali.dev/0d65638b-a8d6-40af-971b-31d0f9e356d0?path=vacancies" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user_123",
    "title": "Менеджер по продажам",
    "description": "Требуется активный менеджер...",
    "salary": "60000-80000",
    "city": "Москва",
    "phone": "+79991234567",
    "tags": ["С опытом", "Полная занятость"],
    "source": "manual"
  }'
```

### Обновить вакансию (PUT ?path=vacancies)

```bash
curl -X PUT "https://functions.poehali.dev/0d65638b-a8d6-40af-971b-31d0f9e356d0?path=vacancies" \
  -H "Content-Type: application/json" \
  -d '{
    "vacancy_id": "vac_123",
    "status": "published",
    "rejection_reason": "Не соответствует требованиям"
  }'
```

---

## ✅ Модерация вакансий (POST ?path=moderate)

### Одобрить вакансию

```bash
curl -X POST "https://functions.poehali.dev/0d65638b-a8d6-40af-971b-31d0f9e356d0?path=moderate" \
  -H "Content-Type: application/json" \
  -d '{
    "vacancy_id": "vac_123",
    "action": "approve"
  }'
```

### Отклонить вакансию

```bash
curl -X POST "https://functions.poehali.dev/0d65638b-a8d6-40af-971b-31d0f9e356d0?path=moderate" \
  -H "Content-Type: application/json" \
  -d '{
    "vacancy_id": "vac_123",
    "action": "reject",
    "rejection_reason": "Нарушение правил платформы"
  }'
```

---

## 💰 Изменить баланс пользователя (POST ?path=update-balance)

Быстрое изменение баланса с автоматическим созданием транзакции.

```bash
# Пополнить баланс
curl -X POST "https://functions.poehali.dev/0d65638b-a8d6-40af-971b-31d0f9e356d0?path=update-balance" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user_123",
    "amount": 1000,
    "description": "Бонус от администрации"
  }'

# Списать средства
curl -X POST "https://functions.poehali.dev/0d65638b-a8d6-40af-971b-31d0f9e356d0?path=update-balance" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user_123",
    "amount": -500,
    "description": "Штраф за нарушение"
  }'
```

---

## 🗄️ Структура базы данных

### Таблица `users`
- `id` - уникальный идентификатор
- `name` - имя пользователя
- `email` - email (уникальный)
- `phone` - телефон (уникальный)
- `password_hash` - хеш пароля
- `role` - роль (seeker, employer, admin)
- `balance` - баланс в рублях
- `tier` - тариф (FREE, ECONOM, VIP, PREMIUM)
- `vacancies_this_month` - количество размещенных вакансий в текущем месяце
- `email_verified` - подтвержден ли email
- `phone_verified` - подтвержден ли телефон

### Таблица `vacancies`
- `id` - уникальный идентификатор
- `user_id` - ID работодателя
- `title` - название вакансии
- `description` - описание
- `salary` - зарплата
- `city` - город
- `phone` - контактный телефон
- `employer_name` - имя работодателя
- `employer_tier` - тариф работодателя
- `tags` - массив тегов
- `status` - статус (pending, published, rejected)
- `source` - источник (manual, avito)
- `rejection_reason` - причина отклонения
- `published_at` - дата публикации

### Таблица `transactions`
- `id` - уникальный идентификатор
- `user_id` - ID пользователя
- `amount` - сумма (положительная или отрицательная)
- `type` - тип (deposit, withdrawal, tier_purchase, vacancy_purchase)
- `description` - описание операции
- `created_at` - дата создания

---

## 🔍 Примеры использования

### Сценарий 1: Модерация вакансии

1. Получить список вакансий на модерации:
```bash
curl "https://functions.poehali.dev/0d65638b-a8d6-40af-971b-31d0f9e356d0?path=vacancies&status=pending"
```

2. Одобрить вакансию:
```bash
curl -X POST "https://functions.poehali.dev/0d65638b-a8d6-40af-971b-31d0f9e356d0?path=moderate" \
  -H "Content-Type: application/json" \
  -d '{"vacancy_id": "vac_123", "action": "approve"}'
```

### Сценарий 2: Изменение баланса и тарифа пользователя

1. Проверить текущий баланс:
```bash
curl "https://functions.poehali.dev/0d65638b-a8d6-40af-971b-31d0f9e356d0?path=users&user_id=user_123"
```

2. Пополнить баланс и повысить тариф:
```bash
curl -X PUT "https://functions.poehali.dev/0d65638b-a8d6-40af-971b-31d0f9e356d0?path=users" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user_123",
    "balance": 5000,
    "tier": "VIP",
    "add_transaction": true,
    "transaction_amount": 500,
    "transaction_type": "tier_purchase",
    "transaction_description": "Покупка VIP тарифа"
  }'
```

### Сценарий 3: Просмотр статистики

```bash
# Общая статистика
curl "https://functions.poehali.dev/0d65638b-a8d6-40af-971b-31d0f9e356d0?path=stats"
```

---

## 🛠️ Для разработчиков

### Тестирование локально

Можно использовать Python для тестирования:

```python
import requests

BASE_URL = "https://functions.poehali.dev/0d65638b-a8d6-40af-971b-31d0f9e356d0"

# Получить статистику
response = requests.get(f"{BASE_URL}?path=stats")
print(response.json())

# Одобрить вакансию
response = requests.post(
    f"{BASE_URL}?path=moderate",
    json={"vacancy_id": "vac_123", "action": "approve"}
)
print(response.json())
```

### Или через JavaScript:

```javascript
const BASE_URL = "https://functions.poehali.dev/0d65638b-a8d6-40af-971b-31d0f9e356d0";

// Получить статистику
fetch(`${BASE_URL}?path=stats`)
  .then(res => res.json())
  .then(data => console.log(data));

// Одобрить вакансию
fetch(`${BASE_URL}?path=moderate`, {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    vacancy_id: 'vac_123',
    action: 'approve'
  })
})
  .then(res => res.json())
  .then(data => console.log(data));
```
