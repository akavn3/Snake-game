// Get canvas and context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Create audio element for sad trombone
const sadTromboneBase64 = 'SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAAFbgCenp6enp6enp6enp6enp6enp6enp6enp6enp6enp6enp6enp6e//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAYAAAAAAAAABW7qdZvxAAAAAAAAAAAAAAAAAAAA';
const sadTromboneSound = new Audio('data:audio/mp3;base64,' + sadTromboneBase64);
sadTromboneSound.volume = 0.5;

// Add a click event listener to enable audio
document.addEventListener('click', function() {
    // Create and play a silent sound to enable audio
    const silentSound = new Audio('data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAAFbgCenp6enp6enp6enp6enp6enp6enp6enp6enp6enp6enp6enp6e//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAYAAAAAAAAABW7qdZvxAAAAAAAAAAAAAAAAAAAA');
    silentSound.play().catch(() => {});
}, { once: true });

// Game constants
const gridSize = 20;
const canvasWidth = 400;
const canvasHeight = 400;
const maxTilesX = Math.floor(canvasWidth / gridSize);
const maxTilesY = Math.floor(canvasHeight / gridSize);

// Rainbow effect variables
let isRainbowSnake = false;
let rainbowTimeout;
let backgroundHue = 0;
let isRainbowBackground = false;

// Game variables
let snake = [
    { x: 10, y: 10 },
    { x: 9, y: 10 },
    { x: 8, y: 10 }  // Start with 3 segments
];
let food = { x: 15, y: 15 };
let dx = 1;  // Start moving right
let dy = 0;
let score = 0;
let highScore = localStorage.getItem('snakeHighScore') || 0;
let gameOver = false;
let gameLoop;
let fireworks = [];
let fireworksLoop;

// Touch controls
let touchStartX = 0;
let touchStartY = 0;
const minSwipeDistance = 30;  // Minimum distance for a swipe to be registered

// Sound setup
const enableSoundButton = document.getElementById('enableSound');
let soundEnabled = false;

enableSoundButton.addEventListener('click', function() {
    soundEnabled = true;
    enableSoundButton.style.display = 'none';
    // Play a silent sound to enable audio context
    sadTromboneSound.play().catch(() => {}).then(() => {
        sadTromboneSound.pause();
        sadTromboneSound.currentTime = 0;
    });
});

// Firework class
class Firework {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.particles = [];
        this.hue = Math.random() * 360;
        this.exploded = false;
        
        // Create particles
        for (let i = 0; i < 50; i++) {
            const angle = (Math.PI * 2 / 50) * i;
            const velocity = 2 + Math.random() * 2;
            this.particles.push({
                x: 0,
                y: 0,
                vx: Math.cos(angle) * velocity,
                vy: Math.sin(angle) * velocity,
                alpha: 1,
                size: 2 + Math.random() * 2
            });
        }
    }

    update() {
        if (!this.exploded) {
            this.exploded = true;
        }

        for (let particle of this.particles) {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.vy += 0.05; // gravity
            particle.alpha *= 0.98; // fade out
        }

        return this.particles[0].alpha > 0.1;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        for (let particle of this.particles) {
            ctx.globalAlpha = particle.alpha;
            ctx.fillStyle = `hsl(${this.hue}, 100%, 60%)`;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }
}

// Initialize game
function startGame() {
    // Reset game state
    snake = [
        { x: 10, y: 10 },
        { x: 9, y: 10 },
        { x: 8, y: 10 }
    ];
    food = generateFood();
    dx = 1;
    dy = 0;
    score = 0;
    gameOver = false;
    isRainbowSnake = false;
    isRainbowBackground = false;
    document.body.style.background = 'linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)';
    updateScore();
    updateHighScore();
    
    // Stop any playing sound
    sadTromboneSound.pause();
    sadTromboneSound.currentTime = 0;
    
    if (gameLoop) clearInterval(gameLoop);
    gameLoop = setInterval(update, 100);
}

// Generate random food position
function generateFood() {
    // Generate food position ensuring it's within bounds
    let foodX, foodY;
    do {
        foodX = Math.floor(Math.random() * maxTilesX);
        foodY = Math.floor(Math.random() * maxTilesY);
        // Make sure food doesn't appear on snake
    } while (snake.some(segment => segment.x === foodX && segment.y === foodY));
    
    return { x: foodX, y: foodY };
}

