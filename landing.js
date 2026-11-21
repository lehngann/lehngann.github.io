// - Small arrows sit on an even grid and spiral in towards the books, like the
//   red markers in the reference video. Each book spins its own direction.
// - Arrows flow over the books. Each book is the eye of a spiral: arrows get
//   smaller and sparser towards its centre, so the cover shows through.
// - The cursor is a spiral eye too: arrows swirl in towards it and thin out,
//   uncovering whatever is underneath.
// - Books are links: clicking one opens that book in the archive page.
// - The canvas has pointer-events: none, so everything underneath stays clickable.

// ---------- Your books: edit this list ----------
// img  = the cover image in your images/ folder
// href = archive.html#ID, where ID is the id you give that book's entry in archive.html
const BOOKS = [
  { img: 'images/bao-boc.png',              href: 'archive.html#bao-boc',              title: 'Bao Bọc' },
  { img: 'images/i-hate-the-fact-that.png', href: 'archive.html#i-hate-the-fact-that', title: 'i hate the fact that' },
  { img: 'images/book-3.png',               href: 'archive.html#book-3',               title: 'Book 3' },
  { img: 'images/book-4.png',               href: 'archive.html#book-4',               title: 'Book 4' },
  { img: 'images/book-5.png',               href: 'archive.html#book-5',               title: 'Book 5' },
];

// Where each book floats (fractions of the space under the header: x = left to right, y = top to bottom)
const SLOTS = [
  [0.14, 0.22], [0.70, 0.16], [0.88, 0.58], [0.12, 0.70],
  [0.40, 0.84], [0.32, 0.10], [0.90, 0.28], [0.68, 0.84],
];

// ---------- Settings you can tweak ----------
const SPACING = 20;                    // distance between arrows (px). Bigger = fewer arrows
const ARROW_SIZE = 0.85;               // arrow length as a fraction of SPACING
const ARROW_COLOR = 'rgba(88, 82, 74, 0.5)'; // faded warm graphite, like pencil on an old map
const LINE_WIDTH = 1.2;
const MOUSE_RADIUS = 150;              // reach of the mouse's push (px)
const HOLE = 0.5;                     // clear space around the mouse, 0 to 0.5 (lower = arrows bunch up less)
const BOOK_MARGIN = 0;                // extra room around each book (px), part of its spiral eye
const EYE_SIZE = 1.1;                  // size of the calm eye over each book (1 = just covers the book)
const EYE_SHRINK = 0.85;               // how much arrows shrink at the very centre of an eye, 0 to 1
const EYE_THIN = 0.1;                  // how many arrows disappear at the very centre of an eye, 0 to 1
const EASE = 0.25;                     // how quickly arrows slide to their new spot
const TURN_SPEED = 0.1;                // how quickly arrows rotate
const FLOW_SPEED = 0.35;               // how fast the spirals drift
const BOOK_DRIFT = 20;                 // how far books wander from their spot (px)

