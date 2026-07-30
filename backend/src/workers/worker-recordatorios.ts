import { connectMongo } from '../config/mongo.js';
import { connectRedis } from '../config/redis.js';
import { Cliente } from '../models/Cliente.js';
import { Evaluacion } from '../models/Evaluacion.js';
import { enviarRecordatorio } from '../services/notificaciones.js';

const DIA_MS = 24 * 60 * 60 * 1000;

export async function correrRecordatorios(): Promise<{ enviados: number }> {
  const hace30 = new Date(Date.now() - 30 * DIA_MS);
  const clientes = await Cliente.find({ activo: true }).select('nombre email telefono entrenadorId').lean();
  let enviados = 0;

  for (const c of clientes) {
    const ultima = await Evaluacion.findOne({ clienteId: c._id }).sort({ fecha: -1 }).select('fecha').lean();
    const ref = ultima?.fecha ? new Date(ultima.fecha) : new Date(0);
    if (ref >= hace30) continue;
    const dias = Math.floor((Date.now() - ref.getTime()) / DIA_MS);
    await enviarRecordatorio({
      email: c.email,
      telefono: c.telefono,
      nombre: c.nombre,
      dias,
    });
    enviados++;
  }

  console.log(`[recordatorios] enviados=${enviados}`);
  return { enviados };
}

if (process.argv[1]?.includes('worker-recordatorios')) {
  await connectMongo();
  await connectRedis();
  await correrRecordatorios();
  process.exit(0);
}
