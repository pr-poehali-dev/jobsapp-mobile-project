type Vacancy = {
  id: string;
  title: string;
  description: string;
  requirements?: string;
  responsibilities?: string;
  experience?: string;
  schedule?: string;
  salary: string;
  city: string;
  phone: string;
  employerName: string;
  employerTier: 'FREE' | 'ECONOM' | 'VIP' | 'PREMIUM';
  tags: string[];
  status: 'pending' | 'published' | 'rejected';
  source?: 'manual' | 'avito';
};

export const MOCK_VACANCIES: Vacancy[] = [
  {
    id: '1',
    title: 'Менеджер по продажам',
    description: 'Требуется активный менеджер для работы с клиентами.',
    requirements: 'Высшее образование, опыт продаж от 1 года, знание техник активных продаж',
    responsibilities: 'Поиск новых клиентов, ведение переговоров, заключение договоров, работа с CRM',
    experience: 'От 1 года',
    schedule: 'Полная занятость',
    salary: '60 000 - 80 000 ₽',
    city: 'Москва',
    phone: '+7 (999) 123-45-67',
    employerName: 'ООО "Продажи+"',
    employerTier: 'VIP',
    tags: ['С опытом', 'Ежедневная оплата'],
    status: 'published',
  },
  {
    id: '2',
    title: 'Грузчик на склад',
    description: 'Работа на крупном складе. График 2/2.',
    requirements: 'Физическая выносливость, ответственность',
    responsibilities: 'Погрузка и разгрузка товаров, сортировка, поддержание порядка на складе',
    experience: 'Без опыта',
    schedule: 'Полная занятость',
    salary: '45 000 ₽',
    city: 'Санкт-Петербург',
    phone: '+7 (999) 987-65-43',
    employerName: 'Склад №1',
    employerTier: 'PREMIUM',
    tags: ['Без опыта', 'Вахтовый метод'],
    status: 'published',
  },
  {
    id: '3',
    title: 'Курьер',
    description: 'Доставка заказов по городу. Свободный график, ежедневные выплаты.',
    requirements: 'Наличие личного транспорта (велосипед/самокат), знание города',
    responsibilities: 'Доставка заказов клиентам, работа с приложением курьера',
    experience: 'Без опыта',
    schedule: 'Частичная занятость',
    salary: 'от 50 000 ₽',
    city: 'Киров',
    phone: '+7 (999) 555-44-33',
    employerName: 'Быстрая доставка',
    employerTier: 'ECONOM',
    tags: ['Подработка', 'Ежедневная оплата', 'Для студентов'],
    status: 'published',
  },
];

// API для работы с моковыми вакансиями через localStorage
const STORAGE_KEY = 'mock_vacancies';

export function getMockVacancies(): Vacancy[] {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      const vacancies = JSON.parse(stored);
      // Проверяем версию данных - если у первой вакансии нет новых полей, обновляем все
      if (vacancies.length > 0 && !('requirements' in vacancies[0])) {
        console.log('Updating mock vacancies to new format');
        localStorage.setItem(STORAGE_KEY, JSON.stringify(MOCK_VACANCIES));
        return MOCK_VACANCIES;
      }
      return vacancies;
    } catch (e) {
      console.error('Error parsing mock vacancies:', e);
    }
  }
  // Если нет сохраненных данных, используем дефолтные
  localStorage.setItem(STORAGE_KEY, JSON.stringify(MOCK_VACANCIES));
  return MOCK_VACANCIES;
}

export function saveMockVacancies(vacancies: Vacancy[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(vacancies));
}

export function deleteMockVacancy(id: string): void {
  const vacancies = getMockVacancies();
  const filtered = vacancies.filter(v => v.id !== id);
  saveMockVacancies(filtered);
}

export function addMockVacancy(vacancy: Vacancy): void {
  const vacancies = getMockVacancies();
  saveMockVacancies([...vacancies, vacancy]);
}