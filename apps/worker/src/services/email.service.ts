import { getLogger } from '@repo/utils';

const logger = getLogger('worker:email');

export interface EmailPayload {
  to: string;
  subject: string;
  body: string;
}

export interface OrderItemDisplay {
  name: string;
  quantity: number;
  price: number;
}

/**
 * Mock email sender for development.
 * In production, integrate with SendGrid, SES, Resend, etc.
 *
 * @param to - Recipient email address
 * @param subject - Email subject line
 * @param body - Email body content
 */
export async function sendEmail(to: string, subject: string, body: string): Promise<void> {
  logger.info(
    { to, subject, bodyLength: body.length },
    `[EMAIL] To: ${to} | Subject: ${subject}`,
  );
  logger.debug(`[EMAIL] Body: ${body}`);

  // In production, uncomment and integrate:
  // await sendgridClient.send({ to, from: 'noreply@example.com', subject, html: body });

  return Promise.resolve();
}

/**
 * Build an order confirmation email.
 */
export function orderConfirmationEmail(
  userName: string,
  orderNumber: string,
  items: OrderItemDisplay[],
  total: number,
): { subject: string; body: string } {
  const itemsList = items
    .map((item) => `  • ${item.name} × ${item.quantity} — $${item.price.toFixed(2)}`)
    .join('\n');

  const subject = `Order Confirmed — ${orderNumber}`;
  const body = [
    `Hi ${userName},`,
    '',
    `Your order ${orderNumber} has been confirmed!`,
    '',
    'Items:',
    itemsList,
    '',
    `Total: $${total.toFixed(2)}`,
    '',
    'We will notify you when your order ships.',
    '',
    'Thanks for shopping with us!',
  ].join('\n');

  return { subject, body };
}

/**
 * Build a welcome email for new users.
 */
export function welcomeEmail(
  userName: string,
): { subject: string; body: string } {
  const subject = 'Welcome to Our Store!';
  const body = [
    `Hi ${userName},`,
    '',
    'Welcome to our e-commerce platform!',
    'We are thrilled to have you on board.',
    '',
    'Start browsing our latest products and enjoy a seamless shopping experience.',
    '',
    'Happy shopping!',
    '',
    'The Team',
  ].join('\n');

  return { subject, body };
}

/**
 * Build a shipping status update email.
 */
export function shippingUpdateEmail(
  orderNumber: string,
  status: string,
): { subject: string; body: string } {
  const subject = `Shipping Update — ${orderNumber}`;
  const body = [
    `Your order ${orderNumber} has a shipping update.`,
    '',
    `Current status: ${status}`,
    '',
    'You can track your order in your account dashboard.',
    '',
    'Thanks for your patience!',
  ].join('\n');

  return { subject, body };
}
