import json
import os
import hashlib
import secrets
import re
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
import psycopg2
from psycopg2.extras import RealDictCursor
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import urllib.request
import urllib.parse


def get_db_connection():
    """Создает подключение к базе данных"""
    return psycopg2.connect(os.environ['DATABASE_URL'])


def hash_password(password: str) -> str:
    """Хеширует пароль с использованием SHA-256"""
    return hashlib.sha256(password.encode()).hexdigest()


def generate_code() -> str:
    """Генерирует 6-значный код верификации"""
    return ''.join([str(secrets.randbelow(10)) for _ in range(6)])


def send_sms(phone: str, code: str) -> bool:
    """
    Отправляет SMS через SMSC.ru
    Возвращает True если успешно, False если сервис недоступен
    """
    try:
        login = os.environ.get('SMSC_LOGIN')
        password = os.environ.get('SMSC_PASSWORD')
        
        if not login or not password:
            print('SMSC credentials not configured, skipping SMS')
            return False
        
        # Формируем сообщение
        message = f'Ваш код подтверждения: {code}'
        
        # Параметры запроса к SMSC API
        params = {
            'login': login,
            'psw': password,
            'phones': phone,
            'mes': message,
            'charset': 'utf-8'
        }
        
        url = 'https://smsc.ru/sys/send.php?' + urllib.parse.urlencode(params)
        response = urllib.request.urlopen(url, timeout=10)
        result = response.read().decode('utf-8')
        
        return 'ERROR' not in result
    except Exception as e:
        print(f'SMS sending failed: {e}')
        return False


def send_email(email: str, code: str, purpose: str = 'verification') -> bool:
    """
    Отправляет email с кодом верификации
    Возвращает True если успешно, False если сервис недоступен
    """
    try:
        smtp_host = os.environ.get('SMTP_HOST')
        smtp_port = int(os.environ.get('SMTP_PORT', '465'))
        smtp_email = os.environ.get('SMTP_EMAIL')
        smtp_password = os.environ.get('SMTP_PASSWORD')
        
        if not all([smtp_host, smtp_email, smtp_password]):
            print('SMTP credentials not configured, skipping email')
            return False
        
        # Формируем письмо
        msg = MIMEMultipart('alternative')
        msg['Subject'] = 'Код подтверждения Jobs-App' if purpose == 'verification' else 'Восстановление пароля Jobs-App'
        msg['From'] = smtp_email
        msg['To'] = email
        
        text = f'Ваш код подтверждения: {code}\n\nКод действителен в течение 10 минут.'
        html = f"""
        <html>
            <body style="font-family: Arial, sans-serif;">
                <h2>Jobs-App</h2>
                <p>Ваш код подтверждения:</p>
                <h1 style="color: #0099dd; letter-spacing: 5px;">{code}</h1>
                <p style="color: #666;">Код действителен в течение 10 минут.</p>
            </body>
        </html>
        """
        
        part1 = MIMEText(text, 'plain')
        part2 = MIMEText(html, 'html')
        msg.attach(part1)
        msg.attach(part2)
        
        # Отправляем письмо
        with smtplib.SMTP_SSL(smtp_host, smtp_port) as server:
            server.login(smtp_email, smtp_password)
            server.send_message(msg)
        
        return True
    except Exception as e:
        print(f'Email sending failed: {e}')
        return False


def validate_email(email: str) -> bool:
    """Проверяет валидность email"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))


def validate_phone(phone: str) -> bool:
    """Проверяет валидность номера телефона (российский формат)"""
    pattern = r'^\+?[78]?9\d{9}$'
    return bool(re.match(pattern, phone.replace(' ', '').replace('-', '').replace('(', '').replace(')', '')))


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    API аутентификации и регистрации пользователей
    
    Эндпоинты:
    - POST /register - Регистрация нового пользователя
    - POST /verify - Подтверждение кода верификации
    - POST /login - Вход в систему
    - POST /reset-password - Запрос на сброс пароля
    - POST /confirm-reset - Подтверждение сброса пароля с новым паролем
    - GET /user/:id - Получение данных пользователя
    """
    method = event.get('httpMethod', 'GET')
    
    # CORS
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    try:
        # Парсим тело запроса
        body = json.loads(event.get('body', '{}')) if method == 'POST' else {}
        path = event.get('params', {}).get('path', '')
        
        # Роутинг
        if method == 'POST' and 'register' in path:
            return register_user(body)
        elif method == 'POST' and 'verify' in path:
            return verify_code(body)
        elif method == 'POST' and 'login' in path:
            return login_user(body)
        elif method == 'POST' and 'reset-password' in path:
            return reset_password(body)
        elif method == 'POST' and 'confirm-reset' in path:
            return confirm_reset(body)
        elif method == 'GET' and path:
            return get_user(path.split('/')[-1])
        else:
            return {
                'statusCode': 404,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Endpoint not found'}),
                'isBase64Encoded': False
            }
            
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)}),
            'isBase64Encoded': False
        }


