"""
Единый API для управления: пользователи, вакансии, модерация, статистика, промо-коды
Роуты: ?path=users, vacancies, moderate, stats, update-balance, promo-codes, activate-promo
"""
import json
import os
from typing import Dict, Any
import psycopg2
from psycopg2.extras import RealDictCursor

DATABASE_URL = os.environ['DATABASE_URL']

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method: str = event.get('httpMethod', 'GET')
    params = event.get('queryStringParameters', {}) or {}
    path = params.get('path', 'stats')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Token, X-User-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    conn = psycopg2.connect(DATABASE_URL)
    
    try:
        if path == 'users':
            if method == 'GET':
                return get_user(params, conn)
            elif method == 'PUT':
                return update_user(event, conn, context)
            elif method == 'DELETE':
                return delete_user(event, conn)
        elif path == 'vacancies':
            if method == 'GET':
                return get_vacancies(params, conn)
            elif method == 'POST':
                return create_vacancy(event, conn, context)
            elif method == 'PUT':
                return update_vacancy(event, conn)
            elif method == 'DELETE':
                return delete_vacancy(event, conn)
        elif path == 'moderate':
            return moderate_vacancy(event, conn)
        elif path == 'stats':
            return get_stats(conn)
        elif path == 'update-balance':
            return update_user_balance(event, conn, context)
        elif path == 'promo-codes':
            if method == 'GET':
                return get_promo_codes(conn)
            elif method == 'POST':
                return create_promo_code(event, conn)
            elif method == 'DELETE':
                return delete_promo_code(event, conn)
        elif path == 'activate-promo':
            return activate_promo_code(event, conn)
        elif path == 'reset-promo-activations':
            return reset_promo_activations(event, conn)
        else:
            return error_response(404, 'Path not found')
    finally:
        conn.close()


def get_user(params: Dict, conn) -> Dict[str, Any]:
    user_id = params.get('user_id')
    limit = int(params.get('limit', 100))
    
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        # Если указан user_id - возвращаем конкретного пользователя
        if user_id:
            cur.execute("""
                SELECT id, name, email, phone, role, balance, tier, 
                       vacancies_this_month, email_verified, phone_verified,
                       created_at, updated_at
                FROM users 
                WHERE id = %s
            """, (user_id,))
            
            user = cur.fetchone()
            
            if not user:
                return error_response(404, 'User not found')
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({
                    'success': True,
                    'user': dict(user)
                }, default=str),
                'isBase64Encoded': False
            }
        
        # Иначе возвращаем список всех пользователей
        cur.execute("""
            SELECT id, name, email, phone, role, balance, tier, 
                   vacancies_this_month, created_at
            FROM users 
            ORDER BY created_at DESC
            LIMIT %s
        """, (limit,))
        
        users = cur.fetchall()
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({
                'success': True,
                'users': [dict(u) for u in users]
            }, default=str),
            'isBase64Encoded': False
        }


def update_user(event: Dict[str, Any], conn, context: Any) -> Dict[str, Any]:
    body_str = event.get('body', '{}') or '{}'
    body = json.loads(body_str)
    user_id = body.get('user_id')
    
    if not user_id:
        return error_response(400, 'user_id required')
    
    update_fields = []
    params_list = []
    
    if 'balance' in body:
        update_fields.append('balance = %s')
        params_list.append(body['balance'])
    
    if 'tier' in body:
        if body['tier'] not in ['FREE', 'ECONOM', 'VIP', 'PREMIUM']:
            return error_response(400, 'Invalid tier')
        update_fields.append('tier = %s')
        params_list.append(body['tier'])
    
    if 'vacancies_this_month' in body:
        update_fields.append('vacancies_this_month = %s')
        params_list.append(body['vacancies_this_month'])
    
    if not update_fields:
        return error_response(400, 'No fields to update')
    
    params_list.append(user_id)
    
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        query = f"UPDATE users SET {', '.join(update_fields)} WHERE id = %s RETURNING *"
        cur.execute(query, params_list)
        conn.commit()
        
        user = cur.fetchone()
        
        if not user:
            return error_response(404, 'User not found')
        
        if body.get('add_transaction'):
            transaction_id = f"txn_{user_id}_{int(context.request_time_epoch)}"
            cur.execute("""
                INSERT INTO transactions (id, user_id, amount, type, description)
                VALUES (%s, %s, %s, %s, %s)
            """, (
                transaction_id,
                user_id,
                body.get('transaction_amount', 0),
                body.get('transaction_type', 'deposit'),
                body.get('transaction_description', 'Balance update')
            ))
            conn.commit()
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({
                'success': True,
                'user': dict(user)
            }, default=str),
            'isBase64Encoded': False
        }


