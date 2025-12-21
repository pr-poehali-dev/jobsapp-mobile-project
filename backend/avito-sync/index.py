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
    Возвращает список вакансий в формате Jobs-App
    
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
            mock_vacancies = [
                {
                    'id': 'avito_mock_1',
                    'title': 'Продавец-консультант',
                    'description': 'Требуется активный продавец в магазин электроники. График 2/2, полный день. Обучение на месте.',
                    'salary': '35 000 - 50 000 ₽',
                    'city': 'Киров',
                    'phone': '+7 (833) 123-45-67',
                    'employerName': 'Магазин "Электроника"',
                    'employerTier': 'FREE',
                    'tags': ['С опытом', 'Для студентов'],
                    'status': 'published',
                    'source': 'avito'
                },
                {
                    'id': 'avito_mock_2',
                    'title': 'Водитель категории B',
                    'description': 'Требуется водитель для доставки товаров по городу. Автомобиль предоставляется. Топливо за счет компании.',
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
                    'description': 'Уборка производственных и складских помещений. График сменный 2/2.',
                    'salary': '30 000 ₽',
                    'city': 'Киров',
                    'phone': '+7 (833) 555-44-33',
                    'employerName': 'Завод "Кировский"',
                    'employerTier': 'FREE',
                    'tags': ['Без опыта', 'Вахтовый метод'],
                    'status': 'published',
                    'source': 'avito'
                },
                {
                    'id': 'avito_mock_4',
                    'title': 'Кассир',
                    'description': 'В продуктовый магазин требуется кассир. График сменный. Дружный коллектив.',
                    'salary': '28 000 - 35 000 ₽',
                    'city': 'Киров',
                    'phone': '+7 (833) 234-56-78',
                    'employerName': 'Супермаркет "Продукты"',
                    'employerTier': 'FREE',
                    'tags': ['Без опыта', 'Для студентов'],
                    'status': 'published',
                    'source': 'avito'
                },
                {
                    'id': 'avito_mock_5',
                    'title': 'Официант',
                    'description': 'В ресторан требуется официант. Гибкий график, чаевые. Питание за счет заведения.',
                    'salary': 'от 32 000 ₽',
                    'city': 'Киров',
                    'phone': '+7 (833) 345-67-89',
                    'employerName': 'Ресторан "Вкусно"',
                    'employerTier': 'FREE',
                    'tags': ['Подработка', 'Для студентов'],
                    'status': 'published',
                    'source': 'avito'
                },
                {
                    'id': 'avito_mock_6',
                    'title': 'Комплектовщик на склад',
                    'description': 'Требуется комплектовщик на крупный склад. Вахта 15/15. Проживание предоставляется.',
                    'salary': '45 000 - 60 000 ₽',
                    'city': 'Киров',
                    'phone': '+7 (833) 456-78-90',
                    'employerName': 'Логистический центр "Склад+"',
                    'employerTier': 'ECONOM',
                    'tags': ['Вахтовый метод', 'Без опыта'],
                    'status': 'published',
                    'source': 'avito'
                },
                {
                    'id': 'avito_mock_7',
                    'title': 'Охранник',
                    'description': 'Требуется охранник на торговый объект. Сутки через трое. Лицензия обязательна.',
                    'salary': '38 000 ₽',
                    'city': 'Киров',
                    'phone': '+7 (833) 567-89-01',
                    'employerName': 'ЧОП "Защита"',
                    'employerTier': 'FREE',
                    'tags': ['С опытом'],
                    'status': 'published',
                    'source': 'avito'
                },
                {
                    'id': 'avito_mock_8',
                    'title': 'Грузчик',
                    'description': 'Требуются грузчики на погрузочно-разгрузочные работы. График сменный. Выплаты еженедельно.',
                    'salary': '35 000 - 45 000 ₽',
                    'city': 'Киров',
                    'phone': '+7 (833) 678-90-12',
                    'employerName': 'Склад "Логистика"',
                    'employerTier': 'FREE',
                    'tags': ['Без опыта', 'Ежедневная оплата'],
                    'status': 'published',
                    'source': 'avito'
                },
                {
                    'id': 'avito_mock_9',
                    'title': 'Менеджер по продажам',
                    'description': 'В динамично развивающуюся компанию требуется менеджер. Активные продажи, работа с клиентами.',
                    'salary': '40 000 - 80 000 ₽',
                    'city': 'Киров',
                    'phone': '+7 (833) 789-01-23',
                    'employerName': 'ООО "Бизнес Решения"',
                    'employerTier': 'VIP',
                    'tags': ['С опытом'],
                    'status': 'published',
                    'source': 'avito'
                },
                {
                    'id': 'avito_mock_10',
                    'title': 'Оператор call-центра',
                    'description': 'Требуется оператор для входящих звонков. Удаленная работа возможна. Обучение предоставляется.',
                    'salary': '30 000 - 40 000 ₽',
                    'city': 'Киров',
                    'phone': '+7 (833) 890-12-34',
                    'employerName': 'Call-центр "Связь"',
                    'employerTier': 'FREE',
                    'tags': ['Без опыта', 'Для студентов'],
                    'status': 'published',
                    'source': 'avito'
                },
                {
                    'id': 'avito_mock_11',
                    'title': 'Курьер',
                    'description': 'Требуется курьер для доставки еды. Гибкий график, ежедневные выплаты.',
                    'salary': 'от 45 000 ₽',
                    'city': 'Киров',
                    'phone': '+7 (833) 901-23-45',
                    'employerName': 'Доставка еды "Быстро"',
                    'employerTier': 'ECONOM',
                    'tags': ['Подработка', 'Ежедневная оплата'],
                    'status': 'published',
                    'source': 'avito'
                },
                {
                    'id': 'avito_mock_12',
                    'title': 'Слесарь-сантехник',
                    'description': 'В управляющую компанию требуется слесарь-сантехник. Полный рабочий день.',
                    'salary': '40 000 - 50 000 ₽',
                    'city': 'Киров',
                    'phone': '+7 (833) 012-34-56',
                    'employerName': 'УК "Наш дом"',
                    'employerTier': 'FREE',
                    'tags': ['С опытом'],
                    'status': 'published',
                    'source': 'avito'
                },
                {
                    'id': 'avito_mock_13',
                    'title': 'Повар',
                    'description': 'В кафе требуется повар. График 2/2. Питание за счет заведения.',
                    'salary': '35 000 - 45 000 ₽',
                    'city': 'Киров',
                    'phone': '+7 (833) 123-45-78',
                    'employerName': 'Кафе "Уют"',
                    'employerTier': 'FREE',
                    'tags': ['С опытом'],
                    'status': 'published',
                    'source': 'avito'
                },
                {
                    'id': 'avito_mock_14',
                    'title': 'Администратор',
                    'description': 'В фитнес-клуб требуется администратор. График сменный. Бесплатный абонемент.',
                    'salary': '32 000 - 38 000 ₽',
                    'city': 'Киров',
                    'phone': '+7 (833) 234-56-89',
                    'employerName': 'Фитнес-клуб "Спорт"',
                    'employerTier': 'FREE',
                    'tags': ['Без опыта', 'Для студентов'],
                    'status': 'published',
                    'source': 'avito'
                },
                {
                    'id': 'avito_mock_15',
                    'title': 'Электромонтер',
                    'description': 'Требуется электромонтер на производство. Полный рабочий день. Соцпакет.',
                    'salary': '45 000 - 55 000 ₽',
                    'city': 'Киров',
                    'phone': '+7 (833) 345-67-90',
                    'employerName': 'Завод "Промышленник"',
                    'employerTier': 'ECONOM',
                    'tags': ['С опытом'],
                    'status': 'published',
                    'source': 'avito'
                },
                {
                    'id': 'avito_mock_16',
                    'title': 'Бармен',
                    'description': 'В бар требуется бармен. Гибкий график, чаевые. Обучение предоставляется.',
                    'salary': 'от 35 000 ₽',
                    'city': 'Киров',
                    'phone': '+7 (833) 456-78-01',
                    'employerName': 'Бар "Cocktail"',
                    'employerTier': 'FREE',
                    'tags': ['Без опыта', 'Подработка'],
                    'status': 'published',
                    'source': 'avito'
                },
                {
                    'id': 'avito_mock_17',
                    'title': 'Мерчендайзер',
                    'description': 'Требуется мерчендайзер для работы в торговых точках. Разъездной характер работы.',
                    'salary': '30 000 - 40 000 ₽',
                    'city': 'Киров',
                    'phone': '+7 (833) 567-89-12',
                    'employerName': 'Компания "Дистрибуция"',
                    'employerTier': 'FREE',
                    'tags': ['Без опыта'],
                    'status': 'published',
                    'source': 'avito'
                },
                {
                    'id': 'avito_mock_18',
                    'title': 'Кладовщик',
                    'description': 'На склад требуется кладовщик. Работа с документами, приемка товара.',
                    'salary': '35 000 ₽',
                    'city': 'Киров',
                    'phone': '+7 (833) 678-90-23',
                    'employerName': 'Склад "Товары"',
                    'employerTier': 'FREE',
                    'tags': ['С опытом'],
                    'status': 'published',
                    'source': 'avito'
                },
                {
                    'id': 'avito_mock_19',
                    'title': 'Промоутер',
                    'description': 'Требуются промоутеры для раздачи листовок. Гибкий график, подработка.',
                    'salary': '1 500 ₽ за смену',
                    'city': 'Киров',
                    'phone': '+7 (833) 789-01-34',
                    'employerName': 'Рекламное агентство "Промо"',
                    'employerTier': 'FREE',
                    'tags': ['Без опыта', 'Подработка', 'Для студентов'],
                    'status': 'published',
                    'source': 'avito'
                },
                {
                    'id': 'avito_mock_20',
                    'title': 'Токарь',
                    'description': 'Требуется токарь на производство. Полный рабочий день. Соцпакет, премии.',
                    'salary': '50 000 - 65 000 ₽',
                    'city': 'Киров',
                    'phone': '+7 (833) 890-12-45',
                    'employerName': 'Машиностроительный завод',
                    'employerTier': 'VIP',
                    'tags': ['С опытом'],
                    'status': 'published',
                    'source': 'avito'
                }
            ]
            
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
                    'vacancies': mock_vacancies,
                    'total': len(mock_vacancies),
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