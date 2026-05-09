import { useEffect, useRef, useState, useCallback } from "react";
import io, { Socket } from "socket.io-client";
import type { NotaEvent } from "@/types";

interface UseEnsembleOptions {
  roomId: string;
  userName: string;
  onRemoteNotePlayed: (note: NotaEvent) => void;
}

export function useEnsemble({ roomId, userName, onRemoteNotePlayed }: UseEnsembleOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [peers, setPeers] = useState<string[]>([]);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const normalizedRoomId = roomId.trim();
    const normalizedUserName = userName.trim() || "anonymous";

    if (!normalizedRoomId) {
      setIsConnected(false);
      setPeers([]);
      socketRef.current = null;
      return;
    }

    // Prototip: Normalde bir .env'den alınmalıdır.
    const SIGNALING_SERVER = process.env.NEXT_PUBLIC_SIGNALING_SERVER || "http://localhost:3001";

    const socket = io(SIGNALING_SERVER, {
      autoConnect: false,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
      socket.emit("join-room", { roomId: normalizedRoomId, userName: normalizedUserName });
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
      setPeers([]);
    });

    socket.on("connect_error", () => {
      setIsConnected(false);
    });

    socket.on("room-users", (users: string[]) => {
      setPeers(users);
    });

    socket.on("remote-note", (data: { user: string; note: NotaEvent }) => {
      onRemoteNotePlayed(data.note);
    });

    socket.connect();

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [roomId, userName, onRemoteNotePlayed]);

  const sendNote = useCallback((note: NotaEvent) => {
    const normalizedRoomId = roomId.trim();
    if (socketRef.current && isConnected && normalizedRoomId) {
      socketRef.current.emit("play-note", { roomId: normalizedRoomId, note });
    }
  }, [roomId, isConnected]);

  return {
    isConnected,
    peers,
    sendNote,
  };
}
