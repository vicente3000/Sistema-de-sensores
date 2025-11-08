// inicializa y maneja socket.io para tiempo real
import type { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { sockets } from '../observability/metrics.js';

let io: Server | null = null;

// inicializa instancia de socket.io sobre el server http
export function initSocket(server: HttpServer) {
  const corsOrigin = process.env.SOCKET_IO_CORS_ORIGIN || '*';
  io = new Server(server, {
    cors: { origin: corsOrigin },
    transports: ['websocket'],
  });

  io.on('connection', (socket) => {
    sockets.inc();
    // suscribirse a canal de sensor
    socket.on('sensor:subscribe', (data: { plantId: string; sensor: string }) => {
      try {
        const room = `${data.plantId}:${data.sensor}`;
        socket.join(room);
      } catch {}
    });
    // desuscribirse del canal
    socket.on('sensor:unsubscribe', (data: { plantId: string; sensor: string }) => {
      try {
        const room = `${data.plantId}:${data.sensor}`;
        socket.leave(room);
      } catch {}
    });
    socket.on('disconnect', () => { sockets.dec(); });
  });

  return io;
}

// obtiene la instancia para otros modulos
export function getIO() {
  return io;
}

// emite punto de sensor en el canal correspondiente y fallback directo
export function emitSensorData(plantId: string, sensor: string, tsISO: string, value: number) {
  if (!io) return;
  const payload = { plantId, sensor, tsISO, value };
  const room = `${plantId}:${sensor}`;
  io.to(room).emit('sensor:data', payload);
  io.emit(`sensor:data:${plantId}:${sensor}`, payload);
}

// emite una alerta a todos los clientes
export function emitAlert(payload: {
  id?: string;
  plantId: string;
  plantName?: string;
  sensorId: string;
  sensorType: string;
  value: number;
  ts: string | number;
  threshold?: { min?: number; max?: number; hysteresis?: number };
  level: 'normal' | 'grave' | 'critica';
}) {
  if (!io) return;
  io.emit('alerts:new', payload);
}
