# 🎙️ Walkie — free group push-to-talk

A browser walkie-talkie. Friends open the same page, type the same **channel name**,
and hold a button to talk to everyone at once. Works on iPhone + Android, no app store.

- **Free:** voice goes phone-to-phone (WebRTC). The server only helps phones find
  each other — it never carries audio, so it stays free.
- **Group:** best for 2–6 people per channel (mesh connection).
- **Private-ish:** anyone who knows the channel name can join it, so use a
  hard-to-guess name (e.g. `roadtrip-x7k2`).

## Run it on your computer (for testing)

```bash
cd walkie-talkie
npm install
npm start
```

Open **http://localhost:3000** in two browser tabs, join the same channel, and
hold the button. (Spacebar also works as push-to-talk on desktop.)

> Phones can't reach `localhost` on your PC and browsers require **HTTPS** for the
> mic on real devices. To use it on phones, deploy it (below) — that gives you an
> `https://` link anyone can open.

## Put it online for free (so friends anywhere can use it)

Any free Node host works. Easiest: **Render.com**

1. Push this folder to a GitHub repo.
2. On Render → **New → Web Service** → connect the repo.
3. Build command: `npm install` · Start command: `npm start`
4. Render gives you an `https://your-app.onrender.com` link. Share it. Done.

Other free options: Glitch, Railway, Fly.io, or Cloudflare Tunnel pointing at your PC.

## Notes / limits

- **6+ people:** the mesh gets heavy. For bigger groups, route audio through one
  server (an "SFU" like mediasoup) — more work, still doable at $0.
- **TURN relay:** the config includes a free public TURN server (Open Relay) so it
  works on strict networks. Free relays can be flaky; if some networks fail to
  connect, that's the piece to upgrade.
- **Free hosts sleep:** Render's free tier spins down when idle, so the first load
  after a quiet period takes ~30s to wake up.
