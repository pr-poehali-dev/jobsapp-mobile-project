import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Icon from '@/components/ui/icon';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { getMockVacancies, deleteMockVacancy } from '@/data/mock-vacancies';

const ADMIN_API = 'https://functions.poehali.dev/0d65638b-a8d6-40af-971b-31d0f9e356d0';
const AUTH_API = 'https://functions.poehali.dev/b3919417-c4e8-496a-982f-500d5754d530';

type User = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
  balance: number;
  tier: string;
  vacancies_this_month: number;
  created_at: string;
};

type Vacancy = {
  id: string;
  user_id: string;
  title: string;
  description: string;
  salary: string;
  city: string;
  phone: string;
  employer_name: string;
  employer_tier: string;
  tags: string[];
  status: string;
  rejection_reason?: string;
  created_at: string;
};

type Stats = {
  users: {
    total_seekers: number;
    total_employers: number;
    total_admins: number;
    total_balance: number;
  };
  vacancies: {
    pending: number;
    published: number;
    rejected: number;
    total: number;
  };
  transactions: {
    total_transactions: number;
    total_amount: number;
  };
  tier_distribution: Array<{ tier: string; count: number }>;
};

export default function Admin() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loginForm, setLoginForm] = useState({ login: '', password: '' });
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedVacancy, setSelectedVacancy] = useState<Vacancy | null>(null);
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [showVacancyDialog, setShowVacancyDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [usersLoading, setUsersLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [mockVacancies, setMockVacancies] = useState<any[]>([]);
  const [mockVacancySearchQuery, setMockVacancySearchQuery] = useState('');
  const [showDeleteVacancyDialog, setShowDeleteVacancyDialog] = useState(false);
  const [vacancyToDelete, setVacancyToDelete] = useState<any | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadStats();
      loadVacancies('pending');
      loadMockVacancies();
    }
  }, [isAuthenticated]);

  const loadMockVacancies = () => {
    const vacancies = getMockVacancies();
    setMockVacancies(vacancies);
  };

  const handleDeleteMockVacancy = (id: string) => {
    deleteMockVacancy(id);
    loadMockVacancies();
    setShowDeleteVacancyDialog(false);
    setVacancyToDelete(null);
    
    // Триггерим событие storage для обновления главной страницы
    window.dispatchEvent(new Event('storage'));
    
    toast({
      title: 'Успешно',
      description: 'Вакансия удалена'
    });
  };

  const checkAuth = () => {
    const savedUser = localStorage.getItem('adminUser');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      if (
        (user.phone === '+79992255109' || user.email === 'ad.alex1995@yandex.ru') &&
        user.role === 'admin'
      ) {
        setCurrentUser(user);
        setIsAuthenticated(true);
      } else {
        localStorage.removeItem('adminUser');
      }
    }
    setIsCheckingAuth(false);
  };

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const response = await fetch(`${AUTH_API}?path=login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          login: loginForm.login,
          password: loginForm.password
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const user = data.user;
        
        if (
          (user.phone === '+79992255109' || user.email === 'ad.alex1995@yandex.ru') &&
          user.role === 'admin'
        ) {
          localStorage.setItem('adminUser', JSON.stringify(user));
          setCurrentUser(user);
          setIsAuthenticated(true);
          toast({
            title: 'Доступ разрешен',
            description: 'Добро пожаловать в админ-панель'
          });
        } else {
          toast({
            title: 'Доступ запрещен',
            description: 'У вас нет прав администратора',
            variant: 'destructive'
          });
        }
      } else {
        toast({
          title: 'Ошибка входа',
          description: data.error || 'Неверный логин или пароль',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось подключиться к серверу',
        variant: 'destructive'
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminUser');
    setCurrentUser(null);
    setIsAuthenticated(false);
    navigate('/');
  };

  const loadStats = async () => {
    try {
      const response = await fetch(`${ADMIN_API}?path=stats`);
      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить статистику',
        variant: 'destructive'
      });
    }
  };

  const loadVacancies = async (status: string) => {
    setLoading(true);
    try {
      const response = await fetch(`${ADMIN_API}?path=vacancies&status=${status}&limit=50`);
      const data = await response.json();
      if (data.success) {
        setVacancies(data.vacancies);
      }
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить вакансии',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadUser = async (userId: string) => {
    try {
      const response = await fetch(`${ADMIN_API}?path=users&user_id=${userId}`);
      const data = await response.json();
      if (data.success) {
        setSelectedUser(data.user);
        setShowUserDialog(true);
      }
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить пользователя',
        variant: 'destructive'
      });
    }
  };

  const updateUserBalance = async (userId: string, amount: number, description: string) => {
    try {
      const response = await fetch(`${ADMIN_API}?path=update-balance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, amount, description })
      });
      const data = await response.json();
      if (data.success) {
        toast({
          title: 'Успешно',
          description: data.message
        });
        setSelectedUser(data.user);
        loadStats();
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось изменить баланс',
        variant: 'destructive'
      });
    }
  };

  const updateUserTier = async (userId: string, tier: string) => {
    try {
      const response = await fetch(`${ADMIN_API}?path=users`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, tier })
      });
      const data = await response.json();
      if (data.success) {
        toast({
          title: 'Успешно',
          description: 'Тариф изменен'
        });
        setSelectedUser(data.user);
        loadStats();
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось изменить тариф',
        variant: 'destructive'
      });
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      const response = await fetch(`${ADMIN_API}?path=users`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId })
      });
      const data = await response.json();
      if (data.success) {
        toast({
          title: 'Успешно',
          description: 'Пользователь удален'
        });
        setShowDeleteDialog(false);
        setShowUserDialog(false);
        setUserToDelete(null);
        loadUsers();
        loadStats();
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось удалить пользователя',
        variant: 'destructive'
      });
    }
  };

  const moderateVacancy = async (vacancyId: string, action: 'approve' | 'reject', reason?: string) => {
    try {
      const response = await fetch(`${ADMIN_API}?path=moderate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          vacancy_id: vacancyId, 
          action,
          rejection_reason: reason
        })
      });
      const data = await response.json();
      if (data.success) {
        toast({
          title: 'Успешно',
          description: data.message
        });
        setShowVacancyDialog(false);
        loadVacancies('pending');
        loadStats();
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось выполнить модерацию',
        variant: 'destructive'
      });
    }
  };

  const filteredVacancies = vacancies.filter(v => 
    v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.employer_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
    (u.email && u.email.toLowerCase().includes(userSearchQuery.toLowerCase())) ||
    (u.phone && u.phone.includes(userSearchQuery))
  );

  const loadUsers = async () => {
    setUsersLoading(true);
    try {
      const response = await fetch(`${ADMIN_API}?path=users&limit=100`);
      const data = await response.json();
      if (data.success) {
        setUsers(data.users);
      }
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить пользователей',
        variant: 'destructive'
      });
    } finally {
      setUsersLoading(false);
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Icon name="Loader2" className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Проверка доступа...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Icon name="Shield" className="h-5 w-5" />
              Вход в админ-панель
            </CardTitle>
            <CardDescription>
              Доступ только для администраторов
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Email или телефон</Label>
              <Input
                type="text"
                placeholder="example@mail.ru или +79991234567"
                value={loginForm.login}
                onChange={(e) => setLoginForm({ ...loginForm, login: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>
            <div>
              <Label>Пароль</Label>
              <Input
                type="password"
                placeholder="Введите пароль"
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>
            <Button
              className="w-full"
              onClick={handleLogin}
              disabled={isLoggingIn || !loginForm.login || !loginForm.password}
            >
              {isLoggingIn ? 'Проверка...' : 'Войти'}
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate('/')}
            >
              На главную
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-accent text-accent-foreground shadow-md">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Icon name="Shield" size={24} />
            <div>
              <h1 className="text-xl font-bold">Админ-панель</h1>
              <p className="text-xs opacity-80">
                {currentUser?.name} • {currentUser?.email || currentUser?.phone}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <Icon name="LogOut" size={16} className="mr-2" />
              Выйти
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/')}>
              <Icon name="Home" size={16} className="mr-2" />
              На главную
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <Tabs defaultValue="moderation" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="moderation">Модерация</TabsTrigger>
            <TabsTrigger value="users">Пользователи</TabsTrigger>
            <TabsTrigger value="all-vacancies">Все объявления</TabsTrigger>
            <TabsTrigger value="stats">Статистика</TabsTrigger>
          </TabsList>

          <TabsContent value="moderation" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Модерация вакансий</CardTitle>
                <CardDescription>
                  На модерации: {stats?.vacancies.pending || 0} вакансий
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Input
                  placeholder="Поиск по названию или работодателю..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="mb-4"
                />

                {loading ? (
                  <div className="text-center py-8">
                    <Icon name="Loader2" size={32} className="animate-spin mx-auto text-muted-foreground" />
                  </div>
                ) : filteredVacancies.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Icon name="CheckCircle" size={48} className="mx-auto mb-2" />
                    <p>Нет вакансий на модерации</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredVacancies.map((vacancy) => (
                      <Card key={vacancy.id} className="cursor-pointer hover:shadow-md transition-shadow">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-lg">{vacancy.title}</CardTitle>
                              <CardDescription className="mt-1">
                                {vacancy.employer_name} • {vacancy.city}
                              </CardDescription>
                            </div>
                            <Badge variant="outline">
                              {vacancy.employer_tier}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm mb-3 line-clamp-2">{vacancy.description}</p>
                          <div className="flex items-center justify-between">
                            <div className="flex gap-2">
                              {vacancy.tags.map((tag) => (
                                <Badge key={tag} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => {
                                  setSelectedVacancy(vacancy);
                                  setShowVacancyDialog(true);
                                }}
                              >
                                <Icon name="Eye" size={14} className="mr-1" />
                                Просмотр
                              </Button>
                              <Button 
                                size="sm"
                                onClick={() => moderateVacancy(vacancy.id, 'approve')}
                              >
                                <Icon name="Check" size={14} className="mr-1" />
                                Одобрить
                              </Button>
                              <Button 
                                size="sm" 
                                variant="destructive"
                                onClick={() => {
                                  setSelectedVacancy(vacancy);
                                  setShowVacancyDialog(true);
                                }}
                              >
                                <Icon name="X" size={14} className="mr-1" />
                                Отклонить
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Управление пользователями</CardTitle>
                <CardDescription>
                  Всего пользователей: {stats?.users.total_seekers + stats?.users.total_employers + stats?.users.total_admins || 0}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 mb-4">
                  <Input
                    placeholder="Поиск по имени, email или телефону..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={loadUsers} disabled={usersLoading}>
                    {usersLoading ? <Icon name="Loader2" size={16} className="animate-spin" /> : <Icon name="RefreshCw" size={16} />}
                  </Button>
                </div>

                {usersLoading ? (
                  <div className="text-center py-8">
                    <Icon name="Loader2" size={32} className="animate-spin mx-auto text-muted-foreground" />
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Icon name="Users" size={48} className="mx-auto mb-2" />
                    <p>Пользователи не найдены</p>
                    <Button onClick={loadUsers} variant="outline" className="mt-4">
                      Загрузить пользователей
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredUsers.map((user) => (
                      <Card key={user.id} className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => {
                          setSelectedUser(user);
                          setShowUserDialog(true);
                        }}>
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-lg flex items-center gap-2">
                                {user.name}
                                {user.role === 'admin' && <Badge variant="destructive">Admin</Badge>}
                              </CardTitle>
                              <CardDescription className="mt-1">
                                {user.email || 'Email не указан'} • {user.phone || 'Телефон не указан'}
                              </CardDescription>
                            </div>
                            <Badge variant="outline">{user.tier}</Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex gap-4">
                              <div>
                                <span className="text-muted-foreground">Баланс: </span>
                                <span className="font-semibold text-primary">{user.balance} ₽</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Роль: </span>
                                <span className="font-semibold">{user.role}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Вакансий: </span>
                                <span className="font-semibold">{user.vacancies_this_month}</span>
                              </div>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {new Date(user.created_at).toLocaleDateString('ru-RU')}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="all-vacancies" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Все объявления главной страницы</CardTitle>
                <CardDescription>
                  Всего объявлений: {mockVacancies.length}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 mb-4">
                  <Input
                    placeholder="Поиск по названию..."
                    value={mockVacancySearchQuery}
                    onChange={(e) => setMockVacancySearchQuery(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={loadMockVacancies} variant="outline">
                    <Icon name="RefreshCw" size={16} />
                  </Button>
                </div>

                {mockVacancies.filter(v => 
                  v.title.toLowerCase().includes(mockVacancySearchQuery.toLowerCase()) ||
                  v.employerName.toLowerCase().includes(mockVacancySearchQuery.toLowerCase())
                ).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Icon name="BriefcaseX" size={48} className="mx-auto mb-2" />
                    <p>Объявления не найдены</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {mockVacancies
                      .filter(v => 
                        v.title.toLowerCase().includes(mockVacancySearchQuery.toLowerCase()) ||
                        v.employerName.toLowerCase().includes(mockVacancySearchQuery.toLowerCase())
                      )
                      .map((vacancy) => (
                        <Card key={vacancy.id} className="hover:shadow-md transition-shadow">
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <CardTitle className="text-lg">{vacancy.title}</CardTitle>
                                <CardDescription className="mt-1">
                                  {vacancy.employerName} • {vacancy.city}
                                </CardDescription>
                              </div>
                              <Badge variant="outline">
                                {vacancy.employerTier}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm mb-3 line-clamp-2">{vacancy.description}</p>
                            <div className="flex items-center justify-between">
                              <div className="flex gap-2">
                                {vacancy.tags.map((tag: string) => (
                                  <Badge key={tag} variant="secondary" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                              <div className="flex gap-2">
                                <Button 
                                  size="sm" 
                                  variant="destructive"
                                  onClick={() => {
                                    setVacancyToDelete(vacancy);
                                    setShowDeleteVacancyDialog(true);
                                  }}
                                >
                                  <Icon name="Trash2" size={14} className="mr-1" />
                                  Удалить
                                </Button>
                              </div>
                            </div>
                            <div className="mt-3 pt-3 border-t text-sm text-muted-foreground">
                              <div className="flex justify-between">
                                <span>Зарплата: {vacancy.salary}</span>
                                <span>Телефон: {vacancy.phone}</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stats" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Пользователи</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Соискатели:</span>
                    <span className="font-semibold">{stats?.users.total_seekers || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Работодатели:</span>
                    <span className="font-semibold">{stats?.users.total_employers || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Администраторы:</span>
                    <span className="font-semibold">{stats?.users.total_admins || 0}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t">
                    <span className="text-muted-foreground">Общий баланс:</span>
                    <span className="font-semibold text-primary">{stats?.users.total_balance || 0} ₽</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Вакансии</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">На модерации:</span>
                    <span className="font-semibold text-orange-600">{stats?.vacancies.pending || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Опубликовано:</span>
                    <span className="font-semibold text-green-600">{stats?.vacancies.published || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Отклонено:</span>
                    <span className="font-semibold text-red-600">{stats?.vacancies.rejected || 0}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t">
                    <span className="text-muted-foreground">Всего:</span>
                    <span className="font-semibold">{stats?.vacancies.total || 0}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Транзакции (30 дней)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Операций:</span>
                    <span className="font-semibold">{stats?.transactions.total_transactions || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Оборот:</span>
                    <span className="font-semibold text-primary">{stats?.transactions.total_amount || 0} ₽</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Распределение тарифов</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {stats?.tier_distribution.map((tier) => (
                    <div key={tier.tier} className="flex justify-between">
                      <span className="text-muted-foreground">{tier.tier}:</span>
                      <span className="font-semibold">{tier.count}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Диалог просмотра вакансии */}
      <Dialog open={showVacancyDialog} onOpenChange={setShowVacancyDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedVacancy?.title}</DialogTitle>
            <DialogDescription>
              {selectedVacancy?.employer_name} • {selectedVacancy?.city}
            </DialogDescription>
          </DialogHeader>
          {selectedVacancy && (
            <div className="space-y-4">
              <div>
                <Label>Описание</Label>
                <p className="text-sm mt-1">{selectedVacancy.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Зарплата</Label>
                  <p className="text-sm mt-1">{selectedVacancy.salary}</p>
                </div>
                <div>
                  <Label>Телефон</Label>
                  <p className="text-sm mt-1">{selectedVacancy.phone}</p>
                </div>
              </div>
              <div>
                <Label>Теги</Label>
                <div className="flex gap-2 mt-2">
                  {selectedVacancy.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">{tag}</Badge>
                  ))}
                </div>
              </div>
              <div>
                <Label>Причина отклонения (опционально)</Label>
                <Textarea
                  id="rejection-reason"
                  placeholder="Укажите причину отклонения..."
                  rows={3}
                  className="mt-1"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={() => moderateVacancy(selectedVacancy.id, 'approve')}
                >
                  <Icon name="Check" size={16} className="mr-2" />
                  Одобрить
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => {
                    const reason = (document.getElementById('rejection-reason') as HTMLTextAreaElement)?.value;
                    moderateVacancy(selectedVacancy.id, 'reject', reason || 'Не указана причина');
                  }}
                >
                  <Icon name="X" size={16} className="mr-2" />
                  Отклонить
                </Button>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => loadUser(selectedVacancy.user_id)}
              >
                <Icon name="User" size={16} className="mr-2" />
                Просмотреть работодателя
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Диалог пользователя */}
      <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Управление пользователем</DialogTitle>
            <DialogDescription>{selectedUser?.name}</DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Имя</Label>
                    <p className="text-sm mt-1 font-semibold">{selectedUser.name}</p>
                  </div>
                  <div>
                    <Label>Дата регистрации</Label>
                    <p className="text-sm mt-1">
                      {new Date(selectedUser.created_at).toLocaleDateString('ru-RU', { 
                        day: 'numeric', 
                        month: 'long', 
                        year: 'numeric' 
                      })}
                    </p>
                  </div>
                  <div>
                    <Label>Email</Label>
                    <p className="text-sm mt-1">{selectedUser.email || 'Не указан'}</p>
                  </div>
                  <div>
                    <Label>Телефон</Label>
                    <p className="text-sm mt-1">{selectedUser.phone || 'Не указан'}</p>
                  </div>
                  <div>
                    <Label>Роль</Label>
                    <p className="text-sm mt-1">{selectedUser.role}</p>
                  </div>
                  <div>
                    <Label>Баланс</Label>
                    <p className="text-sm mt-1 font-semibold text-primary">{selectedUser.balance} ₽</p>
                  </div>
                </div>
              </div>
              <div>
                <Label>Тариф</Label>
                <Select 
                  value={selectedUser.tier} 
                  onValueChange={(tier) => updateUserTier(selectedUser.id, tier)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FREE">FREE</SelectItem>
                    <SelectItem value="ECONOM">ECONOM</SelectItem>
                    <SelectItem value="VIP">VIP</SelectItem>
                    <SelectItem value="PREMIUM">PREMIUM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Изменить баланс</Label>
                <div className="flex gap-2 mt-1">
                  <Button
                    variant="outline"
                    onClick={() => updateUserBalance(selectedUser.id, 500, 'Пополнение администратором')}
                  >
                    +500 ₽
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => updateUserBalance(selectedUser.id, 1000, 'Пополнение администратором')}
                  >
                    +1000 ₽
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => updateUserBalance(selectedUser.id, -500, 'Списание администратором')}
                  >
                    -500 ₽
                  </Button>
                </div>
              </div>
              <div className="pt-4 border-t">
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={() => {
                    setUserToDelete(selectedUser);
                    setShowDeleteDialog(true);
                  }}
                >
                  <Icon name="Trash2" size={16} className="mr-2" />
                  Удалить пользователя
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Диалог подтверждения удаления */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить пользователя?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы собираетесь удалить пользователя <strong>{userToDelete?.name}</strong>.
              <br /><br />
              Будут удалены:
              <ul className="list-disc list-inside mt-2">
                <li>Профиль пользователя</li>
                <li>Все вакансии пользователя</li>
                <li>История транзакций</li>
                <li>Коды верификации</li>
              </ul>
              <br />
              <strong className="text-destructive">Это действие нельзя отменить!</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => userToDelete && deleteUser(userToDelete.id)}
            >
              Удалить безвозвратно
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Диалог подтверждения удаления вакансии */}
      <AlertDialog open={showDeleteVacancyDialog} onOpenChange={setShowDeleteVacancyDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить объявление?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы собираетесь удалить объявление <strong>{vacancyToDelete?.title}</strong>.
              <br /><br />
              Объявление будет удалено из главной страницы навсегда.
              <br />
              <strong className="text-destructive">Это действие нельзя отменить!</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => vacancyToDelete && handleDeleteMockVacancy(vacancyToDelete.id)}
            >
              Удалить безвозвратно
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}