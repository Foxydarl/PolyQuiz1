import { createContext, useContext, useEffect, useState } from "react"
import { io } from "socket.io-client"
import { WEBSOCKET_SERVER_PORT } from "../../config.mjs"

let socket = null;

export const SocketContext = createContext()

export const SocketContextProvider = ({ children }) => {
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!initialized && typeof window !== 'undefined') {
      const wsUrl = `http://${window.location.hostname}:${WEBSOCKET_SERVER_PORT}`;
      
      socket = io(wsUrl, {
        transports: ["websocket", "polling"],
        path: "/socket.io/",
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        autoConnect: true,
        forceNew: true
      });

      // Добавляем обработчики событий для отладки
      socket.on("connect", () => {
        console.log("Connected to socket server:", socket.id);
      });

      socket.on("connect_error", (error) => {
        console.error("Socket connection error:", error);
      });

      socket.on("disconnect", (reason) => {
        console.log("Disconnected from socket server:", reason);
      });

      setInitialized(true);
    }
  }, [initialized]);

  return (
    <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
  )
}

export function useSocketContext() {
  const context = useContext(SocketContext)
  return { socket: context }
}
