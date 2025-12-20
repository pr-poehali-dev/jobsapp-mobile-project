import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import Icon from '@/components/ui/icon';

const PAYMENTS_API_URL = 'https://functions.poehali.dev/fc60f54b-d835-4f8b-9424-5d6c14a11945';

type PaymentSystem = 'pally' | 'yoomoney' | 'sbp';

interface PaymentDialogProps {
  open: boolean;
  onClose: () => void;
  userId: string;
}

export function PaymentDialog({ open, onClose, userId }: PaymentDialogProps) {
  const [amount, setAmount] = useState('200');
  const [loading, setLoading] = useState(false);
  const [selectedSystem, setSelectedSystem] = useState<PaymentSystem | null>(null);

  const handleCreatePayment = async (paymentSystem: PaymentSystem) => {
    const numAmount = parseInt(amount);
    
    if (numAmount <= 0 || isNaN(numAmount)) {
      toast({
        title: 'Ошибка',
        description: 'Укажите корректную сумму',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    setSelectedSystem(paymentSystem);

    try {
      const response = await fetch(`${PAYMENTS_API_URL}?path=create-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          amount: numAmount,
          payment_system: paymentSystem === 'sbp' ? 'pally' : paymentSystem,
          return_url: window.location.origin + '/payment-success'
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Открываем платежную страницу
        window.open(data.payment_url, '_blank');
        
        toast({
          title: 'Переход на оплату',
          description: `Откроется страница оплаты через ${getSystemName(paymentSystem)}`
        });

        // Закрываем диалог через секунду
        setTimeout(() => {
          onClose();
        }, 1000);
      } else {
        toast({
          title: 'Ошибка',
          description: data.error || 'Не удалось создать платеж',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось подключиться к серверу',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
      setSelectedSystem(null);
    }
  };

  const getSystemName = (system: PaymentSystem): string => {
    switch (system) {
      case 'pally': return 'Pally';
      case 'yoomoney': return 'ЮMoney';
      case 'sbp': return 'СБП';
      default: return '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Пополнение баланса</DialogTitle>
          <DialogDescription>Выберите удобный способ оплаты</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Сумма пополнения</Label>
            <Input
              type="number"
              placeholder="Введите сумму"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="1"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[200, 500, 1000].map((preset) => (
              <Button
                key={preset}
                variant="outline"
                size="sm"
                onClick={() => setAmount(preset.toString())}
              >
                {preset} ₽
              </Button>
            ))}
          </div>

          <div className="space-y-2">
            <Label>Способ оплаты</Label>
            
            <Button
              className="w-full flex items-center justify-center gap-2"
              onClick={() => handleCreatePayment('sbp')}
              disabled={loading}
            >
              <Icon name="Smartphone" size={18} />
              {loading && selectedSystem === 'sbp' ? 'Загрузка...' : 'СБП (Система Быстрых Платежей)'}
            </Button>

            <Button
              className="w-full flex items-center justify-center gap-2"
              variant="outline"
              onClick={() => handleCreatePayment('pally')}
              disabled={loading}
            >
              <Icon name="CreditCard" size={18} />
              {loading && selectedSystem === 'pally' ? 'Загрузка...' : 'Банковская карта (Pally)'}
            </Button>

            <Button
              className="w-full flex items-center justify-center gap-2"
              variant="outline"
              onClick={() => handleCreatePayment('yoomoney')}
              disabled={loading}
            >
              <Icon name="Wallet" size={18} />
              {loading && selectedSystem === 'yoomoney' ? 'Загрузка...' : 'ЮMoney'}
            </Button>
          </div>

          <div className="text-xs text-muted-foreground text-center pt-2">
            После оплаты баланс обновится автоматически
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}