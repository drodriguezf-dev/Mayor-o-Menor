// Estado del juego en memoria
const gameState = {
  deckId: null,
  currentCard: null,
  score: 0,
  correct: 0,
  incorrect: 0,
  ties: 0,
  remaining: 52,
  bestScore: 0,
  isRunning: false,
  chart: null
};

const API_URL = 'https://deckofcardsapi.com/api/deck';

// Elementos DOM
const elements = {
  startBtn: document.getElementById('startBtn'),
  stopBtn: document.getElementById('stopBtn'),
  gameArea: document.getElementById('gameArea'),
  chartContainer: document.getElementById('chartContainer'),
  loading: document.getElementById('loading'),
  currentCard: document.getElementById('currentCard'),
  score: document.getElementById('score'),
  remaining: document.getElementById('remaining'),
  bestScore: document.getElementById('bestScore'),
  higherBtn: document.getElementById('higherBtn'),
  lowerBtn: document.getElementById('lowerBtn'),
  statsChart: document.getElementById('statsChart')
};

// Utilidades
const showLoading = () => elements.loading.classList.add('active');
const hideLoading = () => elements.loading.classList.remove('active');

const showFeedback = (type, message) => {
  const feedback = document.createElement('div');
  feedback.className = `feedback ${type}`;
  feedback.textContent = message;
  document.body.appendChild(feedback);
  setTimeout(() => feedback.remove(), 2000);
};

const getCardValue = (card) => {
  const values = { ACE: 1, JACK: 11, QUEEN: 12, KING: 13 };
  return values[card.value] || parseInt(card.value);
};

const updateUI = () => {
  elements.score.textContent = gameState.score;
  elements.remaining.textContent = gameState.remaining;
  elements.bestScore.textContent = gameState.bestScore;
};

const toggleButtons = (disabled) => {
  elements.higherBtn.disabled = disabled;
  elements.lowerBtn.disabled = disabled;
};

// Precargar imagen
const preloadImage = (src) => {
  return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
  });
};

// Inicializar gráfico
const initChart = () => {
  if (gameState.chart) {
      gameState.chart.destroy();
  }

  gameState.chart = new Chart(elements.statsChart, {
      type: 'bar',
      data: {
          labels: ['✅ Aciertos', '❌ Fallos', '🤝 Empates'],
          datasets: [{
              label: 'Resultados',
              data: [0, 0, 0],
              backgroundColor: [
                  'rgba(39, 174, 96, 0.8)',
                  'rgba(231, 76, 60, 0.8)',
                  'rgba(243, 156, 18, 0.8)'
              ],
              borderColor: [
                  'rgba(39, 174, 96, 1)',
                  'rgba(231, 76, 60, 1)',
                  'rgba(243, 156, 18, 1)'
              ],
              borderWidth: 2,
              borderRadius: 8
          }]
      },
      options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
              legend: { display: false },
              tooltip: {
                  backgroundColor: 'rgba(0, 0, 0, 0.8)',
                  titleColor: '#f1c40f',
                  bodyColor: '#fff',
                  padding: 12,
                  borderColor: '#f1c40f',
                  borderWidth: 1
              }
          },
          scales: {
              x: {
                  ticks: { color: '#f1c40f', font: { size: 14 } },
                  grid: { display: false }
              },
              y: {
                  beginAtZero: true,
                  ticks: { 
                      color: '#f1c40f', 
                      font: { size: 14 },
                      stepSize: 1
                  },
                  grid: { color: 'rgba(241, 196, 15, 0.1)' }
              }
          },
          animation: {
              duration: 800,
              easing: 'easeInOutQuart'
          }
      }
  });
};

const updateChart = () => {
  if (gameState.chart) {
      gameState.chart.data.datasets[0].data = [
          gameState.correct,
          gameState.incorrect,
          gameState.ties
      ];
      gameState.chart.update('none'); // Sin animación para actualización instantánea
  }
};

// Funciones del juego
const startGame = async () => {
  showLoading();
  
  try {
      const response = await fetch(`${API_URL}/new/shuffle/?deck_count=1`);
      if (!response.ok) throw new Error('Error al barajar el mazo');
      
      const data = await response.json();
      gameState.deckId = data.deck_id;
      gameState.score = 0;
      gameState.correct = 0;
      gameState.incorrect = 0;
      gameState.ties = 0;
      gameState.remaining = 52;
      gameState.isRunning = true;

      elements.startBtn.classList.add('hidden');
      elements.stopBtn.classList.remove('hidden');
      elements.chartContainer.classList.add('hidden');
      elements.gameArea.classList.remove('hidden');

      initChart();
      await drawCard();
      updateUI();
  } catch (error) {
      console.error('Error:', error);
      showFeedback('error', '❌ Error al iniciar el juego');
  } finally {
      hideLoading();
  }
};

