// Atwood Machine Simulation - The Thinking Experiment
class AtwoodMachine {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        // Logical canvas dimensions
        this.baseWidth = 700;
        this.baseHeight = 600;
        this.setupHiDPI();
        
        this.g = 9.80; // gravitational acceleration (m/s²)
        
        // Physical properties
        this.mass1 = 2.0; // kg (left side)
        this.mass2 = 3.0; // kg (right side)
        this.initialVelocity = 0; // m/s (positive = clockwise = mass2 down, mass1 up)
        this.velocity = 0; // m/s (positive = clockwise rotation)
        this.acceleration = 0; // m/s² (positive = clockwise acceleration)
        this.tension = 0; // N
        
        // Position and animation
        this.position2 = 0; // meters from initial position for mass2 (positive = down)
        this.pixelsPerMeter = 24; // Slower motion for inquiry clarity
        this.time = 0;
        this.dt = 0.008; // smooth simulation step
        
        // Pulley rotation angle for animation
        this.pulleyAngle = 0; // radians
        
        // Animation state
        this.isRunning = false;
        this.animationId = null;
        
        // Visualization options
        this.showForceArrows = true;
        
        // Apparatus geometry
        this.centerX = this.baseWidth / 2;
        this.pulleyY = 110;
        this.pulleyRadius = 42;
        this.ropeLength = 230;
        this.maxRopeTravel = 160; // Max displacement in pixels before soft limit
        
        // Initial positions
        this.mass1InitialY = this.pulleyY + this.ropeLength;
        this.mass2InitialY = this.pulleyY + this.ropeLength;
        
        this.calculate();
        this.draw();
        this.updateDisplay();

