// - Small arrows sit on an even grid and spiral in towards the books, like the
//   red markers in the reference video. Each book spins its own direction.
// - Arrows flow over the books. Each book is the eye of a spiral: arrows get
//   smaller and sparser towards its centre, so the cover shows through.
// - The cursor is a spiral eye too: arrows swirl in towards it and thin out,
//   uncovering whatever is underneath.
// - Books are links: clicking one opens that book in the archive page.
// - The canvas has pointer-events: none, so everything underneath stays clickable.

// ---------- Your books: edit this list ----------
// Every title in the archive. Each visit shows a random selection of SHOW_COUNT of them.
// img  = the cover image in your images/ folder
// href = archive.html#ID, where ID is the id of that book's entry in archive.html
const BOOKS = [
  { img: 'images/bao-boc.png',                href: 'archive.html#bao-boc',                     title: 'Bao Bọc' },
  { img: 'images/i-hate-the-fact-that.png',   href: 'archive.html#i-hate-the-fact-that',        title: 'i hate the fact that' },
  { img: 'images/no-ghost-no-shell.png',      href: 'archive.html#no-ghost-no-shell',           title: 'No Ghost No Shell' },
  { img: 'images/pandora.png',                href: 'archive.html#pandora-of-our-beloved-sea',  title: 'Pandora of Our Beloved Sea' },
  { img: 'images/digital-land.png',           href: 'archive.html#reclaiming-our-digital-land', title: 'Reclaiming Our Digital Land' },
  { img: 'images/spellshaper.png',            href: 'archive.html#spellshaper',                 title: 'Spellshaper' },
  { img: 'images/out-of-time.png',            href: 'archive.html#out-of-time',                 title: 'Out of Time' },
  { img: 'images/riso-obscura.png',           href: 'archive.html#riso-obscura',                title: 'Riso Obscura' },
  { img: 'images/please-dont-look-at-me.png', href: 'archive.html#please-dont-look-at-me',      title: "Please Don't Look at Me" },
];

// ---------- Shuffle: pick a different selection of books on every visit ----------
const SHOW_COUNT = 8; // how many books are on the page at once

function shuffle(list) { // returns a shuffled copy (Fisher–Yates)
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function pickBooks() {
  let last = '';
  try { last = localStorage.getItem('landing-books') || ''; } catch (e) {}
  let pick, key;
  // reshuffle (a few tries) if we happen to land on exactly the same set as last visit
  for (let tries = 0; tries < 10; tries++) {
    pick = shuffle(BOOKS).slice(0, SHOW_COUNT);
    key = pick.map((b) => b.href).sort().join('|');
    if (key !== last) break;
  }
  try { localStorage.setItem('landing-books', key); } catch (e) {}
  return pick;
}

const SHOWN_BOOKS = pickBooks();

// Where each book floats (fractions of the space under the header: x = left to right, y = top to bottom)
const SLOTS = [
  // evenly spread, no two books in the same row or column
  [0.23, 0.17], [0.86, 0.19], [0.70, 0.34], [0.46, 0.45],
  [0.84, 0.69], [0.22, 0.86], [0.11, 0.52], [0.54, 0.79],
];

// ---------- Settings you can tweak ----------
const SPACING = 24;                    // distance between arrows (px). Bigger = fewer arrows
const ARROW_SIZE = 0.9;               // arrow length as a fraction of SPACING
const ARROW_COLOR = 'rgba(58, 54, 50, 0.5)'; // faded warm graphite, like pencil on an old map
const LINE_WIDTH = 1.2;
const HEAD_LENGTH = 0.4;              // length of the arrow head barbs, as a fraction of the arrow
const HEAD_SPREAD = 0.3;               // how wide the head opens (radians; 0.5 is about 29 degrees)
const WOBBLE = 0.1;                   // how bowed and uneven the hand-drawn arrows are (0 = perfectly straight)
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
          pointer-events: auto; will-change: transform;
          cursor: grab; touch-action: none; -webkit-user-drag: none; user-select: none; }
  .book.dragging { cursor: grabbing; z-index: 1; }
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

const books = SHOWN_BOOKS.map((b, i) => {
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
  a.draggable = false; // use our own dragging, not the browser's "drag a link" behaviour
  layer.appendChild(a);
  const book = { el: a, slot: SLOTS[i % SLOTS.length].slice(), ph: i * 2.1, w: 0, h: 0, clear: 0, x: 0, y: 0 };
  makeDraggable(book);
  return book;
});

