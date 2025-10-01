export {}; // module scope

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById("canvas");
  if (!canvas) throw new Error("No canvas#canvas found in DOM");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to get 2D context from canvas");

  const rangeSlider = document.getElementById("size");
  if (!rangeSlider) throw new Error("No input#size found in DOM");
  if (!rangeSlider.value) rangeSlider.value = "10";

  const getSliderValue = () => Math.max(1, Number(rangeSlider.value) || 10);

  class Mouse {
    constructor() {
      this.x = -1;
      this.y = -1;
      this.click = false;
      this.init();
    }

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
    constructor() {
      this.color = getRandomColor();
      this.id = Math.floor(Math.random() * 1000000);
      this._lastPlaced = { x: -Infinity, y: -Infinity };
      this._lastSend = 0;
    }
  }

  function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  }

  const SERVER_URL = "https://apps.judemakes.dev/Coloring-Online-Game";
  const squares = new Map(); // key -> {x, y, color, w, h}

  const mouse = new Mouse();
  const player = new Player();

  async function sendSquareData(x, y, id, color, size) {
    try {
      await fetch(`${SERVER_URL}/data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ x, y, id, color, size })
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

  async function updateSquares() {
    try {
      const sqr = await getSquares();
      for (const s of sqr) {
        const size = s.size != null ? Number(s.size) : 10;
        const key = s.id != null ? String(s.id) : `${Math.round(s.x)}|${Math.round(s.y)}|${s.color}|${Math.round(size)}`;
        squares.set(key, { x: s.x, y: s.y, color: s.color, w: size, h: size });
      }
    } catch (err) {
      console.error(err);
    }
    setTimeout(updateSquares, 200);
  }

  function addSquare(x, y, color, id) {
    const size = getSliderValue();
    const key = id != null ? `${id}:${Math.round(x)}|${Math.round(y)}|${Math.round(size)}` : `${Math.round(x)}|${Math.round(y)}|${color}|${Math.round(size)}`;
    squares.set(key, { x, y, color, w: size, h: size });

    const MAX = 5000;
    if (squares.size > MAX) {
      const k = squares.keys().next().value;
      squares.delete(k);
    }
  }

  function distance(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx*dx + dy*dy);
  }

  function loop() {
    requestAnimationFrame(loop);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw cursor dot
    if (mouse.x >= 0 && mouse.y >= 0) {
      ctx.fillStyle = player.color;
      ctx.beginPath();
      ctx.arc(mouse.x, mouse.y, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Place squares when clicked
    if (mouse.click && mouse.x >= 0 && mouse.y >= 0) {
      const cur = { x: mouse.x, y: mouse.y };
      const THRESH = 8;
      if (distance(cur, player._lastPlaced) > THRESH) {
        addSquare(mouse.x, mouse.y, player.color, player.id);
        player._lastPlaced = cur;
      }

      const now = performance.now();
      const SEND_INTERVAL = 150;
      if (now - player._lastSend > SEND_INTERVAL) {
        player._lastSend = now;
        sendSquareData(mouse.x, mouse.y, player.id, player.color, getSliderValue());
      }
    }

    // Draw all squares (centered)
    for (const sq of squares.values()) {
      ctx.fillStyle = sq.color;
      ctx.fillRect(sq.x, sq.y, sq.w, sq.h);
    }
  }

  updateSquares();
  loop();

  rangeSlider.addEventListener('input', () => {
    // live-preview slider value if you want
    // console.log('size', getSliderValue());
  });
});
