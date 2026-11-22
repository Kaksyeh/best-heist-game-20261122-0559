// guards.js — patrolling guards: vision cones, suspicion, chase, recovery.
import { angleDiff, losBlocked, inShadow } from './world.js';

export const CONE_RANGE = 185;
export const CONE_HALF = 0.6; // ~34 degrees each side

export class Guard {
  constructor(def) {
    this.name = def.name;
    this.waypoints = def.waypoints;
    this.pause = def.pause;
    this.speed = def.speed;
    this.wi = 0;
    this.x = def.waypoints[0].x;
    this.y = def.waypoints[0].y;
    this.angle = 0;
    this.mode = 'patrol'; // patrol | chase | return
    this.suspicion = 0; // 0..100; 100 means spotted
    this.pauseLeft = 0;
    this.lastSeen = { x: this.x, y: this.y };
    this.loseTimer = 0;
    this.seesThief = false;
    this.spottedFlash = 0; // red-cone flash timer after a fresh spot
  }

  // Can this guard see the thief right now?
  canSee(thief, blockers, smokes) {
    const dx = thief.x - this.x;
    const dy = thief.y - this.y;
    const d = Math.hypot(dx, dy);
    if (d > CONE_RANGE) return false;
    if (Math.abs(angleDiff(Math.atan2(dy, dx), this.angle)) > CONE_HALF) return false;
    if (losBlocked(this.x, this.y, thief.x, thief.y, blockers, smokes)) return false;
    return true;
  }

  // Detection rate: closer is faster; sneaking and shadow slow it down.
  detectionRate(thief) {
    const d = Math.hypot(thief.x - this.x, thief.y - this.y);
    let rate = 46 * (1 + (1 - d / CONE_RANGE) * 0.6);
    if (thief.sneaking) rate *= 0.55;
    if (inShadow(thief.x, thief.y)) rate *= 0.5;
    return rate;
  }

  // Returns 'spotted' on the frame suspicion hits 100, 'caught' on touch.
  update(dt, thief, blockers, smokes, lockdown) {
    this.spottedFlash = Math.max(0, this.spottedFlash - dt);
    const seen = this.canSee(thief, blockers, smokes);
    this.seesThief = seen;

    if (seen) {
      this.lastSeen = { x: thief.x, y: thief.y };
      this.loseTimer = 0;
      if (this.mode === 'patrol' || this.mode === 'return') {
        this.suspicion += this.detectionRate(thief) * dt;
        if (this.suspicion >= 100) {
          this.suspicion = 100;
          this.mode = 'chase';
          this.spottedFlash = 1.2;
          return 'spotted';
        }
      }
    } else {
      if (this.mode === 'patrol' || this.mode === 'return') {
        this.suspicion = Math.max(0, this.suspicion - 30 * dt);
      }
    }

    if (this.mode === 'patrol') {
      this.patrolStep(dt);
    } else if (this.mode === 'chase') {
      const arrived = this.moveToward(this.lastSeen.x, this.lastSeen.y, 102, dt);
      if (!seen) {
        this.loseTimer += dt;
        // In lockdown the guards keep hunting longer; otherwise a few
        // seconds unseen and the chase is broken — recovery is possible.
        const giveUp = lockdown ? 5 : 3.5;
        if (this.loseTimer > giveUp || arrived) {
          this.mode = 'return';
          this.suspicion = 45;
          this.loseTimer = 0;
        }
      }
      if (Math.hypot(thief.x - this.x, thief.y - this.y) < 26) return 'caught';
    } else {
      // return: walk back to the nearest waypoint, then resume the loop.
      const wp = this.nearestWaypoint();
      const arrived = this.moveToward(wp.x, wp.y, this.speed, dt);
      if (arrived) {
        this.wi = this.waypoints.indexOf(wp);
        this.mode = 'patrol';
        this.pauseLeft = 0.6;
      }
    }
    return null;
  }

  patrolStep(dt) {
    if (this.pauseLeft > 0) {
      this.pauseLeft -= dt;
      return;
    }
    const wp = this.waypoints[this.wi];
    const arrived = this.moveToward(wp.x, wp.y, this.speed, dt);
    if (arrived) {
      this.wi = (this.wi + 1) % this.waypoints.length;
      this.pauseLeft = this.pause;
    }
  }

  nearestWaypoint() {
    let best = this.waypoints[0];
    let bd = Infinity;
    for (const wp of this.waypoints) {
      const d = Math.hypot(wp.x - this.x, wp.y - this.y);
      if (d < bd) {
        bd = d;
        best = wp;
      }
    }
    return best;
  }

  // Move toward (tx,ty) at speed; face the direction of travel.
  // Returns true when the target is reached this step.
  moveToward(tx, ty, speed, dt) {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const d = Math.hypot(dx, dy);
    if (d < 4) return true;
    const step = Math.min(d, speed * dt);
    this.x += (dx / d) * step;
    this.y += (dy / d) * step;
    const target = Math.atan2(dy, dx);
    let diff = angleDiff(target, this.angle);
    const turn = Math.max(-6 * dt, Math.min(6 * dt, diff));
    this.angle += turn;
    return d <= step + 1;
  }
}
