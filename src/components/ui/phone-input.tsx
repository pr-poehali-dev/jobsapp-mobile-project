import { Input } from '@/components/ui/input';
import { forwardRef } from 'react';

interface PhoneInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
}

export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ value, onChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target.value;
      
      // Убираем все кроме цифр
      const digits = input.replace(/\D/g, '');
      
      // Если пустое поле, возвращаем +7
      if (digits.length === 0) {
        onChange('+7');
        return;
      }
      
      // Если начинается с 7 или 8, убираем эту цифру
      let cleaned = digits;
      if (cleaned.startsWith('7') || cleaned.startsWith('8')) {
        cleaned = cleaned.substring(1);
      }
      
      // Ограничиваем 10 цифрами (российский номер без кода страны)
      cleaned = cleaned.substring(0, 10);
      
      // Форматируем: +7 (XXX) XXX-XX-XX
      let formatted = '+7';
      if (cleaned.length > 0) {
        formatted += ' (' + cleaned.substring(0, 3);
      }
      if (cleaned.length >= 3) {
        formatted += ') ' + cleaned.substring(3, 6);
      }
      if (cleaned.length >= 6) {
        formatted += '-' + cleaned.substring(6, 8);
      }
      if (cleaned.length >= 8) {
        formatted += '-' + cleaned.substring(8, 10);
      }
      
      onChange(formatted);
    };
    
    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      // При фокусе, если поле пустое, ставим +7
      if (!value || value === '') {
        onChange('+7');
      }
      props.onFocus?.(e);
    };

    return (
      <Input
        {...props}
        ref={ref}
        type="tel"
        value={value}
        onChange={handleChange}
        onFocus={handleFocus}
        placeholder="+7 (999) 123-45-67"
      />
    );
  }
);

PhoneInput.displayName = 'PhoneInput';
