"""
Единый API для управления: пользователи, вакансии, модерация, статистика
Роуты: ?path=users, vacancies, moderate, stats, update-balance
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
        
        # Проверка: только пользователи с платным тарифом могут создавать вакансии (админы могут)
        if user['tier'] == 'FREE' and user['role'] != 'admin':
            return error_response(403, 'Требуется платный тариф для размещения вакансий')
        
        vacancy_id = f"vac_{body['user_id']}_{int(context.request_time_epoch)}"
        
        # Определяем статус: PREMIUM тариф и админы публикуют сразу, остальные на модерацию
        status = body.get('status', 'published' if (user['tier'] == 'PREMIUM' or user['role'] == 'admin') else 'pending')
        employer_tier = body.get('employer_tier', user['tier'])
        employer_name = body.get('employer_name', user['name'])
        
        cur.execute("""
            INSERT INTO vacancies (
                id, user_id, title, description, salary, city, phone,
                employer_name, employer_tier, tags, image, status, source
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
        """, (
            vacancy_id,
            body['user_id'],
            body['title'],
            body['description'],
            body['salary'],
            body['city'],
            body['phone'],
            employer_name,
            employer_tier,
            body.get('tags', []),
            body.get('image'),
            status,
            body.get('source', 'manual')
        ))
        
        conn.commit()
        vacancy = cur.fetchone()
        
        return {
            'statusCode': 201,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({
                'success': True,
                'vacancy': dict(vacancy)
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
        
        if body['status'] == 'published':
            update_fields.append('published_at = CURRENT_TIMESTAMP')
    
    if 'rejection_reason' in body:
        update_fields.append('rejection_reason = %s')
        params_list.append(body['rejection_reason'])
    
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
        # Проверяем существование вакансии
        cur.execute('SELECT id, title FROM vacancies WHERE id = %s', (vacancy_id,))
        vacancy = cur.fetchone()
        
        if not vacancy:
            return error_response(404, 'Vacancy not found')
        
        # Удаляем вакансию
        cur.execute('DELETE FROM vacancies WHERE id = %s', (vacancy_id,))
        conn.commit()
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({
                'success': True,
                'message': f'Вакансия "{vacancy["title"]}" успешно удалена'
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
    
    if not vacancy_id or action not in ['approve', 'reject']:
        return error_response(400, 'vacancy_id and action (approve/reject) required')
    
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        if action == 'approve':
            cur.execute("""
                UPDATE vacancies 
                SET status = 'published', published_at = CURRENT_TIMESTAMP
                WHERE id = %s
                RETURNING *
            """, (vacancy_id,))
        else:
            rejection_reason = body.get('rejection_reason', 'Не указана причина')
            cur.execute("""
                UPDATE vacancies 
                SET status = 'rejected', rejection_reason = %s
                WHERE id = %s
                RETURNING *
            """, (rejection_reason, vacancy_id))
        
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


def error_response(status_code: int, message: str) -> Dict[str, Any]:
    return {
        'statusCode': status_code,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'success': False, 'error': message}),
        'isBase64Encoded': False
    }