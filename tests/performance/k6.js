import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 50 },
    { duration: '30s', target: 100 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.05'],
  },
};

export default function () {
  // Test product listing
  const products = http.get('http://localhost:3001/api/trpc/product.list?limit=20');
  check(products, { 'products status 200': (r) => r.status === 200 });

  sleep(1);

  // Test single product
  const product = http.get('http://localhost:3001/api/trpc/product.getBySlug?slug=test-product');
  check(product, { 'product detail status 200': (r) => r.status === 200 });

  sleep(1);

  // Test category list
  const categories = http.get('http://localhost:3001/api/trpc/category.list');
  check(categories, { 'categories status 200': (r) => r.status === 200 });
}
