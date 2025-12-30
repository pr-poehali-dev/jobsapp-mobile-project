import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { LoginForm } from './auth/LoginForm';
import { RegisterForm } from './auth/RegisterForm';

type AuthMode = 'login' | 'register';

type User = {
  id: number;
  phone: string | null;
  email: string | null;
  full_name: string | null;
  is_verified: boolean;
};

interface AuthSystemProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (user: User) => void;
}

export function AuthSystem({ open, onClose, onSuccess }: AuthSystemProps) {
  const [mode, setMode] = useState<AuthMode>('login');

  const handleAuthSuccess = (token: string, user: User) => {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('user', JSON.stringify(user));
    
    toast({
      title: 'Вход выполнен',
      description: `Добро пожаловать${user.full_name ? ', ' + user.full_name : ''}!`
    });
    
    onSuccess(user);
    onClose();
  };

  const getTitle = () => {
    switch (mode) {
      case 'register':
        return 'Регистрация';
      default:
        return 'Вход в аккаунт';
    }
  };

  const getDescription = () => {
    switch (mode) {
      case 'register':
        return 'Создайте аккаунт для доступа ко всем возможностям';
      default:
        return 'Войдите для доступа к своему аккаунту';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
          <DialogDescription>{getDescription()}</DialogDescription>
        </DialogHeader>

        {mode === 'login' && (
          <LoginForm
            onSuccess={handleAuthSuccess}
            onSwitchToRegister={() => setMode('register')}
          />
        )}

        {mode === 'register' && (
          <RegisterForm
            onSuccess={handleAuthSuccess}
            onSwitchToLogin={() => setMode('login')}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