        window.addEventListener('resize', () => {
            this.setupHiDPI();
            this.draw();
        });
    }

    setupHiDPI() {
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();
        const displayWidth = rect.width > 0 ? rect.width : this.baseWidth;
        const displayHeight = rect.height > 0 ? rect.height : this.baseHeight;
        
        this.canvas.width = displayWidth * dpr;
        this.canvas.height = displayHeight * dpr;
        this.scaleRatio = displayWidth / this.baseWidth;
        
        this.ctx.setTransform(dpr * this.scaleRatio, 0, 0, dpr * this.scaleRatio, 0, 0);
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';
    }
    
    calculate() {
        const totalMass = this.mass1 + this.mass2;
        if (totalMass > 0) {
            // Clockwise: a = g * (m2 - m1) / (m1 + m2)
            this.acceleration = this.g * (this.mass2 - this.mass1) / totalMass;
            // Tension: FT = 2 * m1 * m2 * g / (m1 + m2)
            this.tension = (2 * this.mass1 * this.mass2 * this.g) / totalMass;
        } else {
            this.acceleration = 0;
            this.tension = 0;
        }
    }
    
    reset() {
        this.position2 = 0;
        this.velocity = this.initialVelocity;
        this.time = 0;
        this.pulleyAngle = 0;
        this.calculate();
        this.draw();
        this.updateDisplay();
    }
    
    start() {
        if (!this.isRunning) {
            this.isRunning = true;
            this.animate();
        }
    }
    
    pause() {
        this.isRunning = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }
    
    animate() {
        if (!this.isRunning) return;
        
        // Update physics
        this.velocity += this.acceleration * this.dt;
        this.position2 += this.velocity * this.dt;
        this.time += this.dt;
        
        // Rotation angle = displacement / radius
        this.pulleyAngle = (this.position2 * this.pixelsPerMeter) / this.pulleyRadius;
        
        // Boundaries (prevent blocks from hitting pulley or bottom edge)
        const maxTravelMeters = this.maxRopeTravel / this.pixelsPerMeter;
        if (Math.abs(this.position2) >= maxTravelMeters) {
            this.position2 = Math.sign(this.position2) * maxTravelMeters;
            this.velocity = 0;
            this.pause();
            if (startBtn && pauseBtn) {
                startBtn.disabled = false;
                pauseBtn.disabled = true;
            }
        }
        
        this.draw();
        this.updateDisplay();
        
        this.animationId = requestAnimationFrame(() => this.animate());
    }
    
    draw() {
        const width = this.baseWidth;
        const height = this.baseHeight;
        const ctx = this.ctx;
        
        // 1. Crisp White Background
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        
        // Subtle blueprint engineering grid
        ctx.strokeStyle = 'rgba(15, 126, 155, 0.04)';
        ctx.lineWidth = 1;
        for (let x = 20; x < width; x += 25) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }
        for (let y = 20; y < height; y += 25) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
        
        // Tangent points on the pulley
        const leftTangentX = this.centerX - this.pulleyRadius;
        const rightTangentX = this.centerX + this.pulleyRadius;
        
        // Block positions
        const mass1X = leftTangentX;
        const mass2X = rightTangentX;
        const displacementPx = this.position2 * this.pixelsPerMeter;
        const mass1Y = this.mass1InitialY - displacementPx;
        const mass2Y = this.mass2InitialY + displacementPx;
        
        // 2. Ceiling Mounting Bracket & Fixture
        this.drawCeilingMount(ctx);
        
        // 3. Braided Cord
        this.drawRope(ctx, mass1X, mass1Y, mass2X, mass2Y, leftTangentX, rightTangentX);
        
        // 4. Low-Friction Pulley Assembly
        this.drawPulley(ctx);
        
        // 5. Mass Blocks
        this.drawMassBlock(ctx, mass1X, mass1Y, this.mass1, '#0f7e9b', 'm₁');
        this.drawMassBlock(ctx, mass2X, mass2Y, this.mass2, '#d67b19', 'm₂');
        
        // 6. Kinematic Vectors beside blocks
        // Velocity (Teal/Emerald #0f7e9b)
        // Acceleration (Amber #d67b19 - NO GOLD!)
        this.drawMotionVectors(ctx, mass1X, mass1Y, -this.velocity, -this.acceleration, true);
        this.drawMotionVectors(ctx, mass2X, mass2Y, this.velocity, this.acceleration, false);
        
        // 7. Free Body Diagram Panels (if enabled)
        if (this.showForceArrows) {
            this.drawFbdPanels(ctx);
        }
    }
    
    drawCeilingMount(ctx) {
        // Ceiling Beam
        ctx.fillStyle = '#eaf4f7';
        ctx.strokeStyle = '#c8dbe3';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.rect(0, 0, this.baseWidth, 42);
        ctx.fill();
        ctx.stroke();
        
        // Metallic mounting plate
        ctx.fillStyle = '#d4e5ed';
        ctx.strokeStyle = '#0f7e9b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(this.centerX - 45, 34, 90, 14, 4);
        ctx.fill();
        ctx.stroke();
        
        // Mounting bolts
        ctx.fillStyle = '#0a5d74';
        ctx.beginPath();
        ctx.arc(this.centerX - 30, 41, 3, 0, Math.PI * 2);
        ctx.arc(this.centerX + 30, 41, 3, 0, Math.PI * 2);
        ctx.fill();
        
        // Support rod down to pulley axle
        ctx.strokeStyle = '#4b6570';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(this.centerX, 48);
        ctx.lineTo(this.centerX, this.pulleyY);
        ctx.stroke();
    }
    
    drawRope(ctx, m1X, m1Y, m2X, m2Y, tan1X, tan2X) {
        ctx.save();
        ctx.strokeStyle = '#4b6570';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        
        // Left strand (to top eyelet of mass 1)
        ctx.beginPath();
        ctx.moveTo(m1X, m1Y - 28);
        ctx.lineTo(tan1X, this.pulleyY);
        ctx.stroke();
        
        // Right strand (to top eyelet of mass 2)
        ctx.beginPath();
        ctx.moveTo(m2X, m2Y - 28);
        ctx.lineTo(tan2X, this.pulleyY);
        ctx.stroke();
        
        // Arc over pulley groove
        ctx.beginPath();
        ctx.arc(this.centerX, this.pulleyY, this.pulleyRadius, Math.PI, 0, false);
        ctx.stroke();
        ctx.restore();
    }
    
    drawPulley(ctx) {
        ctx.save();
        
        // Outer wheel rim
        ctx.beginPath();
        ctx.arc(this.centerX, this.pulleyY, this.pulleyRadius + 3, 0, Math.PI * 2);
        ctx.fillStyle = '#e2edf2';
        ctx.fill();
        ctx.strokeStyle = '#b0c9d4';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Grooved pulley body
        const grad = ctx.createRadialGradient(
            this.centerX - 10, this.pulleyY - 10, 5,
            this.centerX, this.pulleyY, this.pulleyRadius
        );
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.7, '#dceaf0');
        grad.addColorStop(1, '#c0d7e2');
        
        ctx.beginPath();
        ctx.arc(this.centerX, this.pulleyY, this.pulleyRadius, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.strokeStyle = '#0f7e9b';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Rotating spokes
        ctx.save();
        ctx.translate(this.centerX, this.pulleyY);
        ctx.rotate(this.pulleyAngle);
        
        ctx.strokeStyle = '#718894';
        ctx.lineWidth = 2;
        for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI) / 3;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo((this.pulleyRadius - 7) * Math.cos(angle), (this.pulleyRadius - 7) * Math.sin(angle));
            ctx.stroke();
            
            // Precision dot
            ctx.beginPath();
            ctx.arc((this.pulleyRadius - 7) * Math.cos(angle), (this.pulleyRadius - 7) * Math.sin(angle), 2.5, 0, Math.PI * 2);
            ctx.fillStyle = '#0f7e9b';
            ctx.fill();
        }
        
        // Rotation direction arc on pulley
        if (Math.abs(this.velocity) > 0.05) {
            const arcRadius = this.pulleyRadius * 0.55;
            const span = Math.PI * 0.45;
            ctx.strokeStyle = '#d67b19';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            if (this.velocity > 0) {
                ctx.arc(0, 0, arcRadius, -span, span, false);
            } else {
                ctx.arc(0, 0, arcRadius, Math.PI - span, Math.PI + span, false);
            }
            ctx.stroke();
        }
        
        ctx.restore(); // Restore spoke rotation
        
        // Axle Bearing hub (stationary on top)
        ctx.beginPath();
        ctx.arc(this.centerX, this.pulleyY, 9, 0, Math.PI * 2);
        ctx.fillStyle = '#123140';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(this.centerX, this.pulleyY, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        
        ctx.restore();
    }
    
    drawMassBlock(ctx, x, y, mass, color, label) {
        const width = 56;
        const height = 56;
        const radius = 8;
        
        // Eyelet hook on top
        ctx.strokeStyle = '#4b6570';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(x, y - height / 2 - 4, 4, 0, Math.PI * 2);
        ctx.stroke();
        
        // Drop shadow
        ctx.save();
        ctx.shadowColor = 'rgba(15, 126, 155, 0.14)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 4;
        
        // Block body
        ctx.beginPath();
        ctx.roundRect(x - width / 2, y - height / 2, width, height, radius);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.restore();
        
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        
        // Bevel highlight
        ctx.beginPath();
        ctx.roundRect(x - width / 2 + 3, y - height / 2 + 3, width - 6, height / 3, [radius - 2, radius - 2, 0, 0]);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
        ctx.fill();
        
        // Labels
        ctx.fillStyle = '#ffffff';
        ctx.font = "700 15px 'Inter', sans-serif";
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, x, y - 9);
        
        ctx.font = "600 11px 'Inter', sans-serif";
        ctx.fillText(`${mass.toFixed(1)} kg`, x, y + 11);
    }
    
    drawMotionVectors(ctx, x, y, velocity, acceleration, isLeft) {
        const velOffset = isLeft ? -45 : 45;
        const accOffset = isLeft ? -75 : 75;
        const scale = 16;
        
        // Velocity Vector (Solid Teal/Green)
        if (Math.abs(velocity) > 0.05) {
            const vLen = velocity * scale;
            this.drawVectorArrow(ctx, x + velOffset, y, 0, vLen, '#0f7e9b', 'v', false);
        }
        
        // Acceleration Vector (Dashed Amber - STRICTLY NO GOLD)
        if (Math.abs(acceleration) > 0.05) {
            const aLen = acceleration * scale;
            this.drawVectorArrow(ctx, x + accOffset, y, 0, aLen, '#d67b19', 'a', true);
        }
    }
    
    drawVectorArrow(ctx, startX, startY, dx, dy, color, label, isDashed) {
        if (Math.abs(dy) < 4) return;
        
        const endX = startX + dx;
        const endY = startY + dy;
        const dir = dy > 0 ? 1 : -1;
        
        ctx.save();
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = 2.5;
        if (isDashed) {
            ctx.setLineDash([5, 4]);
        }
        
        // Arrow shaft
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Arrow head
        const headSize = 9;
        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(endX - 5, endY - dir * headSize);
        ctx.lineTo(endX + 5, endY - dir * headSize);
        ctx.closePath();
        ctx.fill();
        
        // Badge label
        ctx.font = "700 12px 'Inter', sans-serif";
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const labelY = startY + dy / 2;
        ctx.fillText(label, startX + (startX > this.centerX ? 14 : -14), labelY);
        
        ctx.restore();
    }
    
    drawFbdPanels(ctx) {
        const boxW = 125;
        const boxH = 150;
        const pad = 16;
        
        // Left FBD (m1)
        this.renderFbdCard(ctx, pad, 60, boxW, boxH, this.mass1, 'm₁', '#0f7e9b');
        
        // Right FBD (m2)
        this.renderFbdCard(ctx, this.baseWidth - boxW - pad, 60, boxW, boxH, this.mass2, 'm₂', '#d67b19');
    }
    
    renderFbdCard(ctx, x, y, w, h, mass, label, color) {
        // Card background
        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 10);
        ctx.fill();
        ctx.strokeStyle = '#c8dbe3';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        
        // Title
        ctx.fillStyle = '#123140';
        ctx.font = "700 11px 'Inter', sans-serif";
        ctx.textAlign = 'center';
        ctx.fillText(`Free-Body: ${label}`, x + w / 2, y + 16);
        
        const centerX = x + w / 2;
        const centerY = y + h / 2 + 4;
        
        // Center-of-mass block
        const bSize = 22;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(centerX - bSize / 2, centerY - bSize / 2, bSize, bSize, 4);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        
        ctx.fillStyle = '#ffffff';
        ctx.font = "700 10px 'Inter', sans-serif";
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, centerX, centerY);
        
        // Calculate force lengths
        const gravity = mass * this.g;
        const arrowScale = 1.6;
        const maxLen = 44;
        const gravLen = Math.min(gravity * arrowScale, maxLen);
        const tensLen = Math.min(this.tension * arrowScale, maxLen);
        
        // Tension vector (Upward - Teal)
        this.drawFbdArrow(ctx, centerX, centerY - bSize / 2, 0, -tensLen, '#0f7e9b', `F_T = ${this.tension.toFixed(1)} N`, true);
        
        // Gravity vector (Downward - Amber/Coral)
        this.drawFbdArrow(ctx, centerX, centerY + bSize / 2, 0, gravLen, '#c25e00', `F_g = ${gravity.toFixed(1)} N`, false);
        
        ctx.restore();
    }
    
    drawFbdArrow(ctx, startX, startY, dx, dy, color, labelText, isUp) {
        if (Math.abs(dy) < 3) return;
        
        const endY = startY + dy;
        const dir = isUp ? -1 : 1;
        
        ctx.save();
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = 2.2;
        
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(startX, endY);
        ctx.stroke();
        
        // Head
        const hSize = 7;
        ctx.beginPath();
        ctx.moveTo(startX, endY);
        ctx.lineTo(startX - 4, endY - dir * hSize);
        ctx.lineTo(startX + 4, endY - dir * hSize);
        ctx.closePath();
        ctx.fill();
        
        // Text
        ctx.font = "600 9.5px 'Inter', sans-serif";
        ctx.textAlign = 'center';
        ctx.textBaseline = isUp ? 'bottom' : 'top';
        ctx.fillText(labelText, startX, endY + (isUp ? -3 : 3));
        
        ctx.restore();
    }
    
    updateDisplay() {
        const accelEl = document.getElementById('currentAcceleration');
        const velEl = document.getElementById('currentVelocity');
        const tensEl = document.getElementById('currentTension');
        const timeEl = document.getElementById('currentTime');
        
        if (accelEl) accelEl.textContent = `${this.acceleration >= 0 ? '+' : ''}${this.acceleration.toFixed(2)} m/s²`;
        if (velEl) velEl.textContent = `${this.velocity >= 0 ? '+' : ''}${this.velocity.toFixed(2)} m/s`;
        if (tensEl) tensEl.textContent = `${this.tension.toFixed(2)} N`;
        if (timeEl) timeEl.textContent = `${this.time.toFixed(2)} s`;
    }
    
    setMass1(mass) {
        this.mass1 = Math.max(0.1, Math.min(20, parseFloat(mass) || 0.1));
        this.calculate();
        this.draw();
        this.updateDisplay();
    }
    
    setMass2(mass) {
        this.mass2 = Math.max(0.1, Math.min(20, parseFloat(mass) || 0.1));
        this.calculate();
        this.draw();
        this.updateDisplay();
    }
    
    setInitialVelocity(velocity) {
        this.initialVelocity = Math.max(-5, Math.min(5, parseFloat(velocity) || 0));
        this.velocity = this.initialVelocity;
        this.draw();
        this.updateDisplay();
    }
    
    setShowForceArrows(show) {
        this.showForceArrows = !!show;
        this.draw();
    }
}

