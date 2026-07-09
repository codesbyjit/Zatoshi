import { test, expect } from '@playwright/test';

const WEB_URL = 'http://localhost:3000';
const ADMIN_URL = 'http://localhost:3003';
const API_URL = 'http://localhost:3001';
const WORKER_URL = 'http://localhost:3002';
const PROMETHEUS_URL = 'http://localhost:9090';
const GRAFANA_URL = 'http://localhost:3005';

test.describe('Monitoring Endpoints', () => {
  // ── Web app metrics ────────────────────────────────────────────
  test('Web /api/metrics returns Prometheus metrics', async () => {
    const response = await fetch(`${WEB_URL}/api/metrics`);
    expect(response.status).toBe(200);

    const contentType = response.headers.get('content-type') || '';
    expect(contentType).toContain('text/plain');

    const body = await response.text();
    expect(body).toContain('# HELP');
    expect(body).toContain('# TYPE');
  });

  test('Web /api/metrics includes default Prometheus metrics', async () => {
    const response = await fetch(`${WEB_URL}/api/metrics`);
    expect(response.status).toBe(200);

    const body = await response.text();
    expect(body).toContain('process_cpu_seconds_total');
    expect(body).toContain('http_requests_total');
    expect(body).toContain('http_request_duration_seconds');
  });

  // ── Admin app metrics ──────────────────────────────────────────
  test('Admin /api/metrics returns Prometheus metrics', async () => {
    const response = await fetch(`${ADMIN_URL}/api/metrics`);
    expect(response.status).toBe(200);

    const contentType = response.headers.get('content-type') || '';
    expect(contentType).toContain('text/plain');

    const body = await response.text();
    expect(body).toContain('# HELP');
    expect(body).toContain('# TYPE');
  });

  test('Admin /api/metrics includes HTTP metrics', async () => {
    const response = await fetch(`${ADMIN_URL}/api/metrics`);
    expect(response.status).toBe(200);

    const body = await response.text();
    expect(body).toContain('http_requests_total');
    expect(body).toContain('http_request_duration_seconds');
  });

  // ── API gateway metrics ────────────────────────────────────────
  test('API /metrics returns Prometheus metrics', async () => {
    const response = await fetch(`${API_URL}/metrics`);
    expect(response.status).toBe(200);

    const contentType = response.headers.get('content-type') || '';
    expect(contentType).toContain('text/plain');

    const body = await response.text();
    expect(body).toContain('# HELP');
    expect(body).toContain('# TYPE');
  });

  test('API /metrics includes HTTP request metrics', async () => {
    const response = await fetch(`${API_URL}/metrics`);
    expect(response.status).toBe(200);

    const body = await response.text();
    expect(body).toContain('http_requests_total');
    expect(body).toContain('http_request_duration_seconds');
  });

  // ── Worker metrics ─────────────────────────────────────────────
  test('Worker /metrics returns Prometheus metrics', async () => {
    const response = await fetch(`${WORKER_URL}/metrics`);
    expect(response.status).toBe(200);

    const contentType = response.headers.get('content-type') || '';
    expect(contentType).toContain('text/plain');

    const body = await response.text();
    expect(body).toContain('# HELP');
    expect(body).toContain('# TYPE');
  });

  test('Worker /metrics includes process metrics', async () => {
    const response = await fetch(`${WORKER_URL}/metrics`);
    expect(response.status).toBe(200);

    const body = await response.text();
    expect(body).toContain('process_cpu_seconds_total');
    expect(body).toContain('nodejs_eventloop_lag_seconds');
  });

  // ── Prometheus ─────────────────────────────────────────────────
  test('Prometheus is reachable at /-/ready', async () => {
    const response = await fetch(`${PROMETHEUS_URL}/-/ready`);
    expect(response.status).toBe(200);
  });

  test('Prometheus returns targets at /api/v1/targets', async () => {
    const response = await fetch(`${PROMETHEUS_URL}/api/v1/targets`);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.status).toBe('success');
    expect(body.data).toBeDefined();
    expect(body.data.activeTargets).toBeDefined();
  });

  // ── Grafana ────────────────────────────────────────────────────
  test('Grafana login page is reachable', async ({ page }) => {
    await page.goto(`${GRAFANA_URL}/login`);
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator('body')).toContainText(/Grafana|grafana/i);
  });

  test('Grafana datasource Prometheus is configured', async ({ page }) => {
    const response = await page.request.get(`${GRAFANA_URL}/api/datasources`, {
      headers: {
        Authorization: 'Basic ' + Buffer.from('admin:admin').toString('base64'),
      },
    });
    expect(response.status()).toBe(200);

    const data = await response.json();
    const prometheusDs = data.find((ds: { type: string }) => ds.type === 'prometheus');
    expect(prometheusDs).toBeDefined();
    expect(prometheusDs.url).toBe('http://demoecom-prometheus-1:9090');
  });
});
