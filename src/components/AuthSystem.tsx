import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { LoginForm } from './auth/LoginForm';
import { RegisterForm } from './auth/RegisterForm';
import { Button } from './ui/button';
import Icon from './ui/icon';

type AuthMode = 'login' | 'register' | 'role-select';
type UserRole = 'seeker' | 'employer';

type User = {
  id: number;
  phone: string | null;
  email: string | null;
  full_name: string | null;
  is_verified: boolean;
  role?: UserRole;
};

interface AuthSystemProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (user: User) => void;
}

export function AuthSystem({ open, onClose, onSuccess }: AuthSystemProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);

  const handleAuthSuccess = (token: string, user: User) => {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('user', JSON.stringify({ ...user, role: selectedRole }));
    
    toast({
      title: 'Вход выполнен',
      description: `Добро пожаловать${user.full_name ? ', ' + user.full_name : ''}!`
    });
    
    onSuccess({ ...user, role: selectedRole || 'seeker' });
    onClose();
  };

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    setMode('register');
  };

  const handleBackToRoleSelect = () => {
    setMode('role-select');
    setSelectedRole(null);
  };

  const getTitle = () => {
    switch (mode) {
      case 'role-select':
        return 'Выберите роль';
      case 'register':
        return selectedRole === 'employer' ? 'Регистрация работодателя' : 'Регистрация соискателя';
      default:
        return 'Вход в аккаунт';
    }
  };

  const getDescription = () => {
    switch (mode) {
      case 'role-select':
        return 'Как вы хотите использовать платформу?';
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
            onSwitchToRegister={() => setMode('role-select')}
          />
        )}

        {mode === 'role-select' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <Button
                variant="outline"
                className="h-auto p-6 flex flex-col items-start gap-3 hover:border-primary hover:bg-primary/5"
                onClick={() => handleRoleSelect('seeker')}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Icon name="User" size={24} className="text-primary" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-lg">Соискатель</h3>
                    <p className="text-sm text-muted-foreground">
                      Ищу работу и откликаюсь на вакансии
                    </p>
                  </div>
                </div>
              </Button>

              <Button
                variant="outline"
                className="h-auto p-6 flex flex-col items-start gap-3 hover:border-primary hover:bg-primary/5"
                onClick={() => handleRoleSelect('employer')}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Icon name="Briefcase" size={24} className="text-primary" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-lg">Работодатель</h3>
                    <p className="text-sm text-muted-foreground">
                      Размещаю вакансии и ищу сотрудников
                    </p>
                  </div>
                </div>
              </Button>
            </div>

            <div className="text-sm text-center">
              <button
                type="button"
                className="text-primary hover:underline"
                onClick={() => setMode('login')}
              >
                Уже есть аккаунт? Войти
              </button>
            </div>
          </div>
        )}

        {mode === 'register' && (
          <div>
            <button
              type="button"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
              onClick={handleBackToRoleSelect}
            >
              <Icon name="ArrowLeft" size={16} />
              Выбрать другую роль
            </button>
            <RegisterForm
              onSuccess={handleAuthSuccess}
              onSwitchToLogin={() => setMode('login')}
              role={selectedRole || 'seeker'}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
