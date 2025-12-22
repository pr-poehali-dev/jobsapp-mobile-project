import { useState, useRef, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { AuthSystem } from '@/components/AuthSystem';
import { PaymentDialog } from '@/components/PaymentDialog';
import { CitySelector } from '@/components/CitySelector';
import { EmployerBottomNav } from '@/components/EmployerBottomNav';
import { InstallPrompt } from '@/components/InstallPrompt';
import { getAllCities } from '@/data/cities';

interface CitySearchInputProps {
  value: string;
  onChange: (city: string) => void;
}

function CitySearchInput({ value, onChange }: CitySearchInputProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const allCities = getAllCities();

  const filteredCities = allCities.filter(city => 
    city.toLowerCase().includes((searchQuery || value).toLowerCase())
  );

  return (
    <div className="relative">
      <Input
        placeholder="Начните вводить название города..."
        value={searchQuery || value}
        onChange={(e) => {
          setSearchQuery(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
      />
      {isOpen && filteredCities.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-y-auto">
          {filteredCities.slice(0, 50).map((city) => (
            <div
              key={city}
              className="px-3 py-2 cursor-pointer hover:bg-accent text-sm"
              onClick={() => {
                onChange(city);
                setSearchQuery('');
                setIsOpen(false);
              }}
            >
              {city}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
import { getMockVacancies } from '@/data/mock-vacancies';

type UserRole = 'guest' | 'seeker' | 'employer' | 'admin';

type Vacancy = {
  id: string;
  title: string;
  description: string;
  requirements?: string;
  responsibilities?: string;
  experience?: string;
  noExperience?: boolean;
  schedule?: string;
  salary: string;
  city: string;
  phone: string;
  employerName: string;
  employerTier: 'ECONOM' | 'VIP' | 'PREMIUM';
  tags: string[];
  image?: string;
  status: 'pending' | 'published' | 'rejected';
  source?: 'manual' | 'avito' | 'database';
};

type User = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: UserRole;
  balance: number;
  tier: 'FREE' | 'ECONOM' | 'VIP' | 'PREMIUM';
  vacanciesThisMonth: number;
};

const TIERS = [
  { name: 'FREE', price: 0, limit: 0, badge: '', moderationTime: '-', description: 'Без размещения вакансий' },
  { name: 'ECONOM', price: 100, limit: 5, badge: '', moderationTime: '48' },
  { name: 'VIP', price: 500, limit: 30, badge: '⭐', moderationTime: '24' },
  { name: 'PREMIUM', price: 2500, limit: 150, badge: '👑', moderationTime: 'моментальная' },
  { name: 'RUSH', price: 500, limit: 1, badge: '', moderationTime: 'моментальная', isOneTime: true },
];

const TAGS = [
  'Вахтовый метод',
  'Подработка',
  'Ежедневная оплата',
  'Без опыта',
  'С опытом',
  'Для студентов',
];

const AVITO_SYNC_URL = 'https://functions.poehali.dev/300cf95d-737b-4557-81c3-01bccd37f7a4';
const ADMIN_API = 'https://functions.poehali.dev/0d65638b-a8d6-40af-971b-31d0f9e356d0';

export default function Index() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [vacancies, setVacancies] = useState<Vacancy[]>(getMockVacancies());
  const [isLoadingAvito, setIsLoadingAvito] = useState(false);
  const [currentVacancyIndex, setCurrentVacancyIndex] = useState(0);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [showBalanceDialog, setShowBalanceDialog] = useState(false);
  const [showVacancyDialog, setShowVacancyDialog] = useState(false);
  const [showAdminDialog, setShowAdminDialog] = useState(false);
  const [showTierDialog, setShowTierDialog] = useState(false);
  const [showLinkEmailDialog, setShowLinkEmailDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [userVacancies, setUserVacancies] = useState<Vacancy[]>([]);
  const touchStartY = useRef<number>(0);
  const isDragging = useRef<boolean>(false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [swipeDirection, setSwipeDirection] = useState<'up' | 'down' | null>(null);

  // Загрузка пользователя из localStorage при монтировании
  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        setCurrentUser(user);
      } catch (error) {
        console.error('Ошибка загрузки пользователя:', error);
        localStorage.removeItem('currentUser');
      }
    }
  }, []);

  // Сохранение пользователя в localStorage при изменении
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('currentUser');
    }
  }, [currentUser]);

  // Загрузка сохраненного города из localStorage
  useEffect(() => {
    const savedCity = localStorage.getItem('selectedCity');
    if (savedCity) {
      setSelectedCity(savedCity);
    }
  }, []);

  // Сохранение выбранного города в localStorage
  useEffect(() => {
    if (selectedCity) {
      localStorage.setItem('selectedCity', selectedCity);
    } else {
      localStorage.removeItem('selectedCity');
    }
  }, [selectedCity]);

  const loadPublishedVacancies = async () => {
    try {
      const response = await fetch(`${ADMIN_API}?path=vacancies&status=published&limit=100`);
      const data = await response.json();
      
      if (data.success && data.vacancies) {
        const dbVacancies = data.vacancies.map((v: any) => ({
          id: v.id,
          title: v.title,
          description: v.description,
          requirements: v.requirements,
          responsibilities: v.responsibilities,
          experience: v.experience,
          schedule: v.schedule,
          salary: v.salary,
          city: v.city,
          phone: v.phone,
          employerName: v.employer_name,
          employerTier: v.employer_tier,
          tags: v.tags || [],
          status: 'published' as const,
          source: 'database' as const
        }));
        
        setVacancies(prev => [
          ...prev.filter(v => v.source !== 'database'),
          ...dbVacancies
        ]);
      }
    } catch (error) {
      console.error('Ошибка загрузки вакансий из БД:', error);
    }
  };

  const loadAvitoVacancies = async () => {
    setIsLoadingAvito(true);
    try {
      const response = await fetch(AVITO_SYNC_URL);
      const data = await response.json();
      
      if (data.success && data.vacancies) {
        // Добавляем вакансии с Avito к существующим
        const avitoVacancies = data.vacancies.map((v: any) => ({
          ...v,
          source: 'avito' as const
        }));
        
        // Убираем дубликаты по ID
        const existingIds = new Set(vacancies.map(v => v.id));
        const newVacancies = avitoVacancies.filter((v: Vacancy) => !existingIds.has(v.id));
        
        if (newVacancies.length > 0) {
          setVacancies(prev => [...prev, ...newVacancies]);
        }
      }
    } catch (error) {
      console.error('Ошибка загрузки вакансий с Avito:', error);
    } finally {
      setIsLoadingAvito(false);
    }
  };

  // Загрузка вакансий работодателя
  const loadEmployerVacancies = async () => {
    if (!currentUser || currentUser.role !== 'employer') return;
    try {
      const response = await fetch(`${ADMIN_API}?path=vacancies&user_id=${currentUser.id}&limit=50`);
      const data = await response.json();
      if (data.success) {
        const mappedVacancies = data.vacancies.map((v: any) => ({
          id: v.id,
          title: v.title,
          description: v.description,
          requirements: v.requirements,
          responsibilities: v.responsibilities,
          experience: v.experience,
          schedule: v.schedule,
          salary: v.salary,
          city: v.city,
          phone: v.phone,
          employerName: v.employer_name,
          employerTier: v.employer_tier,
          tags: v.tags || [],
          status: v.status,
          source: 'database' as const,
          created_at: v.created_at
        }));
        setUserVacancies(mappedVacancies);
      }
    } catch (error) {
      console.error('Ошибка загрузки вакансий работодателя:', error);
    }
  };

  // Загрузка вакансий с Avito и из БД при монтировании компонента
  useEffect(() => {
    loadAvitoVacancies();
    loadPublishedVacancies();
  }, []);

  // Загрузка вакансий работодателя при входе
  useEffect(() => {
    if (currentUser?.role === 'employer') {
      loadEmployerVacancies();
    }
  }, [currentUser]);

  const filteredVacancies = useMemo(() => {
    return vacancies.filter((v) => {
      if (v.status !== 'published') return false;
      
      // Поиск по названию, описанию, требованиям и обязанностям
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const searchableText = [
          v.title,
          v.description,
          v.requirements,
          v.responsibilities,
          v.experience,
          v.schedule
        ].filter(Boolean).join(' ').toLowerCase();
        
        if (!searchableText.includes(query)) return false;
      }
      
      if (selectedTags.length > 0 && !selectedTags.some((tag) => v.tags.includes(tag))) return false;
      if (selectedCity && v.city !== selectedCity) return false;
      return true;
    }).sort((a, b) => {
      // Сортировка: PREMIUM > VIP > ECONOM
      const tierOrder: Record<string, number> = {
        'PREMIUM': 3,
        'VIP': 2,
        'ECONOM': 1
      };
      return (tierOrder[b.employerTier] || 0) - (tierOrder[a.employerTier] || 0);
    });
  }, [vacancies, searchQuery, selectedTags, selectedCity]);

  // Отключаем скролл страницы на мобильных устройствах
  useEffect(() => {
    const isMobile = window.innerWidth < 768;
    if (isMobile && filteredVacancies.length > 0) {
      document.body.style.overflow = 'hidden';
      document.body.style.height = '100vh';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.height = '';
    };
  }, [filteredVacancies]);

  // Обновление вакансий при изменении в localStorage
  useEffect(() => {
    const handleStorageChange = () => {
      const mockVacancies = getMockVacancies();
      // Обновляем только моковые вакансии, сохраняя Avito и БД
      setVacancies(prev => [
        ...mockVacancies,
        ...prev.filter(v => v.source === 'avito' || v.source === 'database')
      ]);
    };

    const handleVacancyApproved = () => {
      loadPublishedVacancies();
    };

    const handleVacancyDeleted = () => {
      loadPublishedVacancies();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('vacancy-approved', handleVacancyApproved);
    window.addEventListener('vacancy-deleted', handleVacancyDeleted);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('vacancy-approved', handleVacancyApproved);
      window.removeEventListener('vacancy-deleted', handleVacancyDeleted);
    };
  }, []);

  const handleSwipeNext = () => {
    if (currentVacancyIndex < filteredVacancies.length - 1) {
      setCurrentVacancyIndex(currentVacancyIndex + 1);
    } else {
      setCurrentVacancyIndex(0);
    }
  };

  const handleSwipePrev = () => {
    if (currentVacancyIndex > 0) {
      setCurrentVacancyIndex(currentVacancyIndex - 1);
    } else {
      setCurrentVacancyIndex(filteredVacancies.length - 1); // Зацикливаем на конец
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    isDragging.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current) return;
    
    e.preventDefault();
    
    const currentY = e.touches[0].clientY;
    const diff = currentY - touchStartY.current;
    
    setSwipeOffset(diff);
  };

  const handleTouchEnd = () => {
    if (!isDragging.current) return;
    
    const swipeThreshold = 80;

    if (swipeOffset < -swipeThreshold) {
      handleSwipeNext();
    } else if (swipeOffset > swipeThreshold) {
      handleSwipePrev();
    }
    
    isDragging.current = false;
    setSwipeOffset(0);
  };



  const handleAddBalance = (amount: number) => {
    if (currentUser) {
      setCurrentUser({ ...currentUser, balance: currentUser.balance + amount });
      setShowBalanceDialog(false);
      toast({ title: 'Баланс пополнен', description: `+${amount} ₽` });
    }
  };

  const handleCreateVacancy = async (vacancy: Partial<Vacancy>) => {
    if (!currentUser) return;

    // Админы могут размещать вакансии без ограничений
    const isAdmin = currentUser.role === 'admin';

    // Проверка лимита вакансий по тарифу
    const tierLimit = TIERS.find((t) => t.name === currentUser.tier)?.limit || 5;
    if (!isAdmin && currentUser.vacanciesThisMonth >= tierLimit) {
      toast({
        title: 'Лимит исчерпан',
        description: `Вы использовали ${currentUser.vacanciesThisMonth} из ${tierLimit} вакансий. Повысьте тариф для размещения большего количества вакансий.`,
        variant: 'destructive',
      });
      setShowTierDialog(true);
      return;
    }

    try {
      // Отправляем вакансию в БД через API
      const payload = {
        user_id: currentUser.id,
        title: vacancy.title || '',
        description: vacancy.description || '',
        requirements: vacancy.requirements || '',
        responsibilities: vacancy.responsibilities || '',
        experience: vacancy.noExperience ? 'Без опыта' : (vacancy.experience || ''),
        schedule: vacancy.schedule || '',
        salary: vacancy.salary || '',
        city: vacancy.city || '',
        phone: vacancy.phone || currentUser.phone || '+7',
        employer_name: currentUser.name,
        employer_tier: isAdmin ? 'PREMIUM' : currentUser.tier,
        tags: vacancy.tags || []
      };
      
      console.log('Creating vacancy with payload:', payload);
      
      const response = await fetch(`${ADMIN_API}?path=vacancies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      console.log('Backend response:', data);

      if (data.success) {
        // Обновляем счетчик вакансий из ответа бэкенда
        setCurrentUser({ 
          ...currentUser, 
          vacanciesThisMonth: data.vacancies_this_month 
        });
        
        setShowVacancyDialog(false);

        // Если вакансия сразу опубликована - обновляем список
        if (data.vacancy.status === 'published') {
          loadPublishedVacancies();
        }
        
        // Обновляем список вакансий работодателя
        if (currentUser.role === 'employer') {
          loadEmployerVacancies();
        }

        toast({
          title: (isAdmin || currentUser.tier === 'PREMIUM') ? 'Вакансия опубликована' : 'Объявление отправлено',
          description: (isAdmin || currentUser.tier === 'PREMIUM') ? 'Вакансия сразу появилась в ленте' : 'Ожидайте модерации. Вы получите уведомление после проверки.',
        });
      } else {
        throw new Error(data.error || 'Не удалось создать вакансию');
      }
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось создать вакансию',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteEmployerVacancy = async (vacancyId: string) => {
    if (!currentUser) return;
    
    try {
      const response = await fetch(`${ADMIN_API}?path=vacancies`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vacancy_id: vacancyId })
      });
      const data = await response.json();
      if (data.success) {
        // Обновляем счетчик вакансий из ответа бэкенда
        setCurrentUser({ 
          ...currentUser, 
          vacanciesThisMonth: data.vacancies_this_month 
        });
        
        toast({ title: 'Вакансия удалена' });
        loadEmployerVacancies();
        loadPublishedVacancies();
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось удалить вакансию',
        variant: 'destructive'
      });
    }
  };

  const currentVacancy = filteredVacancies[currentVacancyIndex];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 bg-accent text-accent-foreground shadow-md h-12 md:h-auto">
        <div className="container mx-auto px-2 md:px-4 h-12 md:h-auto md:py-3 flex items-center justify-between">
          <div className="flex items-center gap-1 md:gap-2">
            <Icon name="Briefcase" size={16} className="md:w-6 md:h-6" />
            <h1 className="text-sm md:text-xl font-bold">Jobs-App</h1>
          </div>
          <div className="flex items-center gap-1 md:gap-2">
            {currentUser ? (
              currentUser.role === 'admin' ? (
                <>
                  <Button 
                    size="sm" 
                    onClick={() => setShowVacancyDialog(true)}
                    className="hidden md:flex"
                  >
                    Разместить вакансию
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => setShowAdminDialog(true)}
                    className="bg-white text-gray-900 border-gray-300 hover:bg-gray-50 text-xs md:text-sm px-2 md:px-3 h-7 md:h-9"
                  >
                    <Icon name="Shield" size={14} className="mr-1 md:mr-2 md:w-4 md:h-4" />
                    <span className="hidden md:inline">Админка</span>
                  </Button>
                </>
              ) : (
                <>
                  {currentUser.role === 'employer' && (
                    <Button 
                      size="sm" 
                      onClick={() => {
                        if (currentUser.tier === 'FREE') {
                          setShowTierDialog(true);
                          toast({
                            title: 'Требуется тариф',
                            description: 'Выберите тариф для размещения вакансий',
                            variant: 'destructive'
                          });
                        } else {
                          setShowVacancyDialog(true);
                        }
                      }} 
                      className="hidden md:flex"
                      variant={currentUser.tier === 'FREE' ? 'outline' : 'default'}
                    >
                      {currentUser.tier === 'FREE' ? (
                        <>
                          <Icon name="Lock" size={16} className="mr-2" />
                          Купить тариф
                        </>
                      ) : (
                        'Разместить вакансию'
                      )}
                    </Button>
                  )}
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => setShowProfileDialog(true)}
                    className="hidden md:flex bg-white text-gray-900 border-gray-300 hover:bg-gray-50"
                  >
                    {currentUser.name}
                    {currentUser.role === 'employer' && (
                      <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-900">
                        {currentUser.balance} ₽
                      </Badge>
                    )}
                  </Button>
                  <Button 
                    size="icon" 
                    variant="outline" 
                    onClick={() => setShowProfileDialog(true)}
                    className="md:hidden rounded-full h-7 w-7 md:h-10 md:w-10 bg-white text-gray-900 border-gray-300 hover:bg-gray-50"
                  >
                    <Icon name="User" size={16} className="md:w-5 md:h-5" />
                  </Button>
                </>
              )
            ) : (
              <Button size="sm" onClick={() => setShowAuthDialog(true)} className="text-xs md:text-sm px-2 md:px-3 h-7 md:h-9">
                Войти
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className={`container mx-auto px-4 py-4 flex-1 flex flex-col ${currentUser?.role === 'employer' ? 'mb-16 md:mb-0' : ''}`}>
        {/* Баннер для работодателей с FREE тарифом */}
        {currentUser?.role === 'employer' && currentUser.tier === 'FREE' && (
          <Card className="mb-4 border-primary bg-gradient-to-r from-primary/10 to-primary/5">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="bg-primary/20 rounded-full p-2">
                  <Icon name="Rocket" size={24} className="text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1">Начните размещать вакансии</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Для публикации вакансий необходимо приобрести тариф. Выберите подходящий план и начните находить сотрудников уже сегодня!
                  </p>
                  <Button onClick={() => setShowTierDialog(true)} size="sm">
                    <Icon name="Sparkles" size={16} className="mr-2" />
                    Выбрать тариф
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="mb-4 space-y-3 relative z-10 bg-background md:bg-transparent">
          <div className="flex gap-2">
            <Input
              placeholder="Поиск вакансий..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <CitySelector 
              selectedCity={selectedCity} 
              onCityChange={setSelectedCity}
            />
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => {
                loadAvitoVacancies();
                loadPublishedVacancies();
              }}
              disabled={isLoadingAvito}
            >
              <Icon name={isLoadingAvito ? "Loader2" : "RefreshCw"} size={16} className={isLoadingAvito ? "animate-spin" : ""} />
            </Button>
          </div>
          <div className="flex gap-2 flex-wrap">
            {TAGS.map((tag) => (
              <Badge
                key={tag}
                variant={selectedTags.includes(tag) ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => {
                  if (selectedTags.includes(tag)) {
                    setSelectedTags(selectedTags.filter((t) => t !== tag));
                  } else {
                    setSelectedTags([...selectedTags, tag]);
                  }
                }}
              >
                {tag}
              </Badge>
            ))}
          </div>
        </div>

        <div className="flex-1 relative">
          {filteredVacancies.length === 0 ? (
            <div className="text-center py-12">
              <Icon name="BriefcaseX" size={48} className="mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Вакансий не найдено</p>
            </div>
          ) : (
            <>
              <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredVacancies.map((vacancy) => (
                  <VacancyCard
                    key={vacancy.id}
                    vacancy={vacancy}
                    currentUser={currentUser}
                    onAuthClick={() => setShowAuthDialog(true)}
                  />
                ))}
              </div>

              <div 
                className="md:hidden relative touch-none" 
                style={{ 
                  height: 'calc(100vh - 200px)',
                  overflow: 'hidden'
                }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                {filteredVacancies.map((vacancy, index) => {
                  const isActive = index === currentVacancyIndex;
                  const isPrev = index === currentVacancyIndex - 1 || (currentVacancyIndex === 0 && index === filteredVacancies.length - 1);
                  const isNext = index === currentVacancyIndex + 1 || (currentVacancyIndex === filteredVacancies.length - 1 && index === 0);
                  const isVisible = isActive || isPrev || isNext;
                  
                  if (!isVisible) return null;
                  
                  let translateY = 0;
                  if (isActive) {
                    translateY = swipeOffset;
                  } else if (isPrev) {
                    translateY = -100 + (swipeOffset > 0 ? swipeOffset / window.innerHeight * 100 : 0);
                  } else if (isNext) {
                    translateY = 100 + (swipeOffset < 0 ? swipeOffset / window.innerHeight * 100 : 0);
                  }
                  
                  const baseClassName = 'w-full max-w-md swipe-card touch-none flex-shrink-0 absolute left-0 right-0 mx-auto px-4';
                  const tierClassName = vacancy.employerTier === 'PREMIUM' 
                    ? 'border-yellow-500 bg-gradient-to-br from-yellow-50 to-background'
                    : vacancy.employerTier === 'VIP'
                    ? 'border-purple-400 bg-gradient-to-br from-purple-50 to-background'
                    : '';
                  
                  return (
                    <Card 
                      key={vacancy.id}
                      className={`${baseClassName} ${tierClassName}`}
                      style={{
                        height: 'calc(100vh - 200px)',
                        transform: `translateY(${translateY}%)`,
                        transition: isDragging.current ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        opacity: isActive ? 1 : 0.3,
                        pointerEvents: isActive ? 'auto' : 'none',
                        zIndex: isActive ? 10 : 5,
                      }}
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-xl">{vacancy.title}</CardTitle>
                            <CardDescription className="flex items-center gap-2 mt-1">
                              <Icon name="MapPin" size={14} />
                              {vacancy.city}
                            </CardDescription>
                          </div>
                          {vacancy.employerTier === 'PREMIUM' && (
                            <Badge className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-white border-0">
                              {TIERS.find((t) => t.name === vacancy.employerTier)?.badge}
                              {vacancy.employerTier}
                            </Badge>
                          )}
                          {vacancy.employerTier === 'VIP' && (
                            <Badge className="bg-gradient-to-r from-purple-500 to-purple-700 text-white border-0">
                              {TIERS.find((t) => t.name === vacancy.employerTier)?.badge}
                              {vacancy.employerTier}
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4 overflow-y-auto pb-8" style={{ maxHeight: 'calc(100vh - 220px)' }}>
                        <div className="flex flex-wrap gap-2">
                          {vacancy.tags.map((tag) => (
                            <Badge key={tag} variant="outline">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        {vacancy.description && <p className="text-sm text-muted-foreground">{vacancy.description}</p>}
                        {vacancy.requirements && (
                          <div>
                            <p className="text-xs font-semibold text-foreground mb-1">Требования:</p>
                            <p className="text-sm text-muted-foreground">{vacancy.requirements}</p>
                          </div>
                        )}
                        {vacancy.responsibilities && (
                          <div>
                            <p className="text-xs font-semibold text-foreground mb-1">Обязанности:</p>
                            <p className="text-sm text-muted-foreground">{vacancy.responsibilities}</p>
                          </div>
                        )}
                        <div className="pt-2 border-t space-y-2">
                          {vacancy.schedule && (
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">График:</span>
                              <span className="text-sm font-medium">{vacancy.schedule}</span>
                            </div>
                          )}
                          {vacancy.experience && (
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">Опыт работы:</span>
                              <span className="text-sm font-medium">{vacancy.experience}</span>
                            </div>
                          )}
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Зарплата:</span>
                            <span className="font-semibold text-primary">{vacancy.salary}</span>
                          </div>
                          {currentUser && currentUser.role !== 'guest' ? (
                            <>
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Работодатель:</span>
                                <span className="text-sm font-medium">{vacancy.employerName}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Телефон:</span>
                                <a href={`tel:${vacancy.phone}`} className="text-sm font-medium text-primary hover:underline">
                                  {vacancy.phone}
                                </a>
                              </div>
                            </>
                          ) : (
                            <div className="bg-muted p-3 rounded-md text-center">
                              <p className="text-sm text-muted-foreground mb-2">Войдите, чтобы увидеть контакты</p>
                              <Button size="sm" onClick={() => setShowAuthDialog(true)}>
                                Войти
                              </Button>
                            </div>
                          )}
                        </div>
                        <div className="text-center text-xs text-muted-foreground pt-2 flex items-center justify-center gap-2">
                          <Icon name="ChevronUp" size={16} className="inline" />
                          <span>Свайп вверх/вниз ({index + 1}/{filteredVacancies.length})</span>
                          <Icon name="ChevronDown" size={16} className="inline" />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      <footer className={`bg-accent text-accent-foreground py-4 mt-8 relative z-10 ${currentUser?.role === 'employer' ? 'md:block hidden' : ''}`}>
        <div className="container mx-auto px-4 text-center text-sm">
          <p>Обратная связь: jobs-app@yandex.ru</p>
        </div>
      </footer>

      <AuthSystem open={showAuthDialog} onClose={() => setShowAuthDialog(false)} onSuccess={(user) => setCurrentUser(user)} />
      <ProfileDialog
        open={showProfileDialog}
        onClose={() => setShowProfileDialog(false)}
        user={currentUser}
        onAddBalance={() => {
          setShowProfileDialog(false);
          setShowBalanceDialog(true);
        }}
        onSelectTier={() => {
          setShowProfileDialog(false);
          setShowTierDialog(true);
        }}
        onCreateVacancy={currentUser?.role === 'employer' ? () => {
          setShowProfileDialog(false);
          setShowVacancyDialog(true);
        } : undefined}
        onLinkEmail={() => {
          setShowProfileDialog(false);
          setShowLinkEmailDialog(true);
        }}
        onUpdateVacanciesCount={(count: number) => {
          if (currentUser) {
            setCurrentUser({ ...currentUser, vacanciesThisMonth: count });
          }
        }}
        onLogout={() => {
          setCurrentUser(null);
          setShowProfileDialog(false);
          toast({
            title: 'Выход выполнен',
            description: 'Вы успешно вышли из системы'
          });
        }}
      />
      <PaymentDialog open={showBalanceDialog} onClose={() => setShowBalanceDialog(false)} userId={currentUser?.id || ''} />
      <LinkEmailDialog 
        open={showLinkEmailDialog} 
        onClose={() => setShowLinkEmailDialog(false)} 
        userId={currentUser?.id || ''}
        onSuccess={(email) => {
          if (currentUser) {
            setCurrentUser({ ...currentUser, email });
          }
        }}
      />
      <VacancyDialog open={showVacancyDialog} onClose={() => setShowVacancyDialog(false)} onCreate={handleCreateVacancy} />
      <AdminDialog
        open={showAdminDialog}
        onClose={() => setShowAdminDialog(false)}
        vacancies={vacancies}
        onApprove={(id) => {
          setVacancies(vacancies.map((v) => (v.id === id ? { ...v, status: 'published' } : v)));
          toast({ title: 'Объявление одобрено' });
        }}
        onReject={(id) => {
          setVacancies(vacancies.map((v) => (v.id === id ? { ...v, status: 'rejected' } : v)));
          toast({ title: 'Объявление отклонено' });
        }}
      />
      <TierDialog
        open={showTierDialog}
        onClose={() => setShowTierDialog(false)}
        currentUser={currentUser}
        onSelectTier={(tierName) => {
          if (!currentUser) return;
          const tier = TIERS.find((t) => t.name === tierName);
          if (!tier) return;
          
          if (currentUser.balance < tier.price) {
            toast({ title: 'Недостаточно средств', description: 'Пополните баланс', variant: 'destructive' });
            return;
          }
          
          setCurrentUser({ ...currentUser, tier: tierName as any, balance: currentUser.balance - tier.price });
          setShowTierDialog(false);
          toast({ title: 'Тариф изменен', description: `Теперь вы используете тариф ${tierName}` });
        }}
      />
      
      {/* Нижнее меню для работодателей */}
      {currentUser?.role === 'employer' && (
        <EmployerBottomNav
          currentUser={currentUser}
          vacancies={userVacancies}
          onTierClick={() => setShowTierDialog(true)}
          onDeleteVacancy={handleDeleteEmployerVacancy}
        />
      )}

      {/* Баннер установки приложения для неавторизованных */}
      {!currentUser && <InstallPrompt />}
    </div>
  );
}

function VacancyCard({ vacancy, currentUser, onAuthClick }: { vacancy: Vacancy; currentUser: User | null; onAuthClick: () => void }) {
  const cardClassName = vacancy.employerTier === 'PREMIUM' 
    ? 'animate-fade-in hover:shadow-lg transition-shadow border-yellow-500 bg-gradient-to-br from-yellow-50 to-background'
    : vacancy.employerTier === 'VIP'
    ? 'animate-fade-in hover:shadow-lg transition-shadow border-purple-400 bg-gradient-to-br from-purple-50 to-background'
    : 'animate-fade-in hover:shadow-lg transition-shadow';

  return (
    <Card className={cardClassName}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-xl">{vacancy.title}</CardTitle>
            <CardDescription className="flex items-center gap-2 mt-1">
              <Icon name="MapPin" size={14} />
              {vacancy.city}
            </CardDescription>
          </div>
          {vacancy.employerTier === 'PREMIUM' && (
            <Badge className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-white border-0">
              {TIERS.find((t) => t.name === vacancy.employerTier)?.badge}
              {vacancy.employerTier}
            </Badge>
          )}
          {vacancy.employerTier === 'VIP' && (
            <Badge className="bg-gradient-to-r from-purple-500 to-purple-700 text-white border-0">
              {TIERS.find((t) => t.name === vacancy.employerTier)?.badge}
              {vacancy.employerTier}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {vacancy.tags.map((tag) => (
            <Badge key={tag} variant="outline">
              {tag}
            </Badge>
          ))}
        </div>
        {vacancy.description && <p className="text-sm text-muted-foreground line-clamp-2">{vacancy.description}</p>}
        {vacancy.requirements && (
          <div>
            <p className="text-xs font-semibold text-foreground mb-1">Требования:</p>
            <p className="text-sm text-muted-foreground line-clamp-2">{vacancy.requirements}</p>
          </div>
        )}
        {vacancy.responsibilities && (
          <div>
            <p className="text-xs font-semibold text-foreground mb-1">Обязанности:</p>
            <p className="text-sm text-muted-foreground line-clamp-2">{vacancy.responsibilities}</p>
          </div>
        )}
        <div className="pt-2 border-t space-y-2">
          {vacancy.schedule && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">График:</span>
              <span className="text-sm font-medium">{vacancy.schedule}</span>
            </div>
          )}
          {vacancy.experience && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Опыт работы:</span>
              <span className="text-sm font-medium">{vacancy.experience}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Зарплата:</span>
            <span className="font-semibold text-primary">{vacancy.salary}</span>
          </div>
          {currentUser && currentUser.role !== 'guest' ? (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Работодатель:</span>
                <span className="text-sm font-medium">{vacancy.employerName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Телефон:</span>
                <a href={`tel:${vacancy.phone}`} className="text-sm font-medium text-primary hover:underline">
                  {vacancy.phone}
                </a>
              </div>
            </>
          ) : (
            <div className="bg-muted p-3 rounded-md text-center">
              <p className="text-sm text-muted-foreground mb-2">Войдите, чтобы увидеть контакты</p>
              <Button size="sm" onClick={onAuthClick}>
                Войти
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ProfileDialog({ open, onClose, user, onAddBalance, onSelectTier, onCreateVacancy, onLinkEmail, onUpdateVacanciesCount, onLogout }: { open: boolean; onClose: () => void; user: User | null; onAddBalance: () => void; onSelectTier: () => void; onCreateVacancy?: () => void; onLinkEmail: () => void; onUpdateVacanciesCount: (count: number) => void; onLogout: () => void }) {
  const [userVacancies, setUserVacancies] = useState<Vacancy[]>([]);
  const [isLoadingVacancies, setIsLoadingVacancies] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [vacancyToDelete, setVacancyToDelete] = useState<Vacancy | null>(null);

  useEffect(() => {
    if (open && user && user.role === 'employer') {
      loadUserVacancies();
    }
  }, [open, user]);

  const loadUserVacancies = async () => {
    if (!user) return;
    setIsLoadingVacancies(true);
    try {
      const response = await fetch(`${ADMIN_API}?path=vacancies&user_id=${user.id}&limit=50`);
      const data = await response.json();
      if (data.success) {
        const mappedVacancies = data.vacancies.map((v: any) => ({
          id: v.id,
          title: v.title,
          description: v.description,
          requirements: v.requirements,
          responsibilities: v.responsibilities,
          experience: v.experience,
          schedule: v.schedule,
          salary: v.salary,
          city: v.city,
          phone: v.phone,
          employerName: v.employer_name,
          employerTier: v.employer_tier,
          tags: v.tags || [],
          status: v.status,
          source: 'database' as const,
          rejection_reason: v.rejection_reason
        }));
        setUserVacancies(mappedVacancies);
      }
    } catch (error) {
      console.error('Ошибка загрузки вакансий:', error);
    } finally {
      setIsLoadingVacancies(false);
    }
  };

  const handleDeleteVacancy = async (vacancyId: string) => {
    try {
      const response = await fetch(`${ADMIN_API}?path=vacancies`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vacancy_id: vacancyId })
      });
      const data = await response.json();
      if (data.success) {
        // Обновляем счетчик вакансий
        onUpdateVacanciesCount(data.vacancies_this_month);
        
        toast({
          title: 'Успешно',
          description: 'Вакансия удалена'
        });
        loadUserVacancies();
        window.dispatchEvent(new CustomEvent('vacancy-deleted'));
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось удалить вакансию',
        variant: 'destructive'
      });
    } finally {
      setShowDeleteDialog(false);
      setVacancyToDelete(null);
    }
  };

  if (!user) return null;

  return (
    <>
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Личный кабинет</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profile">Профиль</TabsTrigger>
            <TabsTrigger value="vacancies">Мои вакансии</TabsTrigger>
          </TabsList>
          
          <TabsContent value="profile" className="space-y-4 mt-4">
          <div>
            <Label>Имя</Label>
            <p className="text-sm mt-1">{user.name}</p>
          </div>
          <div>
            <Label>Роль</Label>
            <p className="text-sm mt-1">
              {user.role === 'seeker' ? 'Соискатель' : user.role === 'employer' ? 'Работодатель' : 'Администратор'}
            </p>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Label>Email</Label>
              <p className="text-sm mt-1">{user.email || 'Не указан'}</p>
            </div>
            {!user.email && (
              <Button size="sm" variant="outline" onClick={onLinkEmail}>
                Привязать
              </Button>
            )}
          </div>
          <div>
            <Label>Телефон</Label>
            <p className="text-sm mt-1">{user.phone || 'Не указан'}</p>
          </div>
          {user.role === 'employer' && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Баланс</Label>
                  <p className="text-2xl font-bold text-primary mt-1">{user.balance} ₽</p>
                </div>
                <Button size="sm" onClick={onAddBalance}>
                  <Icon name="Plus" size={16} className="mr-1" />
                  Пополнить
                </Button>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Тариф</Label>
                  <Button size="sm" variant="outline" onClick={onSelectTier}>
                    Выбрать тариф
                  </Button>
                </div>
                <p className="text-sm mt-1">
                  {user.tier} ({user.vacanciesThisMonth}/{TIERS.find((t) => t.name === user.tier)?.limit} объявлений)
                </p>
              </div>
              {onCreateVacancy && (
                <Button className="w-full md:hidden" onClick={onCreateVacancy}>
                  <Icon name="Plus" size={16} className="mr-2" />
                  Разместить вакансию
                </Button>
              )}
            </>
          )}
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={onLogout}
          >
            <Icon name="LogOut" size={16} className="mr-2" />
            Выйти из аккаунта
          </Button>
          </TabsContent>

          <TabsContent value="vacancies" className="space-y-4 mt-4">
            {user.role === 'employer' && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Мои вакансии</h3>
                  <Button size="sm" onClick={loadUserVacancies} disabled={isLoadingVacancies}>
                    <Icon name={isLoadingVacancies ? "Loader2" : "RefreshCw"} size={14} className={isLoadingVacancies ? "animate-spin" : ""} />
                  </Button>
                </div>

                {isLoadingVacancies ? (
                  <div className="text-center py-8">
                    <Icon name="Loader2" size={32} className="animate-spin mx-auto text-muted-foreground" />
                  </div>
                ) : userVacancies.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Icon name="BriefcaseX" size={48} className="mx-auto mb-2" />
                    <p>У вас пока нет вакансий</p>
                    {onCreateVacancy && (
                      <Button onClick={onCreateVacancy} className="mt-4">
                        Создать вакансию
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {userVacancies.map((vacancy) => (
                      <Card key={vacancy.id}>
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-base">{vacancy.title}</CardTitle>
                              <CardDescription className="mt-1">
                                {vacancy.city} • {vacancy.salary}
                              </CardDescription>
                            </div>
                            <Badge variant={vacancy.status === 'published' ? 'default' : vacancy.status === 'pending' ? 'secondary' : 'destructive'}>
                              {vacancy.status === 'published' ? 'Опубликовано' : vacancy.status === 'pending' ? 'На модерации' : 'Отклонено'}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{vacancy.description}</p>
                          {vacancy.status === 'rejected' && (vacancy as any).rejection_reason && (
                            <div className="mb-3 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                              <div className="flex items-start gap-2">
                                <Icon name="AlertCircle" size={16} className="text-destructive mt-0.5" />
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-destructive">Причина отклонения:</p>
                                  <p className="text-sm text-muted-foreground mt-1">{(vacancy as any).rejection_reason}</p>
                                </div>
                              </div>
                            </div>
                          )}
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                setVacancyToDelete(vacancy);
                                setShowDeleteDialog(true);
                              }}
                            >
                              <Icon name="Trash2" size={14} className="mr-1" />
                              Удалить
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>

    <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Удалить вакансию?</AlertDialogTitle>
          <AlertDialogDescription>
            Вы собираетесь удалить вакансию <strong>{vacancyToDelete?.title}</strong>.
            <br /><br />
            <strong className="text-destructive">Это действие нельзя отменить!</strong>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Отмена</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => vacancyToDelete && handleDeleteVacancy(vacancyToDelete.id)}
          >
            Удалить безвозвратно
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}

function LinkEmailDialog({ open, onClose, userId, onSuccess }: { open: boolean; onClose: () => void; userId: string; onSuccess: (email: string) => void }) {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'verify'>('email');
  const [loading, setLoading] = useState(false);

  const AUTH_API_URL = 'https://functions.poehali.dev/b3919417-c4e8-496a-982f-500d5754d530';

  const handleSendCode = async () => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({ title: 'Ошибка', description: 'Введите корректный email', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${AUTH_API_URL}?path=link-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, email })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setStep('verify');
        toast({ title: 'Код отправлен', description: 'Проверьте свою почту' });
      } else {
        toast({ title: 'Ошибка', description: data.error || 'Не удалось отправить код', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Ошибка', description: 'Не удалось подключиться к серверу', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!code) {
      toast({ title: 'Ошибка', description: 'Введите код', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${AUTH_API_URL}?path=verify-email-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, code })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast({ title: 'Успешно', description: 'Email привязан к аккаунту' });
        onSuccess(email);
        onClose();
        setStep('email');
        setEmail('');
        setCode('');
      } else {
        toast({ title: 'Ошибка', description: data.error || 'Неверный код', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Ошибка', description: 'Не удалось подключиться к серверу', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Привязать Email</DialogTitle>
          <DialogDescription>
            {step === 'email' ? 'Введите ваш email адрес' : 'Введите код из письма'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {step === 'email' ? (
            <>
              <div>
                <Label>Email</Label>
                <Input 
                  type="email" 
                  placeholder="example@mail.com" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
              <Button onClick={handleSendCode} disabled={loading} className="w-full">
                {loading ? 'Отправка...' : 'Отправить код'}
              </Button>
            </>
          ) : (
            <>
              <div>
                <Label>Код подтверждения</Label>
                <Input 
                  placeholder="123456" 
                  value={code} 
                  onChange={(e) => setCode(e.target.value)}
                  disabled={loading}
                  maxLength={6}
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep('email')} disabled={loading} className="flex-1">
                  Назад
                </Button>
                <Button onClick={handleVerifyCode} disabled={loading} className="flex-1">
                  {loading ? 'Проверка...' : 'Подтвердить'}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function VacancyDialog({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (vacancy: Partial<Vacancy>) => void }) {
  const [vacancy, setVacancy] = useState<Partial<Vacancy>>({
    title: '',
    description: '',
    requirements: '',
    responsibilities: '',
    experience: '',
    noExperience: false,
    schedule: '',
    salary: '',
    city: '',
    phone: '',
    tags: [],
  });

  const toggleTag = (tag: string) => {
    const tags = vacancy.tags || [];
    if (tags.includes(tag)) {
      setVacancy({ ...vacancy, tags: tags.filter((t) => t !== tag) });
    } else {
      setVacancy({ ...vacancy, tags: [...tags, tag] });
    }
  };

  const toggleNoExperience = (checked: boolean) => {
    const tags = vacancy.tags || [];
    if (checked) {
      if (!tags.includes('Без опыта')) {
        setVacancy({ ...vacancy, noExperience: true, experience: '', tags: [...tags, 'Без опыта'] });
      } else {
        setVacancy({ ...vacancy, noExperience: true, experience: '' });
      }
    } else {
      setVacancy({ ...vacancy, noExperience: false, tags: tags.filter((t) => t !== 'Без опыта') });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Создать вакансию</DialogTitle>
          <DialogDescription>Заполните информацию о вакансии</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Название вакансии</Label>
            <Input placeholder="Менеджер по продажам" value={vacancy.title} onChange={(e) => setVacancy({ ...vacancy, title: e.target.value })} />
          </div>
          <div>
            <Label>Описание</Label>
            <Textarea
              placeholder="Общее описание вакансии..."
              value={vacancy.description}
              onChange={(e) => setVacancy({ ...vacancy, description: e.target.value })}
              rows={3}
            />
          </div>
          <div>
            <Label>Требования</Label>
            <Textarea
              placeholder="Образование, навыки, знания..."
              value={vacancy.requirements}
              onChange={(e) => setVacancy({ ...vacancy, requirements: e.target.value })}
              rows={3}
            />
          </div>
          <div>
            <Label>Обязанности</Label>
            <Textarea
              placeholder="Что предстоит делать на этой позиции..."
              value={vacancy.responsibilities}
              onChange={(e) => setVacancy({ ...vacancy, responsibilities: e.target.value })}
              rows={3}
            />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Checkbox 
                id="noExperience" 
                checked={vacancy.noExperience}
                onCheckedChange={toggleNoExperience}
              />
              <Label htmlFor="noExperience" className="cursor-pointer">Без опыта</Label>
            </div>
            {!vacancy.noExperience && (
              <div>
                <Label>Стаж работы</Label>
                <Input 
                  placeholder="Например: от 1 года" 
                  value={vacancy.experience} 
                  onChange={(e) => setVacancy({ ...vacancy, experience: e.target.value })} 
                />
              </div>
            )}
          </div>
          <div>
            <Label>График работы</Label>
            <Select value={vacancy.schedule} onValueChange={(value) => setVacancy({ ...vacancy, schedule: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите график работы" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Полная занятость">Полная занятость</SelectItem>
                <SelectItem value="Частичная занятость">Частичная занятость</SelectItem>
                <SelectItem value="Временная работа">Временная работа</SelectItem>
                <SelectItem value="Стажировка">Стажировка</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Зарплата</Label>
            <Input 
              placeholder="50 000 - 70 000" 
              value={vacancy.salary} 
              onChange={(e) => {
                const value = e.target.value.replace(/₽/g, '').trim();
                setVacancy({ ...vacancy, salary: value });
              }}
              onBlur={(e) => {
                const value = e.target.value.replace(/₽/g, '').trim();
                if (value) {
                  // Форматируем числа с пробелами в разрядах
                  const formatted = value.replace(/(\d)[\s]*(\d)/g, (match, d1, d2) => {
                    // Склеиваем все цифры подряд без пробелов
                    return d1 + d2;
                  }).replace(/\b(\d+)\b/g, (match) => {
                    // Если число >= 1000, форматируем с пробелами
                    if (match.length >= 4) {
                      return match.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
                    }
                    return match;
                  });
                  
                  // Нормализуем дефисы и тире с пробелами
                  const normalized = formatted.replace(/\s*[-–—]\s*/g, ' - ');
                  
                  // Валидация диапазона (если есть дефис)
                  const rangeMatch = normalized.match(/(\d[\d\s]*)\s*-\s*(\d[\d\s]*)/);
                  if (rangeMatch) {
                    const num1 = parseInt(rangeMatch[1].replace(/\s/g, ''));
                    const num2 = parseInt(rangeMatch[2].replace(/\s/g, ''));
                    
                    if (num2 < num1) {
                      toast({
                        title: 'Некорректный диапазон',
                        description: 'Максимальная зарплата не может быть меньше минимальной',
                        variant: 'destructive'
                      });
                      return;
                    }
                  }
                  
                  setVacancy({ ...vacancy, salary: normalized + ' ₽' });
                }
              }}
            />
            <p className="text-sm text-muted-foreground mt-1">
              Примеры: <span className="text-foreground">50 000</span>, <span className="text-foreground">от 40 000</span>, <span className="text-foreground">30 000 - 50 000</span>
            </p>
          </div>
          <div>
            <Label>Город</Label>
            <CitySearchInput 
              value={vacancy.city}
              onChange={(city) => setVacancy({ ...vacancy, city })}
            />
          </div>
          <div>
            <Label>Телефон для связи</Label>
            <Input placeholder="+7 (999) 123-45-67" value={vacancy.phone} onChange={(e) => setVacancy({ ...vacancy, phone: e.target.value })} />
          </div>
          <div>
            <Label>Теги</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {TAGS.map((tag) => (
                <div key={tag} className="flex items-center gap-2">
                  <Checkbox checked={vacancy.tags?.includes(tag)} onCheckedChange={() => toggleTag(tag)} />
                  <label className="text-sm cursor-pointer" onClick={() => toggleTag(tag)}>
                    {tag}
                  </label>
                </div>
              ))}
            </div>
          </div>
          <Button className="w-full" onClick={() => onCreate(vacancy)}>
            Создать объявление
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AdminDialog({
  open,
  onClose,
  vacancies,
  onApprove,
  onReject,
}: {
  open: boolean;
  onClose: () => void;
  vacancies: Vacancy[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const [pendingVacancies, setPendingVacancies] = useState<Vacancy[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [vacancyToReject, setVacancyToReject] = useState<Vacancy | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const loadPendingVacancies = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${ADMIN_API}?path=vacancies&status=pending&limit=100`);
      const data = await response.json();
      
      if (data.success && data.vacancies) {
        const pending = data.vacancies.map((v: any) => ({
          id: v.id,
          title: v.title,
          description: v.description,
          requirements: v.requirements,
          responsibilities: v.responsibilities,
          experience: v.experience,
          schedule: v.schedule,
          salary: v.salary,
          city: v.city,
          phone: v.phone,
          employerName: v.employer_name,
          employerTier: v.employer_tier,
          tags: v.tags || [],
          status: 'pending' as const,
          source: 'database' as const
        }));
        setPendingVacancies(pending);
      }
    } catch (error) {
      console.error('Ошибка загрузки вакансий на модерации:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить вакансии на модерации',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadPendingVacancies();
    }
  }, [open]);

  const handleApprove = async (id: string) => {
    try {
      const response = await fetch(`${ADMIN_API}?path=moderate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vacancy_id: id, action: 'approve' })
      });
      const data = await response.json();
      if (data.success) {
        toast({ title: 'Объявление одобрено' });
        loadPendingVacancies();
        onApprove(id);
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось одобрить вакансию',
        variant: 'destructive'
      });
    }
  };

  const handleReject = async () => {
    if (!vacancyToReject || !rejectionReason.trim()) {
      toast({
        title: 'Ошибка',
        description: 'Укажите причину отклонения',
        variant: 'destructive'
      });
      return;
    }

    try {
      const response = await fetch(`${ADMIN_API}?path=moderate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          vacancy_id: vacancyToReject.id, 
          action: 'reject',
          rejection_reason: rejectionReason 
        })
      });
      const data = await response.json();
      if (data.success) {
        toast({ title: 'Объявление отклонено' });
        setShowRejectDialog(false);
        setVacancyToReject(null);
        setRejectionReason('');
        loadPendingVacancies();
        onReject(vacancyToReject.id);
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось отклонить вакансию',
        variant: 'destructive'
      });
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Админ-панель</DialogTitle>
          <DialogDescription>Модерация объявлений ({pendingVacancies.length})</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8">
              <Icon name="Loader2" size={32} className="animate-spin mx-auto text-muted-foreground" />
            </div>
          ) : pendingVacancies.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Нет объявлений на модерации</p>
          ) : (
            pendingVacancies.map((vacancy) => (
              <Card key={vacancy.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{vacancy.title}</CardTitle>
                  <CardDescription>
                    {vacancy.employerName} • {vacancy.city}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm">{vacancy.description}</p>
                  <div className="flex gap-2 flex-wrap">
                    {vacancy.tags.map((tag) => (
                      <Badge key={tag} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <div className="pt-2 border-t space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Зарплата:</span>
                      <span className="font-medium">{vacancy.salary}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Телефон:</span>
                      <span className="font-medium">{vacancy.phone}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleApprove(vacancy.id)} className="flex-1">
                      <Icon name="Check" size={16} className="mr-1" />
                      Одобрить
                    </Button>
                    <Button 
                      size="sm" 
                      variant="destructive" 
                      onClick={() => {
                        setVacancyToReject(vacancy);
                        setShowRejectDialog(true);
                      }} 
                      className="flex-1"
                    >
                      <Icon name="X" size={16} className="mr-1" />
                      Отклонить
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>

    <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Отклонить вакансию?</AlertDialogTitle>
          <AlertDialogDescription>
            Укажите причину отклонения вакансии <strong>{vacancyToReject?.title}</strong>.
            Работодатель увидит это сообщение в своём профиле.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-4">
          <Label>Причина отклонения</Label>
          <Textarea
            placeholder="Например: Вакансия не соответствует правилам сервиса..."
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            rows={4}
            className="mt-2"
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => {
            setShowRejectDialog(false);
            setVacancyToReject(null);
            setRejectionReason('');
          }}>Отмена</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={handleReject}
          >
            Отклонить вакансию
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}

function TierDialog({
  open,
  onClose,
  currentUser,
  onSelectTier,
}: {
  open: boolean;
  onClose: () => void;
  currentUser: User | null;
  onSelectTier: (tierName: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Выберите тариф</DialogTitle>
          <DialogDescription>Выберите подходящий тариф для размещения вакансий</DialogDescription>
        </DialogHeader>
        <div className="grid md:grid-cols-2 gap-4">
          {TIERS.filter(t => !t.isOneTime).map((tier) => {
            const isCurrentTier = currentUser?.tier === tier.name;
            const canAfford = currentUser ? currentUser.balance >= tier.price : false;
            
            return (
              <Card key={tier.name} className={isCurrentTier ? 'border-primary shadow-md' : ''}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>
                      {tier.badge && <span className="mr-2">{tier.badge}</span>}
                      {tier.name}
                    </span>
                    {isCurrentTier && <Badge variant="secondary">Текущий</Badge>}
                  </CardTitle>
                  <CardDescription className="text-2xl font-bold text-primary mt-2">
                    {tier.price === 0 ? 'Бесплатно' : `${tier.price} ₽/мес`}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    {tier.name === 'FREE' ? (
                      <div className="flex items-center gap-2 text-sm">
                        <Icon name="Check" size={16} className="text-primary" />
                        <span>Возможность видеть контакты в вакансиях</span>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 text-sm">
                          <Icon name="Check" size={16} className="text-primary" />
                          <span>До {tier.limit} объявлени{tier.limit === 1 ? 'я' : 'й'} в месяц</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Icon name="Check" size={16} className="text-primary" />
                          <span>Модерация в течение {tier.moderationTime} часов*</span>
                        </div>
                        {tier.name === 'ECONOM' && (
                          <div className="flex items-center gap-2 text-sm">
                            <Icon name="Check" size={16} className="text-primary" />
                            <span>Ваши вакансии всегда выше чем у Free тарифа</span>
                          </div>
                        )}
                        {tier.name === 'VIP' && (
                          <>
                            <div className="flex items-center gap-2 text-sm">
                              <Icon name="Check" size={16} className="text-primary" />
                              <span>Ваши вакансии всегда выше чем у тарифа "Эконом"</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <Icon name="Check" size={16} className="text-primary" />
                              <span>Значок VIP в объявлениях</span>
                            </div>
                          </>
                        )}
                        {tier.name === 'PREMIUM' && (
                          <>
                            <div className="flex items-center gap-2 text-sm">
                              <Icon name="Check" size={16} className="text-primary" />
                              <span>Моментальная модерация</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <Icon name="Check" size={16} className="text-primary" />
                              <span>Ваши вакансии после размещения всегда будут вверху поиска</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <Icon name="Check" size={16} className="text-primary" />
                              <span>Значок PREMIUM в объявлениях</span>
                            </div>
                          </>
                        )}
                      </>
                    )}
                  </div>
                  {!isCurrentTier && (
                    <Button
                      className="w-full"
                      disabled={!canAfford && tier.price > 0}
                      onClick={() => onSelectTier(tier.name)}
                    >
                      {!canAfford && tier.price > 0 ? 'Недостаточно средств' : 'Выбрать тариф'}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {TIERS.filter(t => t.isOneTime).map((tier) => {
            const canAfford = currentUser ? currentUser.balance >= tier.price : false;
            
            return (
              <Card key={tier.name} className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>"Вне очереди"</span>
                  </CardTitle>
                  <CardDescription className="text-2xl font-bold text-primary mt-2">
                    {tier.price} ₽ за размещение
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Icon name="Check" size={16} className="text-primary" />
                      <span>Вне очереди</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Icon name="Check" size={16} className="text-primary" />
                      <span>Моментальная модерация</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Icon name="Check" size={16} className="text-primary" />
                      <span>После размещения ваша вакансия попадает вверх списка, до публикации новых вакансий пользователями</span>
                    </div>
                  </div>
                  <Button
                    className="w-full"
                    disabled={!canAfford}
                    onClick={() => onSelectTier(tier.name)}
                  >
                    {!canAfford ? 'Недостаточно средств' : 'Купить размещение'}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
        <div className="mt-4 p-3 bg-muted rounded-md">
          <p className="text-xs text-muted-foreground">
            * Время модерации зависит от очереди, если ваша вакансия после размещения первая в очереди то она будет опубликована сразу, чем выше тариф тем выше в очереди на модерацию ваша публикация.
          </p>
        </div>
        {currentUser && (
          <div className="mt-4 p-3 bg-muted rounded-md">
            <p className="text-sm text-muted-foreground">
              <Icon name="Wallet" size={16} className="inline mr-1" />
              Ваш баланс: <span className="font-semibold text-primary">{currentUser.balance} ₽</span>
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}