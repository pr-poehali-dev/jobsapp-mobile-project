type Vacancy = {
  id: string;
  title: string;
  description: string;
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
    description: 'Требуется активный менеджер для работы с клиентами. Полная занятость, официальное трудоустройство.',
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
    description: 'Работа на крупном складе. График 2/2. Без опыта, обучение на месте.',
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
      return JSON.parse(stored);
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
