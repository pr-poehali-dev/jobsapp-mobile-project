import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVkAuth } from '@/components/extensions/vk-auth/useVkAuth';
import { useToast } from '@/hooks/use-toast';
import safeStorage from '@/lib/safe-storage';

const VK_API_BASE = 'https://functions.poehali.dev/98c7ab8f-e10f-49ed-aa81-db6e7ee198d3';

const apiUrls = {
  authUrl: `${VK_API_BASE}?action=auth-url`,
  callback: `${VK_API_BASE}?action=callback`,
  refresh: `${VK_API_BASE}?action=refresh`,
  logout: `${VK_API_BASE}?action=logout`,
};

export default function VkCallback() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const callbackProcessed = useRef(false);

  const {
    isAuthenticated,
    isLoading,
    error,
    accessToken,
    user,
    handleCallback,
  } = useVkAuth({ apiUrls });

  useEffect(() => {
    if (callbackProcessed.current) return;
    callbackProcessed.current = true;
    handleCallback();
  }, [handleCallback]);

  useEffect(() => {
    if (isAuthenticated && accessToken && user) {
      safeStorage.setItem('auth_token', accessToken);
      const currentUser = {
        id: user.id,
        email: user.email,
        phone: null,
        full_name: user.name,
        name: user.name,
        is_verified: true,
        role: 'seeker',
        balance: 0,
        tier: 'FREE',
        vacanciesThisMonth: 0,
        avatar_url: user.avatar_url,
        vk_id: user.vk_id,
      };
      safeStorage.setItem('currentUser', JSON.stringify(currentUser));
      toast({
        title: 'Вход выполнен',
        description: `Добро пожаловать${user.name ? ', ' + user.name : ''}!`,
      });
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, accessToken, user, navigate, toast]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md mx-auto p-6">
          <div className="w-16 h-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold">Ошибка авторизации</h1>
          <p className="text-muted-foreground">{error}</p>
          <a
            href="/"
            className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Вернуться на главную
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-12 h-12 mx-auto border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-muted-foreground">Выполняется вход через ВКонтакте...</p>
      </div>
    </div>
  );
}