import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app } from '../src/index.js';
import { Cliente } from '../src/models/Cliente.js';
import { Entrenador } from '../src/models/Entrenador.js';
import { CodigoInvitacion } from '../src/models/CodigoInvitacion.js';
import { PASSWORD_STRENGTH_REGEX, hashPassword, verifyPassword } from '../src/utils/passwordUtils.js';
import {
  firmarJWTCliente,
  verificarJWTCliente,
  registrarFalloLoginCliente,
  limpiarFallosLoginCliente,
  generarTokenAleatorio,
} from '../src/services/clienteAuthService.js';
import jwt from 'jsonwebtoken';
import { env } from '../src/config/env.js';

const STRONG = 'ClientePass1!';

describe('cliente auth — unit', () => {
  it('password strength regex', () => {
    expect(PASSWORD_STRENGTH_REGEX.test('short')).toBe(false);
    expect(PASSWORD_STRENGTH_REGEX.test('nouppercase1!')).toBe(false);
    expect(PASSWORD_STRENGTH_REGEX.test('NoNumber!!')).toBe(false);
    expect(PASSWORD_STRENGTH_REGEX.test('NoSymbol123')).toBe(false);
    expect(PASSWORD_STRENGTH_REGEX.test(STRONG)).toBe(true);
  });

  it('argon2 hash/verify', async () => {
    const hash = await hashPassword(STRONG);
    expect(hash).not.toContain(STRONG);
    expect(await verifyPassword(hash, STRONG)).toBe(true);
    expect(await verifyPassword(hash, 'wrong')).toBe(false);
  });

  it('tokens are single-use length hex', () => {
    const t = generarTokenAleatorio(32);
    expect(t).toMatch(/^[a-f0-9]{64}$/);
  });

  it('JWT cliente has tipo claim and rejects trainer-shaped token', () => {
    const token = firmarJWTCliente({
      sub: new mongoose.Types.ObjectId().toString(),
      email: 'a@b.com',
      entrenadorId: new mongoose.Types.ObjectId().toString(),
      sesionVersion: 0,
    });
    const payload = verificarJWTCliente(token);
    expect(payload.tipo).toBe('cliente');
    expect(payload.aud).toBe('cliente-portal');

    // Trainer RS256 cookie must not verify as cliente HS256
    const fakeTrainer = jwt.sign(
      { sub: 'x', role: 'entrenador' },
      env.jwtPrivateKey,
      { algorithm: 'RS256', expiresIn: '15m' }
    );
    expect(() => verificarJWTCliente(fakeTrainer)).toThrow();
  });
});

