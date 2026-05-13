import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

// Socket.IO client that auto-connects on mount and sends httpOnly cookies
// No localStorage token — auth is handled by the cookie mechanism

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    // Connect to the same origin as the API (VITE_API_URL without /api suffix)
    const socketUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3001').replace(/\/api$/, '');

    const socketInstance = io(socketUrl, {
      withCredentials: true, // Send httpOnly cookies automatically
      transports: ['websocket', 'polling'], // Prefer websocket, fallback to polling
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socketInstance.on('connect', () => {
      setIsConnected(true);
      setConnectionError(null);
    });

    socketInstance.on('disconnect', () => {
      setIsConnected(false);
    });

    socketInstance.on('connect_error', (err) => {
      setIsConnected(false);
      if (err.message === 'No autenticado' || err.message === 'Token inválido' || err.message === 'La sesión ha expirado') {
        setConnectionError('Sesión no válida. Por favor, inicia sesión de nuevo.');
      } else {
        setConnectionError('Error de conexión en tiempo real.');
      }
    });

    socketRef.current = socketInstance;
    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
      socketRef.current = null;
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected, connectionError }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket debe usarse dentro de SocketProvider');
  return ctx;
};
