// Walkie-Talkie signaling server.
// Its ONLY job: relay tiny WebRTC "let's connect" messages between phones in
// the same room. The actual voice audio goes phone-to-phone (peer-to-peer),
// never through here, so this server stays cheap/free even with people talking.

import http from "http";
import { readFile } from "fs/promises";
import { fileURLToPath } from "url";
import path from "path";
import { WebSocketServer } from "ws";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, "public");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".webmanifest": "application/manifest+json",
};

// --- Serve the web app (the phone UI) over plain HTTP ---
const server = http.createServer(async (req, res) => {
  try {
    let urlPath = decodeURIComponent(req.url.split("?")[0]);
    if (urlPath === "/") urlPath = "/index.html";
    // prevent path traversal
    const filePath = path.join(PUBLIC_DIR, path.normalize(urlPath).replace(/^(\.\.[/\\])+/, ""));
    if (!filePath.startsWith(PUBLIC_DIR)) {
      res.writeHead(403).end("Forbidden");
      return;
    }
    const data = await readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    res.end(data);
  } catch {
    res.writeHead(404).end("Not found");
  }
});

// --- Signaling: rooms of peers exchanging connection info ---
const wss = new WebSocketServer({ server });

// roomCode -> Map(peerId -> ws)
const rooms = new Map();

function send(ws, msg) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
}

function broadcast(room, fromId, msg) {
  const peers = rooms.get(room);
  if (!peers) return;
  for (const [id, ws] of peers) {
    if (id !== fromId) send(ws, msg);
  }
}

wss.on("connection", (ws) => {
  ws.peerId = null;
  ws.room = null;

  ws.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    if (msg.type === "join") {
      const room = String(msg.room || "").trim().toLowerCase();
      const name = String(msg.name || "Anon").slice(0, 24);
      if (!room) return;

      ws.room = room;
      ws.peerId = Math.random().toString(36).slice(2, 10);
      ws.name = name;

      if (!rooms.has(room)) rooms.set(room, new Map());
      const peers = rooms.get(room);

      // Tell the newcomer who is already here (they'll initiate connections)
      const existing = [...peers.entries()].map(([id, sock]) => ({ id, name: sock.name }));
      peers.set(ws.peerId, ws);
      send(ws, { type: "welcome", id: ws.peerId, peers: existing });

      // Tell everyone else someone joined
      broadcast(room, ws.peerId, { type: "peer-joined", id: ws.peerId, name });
      return;
    }

    // Relay WebRTC offer/answer/ice to a specific target peer
    if (["offer", "answer", "ice"].includes(msg.type)) {
      const peers = rooms.get(ws.room);
      if (!peers) return;
      const target = peers.get(msg.target);
      if (target) send(target, { ...msg, from: ws.peerId });
      return;
    }
  });

  ws.on("close", () => {
    const peers = rooms.get(ws.room);
    if (!peers) return;
    peers.delete(ws.peerId);
    broadcast(ws.room, ws.peerId, { type: "peer-left", id: ws.peerId });
    if (peers.size === 0) rooms.delete(ws.room);
  });
});

server.listen(PORT, () => {
  console.log(`Walkie-talkie running on http://localhost:${PORT}`);
});
