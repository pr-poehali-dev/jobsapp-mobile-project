import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import Icon from '@/components/ui/icon';

const AUTH_API_URL = 'https://functions.poehali.dev/b3919417-c4e8-496a-982f-500d5754d530';

type AuthMode = 'login' | 'register' | 'verify' | 'reset' | 'confirm-reset';

type User = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: 'seeker' | 'employer' | 'admin';
  balance: number;
  tier: 'FREE' | 'ECONOM' | 'VIP' | 'PREMIUM';
  vacancies_this_month: number;
  email_verified: boolean;
  phone_verified: boolean;
};

interface AuthSystemProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (user: User) => void;
}

export function AuthSystem({ open, onClose, onSuccess }: AuthSystemProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [role, setRole] = useState<'seeker' | 'employer'>('seeker');
  const [verificationType, setVerificationType] = useState<'email' | 'sms'>('email');
  
  // Форма данных
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    code: '',
    newPassword: ''
  });
  
  const [tempUserId, setTempUserId] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${AUTH_API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: verificationType === 'email' ? formData.email : undefined,
          phone: verificationType === 'sms' ? formData.phone : undefined,
          password: formData.password,
          role: role,
          verification_type: verificationType
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setTempUserId(data.user_id);
        setMode('verify');
        toast({
          title: 'Код отправлен',
          description: data.code_sent 
            ? `Код подтверждения отправлен на ${verificationType === 'email' ? formData.email : formData.phone}`
            : data.message
        });
      } else {
        toast({
          title: 'Ошибка регистрации',
          description: data.error || 'Неизвестная ошибка',
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
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${AUTH_API_URL}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: tempUserId,
          code: formData.code
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast({
          title: 'Успешно',
          description: 'Аккаунт подтвержден!'
        });
        onSuccess(data.user);
        onClose();
      } else {
        toast({
          title: 'Ошибка',
          description: data.error || 'Неверный код',
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
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${AUTH_API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          login: formData.email || formData.phone,
          password: formData.password
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast({
          title: 'Вход выполнен',
          description: `Добро пожаловать, ${data.user.name}!`
        });
        onSuccess(data.user);
        onClose();
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
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${AUTH_API_URL}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact: formData.email || formData.phone,
          type: verificationType
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setTempUserId(data.user_id);
        setMode('confirm-reset');
        toast({
          title: 'Код отправлен',
          description: data.code_sent 
            ? 'Код для сброса пароля отправлен'
            : data.message
        });
      } else {
        toast({
          title: 'Ошибка',
          description: data.error || 'Не удалось отправить код',
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
      setLoading(false);
    }
  };

  const handleConfirmReset = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${AUTH_API_URL}/confirm-reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: tempUserId,
          code: formData.code,
          new_password: formData.newPassword
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast({
          title: 'Пароль изменен',
          description: 'Теперь вы можете войти с новым паролем'
        });
        setMode('login');
        setFormData({ ...formData, code: '', newPassword: '', password: '' });
      } else {
        toast({
          title: 'Ошибка',
          description: data.error || 'Неверный код',
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
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      password: '',
      code: '',
      newPassword: ''
    });
    setTempUserId('');
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) {
        onClose();
        resetForm();
        setMode('login');
      }
    }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === 'login' && 'Вход'}
            {mode === 'register' && 'Регистрация'}
            {mode === 'verify' && 'Подтверждение'}
            {mode === 'reset' && 'Восстановление пароля'}
            {mode === 'confirm-reset' && 'Новый пароль'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'login' && 'Войдите в свой аккаунт'}
            {mode === 'register' && 'Создайте новый аккаунт'}
            {mode === 'verify' && 'Введите код из SMS или Email'}
            {mode === 'reset' && 'Укажите email или телефон для восстановления'}
            {mode === 'confirm-reset' && 'Введите код и новый пароль'}
          </DialogDescription>
        </DialogHeader>

        {/* ВХОД */}
        {mode === 'login' && (
          <div className="space-y-4">
            <div>
              <Label>Email или телефон</Label>
              <Input
                type="text"
                placeholder="example@mail.ru или +79991234567"
                value={formData.email || formData.phone}
                onChange={(e) => setFormData({ ...formData, email: e.target.value, phone: e.target.value })}
              />
            </div>
            <div>
              <Label>Пароль</Label>
              <Input
                type="password"
                placeholder="Введите пароль"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>
            <Button className="w-full" onClick={handleLogin} disabled={loading}>
              {loading ? 'Загрузка...' : 'Войти'}
            </Button>
            <div className="flex flex-col gap-2 text-sm text-center">
              <button
                type="button"
                className="text-primary hover:underline"
                onClick={() => { setMode('register'); resetForm(); }}
              >
                Нет аккаунта? Зарегистрироваться
              </button>
              <button
                type="button"
                className="text-muted-foreground hover:underline"
                onClick={() => { setMode('reset'); resetForm(); }}
              >
                Забыли пароль?
              </button>
            </div>
          </div>
        )}

        {/* РЕГИСТРАЦИЯ */}
        {mode === 'register' && (
          <div className="space-y-4">
            <Tabs defaultValue="seeker" onValueChange={(v) => setRole(v as 'seeker' | 'employer')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="seeker">Соискатель</TabsTrigger>
                <TabsTrigger value="employer">Работодатель</TabsTrigger>
              </TabsList>
            </Tabs>

            <div>
              <Label>Имя или название компании</Label>
              <Input
                placeholder="Иван Иванов"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div>
              <Label>Способ подтверждения</Label>
              <Tabs defaultValue="email" onValueChange={(v) => setVerificationType(v as 'email' | 'sms')}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="email">Email</TabsTrigger>
                  <TabsTrigger value="sms">SMS</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {verificationType === 'email' ? (
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  placeholder="example@mail.ru"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            ) : (
              <div>
                <Label>Телефон</Label>
                <Input
                  type="tel"
                  placeholder="+79991234567"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            )}

            <div>
              <Label>Пароль (минимум 6 символов)</Label>
              <Input
                type="password"
                placeholder="Придумайте пароль"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>

            <Button className="w-full" onClick={handleRegister} disabled={loading}>
              {loading ? 'Загрузка...' : 'Зарегистрироваться'}
            </Button>

            <div className="text-sm text-center">
              <button
                type="button"
                className="text-primary hover:underline"
                onClick={() => { setMode('login'); resetForm(); }}
              >
                Уже есть аккаунт? Войти
              </button>
            </div>
          </div>
        )}

        {/* ПОДТВЕРЖДЕНИЕ КОДА */}
        {mode === 'verify' && (
          <div className="space-y-4">
            <div className="text-center">
              <Icon name="Mail" size={48} className="mx-auto mb-4 text-primary" />
              <p className="text-sm text-muted-foreground">
                Код отправлен на {verificationType === 'email' ? formData.email : formData.phone}
              </p>
            </div>
            <div>
              <Label>Код подтверждения</Label>
              <Input
                placeholder="123456"
                maxLength={6}
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.replace(/\D/g, '') })}
              />
            </div>
            <Button className="w-full" onClick={handleVerify} disabled={loading}>
              {loading ? 'Проверка...' : 'Подтвердить'}
            </Button>
            <div className="text-sm text-center">
              <button
                type="button"
                className="text-muted-foreground hover:underline"
                onClick={() => { setMode('register'); resetForm(); }}
              >
                Назад к регистрации
              </button>
            </div>
          </div>
        )}

        {/* ВОССТАНОВЛЕНИЕ ПАРОЛЯ */}
        {mode === 'reset' && (
          <div className="space-y-4">
            <div>
              <Label>Способ восстановления</Label>
              <Tabs defaultValue="email" onValueChange={(v) => setVerificationType(v as 'email' | 'sms')}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="email">Email</TabsTrigger>
                  <TabsTrigger value="sms">SMS</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {verificationType === 'email' ? (
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  placeholder="example@mail.ru"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            ) : (
              <div>
                <Label>Телефон</Label>
                <Input
                  type="tel"
                  placeholder="+79991234567"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            )}

            <Button className="w-full" onClick={handleResetPassword} disabled={loading}>
              {loading ? 'Отправка...' : 'Отправить код'}
            </Button>

            <div className="text-sm text-center">
              <button
                type="button"
                className="text-primary hover:underline"
                onClick={() => { setMode('login'); resetForm(); }}
              >
                Вернуться ко входу
              </button>
            </div>
          </div>
        )}

        {/* ПОДТВЕРЖДЕНИЕ СБРОСА ПАРОЛЯ */}
        {mode === 'confirm-reset' && (
          <div className="space-y-4">
            <div>
              <Label>Код из SMS/Email</Label>
              <Input
                placeholder="123456"
                maxLength={6}
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.replace(/\D/g, '') })}
              />
            </div>
            <div>
              <Label>Новый пароль (минимум 6 символов)</Label>
              <Input
                type="password"
                placeholder="Введите новый пароль"
                value={formData.newPassword}
                onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
              />
            </div>
            <Button className="w-full" onClick={handleConfirmReset} disabled={loading}>
              {loading ? 'Сохранение...' : 'Изменить пароль'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