const vortices = [
  { x: 0.20, y: 0.30, ax: 0.10, ay: 0.12, sp: 1.0, ph: 0.0, dir:  1, r: 0.22 },
  { x: 0.78, y: 0.25, ax: 0.12, ay: 0.10, sp: 0.8, ph: 1.7, dir: -1, r: 0.20 },
  { x: 0.50, y: 0.60, ax: 0.14, ay: 0.12, sp: 0.6, ph: 3.1, dir:  1, r: 0.26 },
  { x: 0.12, y: 0.82, ax: 0.08, ay: 0.08, sp: 1.2, ph: 4.4, dir: -1, r: 0.18 },
  { x: 0.88, y: 0.78, ax: 0.10, ay: 0.10, sp: 0.9, ph: 5.2, dir:  1, r: 0.21 },
];

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- Canvas (created if the page doesn't have one) ----------
let canvas = document.getElementById('flow');
if (!canvas) {
  canvas = document.createElement('canvas');
  canvas.id = 'flow';
  document.body.appendChild(canvas);
}
Object.assign(canvas.style, {
  position: 'fixed', inset: '0', width: '100%', height: '100%',
  zIndex: '10', pointerEvents: 'none',
});
const ctx = canvas.getContext('2d');

// ---------- Books ----------
const style = document.createElement('style');
style.textContent = `
  #books { position: fixed; inset: 0; z-index: 5; pointer-events: none; overflow: hidden; }
  .book { position: absolute; left: 0; top: 0; display: block; width: clamp(70px, 8vw, 130px);
          pointer-events: auto; will-change: transform; }
  .book img { display: block; width: 100%; height: auto; user-select: none; -webkit-user-drag: none; }
  .book:hover, .book:focus-visible { outline: 2px solid #c03910; outline-offset: 3px; }
  .book.no-image { aspect-ratio: 2 / 3; display: flex; align-items: center; justify-content: center;
          padding: 8px; border: 1px solid #000; background: #fff; color: #000; text-align: center;
          text-decoration: none; font: 14px/1.3 Helvetica, Arial, sans-serif; }
`;
document.head.appendChild(style);

const layer = document.createElement('div');
layer.id = 'books';
document.body.appendChild(layer);

const books = BOOKS.map((b, i) => {
  const a = document.createElement('a');
  a.className = 'book';
  a.href = b.href;
  a.setAttribute('aria-label', b.title);
  const img = document.createElement('img');
  img.src = b.img;
  img.alt = b.title;
  img.draggable = false;
  img.addEventListener('load', measureBooks);
  img.addEventListener('error', () => { // no image yet: show the title in a box instead
    a.classList.add('no-image');
    a.textContent = b.title;
    measureBooks();
  });
  a.appendChild(img);
  layer.appendChild(a);
  return { el: a, slot: SLOTS[i % SLOTS.length], ph: i * 2.1, w: 0, h: 0, clear: 0, x: 0, y: 0 };
});

function measureBooks() {
  for (const b of books) {
    b.w = b.el.offsetWidth;
    b.h = b.el.offsetHeight;
    b.clear = Math.hypot(b.w, b.h) / 2 + BOOK_MARGIN; // circle that covers the book
  }
}

function moveBooks(time) {
  const tb = reduceMotion ? 0 : time * 0.001;
  const areaH = height - headerBottom; // the space under the header
  for (const b of books) {
    b.x = b.slot[0] * width + Math.sin(tb * 0.6 + b.ph) * BOOK_DRIFT;
    b.y = headerBottom + b.slot[1] * areaH + Math.cos(tb * 0.5 + b.ph) * BOOK_DRIFT * 0.8;
    // never let a book slide up under the header or off the bottom
    b.y = Math.max(b.y, headerBottom + b.h / 2 + 12);
    b.y = Math.min(b.y, height - b.h / 2 - 12);
    b.el.style.transform = `translate(${b.x - b.w / 2}px, ${b.y - b.h / 2}px)`;
  }
}

// ---------- State ----------
let width, height, count;
let headerBottom = 0; // where the header ends (px from the top); books stay below it
let homeX, homeY, posX, posY, angle, seed;
const mouse = { x: 0, y: 0, sx: 0, sy: 0, active: false, strength: 0 };

// ---------- Flow field ----------
// Arrows spiral in towards (cx, cy). dir = spin direction, w = strength.
function spiralIn(x, y, cx, cy, R, dir, w, acc) {
  const dx = x - cx;
  const dy = y - cy;
  const d2 = dx * dx + dy * dy;
  const d = Math.sqrt(d2) + 0.001;
  const falloff = 1 / (1 + d2 / (R * R));
  acc.x += ((-dy / d) * dir * 0.8 - (dx / d) * 0.7) * falloff * w;
  acc.y += (( dx / d) * dir * 0.8 - (dy / d) * 0.7) * falloff * w;
}

function flowAt(x, y, t, out) {
  const size = Math.min(width, height);
  out.x = 0.5 + 0.35 * Math.sin((y / size) * 5 + t * 2.0);
  out.y = 0.35 * Math.sin((x / size) * 4 + t * 1.6);

  // every book is a spiral centre: arrows spiral in towards it (direction alternates book to book)
  for (let i = 0; i < books.length; i++) {
    const b = books[i];
    spiralIn(x, y, b.x, b.y, size * 0.34, i % 2 === 0 ? 1 : -1, 2.4, out);
  }

  // the cursor is a spiral centre too, fading in and out with mouse.strength
  if (mouse.strength > 0.002) {
    spiralIn(x, y, mouse.sx, mouse.sy, MOUSE_RADIUS * 1.5, 1, 2.4 * mouse.strength, out);
  }

  for (const v of vortices) {
    const cx = (v.x + Math.cos(t * v.sp + v.ph) * v.ax) * width;
    const cy = (v.y + Math.sin(t * v.sp * 1.3 + v.ph) * v.ay) * height;
    const R = v.r * size;
    const dx = x - cx;
    const dy = y - cy;
    const d2 = dx * dx + dy * dy;
    const d = Math.sqrt(d2) + 0.001;
    const falloff = 1 / (1 + d2 / (R * R));
    out.x += ((-dy / d) * v.dir - (dx / d) * 0.3) * falloff * 1.0;
    out.y += (( dx / d) * v.dir - (dy / d) * 0.3) * falloff * 1.0;
  }
}

// How deep a point is inside a spiral eye: 1 at the centre, fading to 0 outside.
function eyeAt(x, y, cx, cy, R) {
  const dx = x - cx;
  const dy = y - cy;
  return Math.exp(-(dx * dx + dy * dy) / (R * R));
}

// Push a point (p) away from a centre: everything inside radius R is squeezed
// into a ring around a clear space. s (0 to 1) fades the effect in and out.
function squeeze(p, cx, cy, R, hole, s) {
  const dx = p.x - cx;
  const dy = p.y - cy;
  const d = Math.hypot(dx, dy);
  if (d >= R) return;
  const u = d / R;
  const inv = 1 - u;
  const nd = R * (u + inv * inv * hole * s);
  let rx = 1, ry = 0;
  if (d > 0.001) { rx = dx / d; ry = dy / d; }
  p.x = cx + rx * nd;
  p.y = cy + ry * nd;
  if (inv * s > p.infl) { p.infl = inv * s; p.rx = rx; p.ry = ry; }
}

// ---------- Setup ----------
function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const cols = Math.ceil(width / SPACING) + 1;
  const rows = Math.ceil(height / SPACING) + 1;
  const offX = (width - (cols - 1) * SPACING) / 2;
  const offY = (height - (rows - 1) * SPACING) / 2;

  count = cols * rows;
  homeX = new Float32Array(count);
  homeY = new Float32Array(count);
  posX = new Float32Array(count);
  posY = new Float32Array(count);
  angle = new Float32Array(count);
  seed = new Float32Array(count);

  headerBottom = document.querySelector('header')?.getBoundingClientRect().bottom || 0;
  measureBooks();
  moveBooks(0);

  const v = { x: 0, y: 0 };
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const k = j * cols + i;
      homeX[k] = posX[k] = offX + i * SPACING;
      homeY[k] = posY[k] = offY + j * SPACING;
      seed[k] = (Math.sin(i * 12.9898 + j * 78.233) * 43758.5453) % 1;
      flowAt(homeX[k], homeY[k], 0, v);
      angle[k] = Math.atan2(v.y, v.x);
    }
  }
}

