import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';

describe('API', () => {
  describe('GET /api/health', () => {
    it('returns 200 with ok and ts', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('ok', true);
      expect(res.body).toHaveProperty('ts');
    });
  });

  describe('POST /api/auth/login', () => {
    it('returns 400 when body is empty', async () => {
      const res = await request(app).post('/api/auth/login').send({});
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('returns 400 when phone or password missing', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ phone: '01700000000' });
      expect(res.status).toBe(400);
    });

    it('returns 401 or 400 for invalid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ phone: '01700000000', password: 'wrong' });
      expect([400, 401]).toContain(res.status);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('GET /api/admin/dashboard', () => {
    it('returns 401 without token', async () => {
      const res = await request(app).get('/api/admin/dashboard');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/packages (public)', () => {
    it('returns 200 and array', async () => {
      const res = await request(app).get('/api/packages');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });
});
