import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
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
import { getAllCities } from '@/data/cities';

type UserRole = 'guest' | 'seeker' | 'employer' | 'admin';

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
  image?: string;
  status: 'pending' | 'published' | 'rejected';
  source?: 'manual' | 'avito';
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
  { name: 'FREE', price: 0, limit: 1, badge: '', moderationTime: '72' },
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

const MOCK_VACANCIES: Vacancy[] = [
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

const AVITO_SYNC_URL = 'https://functions.poehali.dev/300cf95d-737b-4557-81c3-01bccd37f7a4';

export default function Index() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [vacancies, setVacancies] = useState<Vacancy[]>(MOCK_VACANCIES);
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
  const touchStartY = useRef<number>(0);
  const isDragging = useRef<boolean>(false);
  const [swipeOffset, setSwipeOffset] = useState(0);

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

  // Загрузка вакансий с Avito при монтировании компонента
  useEffect(() => {
    loadAvitoVacancies();
  }, []);

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
      setCurrentVacancyIndex(filteredVacancies.length - 1);
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

  const handleCreateVacancy = (vacancy: Partial<Vacancy>) => {
    if (!currentUser) return;

    const cost = 50;
    if (currentUser.balance < cost) {
      toast({ title: 'Недостаточно средств', description: 'Пополните баланс', variant: 'destructive' });
      return;
    }

    const tierLimit = TIERS.find((t) => t.name === currentUser.tier)?.limit || 1;
    if (currentUser.vacanciesThisMonth >= tierLimit) {
      toast({
        title: 'Лимит исчерпан',
        description: 'Повысьте тариф или купите объявление за 50 ₽',
        variant: 'destructive',
      });
      return;
    }

    const newVacancy: Vacancy = {
      id: Date.now().toString(),
      title: vacancy.title || '',
      description: vacancy.description || '',
      salary: vacancy.salary || '',
      city: vacancy.city || '',
      phone: vacancy.phone || currentUser.phone,
      employerName: currentUser.name,
      employerTier: currentUser.tier,
      tags: vacancy.tags || [],
      status: 'pending',
    };

    setVacancies([...vacancies, newVacancy]);
    setCurrentUser({ ...currentUser, balance: currentUser.balance - cost, vacanciesThisMonth: currentUser.vacanciesThisMonth + 1 });
    setShowVacancyDialog(false);

    toast({
      title: 'Объявление отправлено',
      description: 'Ожидайте модерации. Вы получите уведомление после проверки.',
    });
  };

  const filteredVacancies = vacancies.filter((v) => {
    if (v.status !== 'published') return false;
    if (searchQuery && !v.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (selectedTags.length > 0 && !selectedTags.some((tag) => v.tags.includes(tag))) return false;
    if (selectedCity && v.city !== selectedCity) return false;
    return true;
  });

  const currentVacancy = filteredVacancies[currentVacancyIndex];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 bg-accent text-accent-foreground shadow-md">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon name="Briefcase" size={24} />
            <h1 className="text-xl font-bold">Jobs-App</h1>
          </div>
          <div className="flex items-center gap-2">
            {currentUser ? (
              currentUser.role === 'admin' ? (
                <Button size="sm" variant="outline" onClick={() => setShowAdminDialog(true)}>
                  <Icon name="Shield" size={16} />
                </Button>
              ) : (
                <>
                  {currentUser.role === 'employer' && (
                    <Button size="sm" onClick={() => setShowVacancyDialog(true)} className="hidden md:flex">
                      Разместить вакансию
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
                    className="md:hidden rounded-full h-10 w-10 bg-white text-gray-900 border-gray-300 hover:bg-gray-50"
                  >
                    <Icon name="User" size={20} />
                  </Button>
                </>
              )
            ) : (
              <Button size="sm" onClick={() => setShowAuthDialog(true)}>
                Войти
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-4 flex-1 flex flex-col">
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
              onClick={loadAvitoVacancies}
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
                  height: 'calc(100vh - 140px)',
                  overflow: 'hidden'
                }}
              >
                <div 
                  className="absolute inset-0 flex flex-col items-center px-4 pt-0"
                  style={{
                    transform: `translateY(calc(-${currentVacancyIndex * (80 + 3)}vh + ${swipeOffset}px))`,
                    transition: isDragging.current ? 'none' : 'transform 0.3s ease-out',
                  }}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                >
                  {filteredVacancies.map((vacancy, index) => (
                    <Card 
                      key={vacancy.id}
                      className="w-full max-w-md swipe-card touch-none flex-shrink-0" 
                      style={{
                        height: '80vh',
                        marginBottom: '3vh',
                        opacity: index === currentVacancyIndex ? 1 : 0.6,
                        transform: index === currentVacancyIndex ? 'scale(1)' : 'scale(0.92)',
                        transition: 'opacity 0.3s ease-out, transform 0.3s ease-out',
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
                          {vacancy.employerTier !== 'FREE' && (
                            <Badge variant="secondary">
                              {TIERS.find((t) => t.name === vacancy.employerTier)?.badge}
                              {vacancy.employerTier}
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(80vh - 120px)' }}>
                        <div className="flex flex-wrap gap-2">
                          {vacancy.tags.map((tag) => (
                            <Badge key={tag} variant="outline">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        <p className="text-sm text-muted-foreground">{vacancy.description}</p>
                        <div className="pt-2 border-t space-y-2">
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
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <footer className="bg-accent text-accent-foreground py-4 mt-8 relative z-10">
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
    </div>
  );
}

function VacancyCard({ vacancy, currentUser, onAuthClick }: { vacancy: Vacancy; currentUser: User | null; onAuthClick: () => void }) {
  return (
    <Card className="animate-fade-in hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-xl">{vacancy.title}</CardTitle>
            <CardDescription className="flex items-center gap-2 mt-1">
              <Icon name="MapPin" size={14} />
              {vacancy.city}
            </CardDescription>
          </div>
          {vacancy.employerTier !== 'FREE' && (
            <Badge variant="secondary">
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
        <p className="text-sm text-muted-foreground line-clamp-3">{vacancy.description}</p>
        <div className="pt-2 border-t space-y-2">
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

function ProfileDialog({ open, onClose, user, onAddBalance, onSelectTier, onCreateVacancy, onLinkEmail }: { open: boolean; onClose: () => void; user: User | null; onAddBalance: () => void; onSelectTier: () => void; onCreateVacancy?: () => void; onLinkEmail: () => void }) {
  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Личный кабинет</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Имя</Label>
            <p className="text-sm mt-1">{user.name}</p>
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
        </div>
      </DialogContent>
    </Dialog>
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
              placeholder="Требования, условия работы..."
              value={vacancy.description}
              onChange={(e) => setVacancy({ ...vacancy, description: e.target.value })}
              rows={4}
            />
          </div>
          <div>
            <Label>Зарплата</Label>
            <Input placeholder="50 000 - 70 000 ₽" value={vacancy.salary} onChange={(e) => setVacancy({ ...vacancy, salary: e.target.value })} />
          </div>
          <div>
            <Label>Город</Label>
            <Select value={vacancy.city} onValueChange={(city) => setVacancy({ ...vacancy, city })}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите город" />
              </SelectTrigger>
              <SelectContent>
                {getAllCities().map((city) => (
                  <SelectItem key={city} value={city}>
                    {city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            Создать объявление (50 ₽)
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
  const pendingVacancies = vacancies.filter((v) => v.status === 'pending');

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Админ-панель</DialogTitle>
          <DialogDescription>Модерация объявлений ({pendingVacancies.length})</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {pendingVacancies.length === 0 ? (
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
                  <div className="flex gap-2">
                    {vacancy.tags.map((tag) => (
                      <Badge key={tag} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => onApprove(vacancy.id)}>
                      <Icon name="Check" size={16} className="mr-1" />
                      Одобрить
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => onReject(vacancy.id)}>
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