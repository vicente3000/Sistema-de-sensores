import { io } from "socket.io-client";

const URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:4000";

// Conexión persistente (solo WebSocket para menor latencia)
export const socket = io(URL, {
    autoConnect: true,
    transports: ["websocket"],
});
