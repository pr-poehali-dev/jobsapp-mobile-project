import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';

export function PaymentFail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const paymentId = searchParams.get('payment_id');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 p-4">
      <div className="max-w-md w-full bg-card rounded-2xl shadow-xl p-8 space-y-6 text-center">
        {/* Иконка ошибки */}
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
          <Icon name="XCircle" className="w-12 h-12 text-red-600" />
        </div>

        {/* Заголовок */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">
            Платеж не выполнен
          </h1>
          <p className="text-muted-foreground">
            Что-то пошло не так при оплате
          </p>
        </div>

        {/* Причины */}
        <div className="bg-muted rounded-xl p-4 text-left space-y-2">
          <p className="text-sm font-medium text-foreground mb-3">
            Возможные причины:
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex gap-2">
              <Icon name="Circle" size={8} className="mt-1.5 flex-shrink-0" />
              <span>Недостаточно средств на карте</span>
            </li>
            <li className="flex gap-2">
              <Icon name="Circle" size={8} className="mt-1.5 flex-shrink-0" />
              <span>Платеж был отменен</span>
            </li>
            <li className="flex gap-2">
              <Icon name="Circle" size={8} className="mt-1.5 flex-shrink-0" />
              <span>Технические проблемы банка</span>
            </li>
            <li className="flex gap-2">
              <Icon name="Circle" size={8} className="mt-1.5 flex-shrink-0" />
              <span>Превышен лимит по карте</span>
            </li>
          </ul>
        </div>

        {/* Информация */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-left">
          <div className="flex gap-3">
            <Icon name="AlertCircle" className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-900">
              <p className="font-medium mb-1">Деньги не списаны</p>
              <p className="text-amber-700">
                С вашего счета не было списано никаких средств. Вы можете повторить попытку оплаты.
              </p>
            </div>
          </div>
        </div>

        {/* ID транзакции */}
        {paymentId && (
          <div className="text-xs text-muted-foreground">
            ID транзакции: {paymentId.slice(0, 8)}...
          </div>
        )}

        {/* Кнопки */}
        <div className="space-y-3 pt-4">
          <Button
            onClick={() => navigate('/profile')}
            className="w-full"
            size="lg"
          >
            <Icon name="RotateCcw" className="mr-2" size={18} />
            Попробовать снова
          </Button>
          <Button
            onClick={() => navigate('/')}
            variant="outline"
            className="w-full"
            size="lg"
          >
            <Icon name="Home" className="mr-2" size={18} />
            На главную
          </Button>
        </div>

        {/* Контакты поддержки */}
        <div className="pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            Нужна помощь?{' '}
            <button className="text-primary hover:underline">
              Свяжитесь с поддержкой
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default PaymentFail;