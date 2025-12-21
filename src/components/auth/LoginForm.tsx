import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PhoneInput } from '@/components/ui/phone-input';
import { useState } from 'react';

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
  const [loginType, setLoginType] = useState<'email' | 'phone'>('email');
  
  // Автоопределение типа по вводу
  const handleInputChange = (value: string) => {
    if (value.startsWith('+7') || value.startsWith('7') || value.startsWith('8')) {
      setLoginType('phone');
    } else if (value.includes('@')) {
      setLoginType('email');
    }
  };
  
  return (
    <div className="space-y-4">
      <div>
        <Label>Email или телефон</Label>
        {loginType === 'phone' ? (
          <PhoneInput
            value={formData.phone}
            onChange={(phone) => {
              setFormData({ ...formData, phone, email: '' });
              handleInputChange(phone);
            }}
          />
        ) : (
          <Input
            type="text"
            placeholder="example@mail.ru или начните вводить номер"
            value={formData.email}
            onChange={(e) => {
              const value = e.target.value;
              setFormData({ ...formData, email: value, phone: '' });
              handleInputChange(value);
            }}
          />
        )}
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