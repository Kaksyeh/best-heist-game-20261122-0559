// thief.js — Rook: movement, sneak, smoke pellets and the lockpick.
import { WORLD, circleHitsRect, EXIT } from './world.js';

export class Thief {
  constructor() {
    this.reset();
  }

  reset() {
    this.x = 640;
    this.y = 650;
    this.r = 13;
    this.sneaking = false;
    this.moving = false;
    this.smoke = 2; // smoke pellets, never refunded
    this.lockpick = 1; // one use, never refunded
    this.facing = -Math.PI / 2; // facing north
    this.stepPhase = 0;
  }

  // Move with axis-separated collision so the thief slides along walls.
  // input: {up,down,left,right,sneak} booleans. blockers: rect list.
  update(input, blockers, dt) {
    let dx = 0;
    let dy = 0;
    if (input.left) dx -= 1;
    if (input.right) dx += 1;
    if (input.up) dy -= 1;
    if (input.down) dy += 1;
    this.sneaking = !!input.sneak;
    this.moving = dx !== 0 || dy !== 0;
    if (!this.moving) return;
    const len = Math.hypot(dx, dy);
    dx /= len;
    dy /= len;
    const speed = this.sneaking ? 95 : 168;
    this.facing = Math.atan2(dy, dx);
    this.stepPhase += dt * (this.sneaking ? 6 : 11);
    const nx = this.x + dx * speed * dt;
    const ny = this.y + dy * speed * dt;
    // X axis, then Y axis: each tested on its own so walls slide.
    if (!this.hitsAny(nx, this.y, blockers)) this.x = nx;
    if (!this.hitsAny(this.x, ny, blockers)) this.y = ny;
    // Clamp inside the room walls. In the skylight lane (x within the exit
    // gap, widened by the thief's radius) the thief may step up into the
    // exit zone itself; elsewhere the north wall holds them back.
    const T = WORLD.WALL;
    this.x = Math.max(T + this.r, Math.min(WORLD.W - T - this.r, this.x));
    const inExitLane = this.x > EXIT.x - this.r && this.x < EXIT.x + EXIT.w + this.r;
    const top = inExitLane ? this.r : T + this.r;
    this.y = Math.max(top, Math.min(WORLD.H - T - this.r, this.y));
  }

  hitsAny(x, y, blockers) {
    for (const b of blockers) {
      if (circleHitsRect(x, y, this.r, b)) return true;
    }
    return false;
  }

  dropSmoke() {
    if (this.smoke <= 0) return null;
    this.smoke -= 1;
    return { x: this.x, y: this.y, r: 78, ttl: 5 };
  }
}