// Global initialization
var canvas = document.getElementById('atwoodCanvas');
var simulation = new AtwoodMachine(canvas);

// Controls
var mass1Input = document.getElementById('mass1');
var mass2Input = document.getElementById('mass2');
var velocityInput = document.getElementById('initialVelocity');
var startBtn = document.getElementById('startBtn');
var pauseBtn = document.getElementById('pauseBtn');
var resetBtn = document.getElementById('resetBtn');
var showForceArrowsToggle = document.getElementById('showForceArrows');

var mass1Display = document.getElementById('mass1Display');
var mass2Display = document.getElementById('mass2Display');
var velocityDisplay = document.getElementById('velocityDisplay');

function validateMassInput(input, display) {
    let value = parseFloat(input.value);
    if (isNaN(value) || value < 0.1) value = 0.1;
    if (value > 20) value = 20;
    input.value = value;
    return value;
}

if (mass1Input) {
    mass1Input.addEventListener('input', (e) => {
        const val = validateMassInput(e.target, mass1Display);
        simulation.setMass1(val);
        if (mass1Display) mass1Display.textContent = `${val.toFixed(1)} kg`;
    });
}

if (mass2Input) {
    mass2Input.addEventListener('input', (e) => {
        const val = validateMassInput(e.target, mass2Display);
        simulation.setMass2(val);
        if (mass2Display) mass2Display.textContent = `${val.toFixed(1)} kg`;
    });
}