// Update game state
function update() {
    if (gameOver) {
        // Play sad trombone sound only once when game ends
        if (!gameOver.soundPlayed && soundEnabled) {
            sadTromboneSound.play().catch(() => {});
            gameOver.soundPlayed = true;
        }

        // Draw game over screen with blur effect
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        
        // Draw glowing game over text
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.font = "bold 48px 'Press Start 2P'";
        ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
        ctx.shadowBlur = 10;
        ctx.fillText('GAME OVER', canvasWidth / 2, canvasHeight / 2 - 50);
        
        ctx.font = "24px 'Press Start 2P'";
        ctx.fillText(`Score: ${score}`, canvasWidth / 2, canvasHeight / 2);
        
        // Add high score display
        ctx.font = "16px 'Press Start 2P'";
        if (score >= highScore) {
            ctx.fillStyle = '#ffd700'; // Gold color for new high score
            ctx.fillText('New Best Score!', canvasWidth / 2, canvasHeight / 2 + 30);
        } else {
            ctx.fillText(`Best: ${highScore}`, canvasWidth / 2, canvasHeight / 2 + 30);
        }
        
        // Blinking restart text for both desktop and mobile
        if (Math.floor(Date.now() / 500) % 2) {
            ctx.font = "16px 'Press Start 2P'";
            const restartText = /Mobile|Android|iPhone/i.test(navigator.userAgent) 
                ? 'Tap to Restart'
                : 'Press Enter to Restart';
            ctx.fillText(restartText, canvasWidth / 2, canvasHeight / 2 + 70);
        }
        
        ctx.shadowBlur = 0;
        return;
    }

    // Move snake
    const head = { x: snake[0].x + dx, y: snake[0].y + dy };
    
    // Check boundaries before adding new head
    if (head.x < 0 || head.x >= maxTilesX || head.y < 0 || head.y >= maxTilesY) {
        gameOver = true;
        gameOver.soundPlayed = false;
        return;
    }

    snake.unshift(head);

    // Check for self collision
    if (snake.slice(1).some(segment => segment.x === head.x && segment.y === head.y)) {
        gameOver = true;
        gameOver.soundPlayed = false;
        return;
    }

    // Check if food eaten
    if (head.x === food.x && head.y === food.y) {
        score += 10;
        updateScore();
        food = generateFood();
        
        // Activate rainbow snake effect
        isRainbowSnake = true;
        clearTimeout(rainbowTimeout);
        rainbowTimeout = setTimeout(() => {
            isRainbowSnake = false;
        }, 3000);

        // Check if score is multiple of 50 for rainbow background
        if (score % 50 === 0) {
            isRainbowBackground = true;
            setTimeout(() => {
                isRainbowBackground = false;
                document.body.style.background = 'linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)';
            }, 5000);
        }
    } else {
        snake.pop();
    }

    // Update rainbow background if active
    if (isRainbowBackground) {
        backgroundHue = (backgroundHue + 1) % 360;
        document.body.style.background = `linear-gradient(135deg, 
            hsl(${backgroundHue}, 70%, 20%) 0%, 
            hsl(${(backgroundHue + 30) % 360}, 70%, 30%) 100%)`;
    }

    // Clear canvas with a subtle gradient
    const gradient = ctx.createLinearGradient(0, 0, canvasWidth, canvasHeight);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0.3)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Update and draw fireworks
    if (fireworks.length > 0) {
        fireworks = fireworks.filter(firework => {
            const alive = firework.update();
            if (alive) {
                firework.draw(ctx);
            }
            return alive;
        });
    }

    // Draw subtle grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i < maxTilesX; i++) {
        for (let j = 0; j < maxTilesY; j++) {
            ctx.strokeRect(i * gridSize, j * gridSize, gridSize, gridSize);
        }
    }

    // Draw food with glow effect
    ctx.shadowColor = 'rgba(255, 0, 0, 0.5)';
    ctx.shadowBlur = 15;
    ctx.fillStyle = '#ff3333';
    ctx.beginPath();
    const foodCenterX = (food.x * gridSize) + (gridSize / 2);
    const foodCenterY = (food.y * gridSize) + (gridSize / 2);
    ctx.arc(foodCenterX, foodCenterY, gridSize / 2 - 2, 0, Math.PI * 2);
    ctx.fill();

    // Reset shadow for snake
    ctx.shadowBlur = 0;

    // Draw snake with enhanced effects
    snake.forEach((segment, index) => {
        const x = segment.x * gridSize;
        const y = segment.y * gridSize;
        const size = gridSize - 2;

        if (isRainbowSnake) {
            // Rainbow effect with more vibrant colors
            const hue = (Date.now() / 10 + index * 15) % 360;
            ctx.fillStyle = `hsl(${hue}, 100%, 60%)`;
            ctx.strokeStyle = `hsl(${hue}, 100%, 40%)`;
        } else {
            // Normal colors with head/body distinction
            if (index === 0) {
                ctx.fillStyle = '#00ff00';  // Bright green for head
                ctx.strokeStyle = '#008800';
            } else {
                ctx.fillStyle = '#00dd00';  // Slightly darker for body
                ctx.strokeStyle = '#006600';
            }
        }

        // Draw rounded rectangle for each segment
        ctx.beginPath();
        ctx.roundRect(x, y, size, size, 5);
        ctx.fill();
        ctx.stroke();

        // Add eyes to the head
        if (index === 0) {
            ctx.fillStyle = 'white';
            const eyeSize = 3;
            const eyeOffset = 4;
            
            // Position eyes based on direction
            if (dx === 1) { // Right
                ctx.fillRect(x + size - eyeOffset, y + eyeOffset, eyeSize, eyeSize);
                ctx.fillRect(x + size - eyeOffset, y + size - eyeOffset * 2, eyeSize, eyeSize);
            } else if (dx === -1) { // Left
                ctx.fillRect(x + eyeOffset - 1, y + eyeOffset, eyeSize, eyeSize);
                ctx.fillRect(x + eyeOffset - 1, y + size - eyeOffset * 2, eyeSize, eyeSize);
            } else if (dy === -1) { // Up
                ctx.fillRect(x + eyeOffset, y + eyeOffset - 1, eyeSize, eyeSize);
                ctx.fillRect(x + size - eyeOffset * 2, y + eyeOffset - 1, eyeSize, eyeSize);
            } else { // Down
                ctx.fillRect(x + eyeOffset, y + size - eyeOffset, eyeSize, eyeSize);
                ctx.fillRect(x + size - eyeOffset * 2, y + size - eyeOffset, eyeSize, eyeSize);
            }
        }
    });
}