def register_user(data: Dict[str, Any]) -> Dict[str, Any]:
    """Регистрация нового пользователя"""
    name = data.get('name', '').strip()
    email = data.get('email', '').strip().lower()
    phone = data.get('phone', '').strip()
    password = data.get('password', '').strip()
    role = data.get('role', 'seeker')
    verification_type = data.get('verification_type', 'email')  # 'email' или 'sms'
    
    # Валидация
    if not name or len(name) < 2:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Имя должно содержать минимум 2 символа'}),
            'isBase64Encoded': False
        }
    
    if not password or len(password) < 6:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Пароль должен содержать минимум 6 символов'}),
            'isBase64Encoded': False
        }
    
    # Проверяем email или phone
    if verification_type == 'email':
        if not email or not validate_email(email):
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Некорректный email адрес'}),
                'isBase64Encoded': False
            }
        contact = email
    else:
        if not phone or not validate_phone(phone):
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Некорректный номер телефона'}),
                'isBase64Encoded': False
            }
        contact = phone
    
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        # Проверяем существование пользователя
        if email:
            cur.execute('SELECT id FROM users WHERE email = %s', (email,))
            if cur.fetchone():
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Email уже зарегистрирован'}),
                    'isBase64Encoded': False
                }
        
        if phone:
            cur.execute('SELECT id FROM users WHERE phone = %s', (phone,))
            if cur.fetchone():
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Телефон уже зарегистрирован'}),
                    'isBase64Encoded': False
                }
        
        # Создаем пользователя
        password_hash = hash_password(password)
        initial_balance = 30 if role == 'employer' else 0
        
        cur.execute("""
            INSERT INTO users (name, email, phone, password_hash, role, balance)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (name, email if email else None, phone if phone else None, password_hash, role, initial_balance))
        
        user_id = cur.fetchone()['id']
        
        # Генерируем и сохраняем код верификации
        code = generate_code()
        expires_at = datetime.now() + timedelta(minutes=10)
        
        cur.execute("""
            INSERT INTO verification_codes (user_id, code, type, contact, expires_at)
            VALUES (%s, %s, %s, %s, %s)
        """, (user_id, code, verification_type, contact, expires_at))
        
        conn.commit()
        
        # Отправляем код
        sent = False
        if verification_type == 'email':
            sent = send_email(email, code)
        else:
            sent = send_sms(phone, code)
        
        return {
            'statusCode': 201,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({
                'success': True,
                'user_id': str(user_id),
                'verification_required': True,
                'code_sent': sent,
                'message': f'Код отправлен на {contact}' if sent else 'Используйте код: ' + code
            }),
            'isBase64Encoded': False
        }
        
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        cur.close()
        conn.close()


def verify_code(data: Dict[str, Any]) -> Dict[str, Any]:
    """Подтверждение кода верификации"""
    user_id = data.get('user_id')
    code = data.get('code', '').strip()
    
    if not user_id or not code:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Укажите user_id и code'}),
            'isBase64Encoded': False
        }
    
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        # Ищем код
        cur.execute("""
            SELECT * FROM verification_codes
            WHERE user_id = %s AND code = %s AND used = FALSE AND expires_at > NOW()
            ORDER BY created_at DESC
            LIMIT 1
        """, (user_id, code))
        
        verification = cur.fetchone()
        
        if not verification:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Неверный или истекший код'}),
                'isBase64Encoded': False
            }
        
        # Помечаем код использованным
        cur.execute('UPDATE verification_codes SET used = TRUE WHERE id = %s', (verification['id'],))
        
        # Обновляем статус верификации пользователя
        if verification['type'] == 'email':
            cur.execute('UPDATE users SET email_verified = TRUE WHERE id = %s', (user_id,))
        elif verification['type'] == 'sms':
            cur.execute('UPDATE users SET phone_verified = TRUE WHERE id = %s', (user_id,))
        
        # Получаем данные пользователя
        cur.execute("""
            SELECT id, name, email, phone, role, balance, tier, vacancies_this_month,
                   email_verified, phone_verified
            FROM users WHERE id = %s
        """, (user_id,))
        
        user = cur.fetchone()
        conn.commit()
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({
                'success': True,
                'user': {
                    'id': str(user['id']),
                    'name': user['name'],
                    'email': user['email'],
                    'phone': user['phone'],
                    'role': user['role'],
                    'balance': float(user['balance']),
                    'tier': user['tier'],
                    'vacancies_this_month': user['vacancies_this_month'],
                    'email_verified': user['email_verified'],
                    'phone_verified': user['phone_verified']
                }
            }),
            'isBase64Encoded': False
        }
        
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        cur.close()
        conn.close()


def login_user(data: Dict[str, Any]) -> Dict[str, Any]:
    """Вход пользователя по email/phone и паролю"""
    login = data.get('login', '').strip().lower()  # email или phone
    password = data.get('password', '').strip()
    
    if not login or not password:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Укажите логин и пароль'}),
            'isBase64Encoded': False
        }
    
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        # Ищем пользователя по email или phone
        cur.execute("""
            SELECT id, name, email, phone, password_hash, role, balance, tier,
                   vacancies_this_month, email_verified, phone_verified
            FROM users
            WHERE email = %s OR phone = %s
        """, (login, login))
        
        user = cur.fetchone()
        
        if not user:
            return {
                'statusCode': 401,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Неверный логин или пароль'}),
                'isBase64Encoded': False
            }
        
        # Проверяем пароль
        password_hash = hash_password(password)
        if password_hash != user['password_hash']:
            return {
                'statusCode': 401,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Неверный логин или пароль'}),
                'isBase64Encoded': False
            }
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({
                'success': True,
                'user': {
                    'id': str(user['id']),
                    'name': user['name'],
                    'email': user['email'],
                    'phone': user['phone'],
                    'role': user['role'],
                    'balance': float(user['balance']),
                    'tier': user['tier'],
                    'vacancies_this_month': user['vacancies_this_month'],
                    'email_verified': user['email_verified'],
                    'phone_verified': user['phone_verified']
                }
            }),
            'isBase64Encoded': False
        }
        
    finally:
        cur.close()
        conn.close()


def reset_password(data: Dict[str, Any]) -> Dict[str, Any]:
    """Запрос на сброс пароля - отправка кода"""
    contact = data.get('contact', '').strip().lower()  # email или phone
    reset_type = data.get('type', 'email')  # 'email' или 'sms'
    
    if not contact:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Укажите email или телефон'}),
            'isBase64Encoded': False
        }
    
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        # Ищем пользователя
        cur.execute("""
            SELECT id FROM users WHERE email = %s OR phone = %s
        """, (contact, contact))
        
        user = cur.fetchone()
        
        if not user:
            # Не раскрываем существование пользователя
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({
                    'success': True,
                    'message': 'Если аккаунт существует, код будет отправлен'
                }),
                'isBase64Encoded': False
            }
        
        # Генерируем код
        code = generate_code()
        expires_at = datetime.now() + timedelta(minutes=10)
        
        cur.execute("""
            INSERT INTO verification_codes (user_id, code, type, contact, expires_at)
            VALUES (%s, %s, %s, %s, %s)
        """, (user['id'], code, 'password_reset', contact, expires_at))
        
        conn.commit()
        
        # Отправляем код
        sent = False
        if reset_type == 'email' and validate_email(contact):
            sent = send_email(contact, code, 'password_reset')
        elif reset_type == 'sms' and validate_phone(contact):
            sent = send_sms(contact, code)
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({
                'success': True,
                'user_id': str(user['id']),
                'code_sent': sent,
                'message': f'Код отправлен на {contact}' if sent else 'Используйте код: ' + code
            }),
            'isBase64Encoded': False
        }
        
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        cur.close()
        conn.close()


def confirm_reset(data: Dict[str, Any]) -> Dict[str, Any]:
    """Подтверждение сброса пароля с новым паролем"""
    user_id = data.get('user_id')
    code = data.get('code', '').strip()
    new_password = data.get('new_password', '').strip()
    
    if not user_id or not code or not new_password:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Укажите user_id, code и new_password'}),
            'isBase64Encoded': False
        }
    
    if len(new_password) < 6:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Пароль должен содержать минимум 6 символов'}),
            'isBase64Encoded': False
        }
    
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        # Проверяем код
        cur.execute("""
            SELECT * FROM verification_codes
            WHERE user_id = %s AND code = %s AND type = 'password_reset'
                  AND used = FALSE AND expires_at > NOW()
            ORDER BY created_at DESC
            LIMIT 1
        """, (user_id, code))
        
        verification = cur.fetchone()
        
        if not verification:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Неверный или истекший код'}),
                'isBase64Encoded': False
            }
        
        # Обновляем пароль
        password_hash = hash_password(new_password)
        cur.execute('UPDATE users SET password_hash = %s WHERE id = %s', (password_hash, user_id))
        
        # Помечаем код использованным
        cur.execute('UPDATE verification_codes SET used = TRUE WHERE id = %s', (verification['id'],))
        
        conn.commit()
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({
                'success': True,
                'message': 'Пароль успешно изменен'
            }),
            'isBase64Encoded': False
        }
        
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        cur.close()
        conn.close()


def get_user(user_id: str) -> Dict[str, Any]:
    """Получение данных пользователя по ID"""
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        cur.execute("""
            SELECT id, name, email, phone, role, balance, tier, tier_expires_at,
                   vacancies_this_month, email_verified, phone_verified, created_at
            FROM users WHERE id = %s
        """, (user_id,))
        
        user = cur.fetchone()
        
        if not user:
            return {
                'statusCode': 404,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Пользователь не найден'}),
                'isBase64Encoded': False
            }
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({
                'success': True,
                'user': {
                    'id': str(user['id']),
                    'name': user['name'],
                    'email': user['email'],
                    'phone': user['phone'],
                    'role': user['role'],
                    'balance': float(user['balance']),
                    'tier': user['tier'],
                    'tier_expires_at': user['tier_expires_at'].isoformat() if user['tier_expires_at'] else None,
                    'vacancies_this_month': user['vacancies_this_month'],
                    'email_verified': user['email_verified'],
                    'phone_verified': user['phone_verified'],
                    'created_at': user['created_at'].isoformat()
                }
            }),
            'isBase64Encoded': False
        }
        
    finally:
        cur.close()
        conn.close()
