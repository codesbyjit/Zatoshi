import { type ReadinessStatus } from '@repo/types';

import { HealthCheck } from './health';

/**
 * ReadinessCheck wraps a HealthCheck instance and exposes a simpler
 * ready/not-ready interface used for Kubernetes-style /readiness probes.
 *
 * A service is considered "ready" only when ALL dependency checks pass.
 */
export class ReadinessCheck {
  private health: HealthCheck;

  constructor(health: HealthCheck) {
    this.health = health;
  }

  /**
   * Perform a readiness assessment.
   * Returns a ReadinessStatus indicating whether the service is ready
   * to accept traffic.
   */
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
