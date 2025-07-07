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

let joystick = { active: false, x: 0, y: 0, dx: 0, dy: 0 };
let shootstick = { active: false, x: 0, y: 0, dx: 0, dy: 0 };

const joinBtn = document.getElementById("joinBtn");
joinBtn.addEventListener("click", () => {
  const nameInput = document.getElementById("nickname");
  const name = nameInput.value.trim();
  if (name.length === 0) {
    alert("Please enter a nickname");
    return;
  }
  nickname = name;
  startGame();
});

function startGame() {
  playerId = Math.random().toString(36).substr(2, 9);
  room = "main";

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

  db.ref(`rooms/${room}/players`).on("value", (snapshot) => {
    players = snapshot.val() || {};
  });

  db.ref(`rooms/${room}/bullets`).on("value", (snap) => {
    bullets = Object.values(snap.val() || {});
  });

  document.getElementById("menu").style.display = "none";
  setInterval(updateFirebase, 100);
  startGameLoop();
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

function drawStickman(x, y, angle, name, hp, isMe, score) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = isMe ? "cyan" : "white";
  ctx.beginPath();
  ctx.arc(0, 0, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#fff";
  ctx.beginPath();
  ctx.moveTo(0, 15);
  ctx.lineTo(0, 40);
  ctx.moveTo(-10, 25);
  ctx.lineTo(10, 25);
  ctx.moveTo(0, 40);
  ctx.lineTo(-10, 55);
  ctx.moveTo(0, 40);
  ctx.lineTo(10, 55);
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = "#fff";
  ctx.fillText(name + ` (${score})`, x - 25, y - 35);
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

    const me = players[playerId];
    if (me) {
      const speed = 3;
      me.x += joystick.dx * speed;
      me.y += joystick.dy * speed;
    }

    for (const id in players) {
      const p = players[id];
      const isMe = id === playerId;
      drawStickman(p.x, p.y, p.angle, p.name, p.hp, isMe, p.score);
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
            db.ref(`rooms/${room}/bullets`).remove();
            break;
          }
        }
      }
    }

    requestAnimationFrame(loop);
  }
  loop();
}

canvas.addEventListener("touchstart", (e) => {
  for (let touch of e.touches) {
    if (touch.clientX < canvas.width / 2) {
      joystick.active = true;
      joystick.x = touch.clientX;
      joystick.y = touch.clientY;
    } else {
      shootstick.active = true;
      shootstick.x = touch.clientX;
      shootstick.y = touch.clientY;
    }
  }
});

canvas.addEventListener("touchmove", (e) => {
  e.preventDefault();
  for (let touch of e.touches) {
    if (joystick.active && touch.clientX < canvas.width / 2) {
      let dx = touch.clientX - joystick.x;
      let dy = touch.clientY - joystick.y;
      let len = Math.hypot(dx, dy);
      if (len > 0) {
        joystick.dx = dx / len;
        joystick.dy = dy / len;
      }
    } else if (shootstick.active && touch.clientX >= canvas.width / 2) {
      let dx = touch.clientX - shootstick.x;
      let dy = touch.clientY - shootstick.y;
      shootAngle = Math.atan2(dy, dx);
    }
  }
});

canvas.addEventListener("touchend", (e) => {
  joystick.active = false;
  joystick.dx = joystick.dy = 0;
  shootstick.active = false;
  shootBullet(shootAngle);
});

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
