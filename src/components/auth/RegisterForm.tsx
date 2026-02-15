import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PhoneInput } from '@/components/ui/phone-input';
import { VkLoginButton } from '@/components/extensions/vk-auth/VkLoginButton';
import { useState } from 'react';

const VK_API_BASE = 'https://functions.poehali.dev/98c7ab8f-e10f-49ed-aa81-db6e7ee198d3';

interface RegisterFormProps {
  onSuccess: (token: string, user: any) => void;
  onSwitchToLogin?: () => void;
  role: 'seeker' | 'employer';
}

export function RegisterForm({ onSuccess, onSwitchToLogin, role }: RegisterFormProps) {
  const [step, setStep] = useState<'contact' | 'code'>('contact');
  const [contact, setContact] = useState('');
  const [code, setCode] = useState('');
  const [verificationType, setVerificationType] = useState<'email' | 'sms'>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [vkLoading, setVkLoading] = useState(false);

  const handleVkLogin = async () => {
    setVkLoading(true);
    try {
      const response = await fetch(`${VK_API_BASE}?action=auth-url`);
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Не удалось получить ссылку авторизации VK');
        setVkLoading(false);
        return;
      }
      if (data.state) {
        sessionStorage.setItem('vk_auth_state', data.state);
      }
      if (data.code_verifier) {
        sessionStorage.setItem('vk_auth_code_verifier', data.code_verifier);
      }
      window.location.href = data.auth_url;
    } catch {
      setError('Ошибка сети');
      setVkLoading(false);
    }
  };

  const sendCode = async () => {
    if (!contact.trim()) {
      setError('Укажите email или телефон');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('https://functions.poehali.dev/b3919417-c4e8-496a-982f-500d5754d530?path=send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact, role })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Ошибка отправки кода');
      }

      setStep('code');
      setCountdown(60);
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    if (code.length !== 6) {
      setError('Введите 6-значный код');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('https://functions.poehali.dev/b3919417-c4e8-496a-982f-500d5754d530?path=verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact, code, role })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Неверный код');
      }

      onSuccess(data.token, data.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (step === 'code') {
    return (
      <div className="space-y-4">
        <div className="text-center mb-4">
          <h3 className="text-lg font-semibold">Введите код</h3>
          <p className="text-sm text-muted-foreground">
            Код отправлен на {verificationType === 'email' ? 'email' : 'телефон'}
          </p>
          <p className="text-sm font-medium mt-1">{contact}</p>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}

        <div>
          <Label>Код подтверждения</Label>
          <Input
            type="text"
            placeholder="000000"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            className="text-center text-2xl tracking-widest"
          />
        </div>

        <Button className="w-full" onClick={verifyCode} disabled={loading}>
          {loading ? 'Проверка...' : 'Подтвердить'}
        </Button>

        <div className="flex flex-col gap-2 text-sm text-center">
          <button
            type="button"
            className="text-muted-foreground hover:underline"
            onClick={() => {
              setStep('contact');
              setCode('');
              setError('');
            }}
          >
            Изменить контакт
          </button>
          {countdown > 0 ? (
            <p className="text-muted-foreground">
              Отправить код повторно через {countdown} сек
            </p>
          ) : (
            <button
              type="button"
              className="text-primary hover:underline"
              onClick={sendCode}
            >
              Отправить код повторно
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-2">
          {role === 'employer' ? '👔 Работодатель' : '👤 Соискатель'}
        </div>
        <p className="text-sm text-muted-foreground">
          Мы отправим код подтверждения
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

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
            value={contact}
            onChange={(e) => setContact(e.target.value)}
          />
        </div>
      ) : (
        <div>
          <Label>Телефон</Label>
          <PhoneInput
            value={contact}
            onChange={setContact}
          />
        </div>
      )}

      <Button className="w-full" onClick={sendCode} disabled={loading}>
        {loading ? 'Отправка...' : 'Получить код'}
      </Button>

      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">или</span>
        </div>
      </div>

      <VkLoginButton
        onClick={handleVkLogin}
        isLoading={vkLoading}
        className="w-full"
      />

      {onSwitchToLogin && (
        <div className="text-sm text-center">
          <button
            type="button"
            className="text-primary hover:underline"
            onClick={onSwitchToLogin}
          >
            Уже есть аккаунт? Войти
          </button>
        </div>
      )}
    </div>
  );
}