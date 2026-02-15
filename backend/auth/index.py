"""
API аутентификации с одноразовыми кодами через Email и SMS
Пользователи входят только по кодам - без паролей
"""
import json
import os
import secrets
import re
import traceback
from typing import Dict, Any, Tuple
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


SCHEMA = '"t_p41246523_jobsapp_mobile_proje"'


def generate_code() -> str:
    """Генерирует 6-значный код"""
    return ''.join([str(secrets.randbelow(10)) for _ in range(6)])


def generate_token() -> str:
    """Генерирует токен сессии"""
    return secrets.token_urlsafe(48)


def validate_email(email: str) -> bool:
    """Проверяет валидность email"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))


def validate_phone(phone: str) -> bool:
    """Проверяет валидность телефона"""
    digits = ''.join(filter(str.isdigit, phone))
    return len(digits) >= 10


def normalize_phone(phone: str) -> str:
    """Нормализует телефон к формату +7XXXXXXXXXX"""
    digits = ''.join(filter(str.isdigit, phone))
    if digits.startswith('8'):
        digits = '7' + digits[1:]
    elif not digits.startswith('7'):
        digits = '7' + digits
    return '+' + digits


def send_email(email: str, code: str) -> Tuple[bool, str]:
    """Отправляет код на email"""
    try:
        smtp_host = os.environ.get('SMTP_HOST')
        smtp_port = int(os.environ.get('SMTP_PORT', '465'))
        smtp_email = os.environ.get('SMTP_EMAIL')
        smtp_password = os.environ.get('SMTP_PASSWORD')
        
        if not all([smtp_host, smtp_email, smtp_password]):
            return False, 'Email сервис не настроен'
        
        msg = MIMEMultipart('alternative')
        msg['Subject'] = 'Код для входа Jobs-App'
        msg['From'] = smtp_email
        msg['To'] = email
        
        text = f'Ваш код для входа: {code}\n\nКод действителен 10 минут.'
        
        html = f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0;">Jobs-App</h1>
            </div>
            <div style="background: #f7f7f7; padding: 30px; border-radius: 0 0 10px 10px;">
                <h2 style="color: #333;">Вход в аккаунт</h2>
                <p style="color: #666; font-size: 16px;">Ваш код для входа:</p>
                <div style="background: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                    <h1 style="color: #667eea; letter-spacing: 8px; margin: 0; font-size: 36px;">{code}</h1>
                </div>
                <p style="color: #999; font-size: 14px;">Код действителен 10 минут.</p>
                <p style="color: #999; font-size: 12px; margin-top: 30px;">Если вы не запрашивали этот код, проигнорируйте письмо.</p>
            </div>
        </body>
        </html>
        """
        
        msg.attach(MIMEText(text, 'plain', 'utf-8'))
        msg.attach(MIMEText(html, 'html', 'utf-8'))
        
        if smtp_port == 465:
            with smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=30) as server:
                server.login(smtp_email, smtp_password)
                server.send_message(msg)
        else:
            with smtplib.SMTP(smtp_host, smtp_port, timeout=30) as server:
                server.starttls()
                server.login(smtp_email, smtp_password)
                server.send_message(msg)
        
        return True, 'Email отправлен'
        
    except Exception as e:
        return False, f'Ошибка отправки email: {str(e)}'


