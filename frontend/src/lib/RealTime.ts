// src/lib/realtime.ts
import { io, Socket } from "socket.io-client";

export type SensorType = "humidity" | "ph" | "temp" | "lux";
export type LivePoint = { plantId?: string; sensor?: SensorType; tsISO: string; value: number };

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:4000"; // ojo: tu zip usa 4000 por defecto

export type LiveSubscription = { unsubscribe: () => void };

export class LiveClient {
    private socket: Socket | null = null;

    connect() {
        if (this.socket) return;
        this.socket = io(SOCKET_URL, {
            transports: ["websocket"],
            reconnection: true,
            reconnectionDelayMax: 5000,
            autoConnect: true,
        });
    }

    disconnect() {
        this.socket?.disconnect();
        this.socket = null;
    }

    // soporta dos estilos de backend: rooms y evento por-canal
    subscribe(plantId: string, sensor: SensorType, onPoint: (p: LivePoint) => void): LiveSubscription {
        if (!this.socket) this.connect();
        const s = this.socket!;
        const roomEvent   = "sensor:data";
        const directEvent = `sensor:data:${plantId}:${sensor}`;

        const handler = (msg: LivePoint) => {
            if (msg.plantId && msg.sensor) {
                if (msg.plantId !== plantId || msg.sensor !== sensor) return;
            }
            onPoint(msg);
        };

        // rooms (recomendado)
        s.emit("sensor:subscribe", { plantId, sensor });
        s.on(roomEvent, handler);

        // fallback: evento específico por canal
        s.on(directEvent, handler);

        return {
            unsubscribe: () => {
                s.off(roomEvent, handler);
                s.off(directEvent, handler);
                s.emit("sensor:unsubscribe", { plantId, sensor });
            }
        };
    }
}