if (velocityInput) {
    velocityInput.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value) || 0;
        simulation.setInitialVelocity(val);
        if (velocityDisplay) velocityDisplay.textContent = `${val.toFixed(1)} m/s`;
    });
}

if (startBtn) {
    startBtn.addEventListener('click', () => {
        simulation.start();
        startBtn.disabled = true;
        if (pauseBtn) pauseBtn.disabled = false;
    });
}

if (pauseBtn) {
    pauseBtn.addEventListener('click', () => {
        simulation.pause();
        if (startBtn) startBtn.disabled = false;
        pauseBtn.disabled = true;
    });
}

if (resetBtn) {
    resetBtn.addEventListener('click', () => {
        simulation.pause();
        simulation.reset();
        if (startBtn) startBtn.disabled = false;
        if (pauseBtn) pauseBtn.disabled = true;
    });
}

if (showForceArrowsToggle) {
    showForceArrowsToggle.addEventListener('change', (e) => {
        simulation.setShowForceArrows(e.target.checked);
    });
}

// Preset Helper
window.setPreset = function(m1, m2, v0) {
    if (mass1Input) {
        mass1Input.value = m1;
        simulation.setMass1(m1);
        if (mass1Display) mass1Display.textContent = `${m1.toFixed(1)} kg`;
    }
    if (mass2Input) {
        mass2Input.value = m2;
        simulation.setMass2(m2);
        if (mass2Display) mass2Display.textContent = `${m2.toFixed(1)} kg`;
    }
    if (velocityInput) {
        velocityInput.value = v0;
        simulation.setInitialVelocity(v0);
        if (velocityDisplay) velocityDisplay.textContent = `${v0.toFixed(1)} m/s`;
    }
    simulation.reset();
    if (startBtn) startBtn.disabled = false;
    if (pauseBtn) pauseBtn.disabled = true;
};

// Keyboard Shortcuts
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !e.target.matches('input')) {
        e.preventDefault();
        if (simulation.isRunning) {
            if (pauseBtn) pauseBtn.click();
        } else {
            if (startBtn) startBtn.click();
        }
    } else if (e.code === 'KeyR' && !e.target.matches('input')) {
        e.preventDefault();
        if (resetBtn) resetBtn.click();
    }
});

// Tab switching
const tabButtons = document.querySelectorAll('.tab-button');
const tabContents = document.querySelectorAll('.tab-content');

tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        const tabName = button.getAttribute('data-tab');
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));
        button.classList.add('active');
        const targetContent = document.getElementById(`${tabName}-tab`);
        if (targetContent) targetContent.classList.add('active');
    });
});