def delete_user(event: Dict[str, Any], conn) -> Dict[str, Any]:
    """Удаляет пользователя и все его данные"""
    body_str = event.get('body', '{}') or '{}'
    body = json.loads(body_str)
    user_id = body.get('user_id')
    
    if not user_id:
        return error_response(400, 'user_id required')
    
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        # Проверяем существование пользователя
        cur.execute('SELECT id, name FROM users WHERE id = %s', (user_id,))
        user = cur.fetchone()
        
        if not user:
            return error_response(404, 'User not found')
        
        # Удаляем данные пользователя (каскадное удаление через ON DELETE CASCADE)
        # Порядок важен из-за внешних ключей
        
        # 1. Удаляем коды верификации
        cur.execute('DELETE FROM verification_codes WHERE user_id = %s', (user_id,))
        
        # 2. Удаляем транзакции
        cur.execute('DELETE FROM transactions WHERE user_id = %s', (user_id,))
        
        # 3. Удаляем вакансии
        cur.execute('DELETE FROM vacancies WHERE user_id = %s', (user_id,))
        
        # 4. Удаляем самого пользователя
        cur.execute('DELETE FROM users WHERE id = %s', (user_id,))
        
        conn.commit()
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({
                'success': True,
                'message': f'Пользователь {user["name"]} успешно удален'
            }),
            'isBase64Encoded': False
        }


def get_vacancies(params: Dict, conn) -> Dict[str, Any]:
    try:
        status = params.get('status', 'published')
        user_id = params.get('user_id')
        limit = int(params.get('limit', '100'))
        
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            if user_id:
                cur.execute("""
                    SELECT * FROM vacancies 
                    WHERE user_id = %s
                    ORDER BY created_at DESC
                    LIMIT %s
                """, (user_id, limit))
            else:
                cur.execute("""
                    SELECT * FROM vacancies 
                    WHERE status = %s
                    ORDER BY 
                        CASE employer_tier
                            WHEN 'PREMIUM' THEN 1
                            WHEN 'VIP' THEN 2
                            WHEN 'ECONOM' THEN 3
                            WHEN 'FREE' THEN 4
                        END,
                        created_at DESC
                    LIMIT %s
                """, (status, limit))
            
            vacancies = cur.fetchall()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({
                    'success': True,
                    'vacancies': [dict(v) for v in vacancies]
                }, default=str),
                'isBase64Encoded': False
            }
    except Exception as e:
        print(f'Error in get_vacancies: {e}')
        return error_response(500, f'Database error: {str(e)}')


def create_vacancy(event: Dict[str, Any], conn, context: Any) -> Dict[str, Any]:
    body_str = event.get('body', '{}') or '{}'
    body = json.loads(body_str)
    
    required_fields = ['user_id', 'title', 'description', 'salary', 'city', 'phone']
    for field in required_fields:
        if not body.get(field):
            return error_response(400, f'{field} is required')
    
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute('SELECT * FROM users WHERE id = %s', (body['user_id'],))
        user = cur.fetchone()
        
        if not user:
            return error_response(404, 'User not found')
        
        # Проверка лимита вакансий по тарифу (админы не ограничены)
        if user['role'] != 'admin':
            tier_limits = {
                'FREE': 0,
                'ECONOM': 5,
                'VIP': 30,
                'PREMIUM': 150
            }
            limit = tier_limits.get(user['tier'], 0)
            
            if user['vacancies_this_month'] >= limit:
                return error_response(403, f'Лимит вакансий исчерпан ({limit} в месяц для тарифа {user["tier"]}). Приобретите тариф для размещения вакансий.')
        
        # Генерируем UUID для вакансии
        import uuid
        vacancy_id = str(uuid.uuid4())
        
        # Определяем статус: PREMIUM тариф и админы публикуют сразу, остальные на модерацию
        status = body.get('status', 'published' if (user['tier'] == 'PREMIUM' or user['role'] == 'admin') else 'pending')
        employer_tier = body.get('employer_tier', user['tier'])
        employer_name = body.get('employer_name', user['name'])
        
        cur.execute("""
            INSERT INTO vacancies (
                id, user_id, title, description, requirements, responsibilities, 
                experience, schedule, salary, city, phone,
                employer_name, employer_tier, tags, status, source
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
        """, (
            vacancy_id,
            body['user_id'],
            body['title'],
            body['description'],
            body.get('requirements', ''),
            body.get('responsibilities', ''),
            body.get('experience', ''),
            body.get('schedule', ''),
            body['salary'],
            body['city'],
            body['phone'],
            employer_name,
            employer_tier,
            body.get('tags', []),
            status,
            body.get('source', 'manual')
        ))
        
        vacancy = cur.fetchone()
        
        # Увеличиваем счетчик вакансий пользователя (для не-админов)
        if user['role'] != 'admin':
            cur.execute("""
                UPDATE users 
                SET vacancies_this_month = vacancies_this_month + 1
                WHERE id = %s
                RETURNING vacancies_this_month
            """, (body['user_id'],))
            updated_count = cur.fetchone()['vacancies_this_month']
        else:
            updated_count = user['vacancies_this_month']
        
        conn.commit()
        
        return {
            'statusCode': 201,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({
                'success': True,
                'vacancy': dict(vacancy),
                'vacancies_this_month': updated_count
            }, default=str),
            'isBase64Encoded': False
        }


