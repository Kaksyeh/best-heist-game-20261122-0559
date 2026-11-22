// render.js — canvas drawing: floor, cases, figures, cones, HUD, overlays.
// Canvas is 1280x800; the HUD bar occupies the top 56px and the gallery
// floor sits below it (world y + 56).
import { WORLD, EXIT, OBSTACLES, VENT, SHADOWS, LOOT, PANELS } from './world.js';
import { CONE_RANGE, CONE_HALF } from './guards.js';
import { CAM_CONE_HALF } from './cameras.js';

export const HUD_H = 56;
const GOLD = '#c9a227';
const GOLD_DIM = '#8a6d1f';
const NAVY = '#101736';
const FLOOR = '#e8d9a8';
const FLOOR_LINE = '#d9c48a';
const SHADOW_FILL = 'rgba(16, 23, 54, 0.55)';

function wy(y) {
  return y + HUD_H;
}

export function render(ctx, g) {
  ctx.clearRect(0, 0, 1280, 800);
  drawFloor(ctx);
  drawVent(ctx, g);
  drawCones(ctx, g);
  drawObstacles(ctx, g);
  drawCameras(ctx, g);
  drawPanels(ctx, g);
  drawExit(ctx, g);
  drawSmoke(ctx, g);
  drawGuards(ctx, g);
  drawThief(ctx, g);
  drawHUD(ctx, g);
  if (g.state === 'title') drawTitle(ctx, g);
  if (g.state === 'busted') drawBusted(ctx, g);
  if (g.state === 'won') drawWon(ctx, g);
  if (g.state === 'paused') drawPaused(ctx);
  if (g.state === 'playing') drawPrompt(ctx, g);
  if (g.lockdown && g.state === 'playing') drawLockdownBanner(ctx, g.now);
}

function drawFloor(ctx) {
  ctx.fillStyle = FLOOR;
  ctx.fillRect(0, HUD_H, 1280, WORLD.H);
  // Marble tile grid.
  ctx.strokeStyle = FLOOR_LINE;
  ctx.lineWidth = 1;
  for (let x = 0; x <= 1280; x += 80) {
    ctx.beginPath();
    ctx.moveTo(x, HUD_H);
    ctx.lineTo(x, 800);
    ctx.stroke();
  }
  for (let y = HUD_H; y <= 800; y += 62) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(1280, y);
    ctx.stroke();
  }
  // Centre medallion under the Sun Opal.
  ctx.strokeStyle = GOLD_DIM;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(640, wy(324), 74, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(640, wy(324), 60, 0, Math.PI * 2);
  ctx.stroke();
  // Shadow zones: visibly darker floor.
  for (const s of SHADOWS) {
    ctx.fillStyle = SHADOW_FILL;
    ctx.fillRect(s.x, wy(s.y), s.w, s.h);
  }
  // Walls: navy border with a gold inner trim.
  ctx.fillStyle = NAVY;
  const T = WORLD.WALL;
  ctx.fillRect(0, HUD_H, 1280, T);
  ctx.fillRect(0, 800 - T, 1280, T);
  ctx.fillRect(0, HUD_H, T, WORLD.H);
  ctx.fillRect(1280 - T, HUD_H, T, WORLD.H);
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 2;
  ctx.strokeRect(T + 1, HUD_H + T + 1, 1280 - 2 * T - 2, WORLD.H - 2 * T - 2);
}

