import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Icon from '@/components/ui/icon';
import { useState, useEffect } from 'react';

interface VerifyFormProps {
  formData: {
    code: string;
    email: string;
    phone: string;
  };
  setFormData: (data: any) => void;
  verificationType: 'email' | 'sms';
  onVerify: () => void;
  onSwitchToRegister: () => void;
  onResendCode: () => void;
  loading: boolean;
}

export function VerifyForm({
  formData,
  setFormData,
  verificationType,
  onVerify,
  onSwitchToRegister,
  onResendCode,
  loading
}: VerifyFormProps) {
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
      <Button className="w-full" onClick={onVerify} disabled={loading}>
        {loading ? 'Проверка...' : 'Подтвердить'}
      </Button>
      <div className="flex items-center gap-2">
        <Button 
          variant="outline" 
          className="flex-1" 
          onClick={handleResendCode} 
          disabled={!canResend || loading}
        >
          {canResend ? 'Отправить код снова' : `Повтор через ${resendTimer}с`}
        </Button>
      </div>
      <div className="text-sm text-center">
        <button
          type="button"
          className="text-muted-foreground hover:underline"
          onClick={onSwitchToRegister}
        >
          Назад к регистрации
        </button>
      </div>
    </div>
  );
}