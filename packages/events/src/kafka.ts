import { Kafka, KafkaJSError, KafkaJSConnectionError, type Producer, type Consumer, type EachMessagePayload, type Message } from 'kafkajs';
import { randomUUID } from 'node:crypto';
import { getLogger } from '@repo/utils';

const logger = getLogger('events:kafka');

export const KAFKA_TOPICS = {
  ORDER_PLACED: 'order.placed',
  ORDER_STATUS_CHANGED: 'order.status_changed',
  PAYMENT_PROCESSED: 'payment.processed',
  PAYMENT_FAILED: 'payment.failed',
  INVENTORY_UPDATED: 'inventory.updated',
  EMAIL_SENT: 'email.sent',
} as const;

export type KafkaTopic = (typeof KAFKA_TOPICS)[keyof typeof KAFKA_TOPICS];

export interface KafkaConfig {
  brokers: string;
  clientId: string;
  groupId: string;
}

function resolveConfig(): KafkaConfig {
  return {
    brokers: process.env.KAFKA_BROKERS || 'localhost:9092',
    clientId: process.env.KAFKA_CLIENT_ID || 'zatOSHi',
    groupId: process.env.KAFKA_GROUP_ID || 'zatOSHi-consumer-group',
  };
}

export interface ProducerMessage {
  type: string;
  payload: Record<string, unknown>;
  correlationId?: string;
  timestamp?: string;
}

export interface SendResult {
  topic: string;
  partition: number;
  offset: string;
  timestamp: string;
}

/**
 * Wrapper around KafkaJS Producer with logging, error handling,
 * and a clean lifecycle API.
 */
export class KafkaProducer {
  private readonly producer: Producer;
  private readonly config: KafkaConfig;
  private connected = false;

  constructor() {
    this.config = resolveConfig();
    const kafka = new Kafka({
      clientId: this.config.clientId,
      brokers: this.config.brokers.split(',').map((b) => b.trim()),
      retry: { initialRetryTime: 300, retries: 8 },
    });
    this.producer = kafka.producer();
  }

  async connect(): Promise<void> {
    if (this.connected) return;
    try {
      await this.producer.connect();
      this.connected = true;
    } catch (err) {
      const msg = err instanceof KafkaJSConnectionError
        ? `Kafka connection error: ${err.message}`
        : `Failed to connect: ${String(err)}`;
      logger.error({ err: msg }, 'KafkaProducer connection failed');
      throw err;
    }
  }

  async send(topic: string, message: ProducerMessage): Promise<SendResult> {
    if (!this.connected) throw new Error('KafkaProducer not connected. Call connect() first.');
    const kafkaMsg: Message = {
      key: message.type,
      value: JSON.stringify({
        type: message.type,
        payload: message.payload,
        correlationId: message.correlationId ?? randomUUID(),
        timestamp: message.timestamp ?? new Date().toISOString(),
      }),
    };
    try {
      const result = await this.producer.send({ topic, messages: [kafkaMsg] });
      const meta = result[0];
      logger.info({ topic, partition: meta.partition, offset: meta.baseOffset }, 'Kafka message sent');
      return { topic, partition: meta.partition, offset: meta.baseOffset, timestamp: new Date().toISOString() };
    } catch (err) {
      if (err instanceof KafkaJSError) logger.error({ err, topic }, 'Kafka error on send');
      throw err;
    }
  }

  async disconnect(): Promise<void> {
    if (!this.connected) return;
    try { await this.producer.disconnect(); this.connected = false; logger.info('KafkaProducer disconnected'); }
    catch (err) { logger.error({ err }, 'KafkaProducer disconnect error'); }
  }

  isConnected(): boolean { return this.connected; }
}

export type MessageHandler = (payload: EachMessagePayload) => Promise<void>;

/**
 * Wrapper around KafkaJS Consumer with subscription management
 * and graceful shutdown.
 */
export class KafkaConsumer {
  private readonly consumer: Consumer;
  private readonly config: KafkaConfig;
  private connected = false;
  private running = false;

  constructor() {
    this.config = resolveConfig();
    const kafka = new Kafka({
      clientId: this.config.clientId,
      brokers: this.config.brokers.split(',').map((b) => b.trim()),
      retry: { initialRetryTime: 300, retries: 8 },
    });
    this.consumer = kafka.consumer({ groupId: this.config.groupId });
  }

  async connect(): Promise<void> {
    if (this.connected) return;
    try { await this.consumer.connect(); this.connected = true; logger.info('KafkaConsumer connected'); }
    catch (err) {
      const msg = err instanceof KafkaJSConnectionError ? `Kafka connection error: ${err.message}` : `Failed to connect consumer: ${String(err)}`;
      logger.error({ err: msg }, 'KafkaConsumer connection failed');
      throw err;
    }
  }

  async subscribe(topics: string[]): Promise<void> {
    if (!this.connected) throw new Error('KafkaConsumer not connected. Call connect() first.');
    for (const topic of topics) {
      await this.consumer.subscribe({ topic, fromBeginning: false });
      logger.info({ topic }, 'KafkaConsumer subscribed');
    }
  }

  async run(handler: MessageHandler): Promise<void> {
    if (!this.connected) throw new Error('KafkaConsumer not connected. Call connect() first.');
    this.running = true;
    await this.consumer.run({
      eachMessage: async (payload) => {
        try { await handler(payload); }
        catch (err) { logger.error({ err, topic: payload.topic }, 'KafkaConsumer handler error'); }
      },
    });
  }

  async disconnect(): Promise<void> {
    this.running = false;
    try { await this.consumer.disconnect(); this.connected = false; logger.info('KafkaConsumer disconnected'); }
    catch (err) { logger.error({ err }, 'KafkaConsumer disconnect error'); }
  }

  isConnected(): boolean { return this.connected; }
  isRunning(): boolean { return this.running; }
}
