import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Icon from '@/components/ui/icon';
import { toast } from '@/hooks/use-toast';
import { ALL_REGIONS, getCitiesByRegion, findRegionByCity } from '@/data/cities';

interface CitySelectorProps {
  selectedCity: string;
  onCityChange: (city: string) => void;
}

export function CitySelector({ selectedCity, onCityChange }: CitySelectorProps) {
  const [open, setOpen] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  useEffect(() => {
    if (selectedCity) {
      const region = findRegionByCity(selectedCity);
      if (region) {
        setSelectedRegion(region);
        setAvailableCities(getCitiesByRegion(region));
      }
    }
  }, [selectedCity]);

  const handleRegionChange = (region: string) => {
    setSelectedRegion(region);
    const cities = getCitiesByRegion(region);
    setAvailableCities(cities);
  };

  const handleCitySelect = (city: string) => {
    onCityChange(city);
    setOpen(false);
  };

  const handleGetLocation = async () => {
    setIsLoadingLocation(true);
    
    if (!navigator.geolocation) {
      toast({
        title: 'Геолокация недоступна',
        description: 'Ваш браузер не поддерживает определение местоположения',
        variant: 'destructive'
      });
      setIsLoadingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=ru`
          );
          
          const data = await response.json();
          const cityFromGeo = data.address?.city || data.address?.town || data.address?.village;
          
          if (cityFromGeo) {
            const region = findRegionByCity(cityFromGeo);
            
            if (region) {
              setSelectedRegion(region);
              setAvailableCities(getCitiesByRegion(region));
              onCityChange(cityFromGeo);
              setOpen(false);
              
              toast({
                title: 'Местоположение определено',
                description: `Ваш город: ${cityFromGeo}`
              });
            } else {
              toast({
                title: 'Город найден',
                description: `Определен город: ${cityFromGeo}, но он не найден в списке. Выберите ближайший город вручную.`
              });
            }
          } else {
            toast({
              title: 'Не удалось определить город',
              description: 'Пожалуйста, выберите город вручную',
              variant: 'destructive'
            });
          }
        } catch (error) {
          toast({
            title: 'Ошибка определения местоположения',
            description: 'Не удалось получить данные о вашем городе',
            variant: 'destructive'
          });
        } finally {
          setIsLoadingLocation(false);
        }
      },
      (error) => {
        let message = 'Не удалось получить доступ к местоположению';
        
        if (error.code === error.PERMISSION_DENIED) {
          message = 'Доступ к геолокации запрещен. Разрешите доступ в настройках браузера.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          message = 'Информация о местоположении недоступна';
        } else if (error.code === error.TIMEOUT) {
          message = 'Превышено время ожидания определения местоположения';
        }
        
        toast({
          title: 'Ошибка геолокации',
          description: message,
          variant: 'destructive'
        });
        
        setIsLoadingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  return (
    <>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          onClick={() => setOpen(true)}
          className="flex items-center gap-2"
        >
          <Icon name="MapPin" size={16} />
          <span className="hidden sm:inline">{selectedCity || 'Город'}</span>
          <span className="sm:hidden">{selectedCity ? selectedCity.slice(0, 8) + (selectedCity.length > 8 ? '...' : '') : 'Город'}</span>
        </Button>
        {selectedCity && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onCityChange('')}
            className="h-8 w-8"
          >
            <Icon name="X" size={14} />
          </Button>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Выбор города</DialogTitle>
            <DialogDescription>
              Укажите ваш город, чтобы видеть актуальные вакансии
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Button
              variant="outline"
              className="w-full"
              onClick={handleGetLocation}
              disabled={isLoadingLocation}
            >
              <Icon 
                name={isLoadingLocation ? "Loader2" : "Navigation"} 
                size={16} 
                className={`mr-2 ${isLoadingLocation ? 'animate-spin' : ''}`}
              />
              {isLoadingLocation ? 'Определяю местоположение...' : 'Определить автоматически'}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  или выберите вручную
                </span>
              </div>
            </div>

            <div>
              <Label>Регион</Label>
              <Select value={selectedRegion} onValueChange={handleRegionChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите регион" />
                </SelectTrigger>
                <SelectContent>
                  {ALL_REGIONS.map((region) => (
                    <SelectItem key={region} value={region}>
                      {region}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedRegion && availableCities.length > 0 && (
              <div>
                <Label>Город</Label>
                <Select value={selectedCity} onValueChange={handleCitySelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите город" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCities.map((city) => (
                      <SelectItem key={city} value={city}>
                        {city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedRegion && availableCities.length === 0 && (
              <p className="text-sm text-muted-foreground text-center">
                В выбранном регионе нет доступных городов
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}