function drawVent(ctx, g) {
  // The crawlspace: a dark tunnel along the south wall.
  ctx.fillStyle = '#1c2340';
  ctx.fillRect(628, wy(690), 652, 40);
  ctx.strokeStyle = '#3a4470';
  ctx.lineWidth = 1;
  ctx.strokeRect(628, wy(690), 652, 40);
  // The tunnel's north wall: a solid bar the thief cannot cross except
  // through the grate (west end) or the east opening.
  ctx.fillStyle = '#101736';
  ctx.fillRect(VENT.tunnelWall.x, wy(VENT.tunnelWall.y), VENT.tunnelWall.w, VENT.tunnelWall.h);
  ctx.fillRect(VENT.tunnelWallEast.x, wy(VENT.tunnelWallEast.y), VENT.tunnelWallEast.w, VENT.tunnelWallEast.h);
  ctx.strokeStyle = GOLD_DIM;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(VENT.tunnelWall.x, wy(VENT.tunnelWall.y));
  ctx.lineTo(VENT.tunnelWall.x + VENT.tunnelWall.w, wy(VENT.tunnelWall.y));
  ctx.moveTo(VENT.tunnelWallEast.x, wy(VENT.tunnelWallEast.y));
  ctx.lineTo(VENT.tunnelWallEast.x + VENT.tunnelWallEast.w, wy(VENT.tunnelWallEast.y));
  ctx.stroke();
  // Grate at the west end: barred while locked, open once picked.
  const gr = VENT.grate;
  ctx.fillStyle = g.ventOpen ? '#2c355c' : '#5a5a5a';
  ctx.fillRect(gr.x - 4, wy(gr.y) - 4, gr.w + 8, gr.h + 8);
  if (!g.ventOpen) {
    ctx.strokeStyle = '#d8d8d8';
    ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      const bx = gr.x + 3 + i * ((gr.w - 6) / 5);
      ctx.beginPath();
      ctx.moveTo(bx, wy(gr.y) - 2);
      ctx.lineTo(bx, wy(gr.y + gr.h) + 2);
      ctx.stroke();
    }
  } else {
    ctx.fillStyle = '#7fd4a8';
    ctx.font = 'bold 11px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('VENT OPEN', gr.x + gr.w / 2, wy(gr.y) - 8);
  }
}

function drawCones(ctx, g) {
  // Guard cones: warm amber; red while chasing or freshly spotted.
  for (const gd of g.guards) {
    const chasing = gd.mode === 'chase' || gd.spottedFlash > 0;
    const col = chasing ? 'rgba(220, 60, 50, 0.34)' : 'rgba(245, 178, 66, 0.30)';
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(gd.x, wy(gd.y));
    ctx.arc(gd.x, wy(gd.y), CONE_RANGE, gd.angle - CONE_HALF, gd.angle + CONE_HALF);
    ctx.closePath();
    ctx.fill();
  }
  // Camera cones: red, sweeping.
  for (const cam of g.cameras) {
    if (!cam.on) continue;
    ctx.fillStyle = 'rgba(220, 50, 45, 0.22)';
    ctx.beginPath();
    ctx.moveTo(cam.x, wy(cam.y));
    ctx.arc(cam.x, wy(cam.y), cam.range, cam.angle - CAM_CONE_HALF, cam.angle + CAM_CONE_HALF);
    ctx.closePath();
    ctx.fill();
  }
}

