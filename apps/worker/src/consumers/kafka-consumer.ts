import { getLogger } from '@repo/utils';
import { KafkaConsumer, KAFKA_TOPICS, type ProducerMessage } from '@repo/events';
import { withRetry } from '../utils/retry';
import { handleOrderPlaced } from '../handlers/order-placed';
import { handlePaymentProcessed } from '../handlers/payment-processed';

const logger = getLogger('worker:consumer:kafka');

const SUBSCRIBED_TOPICS = [
  KAFKA_TOPICS.ORDER_PLACED, KAFKA_TOPICS.ORDER_STATUS_CHANGED,
  KAFKA_TOPICS.PAYMENT_PROCESSED, KAFKA_TOPICS.PAYMENT_FAILED,
  KAFKA_TOPICS.INVENTORY_UPDATED, KAFKA_TOPICS.EMAIL_SENT,
];

let consumer: KafkaConsumer | null = null;

/**
 * Start the Kafka event consumer.
 *
 * Connects to the Kafka cluster, subscribes to all e-commerce event
 * topics, and dispatches messages to domain handlers.
 */
export async function startKafkaConsumer(): Promise<void> {
  logger.info('Starting Kafka event consumer');
  consumer = new KafkaConsumer();
  try {
    await consumer.connect();
    await consumer.subscribe(SUBSCRIBED_TOPICS);
    await consumer.run(async ({ message, topic }) => {
      const rawValue = message.value?.toString();
      if (!rawValue) { logger.warn({ topic }, 'Empty Kafka message'); return; }
      let parsed: ProducerMessage;
      try { parsed = JSON.parse(rawValue) as ProducerMessage; }
      catch { logger.warn({ topic }, 'Failed to parse Kafka message'); return; }
      const { type, payload } = parsed;
      try {
        await dispatchEvent(type, payload);
        logger.info({ topic, type }, 'Kafka event processed');
      } catch (err) {
        logger.error({ topic, type, err }, 'Failed to process Kafka event');
      }
    });
    logger.info('Kafka consumer started successfully');
  } catch (err) {
    logger.fatal({ err }, 'Failed to start Kafka consumer');
  }
}

async function dispatchEvent(type: string, payload: Record<string, unknown>): Promise<void> {
  switch (type) {
    case KAFKA_TOPICS.ORDER_PLACED:
      await withRetry(() => handleOrderPlaced(payload as any), { maxRetries: 2, baseDelayMs: 500, label: 'kafka-order-placed' });
      break;
    case KAFKA_TOPICS.ORDER_STATUS_CHANGED:
      logger.info({ payload }, 'Order status changed (Kafka) — no-op');
      break;
    case KAFKA_TOPICS.PAYMENT_PROCESSED:
    case KAFKA_TOPICS.PAYMENT_FAILED:
      await withRetry(() => handlePaymentProcessed(payload as any), { maxRetries: 2, baseDelayMs: 500, label: `kafka-payment-${type}` });
      break;
    case KAFKA_TOPICS.INVENTORY_UPDATED:
      logger.info({ payload }, 'Inventory updated (Kafka) — no-op');
      break;
    case KAFKA_TOPICS.EMAIL_SENT:
      logger.info({ payload }, 'Email sent (Kafka) — no-op');
      break;
    default:
      logger.warn({ type }, 'Unknown Kafka event type');
  }
}

/**
 * Stop the Kafka event consumer gracefully.
 */
export async function stopKafkaConsumer(): Promise<void> {
  logger.info('Stopping Kafka consumer...');
  if (consumer) {
    try { await consumer.disconnect(); } catch (err) { logger.error({ err }, 'Error disconnecting Kafka consumer'); }
    consumer = null;
  }
  logger.info('Kafka consumer stopped');
}
