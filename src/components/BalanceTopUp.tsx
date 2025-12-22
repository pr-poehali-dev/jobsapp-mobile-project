import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import Icon from '@/components/ui/icon';

const PAYMENTS_API_URL = 'https://functions.poehali.dev/fc60f54b-d835-4f8b-9424-5d6c14a11945';

interface BalanceTopUpProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  currentBalance: number;
  onSuccess?: () => void;
}

export function BalanceTopUp({ open, onClose, userId, currentBalance, onSuccess }: BalanceTopUpProps) {
  const [amount, setAmount] = useState<string>('500');
  const [loading, setLoading] = useState(false);

  const presetAmounts = [500, 1000, 2000, 5000];

  const handleCreatePayment = async () => {
    const numAmount = parseInt(amount);

    if (isNaN(numAmount) || numAmount < 100) {
      toast({
        title: 'Ошибка',
        description: 'Минимальная сумма пополнения — 100 рублей',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${PAYMENTS_API_URL}?path=create-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          amount: numAmount,
          payment_system: 'pally',
          return_url: `${window.location.origin}/payment-success`
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Открываем платежную страницу
        window.open(data.payment_url, '_blank');
        
        toast({
          title: 'Платеж создан',
          description: 'Откройте новую вкладку для оплаты. После оплаты баланс обновится автоматически.',
        });

        onClose();
        onSuccess?.();
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
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Пополнить баланс</DialogTitle>
          <DialogDescription>
            Текущий баланс: <span className="font-semibold text-foreground">{currentBalance} ₽</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Быстрый выбор суммы */}
          <div className="space-y-3">
            <Label>Быстрый выбор</Label>
            <div className="grid grid-cols-4 gap-2">
              {presetAmounts.map((preset) => (
                <Button
                  key={preset}
                  variant={amount === preset.toString() ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAmount(preset.toString())}
                >
                  {preset} ₽
                </Button>
              ))}
            </div>
          </div>

          {/* Своя сумма */}
          <div className="space-y-2">
            <Label htmlFor="amount">Или укажите свою сумму</Label>
            <div className="relative">
              <Input
                id="amount"
                type="number"
                min="100"
                step="100"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Минимум 100 ₽"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                ₽
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Минимальная сумма пополнения — 100 рублей
            </p>
          </div>

          {/* Итого */}
          <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Текущий баланс:</span>
              <span className="font-medium">{currentBalance} ₽</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Пополнение:</span>
              <span className="font-medium text-primary">+{amount || 0} ₽</span>
            </div>
            <div className="border-t pt-2 flex justify-between">
              <span className="font-semibold">Будет на балансе:</span>
              <span className="font-semibold text-lg">
                {currentBalance + (parseInt(amount) || 0)} ₽
              </span>
            </div>
          </div>

          {/* Кнопки */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={loading}
            >
              Отмена
            </Button>
            <Button
              onClick={handleCreatePayment}
              className="flex-1"
              disabled={loading || !amount || parseInt(amount) < 100}
            >
              {loading ? (
                <>
                  <Icon name="Loader2" className="animate-spin mr-2" size={16} />
                  Создание...
                </>
              ) : (
                <>
                  <Icon name="CreditCard" className="mr-2" size={16} />
                  Пополнить
                </>
              )}
            </Button>
          </div>

          {/* Информация о Pally */}
          <div className="text-xs text-center text-muted-foreground">
            <Icon name="ShieldCheck" size={14} className="inline mr-1" />
            Безопасная оплата через Pally
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default BalanceTopUp;
