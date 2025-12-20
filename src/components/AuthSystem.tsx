import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { LoginForm } from './auth/LoginForm';
import { RegisterForm } from './auth/RegisterForm';
import { VerifyForm } from './auth/VerifyForm';
import { ResetPasswordForm, ConfirmResetForm } from './auth/PasswordResetForms';

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
      const response = await fetch(`${AUTH_API_URL}?path=register`, {
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
      const response = await fetch(`${AUTH_API_URL}?path=verify`, {
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
      const response = await fetch(`${AUTH_API_URL}?path=login`, {
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
      const response = await fetch(`${AUTH_API_URL}?path=reset-password`, {
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
      const response = await fetch(`${AUTH_API_URL}?path=confirm-reset`, {
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

        {mode === 'login' && (
          <LoginForm
            formData={formData}
            setFormData={setFormData}
            onLogin={handleLogin}
            onSwitchToRegister={() => { setMode('register'); resetForm(); }}
            onSwitchToReset={() => { setMode('reset'); resetForm(); }}
            loading={loading}
          />
        )}

        {mode === 'register' && (
          <RegisterForm
            formData={formData}
            setFormData={setFormData}
            role={role}
            setRole={setRole}
            verificationType={verificationType}
            setVerificationType={setVerificationType}
            onRegister={handleRegister}
            onSwitchToLogin={() => { setMode('login'); resetForm(); }}
            loading={loading}
          />
        )}

        {mode === 'verify' && (
          <VerifyForm
            formData={formData}
            setFormData={setFormData}
            verificationType={verificationType}
            onVerify={handleVerify}
            onSwitchToRegister={() => { setMode('register'); resetForm(); }}
            loading={loading}
          />
        )}

        {mode === 'reset' && (
          <ResetPasswordForm
            formData={formData}
            setFormData={setFormData}
            verificationType={verificationType}
            setVerificationType={setVerificationType}
            onResetPassword={handleResetPassword}
            onSwitchToLogin={() => { setMode('login'); resetForm(); }}
            loading={loading}
          />
        )}

        {mode === 'confirm-reset' && (
          <ConfirmResetForm
            formData={formData}
            setFormData={setFormData}
            onConfirmReset={handleConfirmReset}
            loading={loading}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
