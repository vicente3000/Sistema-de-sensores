import { io } from "socket.io-client";

const URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:3000";

// conexion persistente (solo websocket)
export const socket = io(URL, {
    autoConnect: true,
    transports: ["websocket"],
});

