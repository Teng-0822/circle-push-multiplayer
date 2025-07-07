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

// Init Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// Global state
let playerId = null;
let room = null;
let nickname = null;
let players = {};
let bullets = [];
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Join/Create room
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
    x: Math.random() * 700 + 50,
    y: Math.random() * 500 + 50,
    hp: 100,
    score: 0,
    angle: 0,
  };

  const roomRef = db.ref("rooms/" + room + "/players/" + playerId);
  roomRef.set(playerData);
  roomRef.onDisconnect().remove();

  document.getElementById("menu").style.display = "none";

  startGameLoop();
}