const drawCard = async () => {
  showLoading();
  
  try {
      const response = await fetch(`${API_URL}/${gameState.deckId}/draw/?count=1`);
      if (!response.ok) throw new Error('Error al robar carta');
      
      const data = await response.json();
      
      if (data.cards.length === 0) {
          endGame();
          return;
      }

      gameState.currentCard = data.cards[0];
      gameState.remaining = data.remaining;

      // Precargar la imagen antes de mostrarla
      await preloadImage(gameState.currentCard.image);

      elements.currentCard.classList.add('flip');
      
      setTimeout(() => {
          elements.currentCard.src = gameState.currentCard.image;
          elements.currentCard.classList.remove('flip');
      }, 300);

      updateUI();
  } catch (error) {
      console.error('Error:', error);
      showFeedback('error', '❌ Error al robar carta');
  } finally {
      hideLoading();
  }
};

const guessCard = async (choice) => {
  if (!gameState.isRunning) return;
  
  toggleButtons(true);
  showLoading();
  
  try {
      const response = await fetch(`${API_URL}/${gameState.deckId}/draw/?count=1`);
      if (!response.ok) throw new Error('Error al adivinar');
      
      const data = await response.json();
      
      if (data.cards.length === 0) {
          endGame();
          return;
      }

      const newCard = data.cards[0];
      
      // Precargar la imagen mientras calculamos el resultado
      const imagePromise = preloadImage(newCard.image);
      
      const currentValue = getCardValue(gameState.currentCard);
      const newValue = getCardValue(newCard);

      let feedbackType, feedbackMsg;

      if (newValue === currentValue) {
          gameState.ties++;
          feedbackType = 'tie';
          feedbackMsg = '🤝 ¡Empate!';
      } else if (
          (choice === 'higher' && newValue > currentValue) ||
          (choice === 'lower' && newValue < currentValue)
      ) {
          gameState.score++;
          gameState.correct++;
          feedbackType = 'success';
          feedbackMsg = '✅ ¡Correcto! +1';
      } else {
          gameState.score--;
          gameState.incorrect++;
          feedbackType = 'error';
          feedbackMsg = '❌ Incorrecto -1';
      }

      showFeedback(feedbackType, feedbackMsg);

      gameState.currentCard = newCard;
      gameState.remaining = data.remaining;

      // Esperar a que la imagen esté cargada
      await imagePromise;
      
      // Iniciar animación
      elements.currentCard.classList.add('flip');
      
      setTimeout(() => {
          elements.currentCard.src = gameState.currentCard.image;
          elements.currentCard.classList.remove('flip');
      }, 300);

      updateUI();
      updateChart();

      if (gameState.remaining === 0) {
          setTimeout(endGame, 1500);
      }
  } catch (error) {
      console.error('Error:', error);
      showFeedback('error', '❌ Error al adivinar');
  } finally {
      hideLoading();
      toggleButtons(false);
  }
};

const endGame = () => {
  gameState.isRunning = false;
  
  if (gameState.score > gameState.bestScore) {
      gameState.bestScore = gameState.score;
      showFeedback('success', `🏆 ¡Nuevo récord: ${gameState.score}!`);
  }

  elements.gameArea.classList.add('hidden');
  elements.startBtn.classList.remove('hidden');
  elements.stopBtn.classList.add('hidden');
  elements.chartContainer.classList.remove('hidden');
  
  updateUI();
};

// Event listeners
elements.startBtn.addEventListener('click', startGame);
elements.stopBtn.addEventListener('click', endGame);
elements.higherBtn.addEventListener('click', () => guessCard('higher'));
elements.lowerBtn.addEventListener('click', () => guessCard('lower'));

// Atajos de teclado
document.addEventListener('keydown', (e) => {
  if (!gameState.isRunning) return;
  
  if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
      guessCard('higher');
  } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
      guessCard('lower');
  }
});

// Precargar mazo al iniciar la aplicación
const preloadDeck = async () => {
  try {
      const response = await fetch(`${API_URL}/new/shuffle/?deck_count=1`);
      if (!response.ok) return;
      
      const data = await response.json();
      const preloadDeckId = data.deck_id;
      
      // Robar todas las cartas para precargar sus imágenes
      const drawResponse = await fetch(`${API_URL}/${preloadDeckId}/draw/?count=52`);
      if (!drawResponse.ok) return;
      
      const drawData = await drawResponse.json();
      
      // Precargar todas las imágenes en segundo plano
      const imagePromises = drawData.cards.map(card => 
          preloadImage(card.image).catch(() => {}) // Ignorar errores individuales
      );
      
      await Promise.all(imagePromises);
      console.log('✅ Mazo precargado correctamente');
  } catch (error) {
      console.log('⚠️ No se pudo precargar el mazo:', error);
  }
};

// Iniciar precarga cuando se carga la página
window.addEventListener('DOMContentLoaded', preloadDeck);