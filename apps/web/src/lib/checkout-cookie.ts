'use client';

export interface CheckoutDetails {
  fullName: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

const COOKIE_NAME = 'checkout_details';
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds

export function saveCheckoutDetails(details: CheckoutDetails): void {
  const json = JSON.stringify(details);
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(json)}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

export function loadCheckoutDetails(): CheckoutDetails | null {
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]*)`));
  if (!match) return null;
  try {
    return JSON.parse(decodeURIComponent(match[1])) as CheckoutDetails;
  } catch {
    return null; // Corrupted cookie
  }
}

export function hasCheckoutDetails(): boolean {
  return document.cookie.includes(`${COOKIE_NAME}=`);
}

export function clearCheckoutDetails(): void {
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
}
