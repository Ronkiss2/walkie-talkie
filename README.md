# 🎙️ Walkie — free group push-to-talk

A browser walkie-talkie. Friends open the same page, type the same **channel name**,
and hold a button to talk to everyone at once. Works on iPhone + Android, no app store.

- **Free:** voice goes phone-to-phone (WebRTC). The server only helps phones find
  each other — it never carries audio, so it stays free.
- **Group:** best for 2–6 people per channel (mesh connection).
- **Private-ish:** anyone who knows the channel name can join it, so use a
  hard-to-guess name (e.g. `roadtrip-x7k2`).

### Features
- **Three talk modes** (toggle above the button): **push-to-talk** (hold),
  **hands-free** (tap on / tap off), and **voice-activated (VOX)** — transmits
  automatically when you speak, no button.
- **Replay last message** — a button that replays the last thing someone said,
  for when you missed it. Keeps a rolling 30-second buffer.
- **Per-person mute + volume**, plus a **master mute** to go quiet without leaving.
  (Volume is routed through Web Audio so it works on iPhone, which ignores plain
  HTML audio volume.)
- **Talk alert** — a beep (and a buzz on Android) when someone starts talking, so
  you notice with the phone in your pocket.
- **Screen stays awake** while a channel is open, so audio doesn't cut out.
- **Auto-reconnect** — if the network blips, it rejoins the channel on its own.
- **Installable** — "Add to Home Screen" gives it an app icon and fullscreen view.
- **Now-talking banner** showing who currently has the floor.
- **Radio voice filter** — toggle to make everyone sound like a handheld radio.
- **Live captions** — real-time speech-to-text of what people say (Chrome/Android;
  falls back gracefully where the browser lacks speech recognition).
- **Emoji reactions** and **join/leave chirps** for quick, silent signals.
- **One-tap invite** — shares a link with the channel baked in (`/?c=<channel>`).
- **Settings sheet** (⚙️): light/dark theme, accent color, background presets, a
  **voice changer** (robot / alien / megaphone / telephone — changes how *you*
  sound to others), radio filter, captions, read-aloud, and chirp toggles.
- **Saved channels + work channels** — recent channels are saved; mark any as a
  **work** channel (💼). Switch between them from the header without leaving.
- **🛑 STOP / ALERT** (work channels) — one tap blasts a loud siren, a full-screen
  red flashing warning, and a strong vibration on everyone's phone. Built for
  safety-critical "stop now" moments (e.g. spotting heavy equipment). The alarm
  bypasses the listener's master-mute; note it can't override a phone set to silent.
- **Spotting commands** (work channels) — one-tap directional signals (COME AHEAD,
  BACK UP, SWING LEFT/RIGHT, SLOW, ALL CLEAR) that flash big + play a distinct tone
  and are spoken aloud, for directing equipment over engine noise.
- **Operator cab mode** — a giant, glanceable full-screen showing just the current
  command, for a phone mounted in the cab.
- **Acknowledge (Copy)** — the operator taps once to confirm a command was received,
  and the spotter gets a "copied" confirmation.
- **Channel topic** — a pinned note everyone sees, kept for people who join later.
- **Read chat aloud** — incoming texts spoken via the device's text-to-speech.

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
- **Bad-signal handling:** audio uses Opus with in-band FEC (packet-loss recovery),
  DTX (skips silence), and a capped bitrate, so it stays intelligible on weak links.
  Dropped peer connections auto-heal via ICE restart, and each person shows a
  connection indicator ("⚠ reconnecting…") when their link is struggling.
- **TURN relay:** the config includes free public STUN + TURN servers so it works on
  strict networks. Free relays can be flaky; if some networks fail to connect, a
  paid TURN service (or your own coturn) is the piece to upgrade.
- **Free hosts sleep:** Render's free tier spins down when idle, so the first load
  after a quiet period takes ~30s to wake up.