def update_vacancy(event: Dict[str, Any], conn) -> Dict[str, Any]:
    body_str = event.get('body', '{}') or '{}'
    body = json.loads(body_str)
    vacancy_id = body.get('vacancy_id')
    
    if not vacancy_id:
        return error_response(400, 'vacancy_id required')
    
    update_fields = []
    params_list = []
    
    if 'status' in body:
        if body['status'] not in ['pending', 'published', 'rejected']:
            return error_response(400, 'Invalid status')
        update_fields.append('status = %s')
        params_list.append(body['status'])
    

    
    if not update_fields:
        return error_response(400, 'No fields to update')
    
    params_list.append(vacancy_id)
    
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        query = f"UPDATE vacancies SET {', '.join(update_fields)} WHERE id = %s RETURNING *"
        cur.execute(query, params_list)
        conn.commit()
        
        vacancy = cur.fetchone()
        
        if not vacancy:
            return error_response(404, 'Vacancy not found')
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({
                'success': True,
                'vacancy': dict(vacancy)
            }, default=str),
            'isBase64Encoded': False
        }


def delete_vacancy(event: Dict[str, Any], conn) -> Dict[str, Any]:
    """Удаляет вакансию по ID"""
    body_str = event.get('body', '{}') or '{}'
    body = json.loads(body_str)
    vacancy_id = body.get('vacancy_id')
    
    if not vacancy_id:
        return error_response(400, 'vacancy_id required')
    
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        # Проверяем существование вакансии и получаем user_id
        cur.execute('SELECT id, title, user_id FROM vacancies WHERE id = %s', (vacancy_id,))
        vacancy = cur.fetchone()
        
        if not vacancy:
            return error_response(404, 'Vacancy not found')
        
        # Получаем информацию о пользователе
        cur.execute('SELECT role, vacancies_this_month FROM users WHERE id = %s', (vacancy['user_id'],))
        user = cur.fetchone()
        
        # Удаляем вакансию
        cur.execute('DELETE FROM vacancies WHERE id = %s', (vacancy_id,))
        
        # Уменьшаем счетчик вакансий (только для не-админов и если счетчик > 0)
        vacancies_count = user['vacancies_this_month'] if user else 0
        if user and user['role'] != 'admin' and user['vacancies_this_month'] > 0:
            cur.execute("""
                UPDATE users 
                SET vacancies_this_month = vacancies_this_month - 1
                WHERE id = %s
                RETURNING vacancies_this_month
            """, (vacancy['user_id'],))
            vacancies_count = cur.fetchone()['vacancies_this_month']
        
        conn.commit()
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({
                'success': True,
                'message': f'Вакансия "{vacancy["title"]}" успешно удалена',
                'vacancies_this_month': vacancies_count
            }),
            'isBase64Encoded': False
        }


def get_stats(conn) -> Dict[str, Any]:
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("""
            SELECT 
                COUNT(*) FILTER (WHERE role = 'seeker') as total_seekers,
                COUNT(*) FILTER (WHERE role = 'employer') as total_employers,
                COUNT(*) FILTER (WHERE role = 'admin') as total_admins,
                COALESCE(SUM(balance), 0) as total_balance
            FROM users
        """)
        user_stats = cur.fetchone()
        
        cur.execute("""
            SELECT 
                COUNT(*) FILTER (WHERE status = 'pending') as pending,
                COUNT(*) FILTER (WHERE status = 'published') as published,
                COUNT(*) FILTER (WHERE status = 'rejected') as rejected,
                COUNT(*) as total
            FROM vacancies
        """)
        vacancy_stats = cur.fetchone()
        
        cur.execute("""
            SELECT 
                COUNT(*) as total_transactions,
                COALESCE(SUM(amount), 0) as total_amount
            FROM transactions
            WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
        """)
        transaction_stats = cur.fetchone()
        
        cur.execute("""
            SELECT 
                tier,
                COUNT(*) as count
            FROM users
            WHERE role = 'employer'
            GROUP BY tier
        """)
        tier_distribution = cur.fetchall()
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({
                'success': True,
                'stats': {
                    'users': dict(user_stats) if user_stats else {},
                    'vacancies': dict(vacancy_stats) if vacancy_stats else {},
                    'transactions': dict(transaction_stats) if transaction_stats else {},
                    'tier_distribution': [dict(t) for t in tier_distribution]
                }
            }, default=str),
            'isBase64Encoded': False
        }


