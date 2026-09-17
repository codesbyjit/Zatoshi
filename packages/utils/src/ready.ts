import { type ReadinessStatus } from '@repo/types';

import { HealthCheck } from './health';

export class ReadinessCheck {
  private health: HealthCheck;

  constructor(health: HealthCheck) {
    this.health = health;
  }

  async check(): Promise<ReadinessStatus> {
    const status = await this.health.check();
    const checks: ReadinessStatus['checks'] = {};

    for (const [name, entry] of Object.entries(status.checks)) {
      checks[name] = {
        reachable: entry.status === 'healthy',
        latency: entry.latency,
        error: entry.error,
      };
    }

    const ready = status.status === 'healthy';

    return {
      ready,
      checks,
    };
  }
}
