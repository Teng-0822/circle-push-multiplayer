// game.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getDatabase, ref, set, onValue, remove } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyDv0_wV_7U_akaYMCMmqIuZU7mFHu4oGv0",
  authDomain: "firebullz-c5da5.firebaseapp.com",
  databaseURL: "https://firebullz-c5da5-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "firebullz-c5da5",
  storageBucket: "firebullz-c5da5.firebasestorage.app",
  messagingSenderId: "209013988107",
  appId: "1:209013988107:web:4f323d4f66bd167781200e",
  measurementId: "G-ZTVNCF4BQ6"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let playerId = null;
let room = null;
let players = {};
let nickname = "";
let localPlayer = null;

let leftJoystick = { x: 0, y: 0, active: false };
let rightJoystick = { x: 0, y: 0, active: false };

const stickRadius = 50;

function drawStickman(p) {
  ctx.fillStyle = p.color;
  ctx.beginPath();
  ctx.arc(p.x, p.y, 15, 0, Math.PI * 2);
  ctx.fill();

  const armX = p.x + Math.cos(p.angle) * 25;
  const armY = p.y + Math.sin(p.angle) * 25;
  ctx.strokeStyle = p.color;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.lineTo(armX, armY);
  ctx.stroke();

  ctx.fillStyle = "white";
  ctx.fillText(p.name + " (" + p.hp + ")", p.x - 20, p.y - 25);
}

function updateJoystickPosition(e, stick, element) {
  const touch = e.touches[0];
  const rect = element.getBoundingClientRect();
  const x = touch.clientX - rect.left - rect.width / 2;
  const y = touch.clientY - rect.top - rect.height / 2;
  const dist = Math.sqrt(x * x + y * y);
  if (dist < stickRadius) {
    stick.x = x / stickRadius;
    stick.y = y / stickRadius;
  } else {
    const angle = Math.atan2(y, x);
    stick.x = Math.cos(angle);
    stick.y = Math.sin(angle);
  }
  stick.active = true;
}

function stopJoystick(stick) {
  stick.active = false;
  stick.x = 0;
  stick.y = 0;
}

function loop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (localPlayer) {
    if (leftJoystick.active) {
      localPlayer.x += leftJoystick.x * 3;
      localPlayer.y += leftJoystick.y * 3;
    }

    if (rightJoystick.active) {
      localPlayer.angle = Math.atan2(rightJoystick.y, rightJoystick.x);
    }

    set(ref(db, `rooms/${room}/players/${playerId}`), localPlayer);
  }

  for (let id in players) {
    drawStickman(players[id]);
  }

  requestAnimationFrame(loop);
}

function startGame() {
  localPlayer = {
    name: nickname,
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    angle: 0,
    hp: 100,
    score: 0,
    color: "hsl(" + Math.random() * 360 + ", 60%, 60%)"
  };
  set(ref(db, `rooms/${room}/players/${playerId}`), localPlayer);
  document.getElementById("lobby").style.display = "none";
  loop();
}

function initGameListeners() {
  onValue(ref(db, `rooms/${room}/players`), (snapshot) => {
    const data = snapshot.val() || {};
    players = data;
  });
}

// Lobby UI
const createBtn = document.getElementById("createBtn");
const joinBtn = document.getElementById("joinBtn");

createBtn.addEventListener("click", () => {
  const r = document.getElementById("roomName").value.trim();
  const n = document.getElementById("nickname").value.trim();
  if (!r || !n) return alert("Fill out all fields");
  room = r;
  nickname = n;
  playerId = "player_" + Math.floor(Math.random() * 100000);
  startGame();
  initGameListeners();
});

joinBtn.addEventListener("click", () => {
  const r = document.getElementById("roomName").value.trim();
  const n = document.getElementById("nickname").value.trim();
  if (!r || !n) return alert("Fill out all fields");
  room = r;
  nickname = n;
  playerId = "player_" + Math.floor(Math.random() * 100000);
  startGame();
  initGameListeners();
});

// Touch Joystick
const leftEl = document.getElementById("left-joystick");
const rightEl = document.getElementById("right-joystick");

leftEl.addEventListener("touchstart", e => updateJoystickPosition(e, leftJoystick, leftEl));
leftEl.addEventListener("touchmove", e => updateJoystickPosition(e, leftJoystick, leftEl));
leftEl.addEventListener("touchend", () => stopJoystick(leftJoystick));

rightEl.addEventListener("touchstart", e => updateJoystickPosition(e, rightJoystick, rightEl));
rightEl.addEventListener("touchmove", e => updateJoystickPosition(e, rightJoystick, rightEl));
rightEl.addEventListener("touchend", () => stopJoystick(rightJoystick));
