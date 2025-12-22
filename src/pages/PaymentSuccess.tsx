import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';

const PAYMENTS_API_URL = 'https://functions.poehali.dev/fc60f54b-d835-4f8b-9424-5d6c14a11945';

export function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [paymentData, setPaymentData] = useState<any>(null);

  const paymentId = searchParams.get('payment_id');

  useEffect(() => {
    if (paymentId) {
      checkPaymentStatus();
    }
  }, [paymentId]);

  const checkPaymentStatus = async () => {
    try {
      const response = await fetch(`${PAYMENTS_API_URL}?path=payment/${paymentId}`);
      const data = await response.json();

      if (response.ok && data.transaction) {
        setPaymentData(data.transaction);
      }
    } catch (error) {
      console.error('Ошибка проверки статуса:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50">
        <div className="text-center space-y-4">
          <Icon name="Loader2" className="w-12 h-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Проверяем статус платежа...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 space-y-6 text-center">
        {/* Иконка успеха */}
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <Icon name="CheckCircle2" className="w-12 h-12 text-green-600" />
        </div>

        {/* Заголовок */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">
            Платеж успешен!
          </h1>
          <p className="text-gray-600">
            Ваш баланс пополнен
          </p>
        </div>

        {/* Детали платежа */}
        {paymentData && (
          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Сумма пополнения:</span>
              <span className="font-semibold text-gray-900">
                +{paymentData.amount} ₽
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Статус:</span>
              <span className="font-semibold text-green-600">
                {paymentData.status === 'completed' ? 'Завершен' : 'Обрабатывается'}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">ID транзакции:</span>
              <span className="font-mono text-xs text-gray-500">
                {paymentData.id.slice(0, 8)}...
              </span>
            </div>
          </div>
        )}

        {/* Информация */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
          <div className="flex gap-3">
            <Icon name="Info" className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-medium mb-1">Баланс обновлен</p>
              <p className="text-blue-700">
                Средства зачислены на ваш счет и доступны для размещения вакансий.
              </p>
            </div>
          </div>
        </div>

        {/* Кнопки */}
        <div className="space-y-3 pt-4">
          <Button
            onClick={() => navigate('/profile')}
            className="w-full"
            size="lg"
          >
            <Icon name="User" className="mr-2" size={18} />
            Перейти в профиль
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
      </div>
    </div>
  );
}

export default PaymentSuccess;
