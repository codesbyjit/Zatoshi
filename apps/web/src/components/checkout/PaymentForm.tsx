'use client';

import { Input } from '@/components/ui/Input';

export interface PaymentData {
  cardNumber: string;
  cardName: string;
  expiry: string;
  cvv: string;
}

interface PaymentFormProps {
  data: PaymentData;
  onChange: (data: PaymentData) => void;
  errors?: Partial<Record<keyof PaymentData, string>>;
}

export function PaymentForm({ data, onChange, errors = {} }: PaymentFormProps) {
  const handleChange = (field: keyof PaymentData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;

    // Format card number
    if (field === 'cardNumber') {
      value = value.replace(/\D/g, '').replace(/(\d{4})/g, '$1 ').trim().slice(0, 19);
    }

    // Format expiry
    if (field === 'expiry') {
      value = value.replace(/\D/g, '').replace(/(\d{2})(\d)/, '$1/$2').slice(0, 5);
    }

    // Only digits for CVV
    if (field === 'cvv') {
      value = value.replace(/\D/g, '').slice(0, 4);
    }

    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-4">
      <h2 className="text-h2 text-[var(--color-text-primary)]">Payment</h2>
      <p className="text-sm text-[var(--color-text-muted)]">
        Enter your payment details. This is a mock payment form.
      </p>

      <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
        <Input
          label="Card Number"
          placeholder="4242 4242 4242 4242"
          value={data.cardNumber}
          onChange={handleChange('cardNumber')}
          error={errors.cardNumber}
          leftIcon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
              <path d="M2 10h20" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          }
          required
        />

        <div className="mt-4 grid grid-cols-2 gap-4">
          <Input
            label="Expiry Date"
            placeholder="MM/YY"
            value={data.expiry}
            onChange={handleChange('expiry')}
            error={errors.expiry}
            required
          />
          <Input
            label="CVC"
            placeholder="123"
            value={data.cvv}
            onChange={handleChange('cvv')}
            error={errors.cvv}
            type="password"
            required
          />
        </div>

        <div className="mt-4">
          <Input
            label="Name on Card"
            placeholder="John Doe"
            value={data.cardName}
            onChange={handleChange('cardName')}
            error={errors.cardName}
            required
          />
        </div>
      </div>

      <div className="flex items-center gap-2 text-caption text-[var(--color-text-muted)]">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="3" y="11" width="18" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
          <path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="1.5" />
        </svg>
        SSL Encrypted &bull; Your payment info is secure
      </div>
    </div>
  );
}
