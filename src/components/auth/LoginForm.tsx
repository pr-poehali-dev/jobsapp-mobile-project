import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface LoginFormProps {
  formData: {
    email: string;
    phone: string;
    password: string;
  };
  setFormData: (data: any) => void;
  onLogin: () => void;
  onSwitchToRegister: () => void;
  onSwitchToReset: () => void;
  loading: boolean;
}

export function LoginForm({
  formData,
  setFormData,
  onLogin,
  onSwitchToRegister,
  onSwitchToReset,
  loading
}: LoginFormProps) {
  return (
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
      <Button className="w-full" onClick={onLogin} disabled={loading}>
        {loading ? 'Загрузка...' : 'Войти'}
      </Button>
      <div className="flex flex-col gap-2 text-sm text-center">
        <button
          type="button"
          className="text-primary hover:underline"
          onClick={onSwitchToRegister}
        >
          Нет аккаунта? Зарегистрироваться
        </button>
        <button
          type="button"
          className="text-muted-foreground hover:underline"
          onClick={onSwitchToReset}
        >
          Забыли пароль?
        </button>
      </div>
    </div>
  );
}