function drawObstacles(ctx, g) {
  for (const o of OBSTACLES) {
    if (o.kind === 'case') {
      // Dark wood case with gold trim; a taken loot's case goes dim.
      const loot = o.loot ? LOOT.find((l) => l.id === o.loot) : null;
      const taken = loot && g.lootTaken.has(loot.id);
      ctx.fillStyle = taken ? '#3a2c1e' : '#4a3220';
      ctx.fillRect(o.x, wy(o.y), o.w, o.h);
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 2;
      ctx.strokeRect(o.x + 2, wy(o.y) + 2, o.w - 4, o.h - 4);
      ctx.strokeStyle = 'rgba(201, 162, 39, 0.5)';
      ctx.lineWidth = 1;
      ctx.strokeRect(o.x + 8, wy(o.y) + 8, o.w - 16, o.h - 16);
      if (loot && !taken) {
        // The loot glows gold inside its case.
        const pulse = 0.55 + 0.35 * Math.sin(g.now * 3 + loot.slot * 2);
        ctx.fillStyle = `rgba(255, 214, 90, ${pulse})`;
        ctx.beginPath();
        ctx.arc(loot.x, wy(loot.y), 13, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#7a5c00';
        ctx.beginPath();
        ctx.arc(loot.x, wy(loot.y), 6, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (o.kind === 'pillar') {
      ctx.fillStyle = '#e6d6ae';
      ctx.fillRect(o.x, wy(o.y), o.w, o.h);
      ctx.strokeStyle = GOLD_DIM;
      ctx.lineWidth = 2;
      ctx.strokeRect(o.x, wy(o.y), o.w, o.h);
      ctx.fillStyle = GOLD;
      ctx.beginPath();
      ctx.arc(o.x + o.w / 2, wy(o.y) + o.h / 2, 6, 0, Math.PI * 2);
      ctx.fill();
    } else if (o.kind === 'rope') {
      ctx.fillStyle = '#7a1f2b';
      ctx.fillRect(o.x, wy(o.y), o.w, o.h);
      ctx.fillStyle = GOLD;
      ctx.fillRect(o.x, wy(o.y) - 3, 5, o.h + 6);
      ctx.fillRect(o.x + o.w - 5, wy(o.y) - 3, 5, o.h + 6);
    }
  }
}

function drawCameras(ctx, g) {
  for (const cam of g.cameras) {
    const cy = wy(cam.y);
    ctx.fillStyle = cam.on ? '#3a3f4a' : '#22262e';
    ctx.beginPath();
    ctx.arc(cam.x, cy, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = cam.on ? '#c8ccd8' : '#555a66';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Lens: red while live, dark once hacked.
    ctx.fillStyle = cam.on ? '#ff3b30' : '#11141a';
    ctx.beginPath();
    ctx.arc(cam.x + Math.cos(cam.angle) * 4, cy + Math.sin(cam.angle) * 4, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPanels(ctx, g) {
  for (const p of PANELS) {
    const cam = g.cameras[p.camera];
    ctx.fillStyle = cam.on ? '#2c4a6b' : '#333a33';
    ctx.fillRect(p.x - 9, wy(p.y) - 9, 18, 18);
    ctx.strokeStyle = cam.on ? '#7fb2e0' : '#5a6b5a';
    ctx.lineWidth = 2;
    ctx.strokeRect(p.x - 9, wy(p.y) - 9, 18, 18);
    ctx.fillStyle = cam.on ? '#9fd0ff' : '#6f8a6f';
    ctx.beginPath();
    ctx.arc(p.x, wy(p.y), 3.5, 0, Math.PI * 2);
    ctx.fill();
    if (cam.on && g.channel && g.channel.type === 'panel' && g.channel.index === p.camera) {
      // Hack progress ring.
      ctx.strokeStyle = '#ffd65a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(p.x, wy(p.y), 16, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * g.channel.progress);
      ctx.stroke();
    }
  }
}

function drawExit(ctx, g) {
  const sealed = g.lockdown;
  const pulse = 0.6 + 0.4 * Math.sin(g.now * 2.5);
  ctx.fillStyle = sealed ? `rgba(200, 40, 35, ${0.75 * pulse})` : `rgba(90, 220, 140, ${0.55 + 0.35 * pulse})`;
  ctx.fillRect(EXIT.x, HUD_H, EXIT.w, EXIT.h + 8);
  ctx.strokeStyle = sealed ? '#ff5a4a' : '#b8ffce';
  ctx.lineWidth = 2;
  ctx.strokeRect(EXIT.x, HUD_H, EXIT.w, EXIT.h + 8);
  ctx.fillStyle = sealed ? '#ffd2cc' : '#0c3a1e';
  ctx.font = 'bold 11px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText(sealed ? 'SEALED' : 'SKYLIGHT', EXIT.x + EXIT.w / 2, HUD_H + EXIT.h + 24);
}

function drawSmoke(ctx, g) {
  for (const s of g.smokes) {
    const alpha = Math.min(0.75, (s.ttl / 5) * 0.75 + 0.15);
    ctx.fillStyle = `rgba(200, 200, 205, ${alpha})`;
    ctx.beginPath();
    ctx.arc(s.x, wy(s.y), s.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(170, 170, 178, ${alpha * 0.8})`;
    ctx.beginPath();
    ctx.arc(s.x - s.r * 0.4, wy(s.y) - s.r * 0.25, s.r * 0.55, 0, Math.PI * 2);
    ctx.arc(s.x + s.r * 0.35, wy(s.y) + s.r * 0.3, s.r * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawGuards(ctx, g) {
  for (const gd of g.guards) {
    const cy = wy(gd.y);
    // Suspicion arc above the head.
    if (gd.suspicion > 2) {
      ctx.strokeStyle = gd.suspicion >= 100 ? '#ff4a3a' : '#ffb142';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(gd.x, cy - 24, 11, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (gd.suspicion / 100));
      ctx.stroke();
    }
    // Body: navy coat, brass buttons, cap.
    ctx.fillStyle = '#1d2a52';
    ctx.beginPath();
    ctx.arc(gd.x, cy, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0a0f24';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = GOLD;
    ctx.beginPath();
    ctx.arc(gd.x - 3, cy - 2, 1.6, 0, Math.PI * 2);
    ctx.arc(gd.x + 3, cy - 2, 1.6, 0, Math.PI * 2);
    ctx.arc(gd.x - 3, cy + 4, 1.6, 0, Math.PI * 2);
    ctx.arc(gd.x + 3, cy + 4, 1.6, 0, Math.PI * 2);
    ctx.fill();
    // Facing tick.
    ctx.strokeStyle = '#d8c98a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(gd.x, cy);
    ctx.lineTo(gd.x + Math.cos(gd.angle) * 16, cy + Math.sin(gd.angle) * 16);
    ctx.stroke();
    // Chase marker.
    if (gd.mode === 'chase') {
      ctx.fillStyle = '#ff4a3a';
      ctx.font = 'bold 15px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('!', gd.x, cy - 34);
    }
  }
}

function drawThief(ctx, g) {
  const t = g.thief;
  const cy = wy(t.y);
  const crouch = t.sneaking ? 0.82 : 1;
  // Midnight-blue coat.
  ctx.fillStyle = '#22306e';
  ctx.beginPath();
  ctx.ellipse(t.x, cy, 13, 13 * crouch, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#0d1330';
  ctx.lineWidth = 2;
  ctx.stroke();
  // Gold coat trim.
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(t.x, cy, 9, 0, Math.PI * 2);
  ctx.stroke();
  // Slouch hat: wide brim + crown, tilted by facing.
  const hx = t.x + Math.cos(t.facing) * 3;
  const hy = cy + Math.sin(t.facing) * 3;
  ctx.fillStyle = '#131a3a';
  ctx.beginPath();
  ctx.ellipse(hx, hy, 10, 7 * crouch, t.facing * 0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1c2650';
  ctx.beginPath();
  ctx.arc(hx, hy - 2, 5.5, 0, Math.PI * 2);
  ctx.fill();
  // Loot sack grows with the take.
  if (g.lootTaken.size > 0) {
    ctx.fillStyle = '#c9a227';
    ctx.beginPath();
    ctx.arc(t.x - 10, cy + 8, 3 + g.lootTaken.size * 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawHUD(ctx, g) {
  ctx.fillStyle = '#0d1226';
  ctx.fillRect(0, 0, 1280, HUD_H);
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, HUD_H);
  ctx.lineTo(1280, HUD_H);
  ctx.stroke();

  ctx.fillStyle = GOLD;
  ctx.font = 'bold 22px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.fillText('GILDED HOUR', 18, 36);
  ctx.fillStyle = '#8fa0c8';
  ctx.font = '13px Georgia, serif';
  ctx.fillText('the Meridian Gallery', 190, 35);

  // Loot slots: three gold diamond outlines that fill as pieces are taken.
  ctx.font = 'bold 12px Georgia, serif';
  ctx.textAlign = 'center';
  LOOT.forEach((loot, i) => {
    const cx = 430 + i * 52;
    const cy = 28;
    const taken = g.lootTaken.has(loot.id);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = taken ? GOLD : 'rgba(201,162,39,0.12)';
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 2;
    ctx.fillRect(-10, -10, 20, 20);
    ctx.strokeRect(-10, -10, 20, 20);
    ctx.restore();
    ctx.fillStyle = taken ? '#0d1226' : GOLD_DIM;
    ctx.fillText(String(i + 1), cx, cy + 4);
  });
  ctx.fillStyle = '#8fa0c8';
  ctx.font = '11px Georgia, serif';
  ctx.fillText('LOOT', 430 + 52, 52);

  // Alarm meter: vertical gauge, pulsing red edge when high.
  const gx = 640;
  const gy = 8;
  const gw = 20;
  const gh = 40;
  const frac = g.alarm / 100;
  ctx.fillStyle = '#1a2138';
  ctx.fillRect(gx, gy, gw, gh);
  const col = g.alarm >= 75 ? '#ff4a3a' : g.alarm >= 40 ? '#ffb142' : '#7fd4a8';
  ctx.fillStyle = col;
  const fh = gh * frac;
  ctx.fillRect(gx, gy + gh - fh, gw, fh);
  ctx.strokeStyle = g.alarm >= 75 ? `rgba(255,74,58,${0.5 + 0.5 * Math.sin(g.now * 6)})` : GOLD;
  ctx.lineWidth = g.alarm >= 75 ? 3 : 1.5;
  ctx.strokeRect(gx - 1, gy - 1, gw + 2, gh + 2);
  ctx.fillStyle = '#8fa0c8';
  ctx.font = '11px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.fillText('ALARM', gx + 26, 22);
  ctx.fillStyle = '#e8e0c0';
  ctx.font = 'bold 13px Georgia, serif';
  ctx.fillText(String(Math.round(g.alarm)), gx + 26, 38);

  // Smoke pellets and lockpick.
  ctx.fillStyle = '#c8c8cd';
  for (let i = 0; i < 2; i++) {
    ctx.beginPath();
    ctx.arc(800 + i * 22, 24, 8, 0, Math.PI * 2);
    ctx.fillStyle = i < g.thief.smoke ? '#c8c8cd' : 'rgba(200,200,205,0.18)';
    ctx.fill();
  }
  ctx.fillStyle = '#8fa0c8';
  ctx.font = '11px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.fillText('SMOKE (Q)', 790, 50);
  ctx.strokeStyle = g.thief.lockpick > 0 ? GOLD : 'rgba(201,162,39,0.25)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(880, 24, 7, 0, Math.PI * 2);
  ctx.moveTo(885, 29);
  ctx.lineTo(892, 36);
  ctx.stroke();
  ctx.fillStyle = '#8fa0c8';
  ctx.fillText('LOCKPICK', 900, 28);
  ctx.fillText(g.thief.lockpick > 0 ? 'x1' : 'used', 900, 44);

  // Timer.
  const secs = Math.floor(g.elapsed);
  const mm = String(Math.floor(secs / 60)).padStart(2, '0');
  const ss = String(secs % 60).padStart(2, '0');
  ctx.fillStyle = '#e8e0c0';
  ctx.font = 'bold 18px Georgia, serif';
  ctx.textAlign = 'right';
  ctx.fillText(`${mm}:${ss}`, 1262, 32);
  ctx.fillStyle = '#8fa0c8';
  ctx.font = '11px Georgia, serif';
  ctx.fillText('M mute · P pause', 1262, 50);
}

function overlayPanel(ctx, w, h) {
  ctx.fillStyle = 'rgba(8, 11, 26, 0.78)';
  ctx.fillRect(0, HUD_H, 1280, WORLD.H);
  ctx.fillStyle = '#101736';
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 2;
  const x = (1280 - w) / 2;
  const y = HUD_H + (WORLD.H - h) / 2;
  ctx.fillRect(x, y, w, h);
  ctx.strokeRect(x, y, w, h);
  return { x, y };
}

function drawTitle(ctx, g) {
  const p = overlayPanel(ctx, 640, 420);
  ctx.textAlign = 'center';
  ctx.fillStyle = GOLD;
  ctx.font = 'bold 44px Georgia, serif';
  ctx.fillText('GILDED HOUR', 640, p.y + 80);
  ctx.fillStyle = '#e8e0c0';
  ctx.font = '19px Georgia, serif';
  ctx.fillText('Rob the Meridian Gallery: take the Sun Opal,', 640, p.y + 130);
  ctx.fillText('the Jade Mask and the Gold Ledger — then slip', 640, p.y + 158);
  ctx.fillText('out through the green skylight.', 640, p.y + 186);
  ctx.fillStyle = '#8fa0c8';
  ctx.font = '15px Georgia, serif';
  ctx.fillText('WASD / arrows — move · Shift — sneak · E — grab / hack / pick', 640, p.y + 240);
  ctx.fillText('Q — smoke pellet (2) · vent lockpick (1) · P — pause · M — mute', 640, p.y + 266);
  ctx.fillText('Dodge the amber cones. Red means you are seen.', 640, p.y + 292);
  ctx.fillStyle = GOLD;
  ctx.font = 'bold 20px Georgia, serif';
  const blink = 0.6 + 0.4 * Math.sin(g.now * 3);
  ctx.fillStyle = `rgba(201,162,39,${blink})`;
  ctx.fillText('Press Enter or click to begin', 640, p.y + 350);
}

function drawBusted(ctx, g) {
  const p = overlayPanel(ctx, 560, 320);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff4a3a';
  ctx.font = 'bold 52px Georgia, serif';
  ctx.fillText('BUSTED', 640, p.y + 90);
  ctx.fillStyle = '#e8e0c0';
  ctx.font = '19px Georgia, serif';
  ctx.fillText(`The guards caught Rook with ${g.lootTaken.size} of 3 pieces.`, 640, p.y + 140);
  ctx.fillText('The loot stays yours. Try the room again.', 640, p.y + 168);
  ctx.fillStyle = GOLD;
  ctx.font = 'bold 20px Georgia, serif';
  ctx.fillText('Press R or click to retry', 640, p.y + 240);
}

function drawWon(ctx, g) {
  const p = overlayPanel(ctx, 620, 400);
  ctx.textAlign = 'center';
  ctx.fillStyle = GOLD;
  ctx.font = 'bold 40px Georgia, serif';
  ctx.fillText('THE GILDED HOUR IS YOURS', 640, p.y + 70);
  ctx.fillStyle = '#e8e0c0';
  ctx.font = '19px Georgia, serif';
  ctx.fillText('The take:', 640, p.y + 120);
  LOOT.forEach((loot, i) => {
    ctx.fillText(`· ${loot.name}`, 640, p.y + 150 + i * 28);
  });
  const secs = Math.floor(g.winTime);
  ctx.fillText(
    `Time ${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}  ·  alarm spiked ${g.spikes} ${g.spikes === 1 ? 'time' : 'times'}`,
    640,
    p.y + 250,
  );
  ctx.fillStyle = GOLD;
  ctx.font = 'bold 20px Georgia, serif';
  ctx.fillText('Press R or click to play again', 640, p.y + 310);
}

function drawPaused(ctx) {
  const p = overlayPanel(ctx, 420, 180);
  ctx.textAlign = 'center';
  ctx.fillStyle = GOLD;
  ctx.font = 'bold 36px Georgia, serif';
  ctx.fillText('PAUSED', 640, p.y + 80);
  ctx.fillStyle = '#8fa0c8';
  ctx.font = '16px Georgia, serif';
  ctx.fillText('Press P or Esc to resume', 640, p.y + 120);
}

function drawPrompt(ctx, g) {
  const near = g.nearInteract();
  if (!near) return;
  let label = '';
  if (near.type === 'loot') label = `E — Grab the ${near.loot.name}`;
  if (near.type === 'panel') label = 'Hold E — Hack the camera';
  if (near.type === 'vent') label = 'Hold E — Pick the vent lock';
  ctx.fillStyle = 'rgba(8, 11, 26, 0.85)';
  ctx.font = 'bold 17px Georgia, serif';
  const w = ctx.measureText(label).width + 28;
  ctx.fillRect((1280 - w) / 2, 800 - 52, w, 34);
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 1.5;
  ctx.strokeRect((1280 - w) / 2, 800 - 52, w, 34);
  ctx.fillStyle = '#ffd65a';
  ctx.textAlign = 'center';
  ctx.fillText(label, 640, 800 - 29);
  // Channel progress bar for holds.
  if (g.channel) {
    ctx.fillStyle = '#1a2138';
    ctx.fillRect(540, 800 - 66, 200, 8);
    ctx.fillStyle = '#ffd65a';
    ctx.fillRect(540, 800 - 66, 200 * g.channel.progress, 8);
  }
}

function drawLockdownBanner(ctx, now) {
  const alpha = 0.55 + 0.35 * Math.sin(now * 6);
  ctx.fillStyle = `rgba(180, 25, 18, ${alpha})`;
  ctx.fillRect(0, HUD_H + 4, 1280, 26);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 15px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('LOCKDOWN — SKYLIGHT SEALED — STAY UNSEEN TO REOPEN IT', 640, HUD_H + 22);
}