// ---------- Dragging books ----------
// Press and move a book to drag it; it stays where you drop it (until the page is reloaded).
// A press without moving is still a normal click that opens the book in the archive.
const DRAG_START = 6; // px the pointer must move before a press counts as a drag

function makeDraggable(book) {
  const a = book.el;
  let press = null;   // where the press started, while the button is held
  let moved = false;  // true once this press turned into a drag

  a.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    press = { x: e.clientX, y: e.clientY, grabX: e.clientX - book.x, grabY: e.clientY - book.y };
    moved = false;
    a.setPointerCapture(e.pointerId);
  });

  a.addEventListener('pointermove', (e) => {
    if (!press) return;
    if (!moved && Math.hypot(e.clientX - press.x, e.clientY - press.y) < DRAG_START) return;
    moved = true;
    book.dragging = true;
    book.dragX = e.clientX - press.grabX;
    book.dragY = e.clientY - press.grabY;
    a.classList.add('dragging');
  });

  function release() {
    if (!press) return;
    press = null;
    if (!book.dragging) return;
    // turn the drop point into the book's new home spot, so its gentle drift carries on from there
    const tb = reduceMotion ? 0 : performance.now() * 0.001;
    const areaH = height - headerBottom;
    book.slot[0] = (book.x - Math.sin(tb * 0.6 + book.ph) * BOOK_DRIFT) / width;
    book.slot[1] = (book.y - headerBottom - Math.cos(tb * 0.5 + book.ph) * BOOK_DRIFT * 0.8) / areaH;
    book.dragging = false;
    a.classList.remove('dragging');
  }
  a.addEventListener('pointerup', release);
  a.addEventListener('pointercancel', release);

  // after a drag, swallow the click so dropping a book doesn't open the archive
  a.addEventListener('click', (e) => {
    if (moved) { e.preventDefault(); moved = false; }
  });
}

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
    if (b.dragging) { // follows the pointer while being dragged
      b.x = b.dragX;
      b.y = b.dragY;
    } else {
      b.x = b.slot[0] * width + Math.sin(tb * 0.6 + b.ph) * BOOK_DRIFT;
      b.y = headerBottom + b.slot[1] * areaH + Math.cos(tb * 0.5 + b.ph) * BOOK_DRIFT * 0.8;
    }
    // never let a book go off the sides, up under the header, or off the bottom
    b.x = Math.max(b.x, b.w / 2 + 4);
    b.x = Math.min(b.x, width - b.w / 2 - 4);
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

// One hand-drawn arrow: a slightly bowed pencil shaft and an open V head.
// r (0 to 1) is this arrow's own random number, so no two arrows are drawn exactly alike.
function addArrow(x, y, a, len, r) {
  const c = Math.cos(a);
  const s = Math.sin(a);
  const half = len / 2;

  const tailX = x - c * half;
  const tailY = y - s * half;
  const tipX = x + c * half;
  const tipY = y + s * half;

  // shaft: bowed a little to one side, like a quick stroke of the pencil
  const bow = (r - 0.5) * 2 * len * WOBBLE;
  const ctrlX = x - s * bow;
  const ctrlY = y + c * bow;
  ctx.moveTo(tailX, tailY);
  ctx.quadraticCurveTo(ctrlX, ctrlY, tipX, tipY);

  // the head follows the direction the shaft is travelling as it arrives at the tip
  const tip = Math.atan2(tipY - ctrlY, tipX - ctrlX);

  // two barbs that are never quite equal in length or angle
  const r2 = (r * 7.31) % 1;
  const lenA = len * HEAD_LENGTH * (0.85 + 0.3 * r2);
  const lenB = len * HEAD_LENGTH * (1.15 - 0.3 * r2);
  const spreadA = HEAD_SPREAD * (0.9 + 0.2 * r);
  const spreadB = HEAD_SPREAD * (1.1 - 0.2 * r);

  ctx.moveTo(tipX + Math.cos(tip + Math.PI - spreadA) * lenA, tipY + Math.sin(tip + Math.PI - spreadA) * lenA);
  ctx.lineTo(tipX, tipY);
  ctx.lineTo(tipX + Math.cos(tip + Math.PI + spreadB) * lenB, tipY + Math.sin(tip + Math.PI + spreadB) * lenB);
}

// ---------- Drawing ----------
function render(time) {
  const t = time * 0.001 * FLOW_SPEED;
  ctx.clearRect(0, 0, width, height);
  ctx.strokeStyle = ARROW_COLOR;
  ctx.lineWidth = LINE_WIDTH;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
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
    addArrow(posX[k], posY[k], angle[k], len, r);
  }
  ctx.stroke(); // open lines only, so there is nothing to fill
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