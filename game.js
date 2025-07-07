// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyDv0_wV_7U_akaYMCMmqIuZU7mFHu4oGv0",
  authDomain: "firebullz-c5da5.firebaseapp.com",
  databaseURL: "https://firebullz-c5da5-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "firebullz-c5da5",
  storageBucket: "firebullz-c5da5.appspot.com",
  messagingSenderId: "209013988107",
  appId: "1:209013988107:web:4f323d4f66bd167781200e",
  measurementId: "G-ZTVNCF4BQ6"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let playerId = null;
let room = null;
let nickname = null;
let players = {};
let bullets = [];
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const keys = {};
let shootAngle = 0;

document.getElementById("createBtn").onclick = () => joinGame(true);
document.getElementById("joinBtn").onclick = () => joinGame(false);

function joinGame(isCreator) {
  const roomInput = document.getElementById("roomInput").value.trim();
  const nickInput = document.getElementById("nicknameInput").value.trim();
  if (!roomInput || !nickInput) return alert("Fill out both fields!");

  room = roomInput;
  nickname = nickInput;
  playerId = Math.random().toString(36).substr(2, 9);

  const playerData = {
    id: playerId,
    name: nickname,
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    hp: 100,
    score: 0,
    angle: 0
  };

  const playerRef = db.ref(`rooms/${room}/players/${playerId}`);
  playerRef.set(playerData);
  playerRef.onDisconnect().remove();

  document.getElementById("menu").style.display = "none";

  db.ref(`rooms/${room}/players`).on("value", (snapshot) => {
    players = snapshot.val() || {};
  });

  db.ref(`rooms/${room}/bullets`).on("value", (snap) => {
    bullets = Object.values(snap.val() || {});
  });

  startGameLoop();
  setInterval(updateFirebase, 100);
}

function updateFirebase() {
  const me = players[playerId];
  if (!me) return;

  db.ref(`rooms/${room}/players/${playerId}`).update({
    x: me.x,
    y: me.y,
    angle: shootAngle,
    hp: me.hp,
    score: me.score
  });
}

function shootBullet(angle) {
  const me = players[playerId];
  const bulletId = Date.now() + "_" + Math.random();
  db.ref(`rooms/${room}/bullets/${bulletId}`).set({
    owner: playerId,
    x: me.x,
    y: me.y,
    dx: Math.cos(angle) * 8,
    dy: Math.sin(angle) * 8
  });
}

function drawStickman(x, y, angle, name, hp, isMe) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = isMe ? "cyan" : "white";
  ctx.beginPath();
  ctx.arc(0, 0, 15, 0, Math.PI * 2); // head
  ctx.fill();
  ctx.strokeStyle = "#fff";
  ctx.beginPath();
  ctx.moveTo(0, 15);
  ctx.lineTo(0, 40); // body
  ctx.moveTo(-10, 25);
  ctx.lineTo(10, 25); // arms
  ctx.moveTo(0, 40);
  ctx.lineTo(-10, 55); // legs
  ctx.moveTo(0, 40);
  ctx.lineTo(10, 55);
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = "#fff";
  ctx.fillText(name, x - 15, y - 20);
  ctx.fillStyle = "red";
  ctx.fillRect(x - 20, y - 30, 40, 5);
  ctx.fillStyle = "lime";
  ctx.fillRect(x - 20, y - 30, 40 * (hp / 100), 5);
}

function drawBullet(b) {
  ctx.beginPath();
  ctx.arc(b.x, b.y, 5, 0, Math.PI * 2);
  ctx.fillStyle = "yellow";
  ctx.fill();
}

function startGameLoop() {
  function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Move local player
    const me = players[playerId];
    if (me) {
      if (keys["w"] || keys["ArrowUp"]) me.y -= 3;
      if (keys["s"] || keys["ArrowDown"]) me.y += 3;
      if (keys["a"] || keys["ArrowLeft"]) me.x -= 3;
      if (keys["d"] || keys["ArrowRight"]) me.x += 3;
    }

    for (const id in players) {
      const p = players[id];
      const isMe = id === playerId;
      drawStickman(p.x, p.y, p.angle, p.name, p.hp, isMe);
    }

    for (const b of bullets) {
      b.x += b.dx;
      b.y += b.dy;
      drawBullet(b);

      for (const id in players) {
        if (id !== b.owner) {
          const p = players[id];
          const dist = Math.hypot(b.x - p.x, b.y - p.y);
          if (dist < 20) {
            p.hp -= 10;
            if (p.hp <= 0) {
              players[b.owner].score += 1;
              p.hp = 100;
              p.x = Math.random() * canvas.width;
              p.y = Math.random() * canvas.height;
            }
            db.ref(`rooms/${room}/bullets`).remove(); // clear all bullets
            break;
          }
        }
      }
    }

    requestAnimationFrame(loop);
  }

  loop();
}

document.addEventListener("keydown", (e) => keys[e.key] = true);
document.addEventListener("keyup", (e) => keys[e.key] = false);

// 360 Shooting with Mouse / Touch
canvas.addEventListener("click", (e) => {
  const me = players[playerId];
  if (!me) return;
  const rect = canvas.getBoundingClientRect();
  const cx = me.x;
  const cy = me.y;
  const mx = e.clientX;
  const my = e.clientY;
  shootAngle = Math.atan2(my - cy, mx - cx);
  shootBullet(shootAngle);
});