// Update score display
function updateScore() {
    document.getElementById('score').textContent = 'Score: ' + score;
    // Check for new high score
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('snakeHighScore', highScore);
        updateHighScore();
        
        // Add visual feedback for new high score
        if (!gameOver) {
            const highScoreElement = document.getElementById('highScore');
            highScoreElement.style.transform = 'scale(1.2)';
            highScoreElement.style.transition = 'transform 0.3s ease';
            setTimeout(() => {
                highScoreElement.style.transform = 'scale(1)';
            }, 300);

            // Start fireworks
            startFireworks();
        }
    }
}

// Update high score display
function updateHighScore() {
    document.getElementById('highScore').textContent = 'Best: ' + highScore;
}

// Start fireworks animation
function startFireworks() {
    if (fireworksLoop) clearInterval(fireworksLoop);
    fireworks = [];
    let fireworkCount = 0;
    
    fireworksLoop = setInterval(() => {
        if (fireworkCount >= 5) {
            clearInterval(fireworksLoop);
            return;
        }
        
        fireworks.push(new Firework(
            Math.random() * canvasWidth,
            Math.random() * (canvasHeight / 2) + canvasHeight / 4
        ));
        fireworkCount++;
    }, 300);
}

// Handle keyboard input
document.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && gameOver) {
        startGame();
        return;
    }

    switch (event.key) {
        case 'ArrowUp':
            if (dy !== 1) { dx = 0; dy = -1; }
            break;
        case 'ArrowDown':
            if (dy !== -1) { dx = 0; dy = 1; }
            break;
        case 'ArrowLeft':
            if (dx !== 1) { dx = -1; dy = 0; }
            break;
        case 'ArrowRight':
            if (dx !== -1) { dx = 1; dy = 0; }
            break;
    }
});

// Add touch event listeners
canvas.addEventListener('touchstart', handleTouchStart, false);
canvas.addEventListener('touchmove', handleTouchMove, false);
canvas.addEventListener('touchend', handleTouchEnd, false);

function handleTouchStart(event) {
    event.preventDefault();
    touchStartX = event.touches[0].clientX;
    touchStartY = event.touches[0].clientY;
}

function handleTouchEnd(event) {
    if (gameOver) {
        event.preventDefault();
        startGame();
        return;
    }
}

function handleTouchMove(event) {
    if (gameOver) return;  // Don't handle swipes when game is over
    if (!touchStartX || !touchStartY) return;

    event.preventDefault();
    
    const touchEndX = event.touches[0].clientX;
    const touchEndY = event.touches[0].clientY;

    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;

    // Determine if the swipe was primarily horizontal or vertical
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // Horizontal swipe
        if (Math.abs(deltaX) >= minSwipeDistance) {
            if (deltaX > 0 && dx !== -1) {
                // Swipe right
                dx = 1;
                dy = 0;
            } else if (deltaX < 0 && dx !== 1) {
                // Swipe left
                dx = -1;
                dy = 0;
            }
        }
    } else {
        // Vertical swipe
        if (Math.abs(deltaY) >= minSwipeDistance) {
            if (deltaY > 0 && dy !== -1) {
                // Swipe down
                dx = 0;
                dy = 1;
            } else if (deltaY < 0 && dy !== 1) {
                // Swipe up
                dx = 0;
                dy = -1;
            }
        }
    }

    // Reset touch start coordinates
    touchStartX = touchEndX;
    touchStartY = touchEndY;
}

// Prevent scrolling when touching the canvas
document.body.addEventListener('touchmove', function(e) {
    if (e.target === canvas) {
        e.preventDefault();
    }
}, { passive: false });

// Start the game when the page loads
window.onload = startGame; 