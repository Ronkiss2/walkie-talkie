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
// roomCode -> topic string (so late joiners see the current channel topic)
const roomTopics = new Map();

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
      send(ws, { type: "welcome", id: ws.peerId, peers: existing, topic: roomTopics.get(room) || "" });

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

    // Broadcast a text message to everyone else in the room
    if (msg.type === "chat") {
      const text = String(msg.text || "").slice(0, 500).trim();
      if (!text) return;
      broadcast(ws.room, ws.peerId, { type: "chat", name: ws.name, text });
      return;
    }

    // Broadcast a live caption (speech-to-text) to everyone else
    if (msg.type === "caption") {
      const text = String(msg.text || "").slice(0, 200);
      broadcast(ws.room, ws.peerId, { type: "caption", name: ws.name, text, final: !!msg.final });
      return;
    }

    // Broadcast an emoji reaction to everyone else
    if (msg.type === "reaction") {
      const emoji = String(msg.emoji || "").slice(0, 8);
      if (!emoji) return;
      broadcast(ws.room, ws.peerId, { type: "reaction", name: ws.name, emoji });
      return;
    }

    // Emergency STOP alert — highest priority, relay immediately
    if (msg.type === "alert") {
      broadcast(ws.room, ws.peerId, { type: "alert", name: ws.name });
      return;
    }

    // Set the channel topic (stored + shown to everyone, incl. late joiners)
    if (msg.type === "topic") {
      const text = String(msg.text || "").slice(0, 120).trim();
      roomTopics.set(ws.room, text);
      broadcast(ws.room, ws.peerId, { type: "topic", name: ws.name, text });
      return;
    }
  });

  ws.on("close", () => {
    const peers = rooms.get(ws.room);
    if (!peers) return;
    peers.delete(ws.peerId);
    broadcast(ws.room, ws.peerId, { type: "peer-left", id: ws.peerId });
    if (peers.size === 0) { rooms.delete(ws.room); roomTopics.delete(ws.room); }
  });
});

server.listen(PORT, () => {
  console.log(`Walkie-talkie running on http://localhost:${PORT}`);
});
