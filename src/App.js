//https://www.blackbox.ai/chat/AGdo9wL  Blackbox AI


import React, { useState, useEffect, useRef } from "react";
import "./App.css";

const GAME_AREA = {
  width: 300,
  height: 600
};

const LANES = [0, 1, 2]; // 0: left, 1: center, 2: right
const LANE_WIDTH = GAME_AREA.width / 3;
const OBSTACLE_TYPES = ["🚧", "🛑", "🛵","🏍️","🚜","🛻","🛺", "🚕", "🚙", "🚓", "🚒", "🚜", "🚚", "🚛"];

function App() {
  const [gameState, setGameState] = useState("start"); // start, playing, gameover
  const [carPosition, setCarPosition] = useState({ x: 1, y: GAME_AREA.height - 80 });
  const [obstacles, setObstacles] = useState([]);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(
    parseInt(localStorage.getItem("highScore") || "0", 10)
  );
  const [gameSpeed, setGameSpeed] = useState(1);
  const gameAreaRef = useRef(null);
  const touchStartX = useRef(null);
  const obstacleId = useRef(0);
  const animationFrameId = useRef(null);
  const lastTimestamp = useRef(null);
  const lastObstacleTime = useRef(0);

  // Handle arrow keys for desktop
  useEffect(() => {
    if (gameState !== "playing") return;

    function handleKeyDown(e) {
      if (e.key === "ArrowLeft") {
        moveCar(-1);
      } else if (e.key === "ArrowRight") {
        moveCar(1);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [gameState, carPosition.x]);

  // Handle swipe for mobile
  useEffect(() => {
    if (gameState !== "playing") return;

    function handleTouchStart(e) {
      touchStartX.current = e.touches[0].clientX;
    }
    function handleTouchEnd(e) {
      if (touchStartX.current === null) return;
      const touchEndX = e.changedTouches[0].clientX;
      const diff = touchEndX - touchStartX.current;
      if (Math.abs(diff) > 30) {
        if (diff > 0) {
          moveCar(1);
        } else {
          moveCar(-1);
        }
      }
      touchStartX.current = null;
    }
    const gameArea = gameAreaRef.current;
    gameArea.addEventListener("touchstart", handleTouchStart);
    gameArea.addEventListener("touchend", handleTouchEnd);
    return () => {
      gameArea.removeEventListener("touchstart", handleTouchStart);
      gameArea.removeEventListener("touchend", handleTouchEnd);
    };
  }, [gameState, carPosition.x]);

  function moveCar(direction) {
    setCarPosition(prev => ({
      ...prev,
      x: Math.max(0, Math.min(2, prev.x + direction))
    }));
  }

  // Start game
  function startGame() {
    setCarPosition({ x: 1, y: GAME_AREA.height - 80 });
    setObstacles([]);
    setScore(0);
    setGameSpeed(1);
    lastTimestamp.current = null;
    lastObstacleTime.current = 0;
    obstacleId.current = 0;
    setGameState("playing");
  }

  // Restart game after game over
  function restartGame() {
    startGame();
  }

  // Game loop: update obstacles, score, speed
  useEffect(() => {
    if (gameState !== "playing") {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      return;
    }

    function gameLoop(timestamp) {
      if (!lastTimestamp.current) lastTimestamp.current = timestamp;
      const delta = (timestamp - lastTimestamp.current) / 1000; // seconds
      lastTimestamp.current = timestamp;

      // Update score
      setScore(prev => prev + delta);

      // Increase game speed gradually (capped at 3x)
      setGameSpeed(prev => Math.min(3, prev + delta * 0.01));

      // Move obstacles down
      setObstacles(prevObs => {
        const newObs = prevObs
          .map(obs => ({
            ...obs,
            y: obs.y + 150 * gameSpeed * delta // pixels per second
          }))
          .filter(obs => obs.y < GAME_AREA.height + 100); // remove when off screen

        // Add new obstacle with proper spacing (every 1-2 seconds)
        const currentTime = timestamp / 200;
        const timeSinceLastObstacle = currentTime - lastObstacleTime.current;
        const minTimeBetweenObstacles = Math.max(0.8, 2 - gameSpeed * 0.3); // Decreases with speed
        
        if (timeSinceLastObstacle > minTimeBetweenObstacles && Math.random() < 0.8) {
          // Ensure obstacles don't spawn too close to each other
          const newLane = Math.floor(Math.random() * 3);
          const newObstacle = {
            id: obstacleId.current++,
            x: newLane,
            y: -40, // start above screen
            type: OBSTACLE_TYPES[Math.floor(Math.random() * OBSTACLE_TYPES.length)]
          };
          
          // Check if there's enough space above for the new obstacle
          const hasSpace = !newObs.some(obs => 
            obs.x === newLane && obs.y > -100 && obs.y < 50
          );
          
          if (hasSpace) {
            newObs.push(newObstacle);
            lastObstacleTime.current = currentTime;
          }
        }
        
        return newObs;
      });

      animationFrameId.current = requestAnimationFrame(gameLoop);
    }

    animationFrameId.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [gameState, gameSpeed]);

  // Collision detection
  useEffect(() => {
    if (gameState !== "playing") return;

    const carRect = {
      x: carPosition.x * LANE_WIDTH + LANE_WIDTH / 2 - 20,
      y: carPosition.y,
      width: 40,
      height: 60
    };

    for (let obs of obstacles) {
      const obsRect = {
        x: obs.x * LANE_WIDTH + LANE_WIDTH / 2 - 20,
        y: obs.y,
        width: 40,
        height: 40
      };

      // Simple AABB collision detection
      if (carRect.x < obsRect.x + obsRect.width &&
          carRect.x + carRect.width > obsRect.x &&
          carRect.y < obsRect.y + obsRect.height &&
          carRect.y + carRect.height > obsRect.y) {
        
        // Collision detected
        setGameState("gameover");
        if (score > highScore) {
          const newHighScore = Math.floor(score);
          setHighScore(newHighScore);
          localStorage.setItem("highScore", newHighScore.toString());
        }
        break;
      }
    }
  }, [obstacles, carPosition, gameState, score, highScore]);

  return (
    <div className="App">
      {gameState === "start" && (
        <StartScreen onStart={startGame} />
      )}
      {(gameState === "playing" || gameState === "gameover") && (
        <>
          <ScoreBoard score={score} highScore={highScore} />
          <GameArea
            ref={gameAreaRef}
            carPosition={carPosition}
            obstacles={obstacles}
            gameState={gameState}
          />
          {gameState === "gameover" && (
            <GameOverScreen
              score={Math.floor(score)}
              highScore={highScore}
              onRestart={restartGame}
            />
          )}
        </>
      )}
    </div>
  );
}

const StartScreen = ({ onStart }) => {
  return (
    <div className="start-screen">
      <div className="game-background" />
      <div className="start-content">
        <h1>🚗 Race Survival 🚗</h1>
        <div className="demo-scene">
          <div className="demo-road">
            <div className="demo-car">🚗</div>
            <div className="demo-obstacle">🚧</div>
          </div>
        </div>
        <p>Move left/right to avoid obstacles!</p>
        <button className="start-button" onClick={onStart}>
          Start Game
        </button>
      </div>
    </div>
  );
};

const GameOverScreen = ({ score, highScore, onRestart }) => {
  return (
    <div className="gameover-screen">
      <div className="gameover-content">
        <h1>💥 Game Over! 💥</h1>
        <p>Your Score: {score}</p>
        <p>High Score: {highScore}</p>
        <button className="restart-button" onClick={onRestart}>
          🎮 Play Again
        </button>
      </div>
    </div>
  );
};

const ScoreBoard = ({ score, highScore }) => {
  return (
    <div className="scoreboard">
      <div className="high-score">🏆 High: {Math.floor(highScore)}</div>
      <div className="current-score">⏱️ Score: {Math.floor(score)}</div>
    </div>
  );
};

const GameArea = React.forwardRef(({ carPosition, obstacles, gameState }, ref) => {
  return (
    <div className="game-area-container">
      <div className={`game-area ${gameState}`} ref={ref}>
        <Road />
        <Car position={carPosition} />
        {obstacles.map(obs => (
          <Obstacle key={obs.id} position={{ x: obs.x, y: obs.y }} type={obs.type} />
        ))}
        <LaneMarkers />
      </div>
    </div>
  );
});

const Car = ({ position }) => {
  const laneCenter = position.x * LANE_WIDTH + LANE_WIDTH / 2;
  return (
    <div
      className="car"
      style={{
        left: laneCenter - 20,
        top: position.y
      }}
    >
      🚗
    </div>
  );
};

const Obstacle = ({ position, type }) => {
  const laneCenter = position.x * LANE_WIDTH + LANE_WIDTH / 2;
  return (
    <div
      className="obstacle"
      style={{
        left: laneCenter - 20,
        top: position.y
      }}
    >
      {type}
    </div>
  );
};

const Road = () => {
  return (
    <div className="road">
      <div className="road-lines" />
    </div>
  );
};

const LaneMarkers = () => {
  return (
    <>
      <div className="lane-marker left" />
      <div className="lane-marker right" />
    </>
  );
};

export default App;