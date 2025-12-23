"""
API аутентификации с Email и SMS верификацией
Использует SMTP для email и SMSC.ru для SMS
"""
import json
import os
import secrets
import re
from typing import Dict, Any
from datetime import datetime, timedelta
import psycopg2
from psycopg2.extras import RealDictCursor
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import urllib.request
import urllib.parse
import bcrypt


def get_db_connection():
    """Создает подключение к базе данных"""
    return psycopg2.connect(os.environ['DATABASE_URL'])


def sql_escape(value: Any) -> str:
    """Экранирует значение для использования в SQL"""
    if value is None:
        return 'NULL'
    if isinstance(value, bool):
        return 'TRUE' if value else 'FALSE'
    if isinstance(value, (int, float)):
        return str(value)
    if isinstance(value, datetime):
        return f"'{value.isoformat()}'"
    # Для строк используем $$ для экранирования (для bcrypt хешей с $ внутри)
    str_value = str(value)
    if '$' in str_value or '\\' in str_value:
        return f"$${str_value}$$"
    # Для обычных строк экранируем одинарные кавычки
    return f"'{str_value.replace(chr(39), chr(39) + chr(39))}'"


def hash_password(password: str) -> str:
    """Хеширует пароль с использованием bcrypt"""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')


def verify_password(password: str, hashed: str) -> bool:
    """Проверяет пароль с использованием bcrypt"""
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))


def generate_code() -> str:
    """Генерирует 6-значный код верификации"""
    return ''.join([str(secrets.randbelow(10)) for _ in range(6)])


def normalize_phone(phone: str) -> str:
    """Нормализует телефонный номер к формату +7XXXXXXXXXX"""
    phone_clean = ''.join(filter(str.isdigit, phone))
    if phone_clean.startswith('8'):
        phone_clean = '7' + phone_clean[1:]
    if not phone_clean.startswith('7'):
        phone_clean = '7' + phone_clean
    return '+' + phone_clean


def send_sms(phone: str, code: str) -> tuple[bool, str]:
    """
    Отправляет SMS через SMSC.ru
    Возвращает (success, message)
    """
    try:
        login = os.environ.get('SMSC_LOGIN')
        password = os.environ.get('SMSC_PASSWORD')
        
        if not login or not password:
            return False, 'SMS сервис не настроен'
        
        # Нормализуем номер телефона
        phone_clean = ''.join(filter(str.isdigit, phone))
        if phone_clean.startswith('8'):
            phone_clean = '7' + phone_clean[1:]
        if not phone_clean.startswith('7'):
            phone_clean = '7' + phone_clean
        
        message = f'Код подтверждения Jobs-App: {code}'
        
        params = {
            'login': login,
            'psw': password,
            'phones': phone_clean,
            'mes': message,
            'charset': 'utf-8',
            'fmt': 3
        }
        
        url = 'https://smsc.ru/sys/send.php?' + urllib.parse.urlencode(params)
        response = urllib.request.urlopen(url, timeout=10)
        result = json.loads(response.read().decode('utf-8'))
        
        if 'error' in result or 'error_code' in result:
            error_code = result.get('error_code', 'unknown')
            error_msg = result.get('error', 'Ошибка отправки SMS')
            
            if error_code == 2:
                return False, 'Неверный логин или пароль SMSC'
            elif error_code == 6:
                return False, 'Недостаточно средств на балансе SMSC'
            else:
                return False, f'Ошибка SMSC: {error_msg}'
        
        print(f'✅ SMS отправлена на {phone_clean}')
        return True, 'SMS отправлена'
        
    except Exception as e:
        print(f'❌ Ошибка отправки SMS: {e}')
        return False, f'Ошибка отправки SMS: {str(e)}'


