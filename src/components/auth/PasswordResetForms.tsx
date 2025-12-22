import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PhoneInput } from '@/components/ui/phone-input';
import { useState, useEffect } from 'react';

interface ResetPasswordFormProps {
  formData: {
    email: string;
    phone: string;
  };
  setFormData: (data: any) => void;
  verificationType: 'email' | 'sms';
  setVerificationType: (type: 'email' | 'sms') => void;
  onResetPassword: () => void;
  onSwitchToLogin: () => void;
  loading: boolean;
}

export function ResetPasswordForm({
  formData,
  setFormData,
  verificationType,
  setVerificationType,
  onResetPassword,
  onSwitchToLogin,
  loading
}: ResetPasswordFormProps) {
  return (
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
          <PhoneInput
            value={formData.phone}
            onChange={(phone) => setFormData({ ...formData, phone })}
          />
        </div>
      )}

      <Button className="w-full" onClick={onResetPassword} disabled={loading}>
        {loading ? 'Отправка...' : 'Отправить код'}
      </Button>

      <div className="text-sm text-center">
        <button
          type="button"
          className="text-primary hover:underline"
          onClick={onSwitchToLogin}
        >
          Вернуться ко входу
        </button>
      </div>
    </div>
  );
}

interface ConfirmResetFormProps {
  formData: {
    code: string;
    newPassword: string;
  };
  setFormData: (data: any) => void;
  onConfirmReset: () => void;
  onResendCode: () => void;
  loading: boolean;
}

export function ConfirmResetForm({
  formData,
  setFormData,
  onConfirmReset,
  onResendCode,
  loading
}: ConfirmResetFormProps) {
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [resendTimer]);

  const handleResendCode = () => {
    onResendCode();
    setResendTimer(60);
    setCanResend(false);
  };

  return (
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
      <Button className="w-full" onClick={onConfirmReset} disabled={loading}>
        {loading ? 'Сохранение...' : 'Изменить пароль'}
      </Button>
      <Button 
        variant="outline" 
        className="w-full" 
        onClick={handleResendCode} 
        disabled={!canResend || loading}
      >
        {canResend ? 'Отправить код снова' : `Повтор через ${resendTimer}с`}
      </Button>
    </div>
  );
}