describe('cliente auth — integration', () => {
  let mongo: MongoMemoryServer;
  let entrenadorId: string;
  let clienteAId: string;
  let clienteBId: string;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.disconnect().catch(() => undefined);
    await mongoose.connect(mongo.getUri());

    const coach = await Entrenador.create({
      nombre: 'Coach Test',
      email: `coach-portal-${Date.now()}@test.com`,
      passwordHash: await hashPassword('CoachPass1!'),
      rol: 'entrenador',
      activo: true,
    });
    entrenadorId = String(coach._id);

    const a = await Cliente.create({
      entrenadorId: coach._id,
      nombre: 'Cliente A',
      edad: 30,
      sexo: 'Masculino',
      email: 'cliente-a@test.com',
      membershipStatus: 'active',
      currentPeriodEnd: new Date(Date.now() + 30 * 864e5),
    });
    const b = await Cliente.create({
      entrenadorId: coach._id,
      nombre: 'Cliente B',
      edad: 28,
      sexo: 'Femenino',
      email: 'cliente-b@test.com',
      membershipStatus: 'active',
      currentPeriodEnd: new Date(Date.now() + 30 * 864e5),
    });
    clienteAId = String(a._id);
    clienteBId = String(b._id);
  }, 120_000);

  afterAll(async () => {
    await mongoose.disconnect();
    await mongo.stop();
  });

  beforeEach(async () => {
    await CodigoInvitacion.deleteMany({});
  });

  it('registro con código válido / inválido / expirado', async () => {
    const bad = await request(app).post('/api/cliente/auth/registro').send({
      codigoInvitacion: 'DEADBEEF',
      nombre: 'Nuevo',
      email: 'nuevo@test.com',
      password: STRONG,
      confirmarPassword: STRONG,
    });
    expect(bad.status).toBe(400);

    const invite = await CodigoInvitacion.create({
      entrenadorId,
      codigo: 'ABCD1234',
      clienteIdPreexistente: clienteAId,
      expiraEn: new Date(Date.now() + 864e5),
    });

    const ok = await request(app).post('/api/cliente/auth/registro').send({
      codigoInvitacion: invite.codigo,
      nombre: 'Cliente A Portal',
      email: 'cliente-a@test.com',
      password: STRONG,
      confirmarPassword: STRONG,
    });
    expect(ok.status).toBe(201);

    const expired = await CodigoInvitacion.create({
      entrenadorId,
      codigo: 'EXPIRED1',
      expiraEn: new Date(Date.now() - 1000),
    });
    const expRes = await request(app).post('/api/cliente/auth/registro').send({
      codigoInvitacion: expired.codigo,
      nombre: 'X',
      email: 'x@test.com',
      password: STRONG,
      confirmarPassword: STRONG,
    });
    expect(expRes.status).toBe(400);
  });

  it('login exige email verificado; éxito setea cookie cc_client_session', async () => {
    const cliente = await Cliente.findById(clienteAId).select('+passwordHash');
    expect(cliente?.passwordHash).toBeTruthy();

    const unverified = await request(app)
      .post('/api/cliente/auth/login')
      .send({ email: 'cliente-a@test.com', password: STRONG });
    expect(unverified.status).toBe(403);

    await Cliente.updateOne(
      { _id: clienteAId },
      { $set: { emailVerificado: true, cuentaActiva: true } }
    );

    const login = await request(app)
      .post('/api/cliente/auth/login')
      .send({ email: 'cliente-a@test.com', password: STRONG });
    expect(login.status).toBe(200);
    const cookie = login.headers['set-cookie']?.find((c: string) => c.startsWith('cc_client_session='));
    expect(cookie).toBeTruthy();

    const badPass = await request(app)
      .post('/api/cliente/auth/login')
      .send({ email: 'cliente-a@test.com', password: 'WrongPass1!' });
    expect(badPass.status).toBe(401);
  });

  it('lockout progresivo tras fallos', async () => {
    await limpiarFallosLoginCliente(clienteAId);
    for (let i = 0; i < 5; i++) {
      await registrarFalloLoginCliente(clienteAId);
    }
    const c = await Cliente.findById(clienteAId);
    expect(c?.intentosFallidosLogin).toBeGreaterThanOrEqual(5);
    expect(c?.bloqueadoHasta).toBeTruthy();
    await limpiarFallosLoginCliente(clienteAId);
  });

  it('JWT entrenador en ruta cliente → 401; cliente A no lee datos de B', async () => {
    await Cliente.updateOne(
      { _id: clienteAId },
      { $set: { emailVerificado: true, cuentaActiva: true } }
    );
    const login = await request(app)
      .post('/api/cliente/auth/login')
      .send({ email: 'cliente-a@test.com', password: STRONG });
    const cookies = login.headers['set-cookie'];

    const trainerTok = jwt.sign(
      { sub: entrenadorId, tipo: 'entrenador' },
      env.jwtPrivateKey,
      { algorithm: 'RS256', expiresIn: '15m' }
    );
    const cross = await request(app)
      .get('/api/cliente/portal/perfil')
      .set('Cookie', `cc_client_session=${trainerTok}`);
    expect(cross.status).toBe(401);

    const perfil = await request(app).get('/api/cliente/portal/perfil').set('Cookie', cookies);
    expect(perfil.status).toBe(200);
    expect(String(perfil.body.data._id || perfil.body.data.id)).toContain(clienteAId.slice(-4));
    // Never accept foreign clienteId from query
    const sneak = await request(app)
      .get(`/api/cliente/portal/perfil?clienteId=${clienteBId}`)
      .set('Cookie', cookies);
    expect(sneak.status).toBe(200);
    expect(String(sneak.body.data.nombre)).toMatch(/Cliente A/i);
    expect(String(sneak.body.data.nombre)).not.toMatch(/Cliente B/i);
  });
});
