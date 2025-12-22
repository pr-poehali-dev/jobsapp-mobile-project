import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Icon from '@/components/ui/icon';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(userAgent);
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;

    setIsIOS(ios);
    setIsStandalone(standalone);

    const dismissed = localStorage.getItem('installPromptDismissed');
    const isMobile = window.innerWidth < 768;

    if (!dismissed && !standalone && isMobile) {
      if (ios) {
        setShowPrompt(true);
      } else {
        const handler = (e: Event) => {
          e.preventDefault();
          setDeferredPrompt(e as BeforeInstallPromptEvent);
          setShowPrompt(true);
        };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
      }
    }
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setShowPrompt(false);
      localStorage.setItem('installPromptDismissed', 'true');
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('installPromptDismissed', 'true');
  };

  if (!showPrompt || isStandalone) return null;

  return (
    <Card className="fixed bottom-4 left-4 right-4 z-50 p-4 shadow-lg border-primary/50 bg-gradient-to-r from-primary/10 to-background">
      <div className="flex items-start gap-3">
        <div className="bg-primary/20 rounded-full p-2 flex-shrink-0">
          <Icon name="Download" size={20} className="text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm mb-1">Установите приложение</h3>
          {isIOS ? (
            <p className="text-xs text-muted-foreground mb-3">
              Нажмите <Icon name="Share" size={12} className="inline mx-1" /> внизу экрана, затем "На экран «Домой»"
            </p>
          ) : (
            <p className="text-xs text-muted-foreground mb-3">
              Установите приложение для быстрого доступа к вакансиям
            </p>
          )}
          <div className="flex gap-2">
            {!isIOS && deferredPrompt && (
              <Button size="sm" onClick={handleInstall} className="text-xs h-8">
                Установить
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={handleDismiss} className="text-xs h-8">
              Не сейчас
            </Button>
          </div>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6 flex-shrink-0"
          onClick={handleDismiss}
        >
          <Icon name="X" size={14} />
        </Button>
      </div>
    </Card>
  );
}
