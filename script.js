let bestScore = localStorage.getItem("bestScore") || 0;
document.getElementById("best-score").textContent = `Mejor puntuación: ${bestScore}`;

let deckId,
  currentCard,
  score = 0,
  correct = 0,
  incorrect = 0,
  ties = 0,
  remainingCards = 52;
let gameRunning = false;
let statsChart;

const API_BASE_URL = "https://deckofcardsapi.com/api/deck";
const cardElement = document.getElementById("current-card");
const loadingIndicator = document.getElementById("loading-indicator");

document.getElementById("start-game").addEventListener("click", startGame);
document.getElementById("stop-game").addEventListener("click", endGame);
document.getElementById("higher").addEventListener("click", () => guessCard("higher"));
document.getElementById("lower").addEventListener("click", () => guessCard("lower"));

async function startGame() {
  toggleLoading(true);
  resetGameState();

  try {
    const response = await fetch(`${API_BASE_URL}/new/shuffle/?deck_count=1`);
    if (!response.ok) throw new Error("Error al barajar el mazo.");
    const data = await response.json();
    deckId = data.deck_id;

    drawCard();
    document.getElementById("game-area").style.display = "block";
    gameRunning = true;

    if (statsChart) statsChart.destroy();
    initializeChart();
  } catch (error) {
    console.error("Error al iniciar el juego:", error);
    alert("Hubo un problema al iniciar el juego. Intenta nuevamente.");
  } finally {
    toggleLoading(false);
  }
}

async function drawCard() {
  toggleLoading(true);

  try {
    // Ocultar la carta mientras se carga
    cardElement.style.visibility = "hidden";

    const response = await fetch(`${API_BASE_URL}/${deckId}/draw/?count=1`);
    if (!response.ok) throw new Error("Error al robar una carta.");
    const data = await response.json();

    if (data.cards.length === 0 || !gameRunning) return endGame();

    currentCard = data.cards[0];
    remainingCards = data.remaining;

    // Animar el giro de la carta y mostrar la nueva carta
    animateCardFlip(() => {
      cardElement.src = currentCard.image;
      cardElement.style.visibility = "visible"; // Mostrar la carta cuando esté lista
    });

    updateUI();
  } catch (error) {
    console.error("Error al robar una carta:", error);
    alert("Hubo un problema al robar una carta. Intenta nuevamente.");
  } finally {
    toggleLoading(false);
  }
}

async function guessCard(choice) {
  toggleLoading(true);

  try {
    const response = await fetch(`${API_BASE_URL}/${deckId}/draw/?count=1`);
    if (!response.ok) throw new Error("Error al adivinar la carta.");
    const data = await response.json();

    if (data.cards.length === 0 || !gameRunning) return endGame();

    const newCard = data.cards[0];
    const values = { ACE: 1, JACK: 11, QUEEN: 12, KING: 13 };
    const currentValue = values[currentCard.value] || parseInt(currentCard.value);
    const newValue = values[newCard.value] || parseInt(newCard.value);

    if ((newValue > currentValue && choice === "higher") || (newValue < currentValue && choice === "lower")) {
      score++;
      correct++;
    } else if (newValue === currentValue) {
      ties++;
    } else {
      score--;
      incorrect++;
    }

    currentCard = newCard;
    remainingCards = data.remaining;

    animateCardFlip(() => {
      cardElement.src = currentCard.image;
    });

    updateUI();
    updateChart();

    if (remainingCards === 0) endGame();
  } catch (error) {
    console.error("Error al adivinar la carta:", error);
    alert("Hubo un problema al adivinar la carta. Intenta nuevamente.");
  } finally {
    toggleLoading(false);
  }
}

function updateUI() {
  document.getElementById("score").textContent = `Puntos: ${score}`;
  document.getElementById("remaining").textContent = `Cartas restantes: ${remainingCards}`;
}

function endGame() {
  gameRunning = false;
  document.getElementById("game-area").style.display = "none";
  document.getElementById("statsContainer").style.display = "block";
  document.getElementById("start-game").style.display = "block";
  document.getElementById("stop-game").style.display = "none";

  if (score > bestScore) {
    localStorage.setItem("bestScore", score);
    document.getElementById("best-score").textContent = `Mejor puntuación: ${score}`;
  }
}

function resetGameState() {
  document.getElementById("statsContainer").style.display = "none";
  document.getElementById("start-game").style.display = "none";
  document.getElementById("stop-game").style.display = "inline-block";

  score = correct = incorrect = ties = 0;
  remainingCards = 52;
  updateUI();
}

function initializeChart() {
  statsChart = new Chart(document.getElementById("statsChart"), {
    type: "bar",
    data: {
      labels: ["Aciertos", "Fallos", "Empates"],
      datasets: [
        {
          data: [0, 0, 0],
          backgroundColor: ["#27ae60", "#e74c3c", "#f1c40f"],
          borderColor: ["#27ae60", "#e74c3c", "#f1c40f"],
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: "#f1c40f" } },
        y: { ticks: { color: "#f1c40f", beginAtZero: true } },
      },
    },
  });
}

function updateChart() {
  statsChart.data.datasets[0].data = [correct, incorrect, ties];
  statsChart.update();
}

function toggleLoading(show) {
  loadingIndicator.style.display = show ? "block" : "none";
}

function animateCardFlip(callback) {
  cardElement.classList.add("flip");
  setTimeout(() => {
    callback();
    cardElement.classList.remove("flip");
  }, 300); // Reducir el tiempo de la animación a 200ms para mayor fluidez
}
