import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';

const PAYMENTS_API_URL = 'https://functions.poehali.dev/fc60f54b-d835-4f8b-9424-5d6c14a11945';

interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  type: 'deposit' | 'withdrawal' | 'purchase';
  payment_system: string;
  status: 'pending' | 'completed' | 'failed';
  description: string;
  created_at: string;
  updated_at: string;
}

interface TransactionHistoryProps {
  userId: string;
}

export function TransactionHistory({ userId }: TransactionHistoryProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTransactions();
  }, [userId]);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${PAYMENTS_API_URL}?path=transactions/${userId}`);
      const data = await response.json();

      if (response.ok && data.success) {
        setTransactions(data.transactions);
      }
    } catch (error) {
      console.error('Ошибка загрузки транзакций:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getStatusBadge = (status: Transaction['status']) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-700 border-green-200">Завершена</Badge>;
      case 'pending':
        return <Badge variant="secondary">В обработке</Badge>;
      case 'failed':
        return <Badge variant="destructive">Отменена</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeIcon = (type: Transaction['type']) => {
    switch (type) {
      case 'deposit':
        return <Icon name="ArrowDownToLine" className="text-green-600" size={20} />;
      case 'withdrawal':
        return <Icon name="ArrowUpFromLine" className="text-red-600" size={20} />;
      case 'purchase':
        return <Icon name="ShoppingCart" className="text-blue-600" size={20} />;
      default:
        return <Icon name="Wallet" className="text-gray-600" size={20} />;
    }
  };

  const getTypeLabel = (type: Transaction['type']) => {
    switch (type) {
      case 'deposit':
        return 'Пополнение';
      case 'withdrawal':
        return 'Вывод';
      case 'purchase':
        return 'Покупка';
      default:
        return type;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Icon name="Loader2" className="animate-spin text-muted-foreground" size={32} />
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12">
        <Icon name="Receipt" size={48} className="mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground mb-2">История транзакций пуста</p>
        <p className="text-sm text-muted-foreground">
          После пополнения баланса или покупок здесь появятся записи
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">История транзакций</h3>
        <Button size="sm" variant="ghost" onClick={loadTransactions}>
          <Icon name="RefreshCw" size={14} className="mr-1" />
          Обновить
        </Button>
      </div>

      {transactions.map((transaction) => (
        <Card key={transaction.id} className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="mt-1">
                {getTypeIcon(transaction.type)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      {getTypeLabel(transaction.type)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {transaction.description}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${
                      transaction.type === 'deposit' ? 'text-green-600' : 
                      transaction.type === 'withdrawal' ? 'text-red-600' : 
                      'text-gray-900'
                    }`}>
                      {transaction.type === 'deposit' ? '+' : '-'}{transaction.amount} ₽
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2">
                    {getStatusBadge(transaction.status)}
                    <span className="text-xs text-muted-foreground">
                      {transaction.payment_system}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(transaction.created_at)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default TransactionHistory;