def moderate_vacancy(event: Dict[str, Any], conn) -> Dict[str, Any]:
    if event.get('httpMethod') != 'POST':
        return error_response(405, 'Method not allowed')
    
    body_str = event.get('body', '{}') or '{}'
    body = json.loads(body_str)
    vacancy_id = body.get('vacancy_id')
    action = body.get('action')
    rejection_reason = body.get('rejection_reason', '')
    
    if not vacancy_id or action not in ['approve', 'reject']:
        return error_response(400, 'vacancy_id and action (approve/reject) required')
    
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        if action == 'approve':
            cur.execute("""
                UPDATE vacancies 
                SET status = 'published', rejection_reason = NULL
                WHERE id = %s
                RETURNING *
            """, (vacancy_id,))
        else:
            # При отклонении сохраняем причину
            cur.execute("""
                UPDATE vacancies 
                SET status = 'rejected', rejection_reason = %s
                WHERE id = %s
                RETURNING *
            """, (rejection_reason or 'Не указана', vacancy_id))
        
        conn.commit()
        vacancy = cur.fetchone()
        
        if not vacancy:
            return error_response(404, 'Vacancy not found')
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({
                'success': True,
                'vacancy': dict(vacancy),
                'message': f"Вакансия {'одобрена' if action == 'approve' else 'отклонена'}"
            }, default=str),
            'isBase64Encoded': False
        }


def update_user_balance(event: Dict[str, Any], conn, context: Any) -> Dict[str, Any]:
    if event.get('httpMethod') != 'POST':
        return error_response(405, 'Method not allowed')
    
    body_str = event.get('body', '{}') or '{}'
    body = json.loads(body_str)
    user_id = body.get('user_id')
    amount = body.get('amount')
    description = body.get('description', 'Изменение баланса администратором')
    
    if not user_id or amount is None:
        return error_response(400, 'user_id and amount required')
    
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("""
            UPDATE users 
            SET balance = balance + %s
            WHERE id = %s
            RETURNING *
        """, (amount, user_id))
        
        user = cur.fetchone()
        
        if not user:
            return error_response(404, 'User not found')
        
        transaction_id = f"txn_admin_{user_id}_{int(context.request_time_epoch)}"
        cur.execute("""
            INSERT INTO transactions (id, user_id, amount, type, description)
            VALUES (%s, %s, %s, %s, %s)
        """, (transaction_id, user_id, amount, 'deposit' if amount > 0 else 'withdrawal', description))
        
        conn.commit()
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({
                'success': True,
                'user': dict(user),
                'message': f"Баланс изменен на {amount} ₽"
            }, default=str),
            'isBase64Encoded': False
        }


def get_promo_codes(conn) -> Dict[str, Any]:
    """Список всех промо-кодов"""
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("""
            SELECT * FROM promo_codes 
            ORDER BY created_at DESC
        """)
        codes = cur.fetchall()
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({
                'success': True,
                'promo_codes': [dict(c) for c in codes]
            }, default=str),
            'isBase64Encoded': False
        }


def create_promo_code(event: Dict[str, Any], conn) -> Dict[str, Any]:
    """Создание промо-кода администратором"""
    body = json.loads(event.get('body', '{}') or '{}')
    code = (body.get('code') or '').strip().upper()
    bonus_balance = float(body.get('bonus_balance', 0))
    bonus_vacancies = int(body.get('bonus_vacancies', 0))
    max_activations = int(body.get('max_activations', 1))
    expires_at = body.get('expires_at')

    if not code:
        return error_response(400, 'Код не указан')
    if bonus_balance <= 0 and bonus_vacancies <= 0:
        return error_response(400, 'Укажите бонус баланса или вакансий')

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("SELECT id FROM promo_codes WHERE code = %s", (code,))
        if cur.fetchone():
            return error_response(400, 'Промо-код с таким именем уже существует')

        cur.execute("""
            INSERT INTO promo_codes (code, bonus_balance, bonus_vacancies, max_activations, expires_at)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING *
        """, (code, bonus_balance, bonus_vacancies, max_activations, expires_at))
        conn.commit()
        promo = cur.fetchone()

        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({
                'success': True,
                'promo_code': dict(promo)
            }, default=str),
            'isBase64Encoded': False
        }


