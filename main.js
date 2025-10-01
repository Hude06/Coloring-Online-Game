export {}; // This tells TypeScript this file is a module
let canvas = document.getElementById("canvas");
let ctx = canvas.getContext("2d") ;

class Mouse {
  x = -1;
  y = -1;
  click = false;

  constructor() { this.init(); }

  init() {
    canvas.addEventListener("mousemove", (e) => {
      const rect = canvas.getBoundingClientRect();
      this.x = ((e.clientX - rect.left) / rect.width) * canvas.width;
      this.y = ((e.clientY - rect.top) / rect.height) * canvas.height;
    });

    canvas.addEventListener("mouseleave", () => { this.x = -1; this.y = -1; });
    canvas.addEventListener("mousedown", () => { this.click = true; });
    canvas.addEventListener("mouseup", () => { this.click = false; });

    canvas.addEventListener("touchstart", (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      this.updatePos(touch.clientX, touch.clientY);
      this.click = true;
    }, { passive: false });

    canvas.addEventListener("touchmove", (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      this.updatePos(touch.clientX, touch.clientY);
    }, { passive: false });

    canvas.addEventListener("touchend", () => { this.click = false; });
  }

  updatePos(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    this.x = ((clientX - rect.left) / rect.width) * canvas.width;
    this.y = ((clientY - rect.top) / rect.height) * canvas.height;
  }
}

class Player {
  color;
  id;
  _lastPlaced = { x: -Infinity, y: -Infinity }; // used to prevent duplicates while holding
  _lastSend = 0; // timestamp for rate-limit
  constructor() {
    this.color = getRandomColor();
    this.id = Math.floor(Math.random() * 1000000);
  }
}

function getRandomColor() {
  let letters = '0123456789ABCDEF';
  let color = '#';
  for (var i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

const SERVER_URL = "https://apps.judemakes.dev/Coloring-Online-Game";

// --- MAIN CHANGE: use a Map instead of array ---
let squares = new Map(); // key -> {x,y,color}

const mouse = new Mouse();
const player = new Player();

async function sendSquareData(x, y, id, color) {
  try {
    // you might want to batch these on the server later
    await fetch(`${SERVER_URL}/data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ x, y, id, color })
    });
  } catch (err) {
    console.error('Error sending data:', err);
  }
}

async function getSquares() {
  try {
    const response = await fetch(`${SERVER_URL}/squares`);
    const data = await response.json();
    return data;
  } catch (err) {
    console.error('Error fetching data:', err);
    return [];
  }
}

updateSquares();
async function updateSquares() {
  try {
    const sqr = await getSquares();
    for (const s of sqr) {
      const key = s.id != null ? String(s.id) : `${Math.round(s.x)}|${Math.round(s.y)}|${s.color}`;
      // set will overwrite duplicates from server
      squares.set(key, { x: s.x, y: s.y, color: s.color });
    }
  } catch (err) { console.error(err); }
  setTimeout(updateSquares, 200);
}

function addSquare(x, y, color, id) {
  const key = id != null ? String(id) : `${Math.round(x)}|${Math.round(y)}|${color}`;
  squares.set(key, { x, y, color });
  // optional: cap size to avoid unlimited growth
  const MAX = 5000;
  if (squares.size > MAX) {
    // delete oldest entry (Map preserves insertion order)
    const k = squares.keys().next().value;
    squares.delete(k);
  }
}

function distance(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx*dx + dy*dy);
}

async function loop() {
  requestAnimationFrame(loop);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw the blue dot at the mouse position
  if (mouse.x >= 0 && mouse.y >= 0) {
    ctx.fillStyle = player.color;
    ctx.beginPath();
    ctx.arc(mouse.x, mouse.y, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  // If mouse is clicked, store the green square (but de-duplicate + rate-limit)
  if (mouse.click && mouse.x >= 0 && mouse.y >= 0) {
    const cur = { x: mouse.x, y: mouse.y };
    // only place if moved more than threshold (prevents thousands of identical pushes)
    const THRESH = 8; // pixels
    if (distance(cur, player._lastPlaced) > THRESH) {
      addSquare(mouse.x, mouse.y, player.color, player.id);
      player._lastPlaced = cur;
    }

    // rate-limit network sends (e.g., once per 150ms)
    const now = performance.now();
    const SEND_INTERVAL = 150;
    if (now - player._lastSend > SEND_INTERVAL) {
      player._lastSend = now;
      sendSquareData(mouse.x, mouse.y, player.id, player.color);
    }
  }

  // --- Draw all green squares: iterate Map.values() ---
  for (let sq of squares.values()) {
    ctx.fillStyle = sq.color;
    ctx.fillRect(sq.x - 5, sq.y - 5, 40, 40);
  }
}

function init() {
  loop();
}

init();
