// Firebase configuration - replace with your own
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  databaseURL: "YOUR_DB_URL",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// DOM references
const nameInput = document.getElementById('nameInput');
const joinBtn = document.getElementById('joinBtn');
const gameContainer = document.getElementById('gameContainer');
const playerEl = document.getElementById('player');

let playerId = null;
let playerRef = null;
let playersRef = null;
let name = '';

let posX = 0;
let posY = 0;
let score = 0;
let isAlive = true;
let gameDuration = 120; // seconds
let timer = gameDuration;
let gameInterval = null;
const pushTimeouts = {}; // track respawns

// Join game handler
joinBtn.onclick = () => {
  const n = nameInput.value.trim();
  if (!n) {
    alert('Enter your name');
    return;
  }
  name = n;
  document.getElementById('setup').style.display = 'none';
  document.getElementById('gameContainer').style.display = 'block';

  // Create player in Firebase
  playersRef = db.ref('players');
  const newPlayerRef = playersRef.push();
  playerRef = newPlayerRef;
  playerId = newPlayerRef.key;

  // Set initial position
  posX = 0;
  posY = 0;
  score = 0;
  updatePlayer();

  // Handle disconnect
  newPlayerRef.onDisconnect().remove();

  // Listen for other players
  listenForPlayers();

  // Start game timer
  startGame();
};

// Function to update player's data
function updatePlayer() {
  if (playerRef) {
    playerRef.set({ name, x: posX, y: posY, score });
  }
  movePlayer();
}

// Function to move player's visual element
function movePlayer() {
  const stageSize = document.getElementById('circleStage').clientWidth;
  const center = stageSize / 2;
  playerEl.style.left = `${center + posX - 20}px`;
  playerEl.style.top = `${center + posY - 20}px`;
}

// Listen for other players
function listenForPlayers() {
  db.ref('players').on('value', snapshot => {
    const players = snapshot.val() || {};
    Object.keys(players).forEach(id => {
      if (id !== playerId) {
        const p = players[id];
        // Check if outside circle
        const dist = Math.sqrt(p.x * p.x + p.y * p.y);
        const radius = document.getElementById('circleStage').clientWidth/2 - 20;
        if (dist > radius && !(id in pushTimeouts)) {
          // Push detected
          // Increment opponent score
          db.ref(`players/${id}/score`).transaction(c => (c || 0) + 1);
          // Respawn self after 5 seconds
          pushTimeouts[id] = setTimeout(() => {
            posX = 0;
            posY = 0;
            updatePlayer();
            delete pushTimeouts[id];
          }, 5000);
        }
      }
    });
  });
}

// Start game
function startGame() {
  // Reset score
  score = 0;
  // Timer
  timer = gameDuration;
  updateTimer();
  document.getElementById('result') && (document.getElementById('result').innerText = '');
  gameInterval = setInterval(() => {
    timer--;
    if (timer <= 0) {
      clearInterval(gameInterval);
      endGame();
    }
    updateTimer();
  }, 1000);
}

// Update timer display
function updateTimer() {
  const m = Math.floor(timer / 60).toString().padStart(2, '0');
  const s = (timer % 60).toString().padStart(2, '0');
  document.querySelector('h1').innerText = `Time: ${m}:${s}`;
}

// End game
function endGame() {
  // Fetch all scores
  db.ref('players').once('value', snap => {
    const players = snap.val() || {};
    let maxScore = -1;
    let winners = [];
    Object.values(players).forEach(p => {
      if (p.score > maxScore) {
        maxScore = p.score;
        winners = [p.name];
      } else if (p.score === maxScore) {
        winners.push(p.name);
      }
    });
    let msg = '';
    if (winners.length === 1) {
      msg = `Winner: ${winners[0]} with ${maxScore} points!`;
    } else {
      msg = `It's a tie! Players: ${winners.join(', ')} with ${maxScore} points!`;
    }
    alert(msg);
  });
}

// Keyboard controls
window.addEventListener('keydown', e => {
  if (!playerRef) return;
  const step = 10;
  const stageSize = document.getElementById('circleStage').clientWidth;
  const radius = stageSize / 2 - 20;
  if (e.key === 'ArrowUp') {
    posY -= step;
  } else if (e.key === 'ArrowDown') {
    posY += step;
  } else if (e.key === 'ArrowLeft') {
    posX -= step;
  } else if (e.key === 'ArrowRight') {
    posX += step;
  }
  // Constrain
  const dist = Math.sqrt(posX * posX + posY * posY);
  if (dist > radius) {
    const angle = Math.atan2(posY, posX);
    posX = Math.cos(angle) * radius;
    posY = Math.sin(angle) * radius;
  }
  updatePlayer();
});

// Optional: Add mobile joystick controls here if needed
