import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Icon from '@/components/ui/icon';

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
  loading: boolean;
}

export function VerifyForm({
  formData,
  setFormData,
  verificationType,
  onVerify,
  onSwitchToRegister,
  loading
}: VerifyFormProps) {
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
