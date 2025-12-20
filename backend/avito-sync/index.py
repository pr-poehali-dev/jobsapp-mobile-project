import json
import re
from typing import Dict, Any, List
from urllib.parse import urlencode
import urllib.request
from html.parser import HTMLParser


class AvitoParser(HTMLParser):
    """
    Простой парсер HTML для извлечения данных вакансий с Avito
    """
    def __init__(self):
        super().__init__()
        self.vacancies: List[Dict[str, Any]] = []
        self.current_vacancy: Dict[str, Any] = {}
        self.in_title = False
        self.in_price = False
        self.in_location = False
        
    def handle_starttag(self, tag: str, attrs: List[tuple]):
        attrs_dict = dict(attrs)
        
        # Поиск заголовка вакансии
        if 'data-marker' in attrs_dict and 'item-title' in attrs_dict.get('data-marker', ''):
            self.in_title = True
            
        # Поиск зарплаты
        if 'data-marker' in attrs_dict and 'item-price' in attrs_dict.get('data-marker', ''):
            self.in_price = True
            
        # Поиск города
        if 'data-marker' in attrs_dict and 'item-address' in attrs_dict.get('data-marker', ''):
            self.in_location = True
    
    def handle_data(self, data: str):
        data = data.strip()
        if not data:
            return
            
        if self.in_title:
            self.current_vacancy['title'] = data
            self.in_title = False
            
        if self.in_price:
            self.current_vacancy['salary'] = data
            self.in_price = False
            
        if self.in_location:
            self.current_vacancy['city'] = data
            self.in_location = False
            
    def handle_endtag(self, tag: str):
        if self.current_vacancy and 'title' in self.current_vacancy:
            if self.current_vacancy not in self.vacancies:
                self.vacancies.append(self.current_vacancy.copy())
                self.current_vacancy = {}


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Синхронизирует вакансии с Avito (Кировская область)
    Возвращает список вакансий в формате JobsApp
    
    Args:
        event: HTTP событие с параметрами запроса
        context: контекст выполнения функции
    
    Returns:
        JSON с массивом вакансий или ошибкой
    """
    method: str = event.get('httpMethod', 'GET')
    
    # CORS preflight
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    if method != 'GET':
        return {
            'statusCode': 405,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Method not allowed'}),
            'isBase64Encoded': False
        }
    
    try:
        # Параметры для запроса к Avito
        params = event.get('queryStringParameters', {})
        page = int(params.get('page', '1'))
        limit = int(params.get('limit', '20'))
        
        # URL Avito для вакансий Кировской области
        avito_url = 'https://www.avito.ru/kirovskaya_oblast/vakansii'
        
        # Добавляем заголовки, чтобы выглядеть как браузер
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
        }
        
        # Выполняем запрос
        req = urllib.request.Request(avito_url, headers=headers)
        
        try:
            with urllib.request.urlopen(req, timeout=10) as response:
                html_content = response.read().decode('utf-8')
        except Exception as fetch_error:
            # Если не удалось получить реальные данные, вернем моковые вакансии
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'success': True,
                    'source': 'mock',
                    'message': 'Avito недоступен, используются тестовые данные',
                    'vacancies': [
                        {
                            'id': 'avito_mock_1',
                            'title': 'Продавец-консультант',
                            'description': 'Требуется активный продавец в магазин. График 2/2, полный день.',
                            'salary': '35 000 - 50 000 ₽',
                            'city': 'Киров',
                            'phone': '+7 (833) 123-45-67',
                            'employerName': 'Магазин "Товары для дома"',
                            'employerTier': 'FREE',
                            'tags': ['С опытом', 'Для студентов'],
                            'status': 'published',
                            'source': 'avito'
                        },
                        {
                            'id': 'avito_mock_2',
                            'title': 'Водитель категории B',
                            'description': 'Требуется водитель для доставки товаров по городу. Автомобиль предоставляется.',
                            'salary': 'от 40 000 ₽',
                            'city': 'Киров',
                            'phone': '+7 (833) 987-65-43',
                            'employerName': 'Служба доставки "Быстро"',
                            'employerTier': 'ECONOM',
                            'tags': ['С опытом', 'Ежедневная оплата'],
                            'status': 'published',
                            'source': 'avito'
                        },
                        {
                            'id': 'avito_mock_3',
                            'title': 'Уборщик производственных помещений',
                            'description': 'Уборка производственных и складских помещений. График сменный.',
                            'salary': '30 000 ₽',
                            'city': 'Киров',
                            'phone': '+7 (833) 555-44-33',
                            'employerName': 'Завод "Кировский"',
                            'employerTier': 'FREE',
                            'tags': ['Без опыта', 'Вахтовый метод'],
                            'status': 'published',
                            'source': 'avito'
                        }
                    ],
                    'total': 3,
                    'page': page
                }),
                'isBase64Encoded': False
            }
        
        # Парсим HTML
        parser = AvitoParser()
        parser.feed(html_content)
        
        # Преобразуем в формат JobsApp
        vacancies = []
        for idx, raw_vacancy in enumerate(parser.vacancies[:limit], start=1):
            vacancy = {
                'id': f'avito_{page}_{idx}',
                'title': raw_vacancy.get('title', 'Вакансия без названия'),
                'description': f"Вакансия с портала Avito. Подробности по телефону.",
                'salary': raw_vacancy.get('salary', 'Не указана'),
                'city': raw_vacancy.get('city', 'Киров'),
                'phone': '+7 (833) 000-00-00',  # Номер телефона нужно парсить отдельно
                'employerName': 'Работодатель с Avito',
                'employerTier': 'FREE',
                'tags': ['Подработка'],
                'status': 'published',
                'source': 'avito'
            }
            vacancies.append(vacancy)
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'success': True,
                'source': 'avito',
                'vacancies': vacancies,
                'total': len(vacancies),
                'page': page
            }),
            'isBase64Encoded': False
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'error': 'Internal server error',
                'message': str(e)
            }),
            'isBase64Encoded': False
        }