def send_email(email: str, code: str, purpose: str = 'verification') -> tuple[bool, str]:
    """
    Отправляет email с кодом верификации
    Возвращает (success, message)
    """
    try:
        smtp_host = os.environ.get('SMTP_HOST')
        smtp_port = int(os.environ.get('SMTP_PORT', '465'))
        smtp_email = os.environ.get('SMTP_EMAIL')
        smtp_password = os.environ.get('SMTP_PASSWORD')
        
        if not all([smtp_host, smtp_email, smtp_password]):
            return False, 'Email сервис не настроен'
        
        msg = MIMEMultipart('alternative')
        
        if purpose == 'verification':
            msg['Subject'] = 'Код подтверждения Jobs-App'
            title = 'Регистрация в Jobs-App'
        else:
            msg['Subject'] = 'Восстановление пароля Jobs-App'
            title = 'Восстановление пароля'
        
        msg['From'] = smtp_email
        msg['To'] = email
        
        text = f'{title}\n\nВаш код подтверждения: {code}\n\nКод действителен 10 минут.'
        
        html = f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0;">Jobs-App</h1>
            </div>
            <div style="background: #f7f7f7; padding: 30px; border-radius: 0 0 10px 10px;">
                <h2 style="color: #333;">{title}</h2>
                <p style="color: #666; font-size: 16px;">Ваш код подтверждения:</p>
                <div style="background: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                    <h1 style="color: #667eea; letter-spacing: 8px; margin: 0; font-size: 36px;">{code}</h1>
                </div>
                <p style="color: #999; font-size: 14px;">Код действителен в течение 10 минут.</p>
                <p style="color: #999; font-size: 12px; margin-top: 30px;">Если вы не запрашивали этот код, проигнорируйте это письмо.</p>
            </div>
        </body>
        </html>
        """
        
        part1 = MIMEText(text, 'plain', 'utf-8')
        part2 = MIMEText(html, 'html', 'utf-8')
        msg.attach(part1)
        msg.attach(part2)
        
        if smtp_port == 465:
            with smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=30) as server:
                server.login(smtp_email, smtp_password)
                server.send_message(msg)
        else:
            with smtplib.SMTP(smtp_host, smtp_port, timeout=30) as server:
                server.starttls()
                server.login(smtp_email, smtp_password)
                server.send_message(msg)
        
        print(f'✅ Email отправлен на {email}')
        return True, 'Email отправлен'
        
    except smtplib.SMTPAuthenticationError:
        print('❌ SMTP ошибка аутентификации')
        return False, 'Неверный логин или пароль SMTP'
    except Exception as e:
        print(f'❌ Ошибка отправки email: {e}')
        return False, f'Ошибка отправки email: {str(e)}'


def validate_email(email: str) -> bool:
    """Проверяет валидность email"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))


