export {}; // This tells TypeScript this file is a module
let canvas = document.getElementById("canvas");
let ctx = canvas.getContext("2d") ;

class Mouse {
    x = 0;
    y = 0;
    click = false;

    constructor() {
        this.init();
    }

    init() {
        canvas.addEventListener("mousemove", (e) => {
            const rect = canvas.getBoundingClientRect();
            this.x = ((e.clientX - rect.left) / rect.width) * canvas.width;
            this.y = ((e.clientY - rect.top) / rect.height) * canvas.height;
        });

        canvas.addEventListener("mouseleave", () => {
            this.x = -1;
            this.y = -1;
        });

        canvas.addEventListener("mousedown", () => {
            this.click = true;
        });

        canvas.addEventListener("mouseup", () => {
            this.click = false;
        });
        canvas.addEventListener("touchstart", (e) => {
            e.preventDefault(); // Prevent scrolling
            const touch = e.touches[0];
            this.updatePos(touch.clientX, touch.clientY);
            this.click = true;
        }, { passive: false });

        canvas.addEventListener("touchmove", (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            this.updatePos(touch.clientX, touch.clientY);
        }, { passive: false });

        canvas.addEventListener("touchend", () => {
            this.click = false;
        });
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
    constructor() { 
        this.color = getRandomColor();
        this.id = Math.floor(Math.random() * 1000000); // Random ID for the player  
    }
}

// Store green squares here
let squares = [];

const mouse = new Mouse();
const player = new Player();
function getRandomColor() {
  let letters = '0123456789ABCDEF';
  let color = '#';
  for (var i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}
const SERVER_URL = "https://apps.judemakes.dev/Coloring-Online-Game";

async function sendSquareData(x, y,id,color) {
    try {
        console.log('Sending data:', { x, y, id,color });
        await fetch(`${SERVER_URL}/data`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ x, y, id,color })
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
    }
}
updateSquares()
async function updateSquares() {
    try {
        const sqr = await getSquares();
        squares = sqr;
    } catch (err) { console.error(err); }
    setTimeout(updateSquares, 100);
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

    // If mouse is clicked, store the green square
    if (mouse.click) {
        squares.push({ x: mouse.x, y: mouse.y,color:player.color });
        sendSquareData(mouse.x, mouse.y,player.id,player.color);
    }

    // Draw all green squares
    for (let sq of squares) {
        ctx.fillStyle = sq.color;
        ctx.fillRect(sq.x - 5, sq.y - 5, 40, 40);
    }
}

function init() {
    loop();
}

init();

