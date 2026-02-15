import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import Icon from '@/components/ui/icon';
import func2url from '@/../backend/func2url.json';

const ADMIN_API = 'https://functions.poehali.dev/0d65638b-a8d6-40af-971b-31d0f9e356d0';
const ROBOKASSA_API = func2url['robokassa-robokassa'];

interface BalanceTopUpProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  userName?: string;
  userEmail?: string;
  currentBalance: number;
  onSuccess?: (newBalance?: number, newTier?: string) => void;
}

export function BalanceTopUp({ open, onClose, userId, userName, userEmail, currentBalance, onSuccess }: BalanceTopUpProps) {
  const [amount, setAmount] = useState<string>('500');
  const [loading, setLoading] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoResult, setPromoResult] = useState<{ success: boolean; message: string } | null>(null);

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
      const response = await fetch(ROBOKASSA_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: numAmount,
          user_id: userId,
          user_name: userName || 'Пользователь',
          user_email: userEmail || 'noreply@example.com',
          order_comment: 'Пополнение баланса',
          cart_items: [],
          success_url: `${window.location.origin}/payment-success`,
          fail_url: `${window.location.origin}/payment-fail`
        })
      });

      const data = await response.json();

      if (response.ok && data.payment_url) {
        window.open(data.payment_url, '_blank');
        
        toast({
          title: 'Платёж создан',
          description: 'Откройте новую вкладку для оплаты. После оплаты баланс обновится автоматически.',
        });

        onClose();
        onSuccess?.();
      } else {
        toast({
          title: 'Ошибка',
          description: data.error || 'Не удалось создать платёж',
          variant: 'destructive'
        });
      }
    } catch {
      toast({
        title: 'Ошибка',
        description: 'Не удалось подключиться к серверу',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleActivatePromo = async () => {
    if (!promoCode.trim()) return;

    setPromoLoading(true);
    setPromoResult(null);
    try {
      const response = await fetch(`${ADMIN_API}?path=activate-promo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: promoCode.trim(), user_id: userId })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setPromoResult({ success: true, message: data.message });
        setPromoCode('');
        toast({ title: 'Промо-код активирован', description: data.message });
        onSuccess?.(data.new_balance, data.new_tier);
      } else {
        setPromoResult({ success: false, message: data.error || 'Ошибка активации' });
      }
    } catch {
      setPromoResult({ success: false, message: 'Не удалось подключиться к серверу' });
    } finally {
      setPromoLoading(false);
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
          <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
            <Label className="flex items-center gap-2">
              <Icon name="Ticket" size={16} />
              Промо-код
            </Label>
            <div className="flex gap-2">
              <Input
                value={promoCode}
                onChange={(e) => {
                  setPromoCode(e.target.value.toUpperCase());
                  setPromoResult(null);
                }}
                placeholder="Введите промо-код"
                className="font-mono"
                onKeyDown={(e) => e.key === 'Enter' && handleActivatePromo()}
              />
              <Button
                onClick={handleActivatePromo}
                disabled={promoLoading || !promoCode.trim()}
                size="default"
              >
                {promoLoading ? (
                  <Icon name="Loader2" className="animate-spin" size={16} />
                ) : (
                  'Применить'
                )}
              </Button>
            </div>
            {promoResult && (
              <p className={`text-sm ${promoResult.success ? 'text-green-600' : 'text-destructive'}`}>
                {promoResult.message}
              </p>
            )}
          </div>

          <div className="relative flex items-center">
            <div className="flex-1 border-t" />
            <span className="px-3 text-xs text-muted-foreground">или пополните через оплату</span>
            <div className="flex-1 border-t" />
          </div>

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
                  Оплатить {amount} ₽
                </>
              )}
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Оплата через Robokassa. Поддерживаются банковские карты, СБП и другие способы.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default BalanceTopUp;