import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';

export function PaymentSuccess() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50 p-4">
      <div className="max-w-md w-full bg-card rounded-2xl shadow-xl p-8 space-y-6 text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <Icon name="CheckCircle2" className="w-12 h-12 text-green-600" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">
            Оплата прошла успешно!
          </h1>
          <p className="text-muted-foreground">
            Средства зачислены на ваш баланс
          </p>
        </div>

        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 text-left">
          <div className="flex gap-3">
            <Icon name="Info" className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="text-sm text-foreground">
              <p className="font-medium mb-1">Баланс обновлён</p>
              <p className="text-primary">
                Средства уже доступны для оплаты тарифа и размещения вакансий. Перейдите на главную, чтобы продолжить.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3 pt-4">
          <Button
            onClick={() => navigate('/')}
            className="w-full"
            size="lg"
          >
            <Icon name="Home" className="mr-2" size={18} />
            На главную
          </Button>
        </div>
      </div>
    </div>
  );
}

export default PaymentSuccess;
