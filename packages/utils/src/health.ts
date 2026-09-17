import {
  type HealthCheckEntry,
  type HealthStatus,
} from '@repo/types';

const pkgJson = (() => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require(process.cwd() + '/package.json');
  } catch {
    return { version: '0.0.0' };
  }
})();

export type CheckFn = () => Promise<void>;

interface RegisteredCheck {
  name: string;
  fn: CheckFn;
  timeoutMs: number;
}

export class HealthCheck {
  private checks: RegisteredCheck[] = [];
  private startTime: number = Date.now();

  register(name: string, fn: CheckFn, timeoutMs: number = 5000): void {
    this.checks.push({ name, fn, timeoutMs });
  }

  async check(): Promise<HealthStatus> {
    const results = await Promise.allSettled(
      this.checks.map((c) => this.runCheck(c)),
    );

    const checks: Record<string, HealthCheckEntry> = {};
    let overall: HealthStatus['status'] = 'healthy';

    for (let i = 0; i < this.checks.length; i++) {
      const result = results[i];
      const name = this.checks[i].name;
      if (result.status === 'fulfilled') {
        checks[name] = result.value;
        if (result.value.status === 'unhealthy') overall = 'unhealthy';
        else if (result.value.status === 'degraded' && overall !== 'unhealthy') overall = 'degraded';
      } else {
        checks[name] = {
          status: 'unhealthy',
          latency: 0,
          lastChecked: new Date().toISOString(),
          error: result.reason?.message || 'Unknown error',
        };
        overall = 'unhealthy';
      }
    }

    return {
      status: overall,
      version: pkgJson.version || '0.0.0',
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      timestamp: new Date().toISOString(),
      checks,
    };
  }

  private async runCheck(c: RegisteredCheck): Promise<HealthCheckEntry> {
    const start = Date.now();
    const lastChecked = new Date().toISOString();

    try {
      const result = await Promise.race([
        c.fn(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), c.timeoutMs),
        ),
      ]);
      return {
        status: 'healthy',
        latency: Date.now() - start,
        lastChecked,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const status = message === 'timeout' ? 'degraded' : 'unhealthy';
      return {
        status,
        latency: Date.now() - start,
        lastChecked,
        error: message,
      };
    }
  }
}