def delete_promo_code(event: Dict[str, Any], conn) -> Dict[str, Any]:
    """Удаление / деактивация промо-кода"""
    body = json.loads(event.get('body', '{}') or '{}')
    promo_id = body.get('id')
    if not promo_id:
        return error_response(400, 'id required')

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("""
            UPDATE promo_codes SET is_active = false WHERE id = %s RETURNING *
        """, (promo_id,))
        conn.commit()
        promo = cur.fetchone()
        if not promo:
            return error_response(404, 'Промо-код не найден')

        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'success': True, 'message': 'Промо-код деактивирован'}, default=str),
            'isBase64Encoded': False
        }


def activate_promo_code(event: Dict[str, Any], conn) -> Dict[str, Any]:
    """Активация промо-кода пользователем"""
    if event.get('httpMethod') != 'POST':
        return error_response(405, 'Method not allowed')

    body = json.loads(event.get('body', '{}') or '{}')
    code = (body.get('code') or '').strip().upper()
    user_id = body.get('user_id')

    if not code or not user_id:
        return error_response(400, 'code и user_id обязательны')

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("SELECT * FROM promo_codes WHERE code = %s", (code,))
        promo = cur.fetchone()

        if not promo:
            return error_response(404, 'Промо-код не найден')
        if not promo['is_active']:
            return error_response(400, 'Промо-код неактивен')
        if promo['current_activations'] >= promo['max_activations']:
            return error_response(400, 'Промо-код исчерпан')

        from datetime import datetime
        if promo['expires_at'] and promo['expires_at'] < datetime.now():
            return error_response(400, 'Срок действия промо-кода истёк')

        cur.execute(
            "SELECT id FROM promo_activations WHERE promo_code_id = %s AND user_id = %s",
            (promo['id'], user_id)
        )
        if cur.fetchone():
            return error_response(400, 'Вы уже активировали этот промо-код')

        bonus_balance = float(promo['bonus_balance'])
        bonus_vacancies = int(promo['bonus_vacancies'])

        if bonus_balance > 0:
            cur.execute(
                "UPDATE users SET balance = balance + %s WHERE id = %s",
                (bonus_balance, user_id)
            )

        if bonus_vacancies > 0:
            cur.execute(
                "UPDATE users SET vacancies_this_month = vacancies_this_month + %s WHERE id = %s",
                (bonus_vacancies, user_id)
            )

        cur.execute(
            "UPDATE promo_codes SET current_activations = current_activations + 1 WHERE id = %s",
            (promo['id'],)
        )

        cur.execute(
            "INSERT INTO promo_activations (promo_code_id, user_id) VALUES (%s, %s)",
            (promo['id'], user_id)
        )

        if bonus_balance > 0:
            cur.execute("""
                INSERT INTO transactions (user_id, amount, type, status, description)
                VALUES (%s, %s, 'deposit', 'completed', %s)
            """, (
                user_id,
                bonus_balance,
                f"Промо-код {code}"
            ))

        conn.commit()

        cur.execute("SELECT balance, vacancies_this_month FROM users WHERE id = %s", (user_id,))
        user = cur.fetchone()

        bonuses = []
        if bonus_balance > 0:
            bonuses.append(f"+{int(bonus_balance)} ₽ на баланс")
        if bonus_vacancies > 0:
            bonuses.append(f"+{bonus_vacancies} вакансий")

        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({
                'success': True,
                'message': f"Промо-код активирован: {', '.join(bonuses)}",
                'bonus_balance': bonus_balance,
                'bonus_vacancies': bonus_vacancies,
                'new_balance': float(user['balance']) if user else 0,
                'new_vacancies': int(user['vacancies_this_month']) if user else 0
            }, default=str),
            'isBase64Encoded': False
        }


def reset_promo_activations(event: dict, conn) -> Dict[str, Any]:
    """Сброс всех активаций промо-кодов"""
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("DELETE FROM promo_activations")
        cur.execute("UPDATE promo_codes SET current_activations = 0, is_active = true")
        conn.commit()
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'success': True, 'message': 'Все активации сброшены'}),
        'isBase64Encoded': False
    }


def error_response(status_code: int, message: str) -> Dict[str, Any]:
    return {
        'statusCode': status_code,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'success': False, 'error': message}),
        'isBase64Encoded': False
    }