import json
import os
import uuid
from typing import Dict, Any
from datetime import datetime
import psycopg2
from psycopg2.extras import RealDictCursor
import urllib.request
import urllib.parse
import hashlib


def get_db_connection():
    """Создает подключение к базе данных"""
    return psycopg2.connect(os.environ['DATABASE_URL'])


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    API для работы с платежами через Pally и ЮMoney
    
    Эндпоинты:
    - POST /create-payment - Создание платежа
    - POST /webhook - Обработка уведомлений от платежных систем
    - GET /payment/:id - Получение статуса платежа
    """
    method = event.get('httpMethod', 'GET')
    
    # CORS
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    try:
        body = json.loads(event.get('body', '{}')) if method == 'POST' else {}
        path = event.get('params', {}).get('path', '')
        
        if method == 'POST' and 'create-payment' in path:
            return create_payment(body)
        elif method == 'POST' and 'webhook' in path:
            return handle_webhook(body, event.get('headers', {}))
        elif method == 'GET' and path:
            return get_payment_status(path.split('/')[-1])
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


def create_payment(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Создание нового платежа
    Поддерживает Pally и ЮMoney
    """
    user_id = data.get('user_id')
    amount = float(data.get('amount', 0))
    payment_system = data.get('payment_system', 'yoomoney')  # 'pally' или 'yoomoney'
    return_url = data.get('return_url', 'https://yourapp.com/payment-success')
    
    if not user_id or amount <= 0:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Укажите user_id и сумму > 0'}),
            'isBase64Encoded': False
        }
    
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        # Проверяем существование пользователя
        cur.execute('SELECT id FROM users WHERE id = %s', (user_id,))
        if not cur.fetchone():
            return {
                'statusCode': 404,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Пользователь не найден'}),
                'isBase64Encoded': False
            }
        
        # Создаем транзакцию
        transaction_id = str(uuid.uuid4())
        cur.execute("""
            INSERT INTO transactions (id, user_id, amount, type, payment_system, status, description)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (transaction_id, user_id, amount, 'deposit', payment_system, 'pending', f'Пополнение баланса через {payment_system}'))
        
        conn.commit()
        
        # Формируем ссылку на оплату
        if payment_system == 'pally':
            payment_url = create_pally_payment(transaction_id, amount, return_url)
        else:  # yoomoney
            payment_url = create_yoomoney_payment(transaction_id, amount, return_url)
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({
                'success': True,
                'transaction_id': transaction_id,
                'payment_url': payment_url,
                'amount': amount
            }),
            'isBase64Encoded': False
        }
        
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        cur.close()
        conn.close()


def create_pally_payment(transaction_id: str, amount: float, return_url: str) -> str:
    """
    Создает платеж в системе Pally
    Документация: https://docs.pally.info
    """
    api_key = os.environ.get('PALLY_API_KEY')
    
    if not api_key:
        # Возвращаем тестовую ссылку если API ключ не настроен
        return f'https://demo-payment.pally.info?amount={amount}&order={transaction_id}'
    
    try:
        # Формируем запрос к Pally API
        payload = {
            'amount': amount,
            'currency': 'RUB',
            'order_id': transaction_id,
            'description': f'Пополнение баланса Jobs-App',
            'return_url': return_url,
            'webhook_url': 'https://yourapp.com/api/payments/webhook'
        }
        
        headers = {
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json'
        }
        
        req = urllib.request.Request(
            'https://api.pally.info/v1/payments',
            data=json.dumps(payload).encode('utf-8'),
            headers=headers,
            method='POST'
        )
        
        with urllib.request.urlopen(req, timeout=10) as response:
            result = json.loads(response.read().decode('utf-8'))
            return result.get('payment_url', '#')
            
    except Exception as e:
        print(f'Pally payment creation failed: {e}')
        return f'https://demo-payment.pally.info?amount={amount}&order={transaction_id}'


def create_yoomoney_payment(transaction_id: str, amount: float, return_url: str) -> str:
    """
    Создает платеж в системе ЮMoney
    Документация: https://yoomoney.ru/docs/payment-buttons/using-api/forms
    """
    client_id = os.environ.get('YOOMONEY_CLIENT_ID')
    
    if not client_id:
        # Возвращаем тестовую ссылку
        return f'https://demo-payment.yoomoney.ru?sum={amount}&label={transaction_id}'
    
    # Формируем URL для платежной формы ЮMoney
    params = {
        'receiver': client_id,
        'quickpay-form': 'shop',
        'targets': f'Пополнение баланса Jobs-App',
        'paymentType': 'AC',  # Банковская карта
        'sum': amount,
        'label': transaction_id,
        'successURL': return_url
    }
    
    return 'https://yoomoney.ru/quickpay/confirm.xml?' + urllib.parse.urlencode(params)


def handle_webhook(data: Dict[str, Any], headers: Dict[str, str]) -> Dict[str, Any]:
    """
    Обработка уведомлений от платежных систем о статусе платежа
    """
    # Определяем систему по данным
    if 'label' in data:  # ЮMoney
        return handle_yoomoney_webhook(data)
    elif 'order_id' in data:  # Pally
        return handle_pally_webhook(data, headers)
    else:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Unknown payment system'}),
            'isBase64Encoded': False
        }


def handle_yoomoney_webhook(data: Dict[str, Any]) -> Dict[str, Any]:
    """Обработка webhook от ЮMoney"""
    transaction_id = data.get('label')
    amount = float(data.get('withdraw_amount', 0))
    operation_id = data.get('operation_id')
    
    if not transaction_id:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Missing label'}),
            'isBase64Encoded': False
        }
    
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        # Находим транзакцию
        cur.execute('SELECT * FROM transactions WHERE id = %s', (transaction_id,))
        transaction = cur.fetchone()
        
        if not transaction:
            return {
                'statusCode': 404,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Transaction not found'}),
                'isBase64Encoded': False
            }
        
        # Проверяем что транзакция еще не обработана
        if transaction['status'] == 'completed':
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'success': True, 'message': 'Already processed'}),
                'isBase64Encoded': False
            }
        
        # Обновляем статус транзакции
        cur.execute("""
            UPDATE transactions
            SET status = 'completed', payment_id = %s, updated_at = NOW()
            WHERE id = %s
        """, (operation_id, transaction_id))
        
        # Пополняем баланс пользователя
        cur.execute("""
            UPDATE users
            SET balance = balance + %s
            WHERE id = %s
        """, (amount, transaction['user_id']))
        
        conn.commit()
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'success': True}),
            'isBase64Encoded': False
        }
        
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        cur.close()
        conn.close()


def handle_pally_webhook(data: Dict[str, Any], headers: Dict[str, str]) -> Dict[str, Any]:
    """Обработка webhook от Pally"""
    transaction_id = data.get('order_id')
    amount = float(data.get('amount', 0))
    status = data.get('status')
    payment_id = data.get('payment_id')
    
    # Проверка подписи (если настроена)
    # signature = headers.get('X-Pally-Signature')
    # if not verify_pally_signature(data, signature):
    #     return {'statusCode': 403, 'body': json.dumps({'error': 'Invalid signature'})}
    
    if status != 'success':
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'success': True, 'message': 'Payment not successful'}),
            'isBase64Encoded': False
        }
    
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        cur.execute('SELECT * FROM transactions WHERE id = %s', (transaction_id,))
        transaction = cur.fetchone()
        
        if not transaction or transaction['status'] == 'completed':
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'success': True}),
                'isBase64Encoded': False
            }
        
        cur.execute("""
            UPDATE transactions
            SET status = 'completed', payment_id = %s, updated_at = NOW()
            WHERE id = %s
        """, (payment_id, transaction_id))
        
        cur.execute("""
            UPDATE users
            SET balance = balance + %s
            WHERE id = %s
        """, (amount, transaction['user_id']))
        
        conn.commit()
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'success': True}),
            'isBase64Encoded': False
        }
        
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        cur.close()
        conn.close()


def get_payment_status(transaction_id: str) -> Dict[str, Any]:
    """Получение статуса платежа"""
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        cur.execute("""
            SELECT id, user_id, amount, type, payment_system, status, created_at, updated_at
            FROM transactions
            WHERE id = %s
        """, (transaction_id,))
        
        transaction = cur.fetchone()
        
        if not transaction:
            return {
                'statusCode': 404,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Transaction not found'}),
                'isBase64Encoded': False
            }
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({
                'success': True,
                'transaction': {
                    'id': str(transaction['id']),
                    'user_id': str(transaction['user_id']),
                    'amount': float(transaction['amount']),
                    'type': transaction['type'],
                    'payment_system': transaction['payment_system'],
                    'status': transaction['status'],
                    'created_at': transaction['created_at'].isoformat(),
                    'updated_at': transaction['updated_at'].isoformat()
                }
            }),
            'isBase64Encoded': False
        }
        
    finally:
        cur.close()
        conn.close()
