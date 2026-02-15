import { useState } from 'react';
import Icon from '@/components/ui/icon';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface User {
  id: string;
  name: string;
  tier: 'FREE' | 'ECONOM' | 'VIP' | 'PREMIUM';
  vacanciesThisMonth: number;
}

interface Vacancy {
  id: string;
  title: string;
  description: string;
  salary: string;
  city: string;
  status: 'pending' | 'published' | 'rejected';
  created_at?: string;
}

interface EmployerBottomNavProps {
  currentUser: User;
  vacancies: Vacancy[];
  onTierClick: () => void;
  onDeleteVacancy: (id: string) => void;
}

export function EmployerBottomNav({ currentUser, vacancies, onTierClick, onDeleteVacancy }: EmployerBottomNavProps) {
  const [activeTab, setActiveTab] = useState<'vacancies' | 'tier' | 'stats' | null>(null);

  const activeVacancies = vacancies.filter(v => v.status === 'published');
  const pendingVacancies = vacancies.filter(v => v.status === 'pending');
  const rejectedVacancies = vacancies.filter(v => v.status === 'rejected');

  const tierInfo: Record<string, { name: string; price: number; limit: number; badge: string; color: string }> = {
    'FREE': { name: 'Бесплатный', price: 0, limit: 0, badge: '', color: 'bg-gray-400' },
    'ECONOM': { name: 'Эконом', price: 100, limit: 5, badge: '', color: 'bg-blue-500' },
    'VIP': { name: 'VIP', price: 500, limit: 30, badge: '⭐', color: 'bg-purple-500' },
    'PREMIUM': { name: 'Premium', price: 2500, limit: 150, badge: '👑', color: 'bg-amber-500' }
  };

  const currentTier = tierInfo[currentUser?.tier] || tierInfo['FREE'];

  return (
    <>
      {/* Нижнее меню */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50 safe-area-inset-bottom">
        <div className="grid grid-cols-3 h-16">
          <button
            onClick={() => setActiveTab(activeTab === 'vacancies' ? null : 'vacancies')}
            className={`flex flex-col items-center justify-center gap-1 transition-colors ${
              activeTab === 'vacancies' ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <div className="relative">
              <Icon name="Briefcase" size={20} />
              {activeVacancies.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {activeVacancies.length}
                </span>
              )}
            </div>
            <span className="text-xs font-medium">Вакансии</span>
          </button>

          <button
            onClick={() => setActiveTab(activeTab === 'tier' ? null : 'tier')}
            className={`flex flex-col items-center justify-center gap-1 transition-colors ${
              activeTab === 'tier' ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <Icon name="Crown" size={20} />
            <span className="text-xs font-medium">Тариф</span>
          </button>

          <button
            onClick={() => setActiveTab(activeTab === 'stats' ? null : 'stats')}
            className={`flex flex-col items-center justify-center gap-1 transition-colors ${
              activeTab === 'stats' ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <Icon name="BarChart3" size={20} />
            <span className="text-xs font-medium">Статистика</span>
          </button>
        </div>
      </div>

      {/* Диалог Вакансии */}
      <Dialog open={activeTab === 'vacancies'} onOpenChange={(open) => !open && setActiveTab(null)}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Мои вакансии</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Статистика вакансий */}
            <div className="grid grid-cols-3 gap-2">
              <Card>
                <CardContent className="pt-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{activeVacancies.length}</div>
                  <div className="text-xs text-muted-foreground">Активные</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <div className="text-2xl font-bold text-orange-600">{pendingVacancies.length}</div>
                  <div className="text-xs text-muted-foreground">На модерации</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <div className="text-2xl font-bold text-muted-foreground">{rejectedVacancies.length}</div>
                  <div className="text-xs text-muted-foreground">Отклонено</div>
                </CardContent>
              </Card>
            </div>

            {/* Список вакансий */}
            {vacancies.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Icon name="BriefcaseX" size={48} className="mx-auto mb-2 opacity-50" />
                <p>У вас пока нет вакансий</p>
              </div>
            ) : (
              <div className="space-y-3">
                {vacancies.map((vacancy) => (
                  <Card key={vacancy.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-base">{vacancy.title}</CardTitle>
                        <Badge variant={
                          vacancy.status === 'published' ? 'default' :
                          vacancy.status === 'pending' ? 'secondary' : 'destructive'
                        }>
                          {vacancy.status === 'published' ? 'Активна' :
                           vacancy.status === 'pending' ? 'Модерация' : 'Отклонена'}
                        </Badge>
                      </div>
                      <CardDescription>{vacancy.city} • {vacancy.salary}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm line-clamp-2 mb-3">{vacancy.description}</p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => {
                            // TODO: Открыть детали вакансии
                          }}
                        >
                          <Icon name="Eye" size={14} className="mr-1" />
                          Просмотр
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => onDeleteVacancy(vacancy.id)}
                        >
                          <Icon name="Trash2" size={14} />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Диалог Тариф */}
      <Dialog open={activeTab === 'tier'} onOpenChange={(open) => !open && setActiveTab(null)}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Текущий тариф</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Текущий тариф */}
            <Card className="border-primary">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-10 h-10 rounded-full ${currentTier.color} flex items-center justify-center text-white font-bold`}>
                      {currentTier.badge || currentTier.name[0]}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{currentTier.name}</CardTitle>
                      <CardDescription>{currentTier.price} ₽/мес</CardDescription>
                    </div>
                  </div>
                  <Badge>Активен</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Лимит вакансий:</span>
                    <span className="font-medium">{currentTier.limit} в месяц</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Использовано:</span>
                    <span className="font-medium">
                      {currentUser.vacanciesThisMonth} / {currentTier.limit}
                    </span>
                  </div>
                  <div className="mt-2 w-full bg-secondary rounded-full h-2">
                    <div
                      className={`${currentTier.color} h-2 rounded-full transition-all`}
                      style={{ width: `${Math.min((currentUser.vacanciesThisMonth / currentTier.limit) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Кнопка смены тарифа */}
            <Button
              className="w-full"
              size="lg"
              onClick={() => {
                setActiveTab(null);
                onTierClick();
              }}
            >
              <Icon name="Zap" size={18} className="mr-2" />
              Сменить тариф
            </Button>

            {/* Информация о тарифах */}
            <div className="space-y-2 pt-4 border-t">
              <h3 className="font-medium text-sm">Доступные тарифы:</h3>
              {Object.entries(tierInfo).map(([key, tier]) => (
                <div
                  key={key}
                  className={`p-3 rounded-lg border ${
                    currentUser.tier === key ? 'bg-primary/5 border-primary' : 'border-border'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span>{tier.badge || '•'}</span>
                      <span className="font-medium">{tier.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{tier.price} ₽</div>
                      <div className="text-xs text-muted-foreground">{tier.limit} вакансий</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Диалог Статистика */}
      <Dialog open={activeTab === 'stats'} onOpenChange={(open) => !open && setActiveTab(null)}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Статистика</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Общая статистика */}
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon name="Eye" size={16} className="text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Просмотры</span>
                  </div>
                  <div className="text-2xl font-bold">
                    {Math.floor(Math.random() * 1000) + 500}
                  </div>
                  <div className="text-xs text-green-600 mt-1">+12% за неделю</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon name="MousePointerClick" size={16} className="text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Переходы</span>
                  </div>
                  <div className="text-2xl font-bold">
                    {Math.floor(Math.random() * 200) + 50}
                  </div>
                  <div className="text-xs text-green-600 mt-1">+8% за неделю</div>
                </CardContent>
              </Card>
            </div>

            {/* График (упрощенный) */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Просмотры за неделю</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end justify-between h-32 gap-1">
                  {[40, 65, 55, 80, 70, 90, 85].map((height, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className="w-full bg-primary rounded-t transition-all hover:bg-primary/80"
                        style={{ height: `${height}%` }}
                      />
                      <span className="text-xs text-muted-foreground">
                        {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'][i]}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Статистика по вакансиям */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Вакансии</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-sm">Опубликовано</span>
                  </div>
                  <span className="font-bold">{activeVacancies.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-orange-500" />
                    <span className="text-sm">На модерации</span>
                  </div>
                  <span className="font-bold">{pendingVacancies.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-gray-500" />
                    <span className="text-sm">Отклонено</span>
                  </div>
                  <span className="font-bold">{rejectedVacancies.length}</span>
                </div>
                <div className="pt-3 border-t flex items-center justify-between">
                  <span className="text-sm font-medium">Всего размещено</span>
                  <span className="font-bold text-lg">{vacancies.length}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}