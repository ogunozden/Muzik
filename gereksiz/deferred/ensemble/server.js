const { Server } = require("socket.io");
const http = require("http");

const PORT = process.env.PORT || 3001;
const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:4000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Muzik Signaling Server");
});

const io = new Server(server, {
  cors: {
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("Origin not allowed"));
    },
    methods: ["GET", "POST"]
  }
});

// Oda durumunu hafızada tut
const rooms = new Map(); // roomId -> Set of { socketId, userName }

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

io.on("connection", (socket) => {
  console.log("Kullanıcı bağlandı:", socket.id);

  socket.on("join-room", (payload = {}) => {
    const roomId = isNonEmptyString(payload.roomId) ? payload.roomId.trim() : "";
    const userName = isNonEmptyString(payload.userName) ? payload.userName.trim() : "";

    if (!roomId || !userName) {
      socket.emit("room-error", { message: "Invalid room payload" });
      return;
    }

    socket.join(roomId);
    console.log(`Socket ${socket.id} (${userName}) odaya katıldı: ${roomId}`);

    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Map());
    }
    const roomUsers = rooms.get(roomId);
    roomUsers.set(socket.id, userName);

    // Odadaki herkese güncel kullanıcı listesini gönder
    io.to(roomId).emit("room-users", Array.from(roomUsers.values()));
  });

  socket.on("play-note", (payload = {}) => {
    const roomId = isNonEmptyString(payload.roomId) ? payload.roomId.trim() : "";
    const note = payload.note;
    if (!roomId || !note) return;

    const roomUsers = rooms.get(roomId);
    if (!roomUsers) return;

    const userName = roomUsers.get(socket.id);

    // Kendisi hariç odadaki diğer kişilere notayı ilet
    socket.to(roomId).emit("remote-note", {
      user: userName || "Bilinmeyen Kullanıcı",
      note
    });
  });

  socket.on("disconnect", () => {
    console.log("Kullanıcı ayrıldı:", socket.id);

    // Kullanıcıyı bulunduğu odalardan temizle
    for (const [roomId, roomUsers] of rooms.entries()) {
      if (roomUsers.has(socket.id)) {
        roomUsers.delete(socket.id);
        io.to(roomId).emit("room-users", Array.from(roomUsers.values()));
        if (roomUsers.size === 0) {
          rooms.delete(roomId);
        }
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`Ensemble (Birlikte Çalma) sunucusu çalışıyor: http://localhost:${PORT}`);
});
