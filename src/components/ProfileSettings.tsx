import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import Icon from '@/components/ui/icon';

type UserRole = 'seeker' | 'employer';

interface User {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: 'guest' | 'seeker' | 'employer' | 'admin';
  balance: number;
  tier: 'FREE' | 'ECONOM' | 'VIP' | 'PREMIUM';
  vacanciesThisMonth: number;
}

interface ProfileSettingsProps {
  open: boolean;
  onClose: () => void;
  user: User;
  onUpdate: (user: User) => void;
}

export function ProfileSettings({ open, onClose, user, onUpdate }: ProfileSettingsProps) {
  const [selectedRole, setSelectedRole] = useState<UserRole>(
    user.role === 'employer' || user.role === 'seeker' ? user.role : 'seeker'
  );
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (selectedRole === user.role) {
      toast({
        title: 'Без изменений',
        description: 'Вы не изменили роль'
      });
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const isVkUser = !!(user as any).vk_id;
      const apiUrl = isVkUser
        ? 'https://functions.poehali.dev/98c7ab8f-e10f-49ed-aa81-db6e7ee198d3?action=update-role'
        : 'https://functions.poehali.dev/b3919417-c4e8-496a-982f-500d5754d530?path=update-role';
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(isVkUser
            ? { 'Authorization': `Bearer ${token}` }
            : { 'X-Session-Token': token || '' })
        },
        body: JSON.stringify({ role: selectedRole })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Ошибка обновления роли');
      }

      const updatedUser = { ...user, role: selectedRole };
      onUpdate(updatedUser);
      localStorage.setItem('currentUser', JSON.stringify(updatedUser));

      toast({
        title: 'Роль обновлена',
        description: selectedRole === 'employer' ? 'Теперь вы работодатель' : 'Теперь вы соискатель'
      });

      onClose();
      window.location.reload();
    } catch (err: any) {
      toast({
        title: 'Ошибка',
        description: err.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Настройки профиля</DialogTitle>
          <DialogDescription>
            Измените свою роль на платформе
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="mb-3 block">Ваша роль</Label>
            <div className="grid grid-cols-1 gap-3">
              <Button
                variant={selectedRole === 'seeker' ? 'default' : 'outline'}
                className="h-auto p-4 flex items-center justify-start gap-3"
                onClick={() => setSelectedRole('seeker')}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  selectedRole === 'seeker' ? 'bg-primary-foreground/20' : 'bg-primary/10'
                }`}>
                  <Icon 
                    name="User" 
                    size={20} 
                    className={selectedRole === 'seeker' ? 'text-primary-foreground' : 'text-primary'} 
                  />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold">Соискатель</h3>
                  <p className="text-xs opacity-80">
                    Ищу работу и откликаюсь на вакансии
                  </p>
                </div>
              </Button>

              <Button
                variant={selectedRole === 'employer' ? 'default' : 'outline'}
                className="h-auto p-4 flex items-center justify-start gap-3"
                onClick={() => setSelectedRole('employer')}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  selectedRole === 'employer' ? 'bg-primary-foreground/20' : 'bg-primary/10'
                }`}>
                  <Icon 
                    name="Briefcase" 
                    size={20} 
                    className={selectedRole === 'employer' ? 'text-primary-foreground' : 'text-primary'} 
                  />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold">Работодатель</h3>
                  <p className="text-xs opacity-80">
                    Размещаю вакансии и ищу сотрудников
                  </p>
                </div>
              </Button>
            </div>
          </div>

          <div className="bg-muted/50 rounded-lg p-3 text-sm">
            <div className="flex gap-2">
              <Icon name="Info" size={16} className="text-muted-foreground mt-0.5" />
              <p className="text-muted-foreground">
                Вы можете изменить роль в любой момент. Это повлияет на доступные функции приложения.
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Отмена
            </Button>
            <Button 
              className="flex-1" 
              onClick={handleSave}
              disabled={loading || selectedRole === user.role}
            >
              {loading ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}