def send_sms(phone: str, code: str) -> Tuple[bool, str]:
    """Отправляет SMS код"""
    try:
        login = os.environ.get('SMSC_LOGIN')
        password = os.environ.get('SMSC_PASSWORD')
        
        if not login or not password:
            return False, 'SMS сервис не настроен'
        
        phone_clean = ''.join(filter(str.isdigit, phone))
        if phone_clean.startswith('8'):
            phone_clean = '7' + phone_clean[1:]
        elif not phone_clean.startswith('7'):
            phone_clean = '7' + phone_clean
        
        message = f'Код для входа Jobs-App: {code}'
        
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
            return False, result.get('error', 'Ошибка отправки SMS')
        
        return True, 'SMS отправлена'
        
    except Exception as e:
        return False, f'Ошибка отправки SMS: {str(e)}'


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    API аутентификации через одноразовые коды
    Endpoints: /send-code, /verify-code, /check-session, /update-role
    """
    method = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-Session-Token',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    try:
        body = json.loads(event.get('body', '{}')) if method == 'POST' else {}
        params = event.get('queryStringParameters') or {}
        path = params.get('path', 'send-code')
        
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # Обновление роли пользователя
        if path == 'update-role' and method == 'POST':
            token = event.get('headers', {}).get('X-Session-Token') or body.get('token')
            role = body.get('role')
            
            if not token:
                return {
                    'statusCode': 401,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Токен не указан'}),
                    'isBase64Encoded': False
                }
            
            if role not in ['seeker', 'employer']:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Неверная роль'}),
                    'isBase64Encoded': False
                }
            
            # Проверяем сессию
            cur.execute(f"""
                SELECT s.user_id FROM {SCHEMA}.sessions s
                WHERE s.token = %s 
                AND s.is_active = TRUE 
                AND s.expires_at > NOW()
            """, (token,))
            
            session = cur.fetchone()
            if not session:
                conn.close()
                return {
                    'statusCode': 401,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Сессия недействительна'}),
                    'isBase64Encoded': False
                }
            
            # Обновляем роль
            cur.execute(f"""
                UPDATE {SCHEMA}.users 
                SET role = %s 
                WHERE id = %s
                RETURNING id, phone, email, name, email_verified, phone_verified, role
            """, (role, session['user_id']))
            
            user = cur.fetchone()
            conn.commit()
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({
                    'success': True,
                    'user': {
                        'id': str(user['id']),
                        'phone': user.get('phone'),
                        'email': user.get('email'),
                        'full_name': user.get('name'),
                        'is_verified': user.get('email_verified') or user.get('phone_verified', False),
                        'role': user.get('role', 'seeker')
                    }
                }),
                'isBase64Encoded': False
            }
        
        # Отправка кода
        if path == 'send-code' and method == 'POST':
            contact = body.get('contact', '').strip()
            role = body.get('role', 'seeker')
            
            if not contact:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Укажите email или телефон'}),
                    'isBase64Encoded': False
                }
            
            # Определяем тип контакта
            is_email = '@' in contact
            if is_email:
                if not validate_email(contact):
                    return {
                        'statusCode': 400,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Неверный формат email'}),
                        'isBase64Encoded': False
                    }
                contact_type = 'email'
                normalized_contact = contact.lower()
            else:
                if not validate_phone(contact):
                    return {
                        'statusCode': 400,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Неверный формат телефона'}),
                        'isBase64Encoded': False
                    }
                contact_type = 'phone'
                normalized_contact = normalize_phone(contact)
            
            # Проверяем лимит запросов (не более 3 кодов за 10 минут)
            cur.execute(f"""
                SELECT COUNT(*) as count FROM {SCHEMA}.otp_codes 
                WHERE contact = %s 
                AND created_at > NOW() - INTERVAL '10 minutes'
            """, (normalized_contact,))
            
            result = cur.fetchone()
            if result and result['count'] >= 3:
                conn.close()
                return {
                    'statusCode': 429,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Слишком много запросов. Попробуйте через 10 минут'}),
                    'isBase64Encoded': False
                }
            
            # Генерируем код
            code = generate_code()
            expires_at = datetime.now() + timedelta(minutes=10)
            
            # Сохраняем код с purpose='login' (constraint требует только эти значения)
            # Роль сохраняем в код самом (последний символ: 0-5=seeker, 6-9=employer)
            # Но лучше просто использовать role из параметра при создании пользователя
            cur.execute(f"""
                INSERT INTO {SCHEMA}.otp_codes (contact, contact_type, code, purpose, expires_at)
                VALUES (%s, %s, %s, 'login', %s)
            """, (normalized_contact, contact_type, code, expires_at))
            conn.commit()
            
            # Отправляем код
            if contact_type == 'email':
                success, message = send_email(normalized_contact, code)
            else:
                success, message = send_sms(normalized_contact, code)
            
            conn.close()
            
            if not success:
                return {
                    'statusCode': 500,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': message}),
                    'isBase64Encoded': False
                }
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({
                    'success': True,
                    'message': f'Код отправлен на {contact_type}',
                    'contact_type': contact_type
                }),
                'isBase64Encoded': False
            }
        
        # Проверка кода и вход
        elif path == 'verify-code' and method == 'POST':
            contact = body.get('contact', '').strip()
            code = body.get('code', '').strip()
            
            print(f'[DEBUG] verify-code: contact={contact}, code={code}')
            
            if not contact or not code:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Укажите контакт и код'}),
                    'isBase64Encoded': False
                }
            
            # Нормализуем контакт
            is_email = '@' in contact
            normalized_contact = contact.lower() if is_email else normalize_phone(contact)
            
            print(f'[DEBUG] normalized_contact={normalized_contact}, is_email={is_email}')
            
            # Проверяем код
            cur.execute(f"""
                SELECT * FROM {SCHEMA}.otp_codes 
                WHERE contact = %s 
                AND code = %s 
                AND is_used = FALSE 
                AND expires_at > NOW()
                ORDER BY created_at DESC
                LIMIT 1
            """, (normalized_contact, code))
            
            otp = cur.fetchone()
            print(f'[DEBUG] otp found: {otp is not None}')
            
            if not otp:
                # Увеличиваем счетчик попыток
                cur.execute(f"""
                    UPDATE {SCHEMA}.otp_codes 
                    SET attempts = attempts + 1 
                    WHERE contact = %s AND code = %s
                """, (normalized_contact, code))
                conn.commit()
                conn.close()
                
                return {
                    'statusCode': 401,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Неверный или истекший код'}),
                    'isBase64Encoded': False
                }
            
            # Отмечаем код как использованный
            print(f'[DEBUG] Marking OTP as used, otp_id={otp["id"]}')
            cur.execute(f"UPDATE {SCHEMA}.otp_codes SET is_used = TRUE WHERE id = %s", (otp['id'],))
            conn.commit()
            
            # Роль берем из body (она была передана вместе с кодом)
            role = body.get('role', 'seeker')
            if role not in ['seeker', 'employer']:
                role = 'seeker'
            
            # Ищем или создаем пользователя (используем name вместо full_name, email_verified/phone_verified)
            if is_email:
                cur.execute(f"SELECT id, phone, email, name, email_verified, role FROM {SCHEMA}.users WHERE email = %s", (normalized_contact,))
            else:
                cur.execute(f"SELECT id, phone, email, name, phone_verified, role FROM {SCHEMA}.users WHERE phone = %s", (normalized_contact,))
            
            user = cur.fetchone()
            print(f'[DEBUG] user found: {user is not None}')
            
            if not user:
                # Создаем нового пользователя с ролью (password_hash = '', name = email/phone)
                print(f'[DEBUG] Creating new user with role={role}')
                if is_email:
                    cur.execute(f"""
                        INSERT INTO {SCHEMA}.users (email, email_verified, updated_at, role, password_hash, name)
                        VALUES (%s, TRUE, NOW(), %s, '', %s)
                        RETURNING id, phone, email, name, email_verified, role
                    """, (normalized_contact, role, normalized_contact))
                else:
                    cur.execute(f"""
                        INSERT INTO {SCHEMA}.users (phone, phone_verified, updated_at, role, password_hash, name)
                        VALUES (%s, TRUE, NOW(), %s, '', %s)
                        RETURNING id, phone, email, name, phone_verified, role
                    """, (normalized_contact, role, normalized_contact))
                user = cur.fetchone()
                print(f'[DEBUG] New user created: user_id={user["id"] if user else None}')
                conn.commit()
            else:
                # Обновляем updated_at и verified (роль не меняем для существующих)
                print(f'[DEBUG] Updating existing user, user_id={user["id"]}')
                if is_email:
                    cur.execute(f"UPDATE {SCHEMA}.users SET updated_at = NOW(), email_verified = TRUE WHERE id = %s", (user['id'],))
                else:
                    cur.execute(f"UPDATE {SCHEMA}.users SET updated_at = NOW(), phone_verified = TRUE WHERE id = %s", (user['id'],))
                conn.commit()
            
            # Создаем сессию
            token = generate_token()
            expires_at = datetime.now() + timedelta(days=30)
            
            print(f'[DEBUG] Creating session for user_id={user["id"]}')
            cur.execute(f"""
                INSERT INTO {SCHEMA}.sessions (user_id, token, expires_at)
                VALUES (%s, %s, %s)
            """, (user['id'], token, expires_at))
            conn.commit()
            print(f'[DEBUG] Session created successfully')
            conn.close()
            
            # Поле is_verified зависит от типа контакта
            is_verified = user.get('email_verified', False) if is_email else user.get('phone_verified', False)
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({
                    'success': True,
                    'token': token,
                    'user': {
                        'id': str(user['id']),  # UUID to string
                        'phone': user.get('phone'),
                        'email': user.get('email'),
                        'full_name': user.get('name'),
                        'is_verified': is_verified,
                        'role': user.get('role', 'seeker')
                    }
                }),
                'isBase64Encoded': False
            }
        
        # Проверка сессии
        elif path == 'check-session' and method == 'GET':
            token = event.get('headers', {}).get('X-Session-Token') or params.get('token')
            
            if not token:
                return {
                    'statusCode': 401,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Токен не указан'}),
                    'isBase64Encoded': False
                }
            
            cur.execute(f"""
                SELECT s.*, u.* 
                FROM {SCHEMA}.sessions s
                JOIN {SCHEMA}.users u ON s.user_id = u.id
                WHERE s.token = %s 
                AND s.is_active = TRUE 
                AND s.expires_at > NOW()
            """, (token,))
            
            result = cur.fetchone()
            conn.close()
            
            if not result:
                return {
                    'statusCode': 401,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Сессия недействительна'}),
                    'isBase64Encoded': False
                }
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({
                    'valid': True,
                    'user': {
                        'id': str(result['id']),  # UUID to string
                        'phone': result['phone'],
                        'email': result['email'],
                        'full_name': result['name'],
                        'is_verified': True,
                        'role': result.get('role', 'seeker')
                    }
                }),
                'isBase64Encoded': False
            }
        
        elif path == 'login' and method == 'POST':
            login_value = body.get('login', '').strip()
            password = body.get('password', '')
            
            admin_password = os.environ.get('ADMIN_PASSWORD', '')
            if not admin_password or password != admin_password:
                conn.close()
                return {
                    'statusCode': 401,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Неверный логин или пароль'}),
                    'isBase64Encoded': False
                }
            
            is_email = '@' in login_value
            if is_email:
                cur.execute(f"SELECT id, phone, email, name, email_verified, role FROM {SCHEMA}.users WHERE email = %s AND role = 'admin'", (login_value.lower(),))
            else:
                normalized = normalize_phone(login_value)
                cur.execute(f"SELECT id, phone, email, name, phone_verified, role FROM {SCHEMA}.users WHERE phone = %s AND role = 'admin'", (normalized,))
            
            user = cur.fetchone()
            
            if not user:
                conn.close()
                return {
                    'statusCode': 401,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Администратор не найден'}),
                    'isBase64Encoded': False
                }
            
            token = generate_token()
            expires_at = datetime.now() + timedelta(days=30)
            cur.execute(f"INSERT INTO {SCHEMA}.sessions (user_id, token, expires_at) VALUES (%s, %s, %s)", (user['id'], token, expires_at))
            conn.commit()
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({
                    'success': True,
                    'token': token,
                    'user': {
                        'id': str(user['id']),
                        'phone': user.get('phone'),
                        'email': user.get('email'),
                        'full_name': user.get('name'),
                        'is_verified': True,
                        'role': user.get('role', 'admin')
                    }
                }),
                'isBase64Encoded': False
            }
        
        else:
            conn.close()
            return {
                'statusCode': 404,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Endpoint не найден'}),
                'isBase64Encoded': False
            }
    
    except Exception as e:
        error_traceback = traceback.format_exc()
        print(f'[ERROR] Exception occurred: {str(e)}')
        print(f'[ERROR] Traceback:\n{error_traceback}')
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({
                'error': f'Ошибка сервера: {str(e)}',
                'details': error_traceback if os.environ.get('DEBUG') else None
            }),
            'isBase64Encoded': False
        }