// main.js — game loop and state machine: title, playing, busted, won, paused.
// Also stages the four screenshots via ?scene=cover|sneak|alarm|getaway and
// exposes a small debug hook (window.__heist) for automated play-testing.
import { WORLD, EXIT, OBSTACLES, VENT, LOOT, PANELS, GUARD_DEFS, CAMERA_DEFS, THIEF_START, sightBlockers, pointInRect } from './world.js';
import { Thief } from './thief.js';
import { Guard } from './guards.js';
import { Camera } from './cameras.js';
import { Sfx } from './audio.js';
import { Input } from './input.js';
import { render, HUD_H } from './render.js';

const INTERACT_RANGE = 52;

class Game {
  constructor() {
    this.canvas = document.getElementById('game');
    this.ctx = this.canvas.getContext('2d');
    this.input = new Input(this.canvas);
    this.sfx = new Sfx();
    this.state = 'title'; // title | playing | busted | won | paused
    this.now = 0;
    this.frozen = false; // staged screenshot scenes do not advance
    this.resetRun();
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  resetRun() {
    this.thief = new Thief();
    this.thief.x = THIEF_START.x;
    this.thief.y = THIEF_START.y;
    this.guards = GUARD_DEFS.map((d) => new Guard(d));
    this.cameras = CAMERA_DEFS.map((d, i) => new Camera(d, i));
    this.lootTaken = new Set();
    this.smokes = [];
    this.alarm = 0;
    this.lockdown = false;
    this.spikes = 0;
    this.elapsed = 0;
    this.winTime = 0;
    this.channel = null; // {type:'panel'|'vent', index, progress, needed}
    this.unseenTimer = 0;
    this.stepTimer = 0;
    this.ventOpen = false;
  }

  start() {
    this.resetRun();
    this.input.pressed.clear();
    this.state = 'playing';
  }

  // Rects that block movement right now.
  moveBlockers() {
    const list = OBSTACLES.slice();
    if (!this.ventOpen) list.push(VENT.grate);
    list.push(VENT.tunnelWall, VENT.tunnelWallEast);
    return list;
  }

  sightBlockers() {
    return sightBlockers(this.ventOpen);
  }

  // Nearest thing the thief can interact with, or null.
  nearInteract() {
    const t = this.thief;
    for (const loot of LOOT) {
      if (this.lootTaken.has(loot.id)) continue;
      if (Math.hypot(loot.x - t.x, loot.y - t.y) < INTERACT_RANGE + 18) {
        return { type: 'loot', loot };
      }
    }
    for (let i = 0; i < PANELS.length; i++) {
      const p = PANELS[i];
      if (!this.cameras[i].on) continue;
      if (Math.hypot(p.x - t.x, p.y - t.y) < INTERACT_RANGE) {
        return { type: 'panel', index: i };
      }
    }
    if (!this.ventOpen && this.thief.lockpick > 0) {
      if (Math.hypot(VENT.entry.x - t.x, VENT.entry.y - t.y) < INTERACT_RANGE) {
        return { type: 'vent' };
      }
    }
    return null;
  }

  loop(tms) {
    const now = tms / 1000;
    const dt = Math.min(0.05, Math.max(0, now - (this.lastT ?? now)));
    this.lastT = now;
    this.now = now;
    if (!this.frozen) this.update(dt);
    render(this.ctx, this);
    requestAnimationFrame(this.loop);
  }

  update(dt) {
    const input = this.input;
    // Global keys.
    if (input.consumePress('m')) {
      this.sfx.muted = !this.sfx.muted;
      if (this.sfx.muted) this.sfx.stopSwell();
    }
    if (input.consumePress('p') || input.consumePress('escape')) {
      if (this.state === 'playing') this.state = 'paused';
      else if (this.state === 'paused') this.state = 'playing';
    }
    const click = input.takeClick();
    if (click) this.sfx.ensure();

    if (this.state === 'title') {
      if (input.consumePress('enter') || click) this.start();
      return;
    }
    if (this.state === 'busted' || this.state === 'won') {
      if (input.consumePress('r') || click) this.start();
      return;
    }
    if (this.state === 'paused') return;
    if (this.state !== 'playing') return;

    // --- playing ---
    if (input.consumePress('q')) {
      const puff = this.thief.dropSmoke();
      if (puff) {
        this.smokes.push(puff);
        this.sfx.ensure();
        this.sfx.smoke();
      }
    }

    const move = input.move();
    const wasMoving = this.thief.moving;
    this.thief.update(move, this.moveBlockers(), dt);
    if (this.thief.moving) {
      this.stepTimer -= dt;
      if (this.stepTimer <= 0) {
        this.stepTimer = this.thief.sneaking ? 0.55 : 0.36;
        this.sfx.ensure();
        this.sfx.step(this.thief.sneaking);
      }
    } else {
      this.stepTimer = 0;
    }
    void wasMoving;

    // Interactions: E press grabs loot; E hold (or click) channels hacks.
    const near = this.nearInteract();
    // A stale E tap from elsewhere must not fire the moment loot is near.
    if (!near || near.type !== 'loot') this.input.pressed.delete('e');
    if (near && near.type === 'loot' && input.consumePress('e')) {
      this.lootTaken.add(near.loot.id);
      this.sfx.ensure();
      this.sfx.chime();
    }
    if (near && (near.type === 'panel' || near.type === 'vent')) {
      const holding = input.interactHeld();
      const clickedHere =
        click &&
        Math.hypot(click.x - nearX(near), click.y - (nearY(near) + HUD_H)) < 70;
      if (holding || clickedHere || (this.channel && this.channel.auto)) {
        if (!this.channel || this.channel.key !== channelKey(near)) {
          this.channel = {
            key: channelKey(near),
            type: near.type,
            index: near.index,
            progress: 0,
            needed: near.type === 'panel' ? 2.5 : 1.2,
            auto: !!clickedHere,
          };
        }
        // Channel breaks if the thief walks away.
        if (this.thief.moving) {
          this.channel.progress = 0;
        } else {
          this.channel.progress += dt / this.channel.needed;
          if (Math.random() < dt * 6) this.sfx.beep();
          if (this.channel.progress >= 1) {
            this.finishChannel(this.channel);
            this.channel = null;
          }
        }
      } else {
        this.channel = null;
      }
    } else {
      this.channel = null;
    }
    // Click on a loot case grabs it directly.
    if (click && near && near.type === 'loot') {
      this.lootTaken.add(near.loot.id);
      this.sfx.ensure();
      this.sfx.chime();
    }

    // Smoke clouds fade.
    for (const s of this.smokes) s.ttl -= dt;
    this.smokes = this.smokes.filter((s) => s.ttl > 0);

    // Guards and cameras.
    const blockers = this.sightBlockers();
    let anySees = false;
    let guardSees = false;
    for (const gd of this.guards) {
      const event = gd.update(dt, this.thief, blockers, this.smokes, this.lockdown);
      if (gd.seesThief) {
        anySees = true;
        guardSees = true;
      }
      if (event === 'spotted') {
        this.alarm = Math.min(100, this.alarm + 25);
        this.sfx.ensure();
        this.sfx.sting();
      }
      if (event === 'caught') {
        this.state = 'busted';
        this.sfx.ensure();
        this.sfx.busted();
        this.sfx.stopSwell();
        return;
      }
    }
    for (const cam of this.cameras) {
      cam.update(dt, this.thief, blockers, this.smokes);
      if (cam.seesThief) anySees = true;
    }

    // Alarm meter.
    if (anySees) {
      this.unseenTimer = 0;
      if (guardSees) this.alarm += 14 * dt;
      for (const cam of this.cameras) {
        if (cam.seesThief) this.alarm += cam.detectionRate(this.thief) * dt;
      }
    } else {
      this.unseenTimer += dt;
      const drain = this.lockdown ? (this.unseenTimer >= 4 ? 6 : 0) : 4;
      this.alarm = Math.max(0, this.alarm - drain * dt);
    }
    this.alarm = Math.min(100, this.alarm);
    if (this.alarm >= 100 && !this.lockdown) {
      this.lockdown = true;
      this.spikes += 1;
      this.unseenTimer = 0;
      for (const gd of this.guards) {
        gd.mode = 'chase';
        gd.suspicion = 100;
        gd.lastSeen = { x: this.thief.x, y: this.thief.y };
        gd.loseTimer = 0;
      }
    }
    if (this.lockdown && this.alarm < 60) {
      this.lockdown = false;
    }
    this.sfx.alarmSwell(this.alarm);

    // Win: all three pieces, then the skylight — unless it is sealed.
    this.elapsed += dt;
    if (
      this.lootTaken.size === 3 &&
      !this.lockdown &&
      pointInRect(this.thief.x, this.thief.y, EXIT)
    ) {
      this.state = 'won';
      this.winTime = this.elapsed;
      this.sfx.ensure();
      this.sfx.win();
      this.sfx.stopSwell();
    }
  }

  finishChannel(ch) {
    if (ch.type === 'panel') {
      this.cameras[ch.index].on = false;
      this.cameras[ch.index].hackProgress = 0;
      this.sfx.ensure();
      this.sfx.hackDone();
    } else if (ch.type === 'vent') {
      this.ventOpen = true;
      this.thief.lockpick = 0;
      this.sfx.ensure();
      this.sfx.hackDone();
    }
  }

  // ---- staged scenes for the screenshots (?scene=...) -------------------
  applyScene(name) {
    this.resetRun();
    this.state = 'playing';
    this.frozen = true;
    const t = this.thief;
    if (name === 'cover') {
      t.x = 640;
      t.y = 430;
      this.alarm = 12;
      this.setGuard(0, 500, 300, 0, 'patrol', 0);
      this.setGuard(1, 220, 420, -Math.PI / 2, 'patrol', 0);
      this.setGuard(2, 1020, 300, Math.PI, 'patrol', 0);
      this.cameras[0].angle = Math.PI / 2 + 0.4;
      this.cameras[1].angle = Math.PI - 0.3;
    } else if (name === 'sneak') {
      t.x = 120;
      t.y = 620;
      t.sneaking = true;
      t.facing = Math.PI / 2;
      this.alarm = 8;
      this.setGuard(0, 500, 300, 0, 'patrol', 0);
      this.setGuard(1, 200, 430, 1.1, 'patrol', 35);
      this.setGuard(2, 1020, 300, Math.PI, 'patrol', 0);
      this.cameras[0].angle = Math.PI / 2 + 0.5;
      this.cameras[1].angle = Math.PI + 0.5;
    } else if (name === 'alarm') {
      t.x = 640;
      t.y = 430;
      this.alarm = 82;
      this.lootTaken.add('opal');
      this.lootTaken.add('mask');
      this.setGuard(0, 560, 380, Math.atan2(50, 80), 'chase', 100);
      this.guards[0].spottedFlash = 1;
      this.guards[0].lastSeen = { x: 640, y: 430 };
      this.setGuard(1, 220, 420, -Math.PI / 2, 'patrol', 20);
      this.setGuard(2, 1020, 300, Math.PI, 'patrol', 10);
      this.cameras[0].angle = Math.PI / 2 + 0.4;
      // Camera 2 (east wall) aims its red cone at the thief.
      this.cameras[1].angle = Math.atan2(430 - 380, 640 - 1270);
      this.cameras[1].seesThief = true;
    } else if (name === 'getaway') {
      t.x = 640;
      t.y = 30;
      t.facing = -Math.PI / 2;
      this.alarm = 15;
      this.lootTaken.add('opal');
      this.lootTaken.add('mask');
      this.lootTaken.add('ledger');
      this.setGuard(0, 450, 480, Math.PI, 'patrol', 0);
      this.setGuard(1, 120, 620, 0, 'patrol', 0);
      this.setGuard(2, 1160, 120, Math.PI / 2, 'patrol', 0);
      this.cameras[0].angle = Math.PI / 2 - 0.5;
      this.cameras[1].angle = Math.PI + 0.5;
    }
  }

  setGuard(i, x, y, angle, mode, suspicion) {
    const gd = this.guards[i];
    gd.x = x;
    gd.y = y;
    gd.angle = angle;
    gd.mode = mode;
    gd.suspicion = suspicion;
  }

  // Debug hook for automated play-testing (not part of the game UI).
  debugState() {
    const near = this.state === 'playing' ? this.nearInteract() : null;
    return {
      state: this.state,
      loot: this.lootTaken.size,
      lootTaken: [...this.lootTaken],
      alarm: Math.round(this.alarm * 10) / 10,
      lockdown: this.lockdown,
      spikes: this.spikes,
      thief: { x: Math.round(this.thief.x), y: Math.round(this.thief.y), sneaking: this.thief.sneaking },
      guards: this.guards.map((gd) => ({
        mode: gd.mode,
        suspicion: Math.round(gd.suspicion),
        x: Math.round(gd.x),
        y: Math.round(gd.y),
        seesThief: gd.seesThief,
      })),
      cameras: this.cameras.map((c) => ({ on: c.on, seesThief: c.seesThief })),
      smoke: this.thief.smoke,
      lockpick: this.thief.lockpick,
      ventOpen: this.ventOpen,
      elapsed: Math.round(this.elapsed * 10) / 10,
      winTime: this.winTime,
      near: near ? near.type : null,
      channel: this.channel ? Math.round(this.channel.progress * 100) / 100 : null,
    };
  }
}

function nearX(near) {
  if (near.type === 'loot') return near.loot.x;
  if (near.type === 'panel') return PANELS[near.index].x;
  return VENT.entry.x;
}

function nearY(near) {
  if (near.type === 'loot') return near.loot.y;
  if (near.type === 'panel') return PANELS[near.index].y;
  return VENT.entry.y;
}

function channelKey(near) {
  return near.type === 'panel' ? `panel-${near.index}` : near.type;
}

const game = new Game();
const scene = new URLSearchParams(window.location.search).get('scene');
if (scene) game.applyScene(scene);

// Debug hook for automated play-testing.
window.__heist = {
  state: () => game.debugState(),
  start: () => game.start(),
};
