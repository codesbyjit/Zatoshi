'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/Input';

export interface ShippingAddressData {
  firstName: string;
  lastName: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone: string;
}

interface ShippingFormProps {
  data: ShippingAddressData;
  onChange: (data: ShippingAddressData) => void;
  errors?: Partial<Record<keyof ShippingAddressData, string>>;
}

export function ShippingForm({ data, onChange, errors = {} }: ShippingFormProps) {
  const handleChange = (field: keyof ShippingAddressData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...data, [field]: e.target.value });
  };

  return (
    <div className="space-y-4">
      <h2 className="text-h2 text-[var(--color-text-primary)]">Shipping Address</h2>
      <p className="text-sm text-[var(--color-text-muted)]">
        Enter your shipping details below.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="First Name"
          placeholder="John"
          value={data.firstName}
          onChange={handleChange('firstName')}
          error={errors.firstName}
          required
        />
        <Input
          label="Last Name"
          placeholder="Doe"
          value={data.lastName}
          onChange={handleChange('lastName')}
          error={errors.lastName}
          required
        />
      </div>

      <Input
        label="Street Address"
        placeholder="123 Main St"
        value={data.street}
        onChange={handleChange('street')}
        error={errors.street}
        required
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Input
          label="City"
          placeholder="New York"
          value={data.city}
          onChange={handleChange('city')}
          error={errors.city}
          required
        />
        <Input
          label="State"
          placeholder="NY"
          value={data.state}
          onChange={handleChange('state')}
          error={errors.state}
          required
        />
        <Input
          label="ZIP Code"
          placeholder="10001"
          value={data.zip}
          onChange={handleChange('zip')}
          error={errors.zip}
          required
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Country"
          placeholder="United States"
          value={data.country}
          onChange={handleChange('country')}
          error={errors.country}
          required
        />
        <Input
          label="Phone"
          placeholder="+1 (555) 000-0000"
          value={data.phone}
          onChange={handleChange('phone')}
          error={errors.phone}
          type="tel"
          required
        />
      </div>
    </div>
  );
}
