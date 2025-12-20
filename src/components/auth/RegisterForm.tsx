import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface RegisterFormProps {
  formData: {
    name: string;
    email: string;
    phone: string;
    password: string;
  };
  setFormData: (data: any) => void;
  role: 'seeker' | 'employer';
  setRole: (role: 'seeker' | 'employer') => void;
  verificationType: 'email' | 'sms';
  setVerificationType: (type: 'email' | 'sms') => void;
  onRegister: () => void;
  onSwitchToLogin: () => void;
  loading: boolean;
}

export function RegisterForm({
  formData,
  setFormData,
  role,
  setRole,
  verificationType,
  setVerificationType,
  onRegister,
  onSwitchToLogin,
  loading
}: RegisterFormProps) {
  return (
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

      <Button className="w-full" onClick={onRegister} disabled={loading}>
        {loading ? 'Загрузка...' : 'Зарегистрироваться'}
      </Button>

      <div className="text-sm text-center">
        <button
          type="button"
          className="text-primary hover:underline"
          onClick={onSwitchToLogin}
        >
          Уже есть аккаунт? Войти
        </button>
      </div>
    </div>
  );
}