def validate_phone(phone: str) -> bool:
    """Проверяет валидность номера телефона (российский формат)"""
    phone_clean = phone.replace(' ', '').replace('-', '').replace('(', '').replace(')', '')
    pattern = r'^\+?[78]?9\d{9}$'
    return bool(re.match(pattern, phone_clean))


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    API аутентификации и регистрации
    Endpoints: register, verify, login, reset-password, confirm-reset, link-email, verify-email-link
    """
    method = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    try:
        body = json.loads(event.get('body', '{}')) if method == 'POST' else {}
        path = event.get('queryStringParameters', {}).get('path', '') if event.get('queryStringParameters') else ''
        
        if method == 'POST' and 'register' in path:
            return register_user(body)
        elif method == 'POST' and 'verify-email-link' in path:
            return verify_email_link(body)
        elif method == 'POST' and 'link-email' in path:
            return link_email(body)
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
        print(f'Error: {e}')
        import traceback
        traceback.print_exc()
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
    verification_type = data.get('verification_type', 'email')
    
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
        if email:
            cur.execute(f"SELECT id FROM users WHERE email = {sql_escape(email)}")
            if cur.fetchone():
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Email уже зарегистрирован'}),
                    'isBase64Encoded': False
                }
        
        if phone:
            cur.execute(f"SELECT id FROM users WHERE phone = {sql_escape(phone)}")
            if cur.fetchone():
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Телефон уже зарегистрирован'}),
                    'isBase64Encoded': False
                }
        
        password_hash = hash_password(password)
        
        email_val = sql_escape(email) if email else 'NULL'
        phone_val = sql_escape(phone) if phone else 'NULL'
        
        cur.execute(f"""
            INSERT INTO users (name, email, phone, password_hash, role, balance, tier)
            VALUES ({sql_escape(name)}, {email_val}, {phone_val}, {sql_escape(password_hash)}, 
                    {sql_escape(role)}, 0, 'FREE')
            RETURNING id
        """)
        
        user_id = cur.fetchone()['id']
        
        code = generate_code()
        expires_at = datetime.now() + timedelta(minutes=10)
        
        cur.execute(f"""
            INSERT INTO verification_codes (user_id, code, type, contact, expires_at)
            VALUES ({user_id}, {sql_escape(code)}, {sql_escape(verification_type)}, 
                    {sql_escape(contact)}, {sql_escape(expires_at)})
        """)
        
        conn.commit()
        
        if verification_type == 'email':
            success, message = send_email(email, code)
        else:
            success, message = send_sms(phone, code)
        
        return {
            'statusCode': 201,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({
                'success': True,
                'user_id': str(user_id),
                'verification_required': True,
                'code_sent': success,
                'message': f'Код отправлен на {contact}' if success else message
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
        cur.execute(f"""
            SELECT * FROM verification_codes
            WHERE user_id = {user_id} AND code = {sql_escape(code)} 
            AND used = FALSE AND expires_at > NOW()
            ORDER BY created_at DESC
            LIMIT 1
        """)
        
        verification = cur.fetchone()
        
        if not verification:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Неверный или истекший код'}),
                'isBase64Encoded': False
            }
        
        cur.execute(f"UPDATE verification_codes SET used = TRUE WHERE id = {verification['id']}")
        
        if verification['type'] == 'email':
            cur.execute(f"UPDATE users SET email_verified = TRUE WHERE id = {user_id}")
        elif verification['type'] == 'sms':
            cur.execute(f"UPDATE users SET phone_verified = TRUE WHERE id = {user_id}")
        
        cur.execute(f"""
            SELECT id, name, email, phone, role, balance, tier, vacancies_this_month,
                   email_verified, phone_verified
            FROM users WHERE id = {user_id}
        """)
        
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
    login = data.get('login', '').strip()
    password = data.get('password', '').strip()
    
    print(f'🔑 Попытка входа: login={login}')
    
    if not login or not password:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Укажите логин и пароль'}),
            'isBase64Encoded': False
        }
    
    # Нормализуем логин
    if validate_phone(login):
        login_normalized = normalize_phone(login)
        print(f'📱 Нормализован телефон: {login_normalized}')
    else:
        login_normalized = login.lower()
        print(f'📧 Email: {login_normalized}')
    
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        cur.execute(f"""
            SELECT id, name, email, phone, password_hash, role, balance, tier,
                   vacancies_this_month, email_verified, phone_verified
            FROM users
            WHERE email = {sql_escape(login_normalized)} OR phone = {sql_escape(login_normalized)}
        """)
        
        print(f'🔍 Поиск пользователя: {login_normalized}')
        
        user = cur.fetchone()
        
        if not user:
            print(f'❌ Пользователь не найден: {login_normalized}')
            return {
                'statusCode': 401,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Неверный логин или пароль'}),
                'isBase64Encoded': False
            }
        
        print(f'✅ Пользователь найден: user_id={user["id"]}, имеет хеш: {user["password_hash"][:20]}...')
        
        password_hash = user['password_hash']
        is_valid = False
        
        if password_hash.startswith('$2b$'):
            print(f'🔐 Проверка bcrypt хеша...')
            is_valid = verify_password(password, password_hash)
            print(f'{"✅" if is_valid else "❌"} Результат проверки bcrypt: {is_valid}')
        else:
            print(f'🔐 Проверка старого SHA256 хеша...')
            import hashlib
            old_hash = hashlib.sha256(password.encode()).hexdigest()
            is_valid = (old_hash == password_hash)
            print(f'{"✅" if is_valid else "❌"} Результат проверки SHA256: {is_valid}')
            
            if is_valid:
                print(f'🔄 Обновление хеша на bcrypt...')
                new_hash = hash_password(password)
                cur.execute(f"UPDATE users SET password_hash = {sql_escape(new_hash)} WHERE id = {user['id']}")
                conn.commit()
        
        if not is_valid:
            print(f'❌ Неверный пароль для пользователя {user["id"]}')
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
    """Запрос на сброс пароля"""
    contact = data.get('contact', '').strip()
    reset_type = data.get('type', 'email')
    
    print(f'🔐 Запрос сброса пароля: contact={contact}, type={reset_type}')
    
    if not contact:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Укажите email или телефон'}),
            'isBase64Encoded': False
        }
    
    # Нормализуем контакт
    if reset_type == 'sms':
        contact_normalized = normalize_phone(contact)
    else:
        contact_normalized = contact.lower()
    
    print(f'📝 Нормализованный контакт: {contact_normalized}')
    
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        cur.execute(f"""
            SELECT id FROM users WHERE email = {sql_escape(contact_normalized)} 
            OR phone = {sql_escape(contact_normalized)}
        """)
        
        user = cur.fetchone()
        
        if not user:
            print(f'⚠️ Пользователь не найден: {contact}')
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({
                    'success': True,
                    'message': 'Если аккаунт существует, код будет отправлен'
                }),
                'isBase64Encoded': False
            }
        
        print(f'✅ Пользователь найден: user_id={user["id"]}')
        
        code = generate_code()
        expires_at = datetime.now() + timedelta(minutes=10)
        
        cur.execute(f"""
            INSERT INTO verification_codes (user_id, code, type, contact, expires_at)
            VALUES ({user['id']}, {sql_escape(code)}, 'password_reset', 
                    {sql_escape(contact_normalized)}, {sql_escape(expires_at)})
        """)
        
        conn.commit()
        print(f'✅ Код верификации сохранен: {code}')
        
        if reset_type == 'email' and validate_email(contact_normalized):
            print(f'📧 Отправка email на {contact_normalized}')
            success, message = send_email(contact_normalized, code, 'password_reset')
        elif reset_type == 'sms' and validate_phone(contact_normalized):
            print(f'📱 Отправка SMS на {contact_normalized}')
            success, message = send_sms(contact_normalized, code)
        else:
            success, message = False, 'Некорректный формат контакта'
        
        print(f'{"✅" if success else "❌"} Результат отправки: {message}')
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({
                'success': True,
                'user_id': str(user['id']),
                'code_sent': success,
                'message': f'Код отправлен на {contact_normalized}' if success else message
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
    """Подтверждение сброса пароля"""
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
        cur.execute(f"""
            SELECT * FROM verification_codes
            WHERE user_id = {user_id} AND code = {sql_escape(code)} 
            AND type = 'password_reset' AND used = FALSE AND expires_at > NOW()
            ORDER BY created_at DESC
            LIMIT 1
        """)
        
        verification = cur.fetchone()
        
        if not verification:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Неверный или истекший код'}),
                'isBase64Encoded': False
            }
        
        new_hash = hash_password(new_password)
        
        cur.execute(f"UPDATE users SET password_hash = {sql_escape(new_hash)} WHERE id = {user_id}")
        cur.execute(f"UPDATE verification_codes SET used = TRUE WHERE id = {verification['id']}")
        
        cur.execute(f"""
            SELECT id, name, email, phone, role, balance, tier, vacancies_this_month,
                   email_verified, phone_verified
            FROM users WHERE id = {user_id}
        """)
        
        user = cur.fetchone()
        conn.commit()
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({
                'success': True,
                'message': 'Пароль успешно изменен',
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


def get_user(user_id: str) -> Dict[str, Any]:
    """Получение информации о пользователе"""
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        cur.execute(f"""
            SELECT id, name, email, phone, role, balance, tier, vacancies_this_month,
                   email_verified, phone_verified
            FROM users WHERE id = {sql_escape(user_id)}
        """)
        
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
            }),
            'isBase64Encoded': False
        }
        
    finally:
        cur.close()
        conn.close()


def link_email(data: Dict[str, Any]) -> Dict[str, Any]:
    """Привязка email к существующему аккаунту"""
    user_id = data.get('user_id')
    email = data.get('email', '').strip().lower()
    
    if not user_id or not email:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Укажите user_id и email'}),
            'isBase64Encoded': False
        }
    
    if not validate_email(email):
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Некорректный email адрес'}),
            'isBase64Encoded': False
        }
    
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        cur.execute(f"SELECT id FROM users WHERE email = {sql_escape(email)}")
        if cur.fetchone():
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Email уже используется'}),
                'isBase64Encoded': False
            }
        
        code = generate_code()
        expires_at = datetime.now() + timedelta(minutes=10)
        
        cur.execute(f"""
            INSERT INTO verification_codes (user_id, code, type, contact, expires_at)
            VALUES ({user_id}, {sql_escape(code)}, 'email_link', 
                    {sql_escape(email)}, {sql_escape(expires_at)})
        """)
        
        conn.commit()
        
        success, message = send_email(email, code)
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({
                'success': True,
                'code_sent': success,
                'message': f'Код отправлен на {email}' if success else message
            }),
            'isBase64Encoded': False
        }
        
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        cur.close()
        conn.close()


def verify_email_link(data: Dict[str, Any]) -> Dict[str, Any]:
    """Подтверждение привязки email"""
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
        cur.execute(f"""
            SELECT * FROM verification_codes
            WHERE user_id = {user_id} AND code = {sql_escape(code)} 
            AND type = 'email_link' AND used = FALSE AND expires_at > NOW()
            ORDER BY created_at DESC
            LIMIT 1
        """)
        
        verification = cur.fetchone()
        
        if not verification:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Неверный или истекший код'}),
                'isBase64Encoded': False
            }
        
        email = verification['contact']
        
        cur.execute(f"""
            UPDATE users 
            SET email = {sql_escape(email)}, email_verified = TRUE 
            WHERE id = {user_id}
        """)
        cur.execute(f"UPDATE verification_codes SET used = TRUE WHERE id = {verification['id']}")
        
        cur.execute(f"""
            SELECT id, name, email, phone, role, balance, tier, vacancies_this_month,
                   email_verified, phone_verified
            FROM users WHERE id = {user_id}
        """)
        
        user = cur.fetchone()
        conn.commit()
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({
                'success': True,
                'message': 'Email успешно привязан',
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