function addArrow(x, y, a, len) {
  const c = Math.cos(a);
  const s = Math.sin(a);
  const half = len / 2;
  const headLen = len * 0.34;
  const headHalf = len * 0.15;
  const bx = x + c * (half - headLen); // where the head starts
  const by = y + s * (half - headLen);

  // shaft (stroked)
  ctx.moveTo(x - c * half, y - s * half);
  ctx.lineTo(bx, by);
  // small solid triangle head (filled)
  ctx.moveTo(x + c * half, y + s * half);
  ctx.lineTo(bx - s * headHalf, by + c * headHalf);
  ctx.lineTo(bx + s * headHalf, by - c * headHalf);
  ctx.closePath();
}

// ---------- Drawing ----------
function render(time) {
  const t = time * 0.001 * FLOW_SPEED;
  ctx.clearRect(0, 0, width, height);
  ctx.strokeStyle = ARROW_COLOR;
  ctx.lineWidth = LINE_WIDTH;
  ctx.lineCap = 'round';
  ctx.beginPath();

  moveBooks(time);

  mouse.strength += ((mouse.active ? 1 : 0) - mouse.strength) * (reduceMotion ? 1 : 0.08);
  mouse.sx += (mouse.x - mouse.sx) * 0.35;
  mouse.sy += (mouse.y - mouse.sy) * 0.35;
  const S = mouse.strength;

  const p = { x: 0, y: 0, infl: 0, rx: 0, ry: 0 };
  const v = { x: 0, y: 0 };
  const ease = reduceMotion ? 1 : EASE;

  for (let k = 0; k < count; k++) {
    p.x = homeX[k];
    p.y = homeY[k];
    p.infl = 0;
    p.rx = 0;
    p.ry = 0;

    // the mouse makes a little room; arrows flow over the books
    if (S > 0.002) squeeze(p, mouse.sx, mouse.sy, MOUSE_RADIUS, HOLE, S);

    posX[k] += (p.x - posX[k]) * ease;
    posY[k] += (p.y - posY[k]) * ease;

    // direction: the flow, which already spirals in towards the books and the mouse
    flowAt(posX[k], posY[k], t, v);
    let diff = Math.atan2(v.y, v.x) - angle[k];
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    angle[k] += diff * (reduceMotion ? 1 : TURN_SPEED);

    // spiral eyes: near a book's or the cursor's centre, arrows get smaller and sparser
    let eye = 0;
    for (const b of books) eye = Math.max(eye, eyeAt(posX[k], posY[k], b.x, b.y, b.clear * EYE_SIZE));
    if (S > 0.002) eye = Math.max(eye, S * eyeAt(posX[k], posY[k], mouse.sx, mouse.sy, MOUSE_RADIUS * 0.7));
    const r = Math.abs(seed[k]);
    if (r < eye * EYE_THIN) continue; // thinned out

    // arrows shrink where they get crowded or deep in an eye, so they don't stick together
    const len = SPACING * ARROW_SIZE * (0.85 + 0.3 * r) * (1 - 0.5 * p.infl) * (1 - EYE_SHRINK * eye);
    if (len < 2) continue;
    addArrow(posX[k], posY[k], angle[k], len);
  }
  ctx.fillStyle = ARROW_COLOR;
  ctx.fill();
  ctx.stroke();
}

function loop(time) {
  render(time);
  if (!reduceMotion) requestAnimationFrame(loop);
}

// ---------- Mouse and touch (listening on the window, so clicks still reach the page) ----------
function track(e) {
  if (!mouse.active) { mouse.sx = e.clientX; mouse.sy = e.clientY; }
  mouse.x = e.clientX;
  mouse.y = e.clientY;
  mouse.active = true;
  if (reduceMotion) render(performance.now());
}
window.addEventListener('pointermove', track);
window.addEventListener('pointerdown', track);
document.addEventListener('pointerout', (e) => { if (!e.relatedTarget) mouse.active = false; });
window.addEventListener('pointercancel', () => { mouse.active = false; });
window.addEventListener('pointerup', (e) => { if (e.pointerType === 'touch') mouse.active = false; });
window.addEventListener('blur', () => { mouse.active = false; });
window.addEventListener('resize', () => { resize(); if (reduceMotion) render(performance.now()); });

resize();
requestAnimationFrame(loop);