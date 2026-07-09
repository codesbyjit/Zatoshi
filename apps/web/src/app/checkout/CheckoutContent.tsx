'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { ShippingForm, type ShippingAddressData } from '@/components/checkout/ShippingForm';
import { PaymentForm, type PaymentData } from '@/components/checkout/PaymentForm';
import { OrderSummary } from '@/components/checkout/OrderSummary';
import { CartSummary } from '@/components/cart/CartSummary';
import { generateId, formatCurrency, getShippingCost, getTax, cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import type { CartItemData } from '@/components/cart/CartItem';
import {
  saveCheckoutDetails,
  loadCheckoutDetails,
  hasCheckoutDetails,
  type CheckoutDetails,
} from '@/lib/checkout-cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

type Step = 'shipping' | 'payment' | 'review';

const steps: { key: Step; label: string }[] = [
  { key: 'shipping', label: 'Shipping' },
  { key: 'payment', label: 'Payment' },
  { key: 'review', label: 'Review' },
];

export function CheckoutContent() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>('shipping');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [idempotencyKey] = useState(generateId());
  const [cartItems, setCartItems] = useState<CartItemData[]>([]);
  const [cartLoading, setCartLoading] = useState(true);
  const [error, setError] = useState('');

  const [shippingData, setShippingData] = useState<ShippingAddressData>({
    firstName: '',
    lastName: '',
    street: '',
    city: '',
    state: '',
    zip: '',
    country: 'United States',
    phone: '',
  });

  const [paymentData, setPaymentData] = useState<PaymentData>({
    cardNumber: '',
    cardName: '',
    expiry: '',
    cvv: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showSavedBanner, setShowSavedBanner] = useState(false);
  const [useSavedDetails, setUseSavedDetails] = useState(false);

  // Fetch real cart on mount
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/auth/login');
      return;
    }

    const fetchCart = async () => {
      try {
        const res = await fetch(`${API_URL}/trpc/cart.get`, {
          credentials: 'include',
          cache: 'no-store',
        });
        const data = await res.json();
        const items = data?.result?.data?.items || [];
        setCartItems(items);
      } catch {
        setCartItems([]);
      } finally {
        setCartLoading(false);
      }
    };

    fetchCart();
  }, [user, authLoading, router]);

  // Check for saved checkout details on mount
  useEffect(() => {
    if (authLoading) return;
    setShowSavedBanner(hasCheckoutDetails());
    setUseSavedDetails(false);
  }, [authLoading]);

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const validateShipping = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};
    if (!shippingData.firstName) newErrors.firstName = 'Required';
    if (!shippingData.lastName) newErrors.lastName = 'Required';
    if (!shippingData.street) newErrors.street = 'Required';
    if (!shippingData.city) newErrors.city = 'Required';
    if (!shippingData.state) newErrors.state = 'Required';
    if (!shippingData.zip) newErrors.zip = 'Required';
    if (!shippingData.country) newErrors.country = 'Required';
    if (!shippingData.phone) newErrors.phone = 'Required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [shippingData]);

  const validatePayment = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};
    if (!paymentData.cardNumber || paymentData.cardNumber.replace(/\s/g, '').length < 13)
      newErrors.cardNumber = 'Invalid card number';
    if (!paymentData.cardName) newErrors.cardName = 'Required';
    if (!paymentData.expiry || paymentData.expiry.length < 5)
      newErrors.expiry = 'Invalid expiry';
    if (!paymentData.cvv || paymentData.cvv.length < 3)
      newErrors.cvv = 'Invalid CVV';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [paymentData]);

  // Toggle saved details auto-fill
  const handleSavedDetailsToggle = (checked: boolean) => {
    setUseSavedDetails(checked);
    if (checked) {
      const saved = loadCheckoutDetails();
      if (saved) {
        const nameParts = saved.fullName.split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        setShippingData({
          firstName,
          lastName,
          street: saved.addressLine1 + (saved.addressLine2 ? `, ${saved.addressLine2}` : ''),
          city: saved.city,
          state: saved.state,
          zip: saved.zip,
          country: saved.country,
          phone: saved.phone,
        });
      }
    } else {
      // Reset to empty when unchecking
      setShippingData({
        firstName: '',
        lastName: '',
        street: '',
        city: '',
        state: '',
        zip: '',
        country: 'United States',
        phone: '',
      });
    }
  };

  const goToNextStep = () => {
    if (currentStep === 'shipping') {
      if (!validateShipping()) return;
      setCurrentStep('payment');
    } else if (currentStep === 'payment') {
      if (!validatePayment()) return;
      setCurrentStep('review');
    }
  };

  const goToPrevStep = () => {
    if (currentStep === 'payment') setCurrentStep('shipping');
    else if (currentStep === 'review') setCurrentStep('payment');
  };

  const handlePlaceOrder = async () => {
    if (cartItems.length === 0) return;

    setIsSubmitting(true);
    setError('');

    try {
      // Build items payload (only productId, variantInfo, quantity for order.create)
      const items = cartItems.map((ci) => ({
        productId: ci.productId,
        variantInfo: ci.variantInfo,
        quantity: ci.quantity,
      }));

      const res = await fetch(`${API_URL}/trpc/order.create`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          shippingAddress: shippingData,
          idempotencyKey,
        }),
      });

      const data = await res.json();

      if (data?.error) {
        throw new Error(data.error.message || 'Failed to place order');
      }

      const order = data?.result?.data;
      if (!order) {
        throw new Error('Invalid response from server');
      }

      // Save shipping details to cookie for next checkout
      saveCheckoutDetails({
        fullName: `${shippingData.firstName} ${shippingData.lastName}`.trim(),
        email: user?.email ?? '',
        phone: shippingData.phone,
        addressLine1: shippingData.street,
        addressLine2: '',
        city: shippingData.city,
        state: shippingData.state,
        zip: shippingData.zip,
        country: shippingData.country,
      });

      router.push(`/checkout/success?orderId=${order._id}&orderNumber=${order.orderNumber}`);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (authLoading || cartLoading) {
    return (
      <div className="container-content flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-accent)] border-t-transparent" />
      </div>
    );
  }

  // Empty cart — redirect to cart
  if (cartItems.length === 0) {
    return (
      <div className="container-content flex flex-col items-center justify-center py-16 text-center">
        <h1 className="text-h2 text-[var(--color-text-primary)]">Your cart is empty</h1>
        <p className="mt-2 text-body text-[var(--color-text-secondary)]">Add some items before checking out.</p>
        <Button variant="primary" size="lg" className="mt-6" onClick={() => router.push('/cart')}>
          View Cart
        </Button>
      </div>
    );
  }

  const currentIndex = steps.findIndex((s) => s.key === currentStep);

  return (
    <div className="container-content py-8">
      {/* Error banner */}
      {error && (
        <div className="mb-6 rounded-md bg-[var(--color-error-bg)] p-4 text-sm text-[var(--color-error)]">
          {error}
        </div>
      )}

      {/* Step indicator - Desktop */}
      <div className="mb-8 hidden items-center justify-center md:flex">
        {steps.map((step, idx) => (
          <div key={step.key} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-all duration-200',
                  idx < currentIndex
                    ? 'bg-[var(--color-success)] text-white'
                    : idx === currentIndex
                      ? 'bg-[var(--color-accent)] text-white'
                      : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)]',
                )}
              >
                {idx < currentIndex ? (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                    <path d="M3 7l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                ) : (
                  idx + 1
                )}
              </div>
              <span
                className={cn(
                  'mt-1 text-xs',
                  idx <= currentIndex ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-muted)]',
                )}
              >
                {step.label}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div className={cn('mx-4 h-px w-16', idx < currentIndex ? 'bg-[var(--color-success)]' : 'bg-[var(--color-border)]')} />
            )}
          </div>
        ))}
      </div>

      {/* Step indicator - Mobile */}
      <div className="mb-6 text-center md:hidden">
        <p className="text-sm text-[var(--color-text-muted)]">
          Step {currentIndex + 1} of {steps.length}: {steps[currentIndex].label}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_380px]">
        <div>
          {currentStep === 'shipping' && (
            <>
              {showSavedBanner && (
                <div className="mb-6 rounded-lg border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/5 p-4">
                  <label className="flex cursor-pointer items-center gap-3">
                    <input
                      type="checkbox"
                      checked={useSavedDetails}
                      onChange={(e) => handleSavedDetailsToggle(e.target.checked)}
                      className="h-4 w-4 rounded border-[var(--color-border)] text-[var(--color-accent)] focus:ring-[var(--color-accent)]"
                    />
                    <div>
                      <p className="text-sm-medium text-[var(--color-text-primary)]">
                        Use saved details from last checkout?
                      </p>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        Pre-fill your shipping address from your previous order.
                      </p>
                    </div>
                  </label>
                </div>
              )}

              <ShippingForm
                data={shippingData}
                onChange={(d) => {
                  setShippingData(d);
                  setErrors({});
                }}
              errors={errors as any}
            />
            </>
          )}

          {currentStep === 'payment' && (
            <PaymentForm
              data={paymentData}
              onChange={(d) => {
                setPaymentData(d);
                setErrors({});
              }}
              errors={errors as any}
            />
          )}

          {currentStep === 'review' && (
            <OrderSummary
              items={cartItems}
              shippingAddress={shippingData}
              paymentMethod={
                paymentData.cardName
                  ? `Card ending in ${paymentData.cardNumber.slice(-4)}`
                  : undefined
              }
            />
          )}

          <div className="mt-8 flex items-center justify-between border-t border-[var(--color-border)] pt-6">
            <Button
              variant="ghost"
              size="md"
              onClick={goToPrevStep}
              disabled={currentStep === 'shipping'}
            >
              &larr; Back
            </Button>

            {currentStep === 'review' ? (
              <Button
                variant="primary"
                size="lg"
                isLoading={isSubmitting}
                onClick={handlePlaceOrder}
              >
                Place Order
              </Button>
            ) : (
              <Button variant="primary" size="lg" onClick={goToNextStep}>
                {currentStep === 'payment' ? 'Review Order' : 'Continue'}
              </Button>
            )}
          </div>
        </div>

        <div className="lg:sticky lg:top-24 lg:self-start">
          <CartSummary subtotal={subtotal} />
        </div>
      </div>
    </div>
  );
}
