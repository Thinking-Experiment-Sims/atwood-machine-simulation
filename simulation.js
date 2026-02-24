// Atwood Machine Simulation
class AtwoodMachine {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        // Scale canvas for high DPI displays (sharper rendering)
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        this.ctx.scale(dpr, dpr);
        
        // Store CSS dimensions for calculations
        this.canvasWidth = rect.width;
        this.canvasHeight = rect.height;
        
        // Use CSS size for layout
        canvas.style.width = rect.width + 'px';
        canvas.style.height = rect.height + 'px';
        
        // Enable anti-aliasing for smoother lines
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';
        
        this.g = 9.8; // gravitational acceleration (m/s²)
        
        // Physical properties
        this.mass1 = 2; // kg (left side)
        this.mass2 = 3; // kg (right side)
        this.initialVelocity = 0; // m/s (positive = clockwise = mass2 down, mass1 up)
        this.velocity = 0; // m/s (positive = clockwise rotation)
        this.acceleration = 0; // m/s² (positive = clockwise acceleration)
        this.tension = 0; // N
        
        // Position and animation
        this.position2 = 0; // meters from initial position for mass2 (positive = down)
        this.pixelsPerMeter = 25; // Slower motion for clarity
        this.time = 0;
        this.dt = 0.008; // ~120 FPS, but slower per frame
        
        // Pulley rotation angle for animation
        this.pulleyAngle = 0; // radians
        
        // Animation state
        this.isRunning = false;
        this.animationId = null;
        
        // Visualization options
        this.showForceArrows = true;
        
        // Canvas dimensions
        this.centerX = this.canvasWidth / 2;
        this.pulleyY = 100;
        this.pulleyRadius = 38;
        this.ropeLength = 240;
        this.maxRopeLength = 175; // Maximum rope extension (blocks stop well before touching pulley - needs 38+25=63px clearance)
        
        // Initial positions
        this.mass1InitialY = this.pulleyY + this.ropeLength;
        this.mass2InitialY = this.pulleyY + this.ropeLength;
        
        this.calculate();
        this.draw();
        
        // Initialize force diagrams visibility
        const forceDiagrams = document.getElementById('forceDiagrams');
        if (forceDiagrams && this.showForceArrows) {
            forceDiagrams.classList.remove('hidden');
        }
    }
    
    calculate() {
        // Calculate acceleration: a = g(m2-m1)/(m1+m2)
        this.acceleration = this.g * (this.mass2 - this.mass1) / (this.mass1 + this.mass2);
        
        // Calculate tension: T = 2*m1*m2*g/(m1+m2)
        this.tension = (2 * this.mass1 * this.mass2 * this.g) / (this.mass1 + this.mass2);
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
        
        // Update physics (positive velocity = clockwise = mass2 down)
        this.velocity += this.acceleration * this.dt;
        this.position2 += this.velocity * this.dt;
        this.time += this.dt;
        
        // Update pulley rotation angle based on rope movement
        // Rotation angle = arc length / radius = position / radius
        this.pulleyAngle = (this.position2 * this.pixelsPerMeter) / this.pulleyRadius;
        
        // Check boundaries (prevent masses from going off screen or touching pulley)
        const maxPosition = this.maxRopeLength / this.pixelsPerMeter; // Bottom boundary
        const minPosition = -this.maxRopeLength / this.pixelsPerMeter; // Top boundary (prevent touching pulley)
        
        if (this.position2 > maxPosition || this.position2 < minPosition) {
            this.pause();
        }
        
        this.draw();
        this.updateDisplay();
        
        this.animationId = requestAnimationFrame(() => this.animate());
    }
    
    draw() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Tangent points on the pulley (left and right edges)
        const leftTangentX = this.centerX - this.pulleyRadius;
        const rightTangentX = this.centerX + this.pulleyRadius;
        
        // Masses are directly below their respective tangent points
        const mass1X = leftTangentX;
        const mass2X = rightTangentX;
        
        // Calculate current positions (positive position2 = mass2 down, mass1 up)
        const mass1Y = this.mass1InitialY - this.position2 * this.pixelsPerMeter;
        const mass2Y = this.mass2InitialY + this.position2 * this.pixelsPerMeter;
        
        // Draw ceiling
        this.ctx.strokeStyle = '#495057';
        this.ctx.lineWidth = 6;
        this.ctx.beginPath();
        this.ctx.moveTo(0, 50);
        this.ctx.lineTo(this.canvas.width, 50);
        this.ctx.stroke();
        
        // Draw pulley support
        this.ctx.strokeStyle = '#495057';
        this.ctx.lineWidth = 4;
        this.ctx.beginPath();
        this.ctx.moveTo(this.centerX, 50);
        this.ctx.lineTo(this.centerX, this.pulleyY - this.pulleyRadius);
        this.ctx.stroke();
        
        // Draw pulley with rotation
        this.ctx.save(); // Save context state
        
        // Draw pulley body
        this.ctx.beginPath();
        this.ctx.arc(this.centerX, this.pulleyY, this.pulleyRadius, 0, Math.PI * 2);
        this.ctx.fillStyle = '#adb5bd';
        this.ctx.fill();
        this.ctx.strokeStyle = '#495057';
        this.ctx.lineWidth = 3;
        this.ctx.stroke();
        
        // Draw rotation indicators (spokes that rotate)
        this.ctx.translate(this.centerX, this.pulleyY);
        this.ctx.rotate(this.pulleyAngle);
        
        // Draw 6 spokes
        for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI) / 3;
            this.ctx.save();
            this.ctx.rotate(angle);
            
            // Spoke line
            this.ctx.strokeStyle = '#6c757d';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(0, 0);
            this.ctx.lineTo(this.pulleyRadius - 8, 0);
            this.ctx.stroke();
            
            // Dot at end of spoke
            this.ctx.beginPath();
            this.ctx.arc(this.pulleyRadius - 8, 0, 3, 0, Math.PI * 2);
            this.ctx.fillStyle = '#495057';
            this.ctx.fill();
            
            this.ctx.restore();
        }
        
        // Draw direction arrow on pulley (shows current rotation direction)
        if (Math.abs(this.velocity) > 0.05) {
            const arrowRadius = this.pulleyRadius * 0.6;
            const arrowAngle = Math.PI * 0.4;
            
            this.ctx.strokeStyle = this.velocity > 0 ? '#28a745' : '#e74c3c';
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            
            // Draw arc showing direction
            if (this.velocity > 0) {
                // Clockwise arrow (top right to bottom right)
                this.ctx.arc(0, 0, arrowRadius, -arrowAngle, arrowAngle, false);
            } else {
                // Counterclockwise arrow (top left to bottom left)
                this.ctx.arc(0, 0, arrowRadius, Math.PI - arrowAngle, Math.PI + arrowAngle, false);
            }
            this.ctx.stroke();
            
            // Draw arrowhead
            const endAngle = this.velocity > 0 ? arrowAngle : Math.PI + arrowAngle;
            const headX = arrowRadius * Math.cos(endAngle);
            const headY = arrowRadius * Math.sin(endAngle);
            const headAngle = endAngle + (this.velocity > 0 ? Math.PI / 2 : -Math.PI / 2);
            
            this.ctx.fillStyle = this.velocity > 0 ? '#28a745' : '#e74c3c';
            this.ctx.beginPath();
            this.ctx.moveTo(headX, headY);
            this.ctx.lineTo(
                headX + 8 * Math.cos(headAngle + 0.3),
                headY + 8 * Math.sin(headAngle + 0.3)
            );
            this.ctx.lineTo(
                headX + 8 * Math.cos(headAngle - 0.3),
                headY + 8 * Math.sin(headAngle - 0.3)
            );
            this.ctx.closePath();
            this.ctx.fill();
        }
        
        this.ctx.restore(); // Restore context state
        
        // Draw pulley center (on top of spokes)
        this.ctx.beginPath();
        this.ctx.arc(this.centerX, this.pulleyY, 8, 0, Math.PI * 2);
        this.ctx.fillStyle = '#495057';
        this.ctx.fill();
        
        // Draw ropes (straight down from tangent points)
        this.ctx.strokeStyle = '#6c757d';
        this.ctx.lineWidth = 3;
        
        // Left rope - straight vertical line from mass to tangent point
        this.ctx.beginPath();
        this.ctx.moveTo(mass1X, mass1Y - 25);
        this.ctx.lineTo(leftTangentX, this.pulleyY);
        this.ctx.stroke();
        
        // Right rope - straight vertical line from mass to tangent point
        this.ctx.beginPath();
        this.ctx.moveTo(mass2X, mass2Y - 25);
        this.ctx.lineTo(rightTangentX, this.pulleyY);
        this.ctx.stroke();
        
        // Draw rope arc over pulley (semicircle over the top)
        this.ctx.beginPath();
        this.ctx.arc(this.centerX, this.pulleyY, this.pulleyRadius, Math.PI, 0, false);
        this.ctx.stroke();
        
        // Draw masses
        this.drawMass(mass1X, mass1Y, this.mass1, '#2fa4e7', 'm₁');
        this.drawMass(mass2X, mass2Y, this.mass2, '#e74c3c', 'm₂');
        
        // Draw velocity and acceleration arrows BESIDE each mass
        // Draw velocity and acceleration arrows BESIDE each mass
        // Left mass (m1) - velocity is positive when m1 goes UP (opposite of position2)
        this.drawVelocityArrow(mass1X - 50, mass1Y, -this.velocity, '#28a745', 'v');
        this.drawAccelerationArrow(mass1X - 90, mass1Y, -this.acceleration, '#ffc107', 'a');
        
        // Right mass (m2) - velocity is positive when m2 goes DOWN (same as position2)
        this.drawVelocityArrow(mass2X + 50, mass2Y, this.velocity, '#28a745', 'v');
        this.drawAccelerationArrow(mass2X + 90, mass2Y, this.acceleration, '#ffc107', 'a');
        
        // Draw force arrows if enabled
        if (this.showForceArrows) {
            this.drawForceArrowsInBoxes();
        }
        
        // Draw labels
        this.drawLabels();
    }
    
    drawForceArrowsInBoxes() {
        // Draw force diagrams in separate canvases
        const canvas1 = document.getElementById('forceCanvas1');
        const canvas2 = document.getElementById('forceCanvas2');
        
        if (canvas1 && canvas2) {
            this.drawForceDiagram(canvas1, this.mass1, this.tension, 'm₁');
            this.drawForceDiagram(canvas2, this.mass2, this.tension, 'm₂');
        }
    }
    
    drawForceDiagram(canvas, mass, tension, label) {
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        // Clear canvas
        ctx.clearRect(0, 0, width, height);
        
        const centerX = width / 2;
        const centerY = height / 2;
        const boxSize = 30;
        const arrowScale = 2.5;
        const maxArrowLength = 60;
        
        // Draw mass box
        ctx.fillStyle = label === 'm₁' ? '#2fa4e7' : '#e74c3c';
        ctx.fillRect(centerX - boxSize/2, centerY - boxSize/2, boxSize, boxSize);
        ctx.strokeStyle = '#495057';
        ctx.lineWidth = 2;
        ctx.strokeRect(centerX - boxSize/2, centerY - boxSize/2, boxSize, boxSize);
        
        // Draw label on box
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, centerX, centerY);
        
        // Calculate arrow lengths
        const gravity = mass * this.g;
        const gravityLength = Math.min(gravity * arrowScale, maxArrowLength);
        const tensionLength = Math.min(tension * arrowScale, maxArrowLength);
        
        // Draw gravity arrow (downward)
        this.drawForceArrowInDiagram(ctx, centerX, centerY + boxSize/2, 0, gravityLength, '#e74c3c', `Fg = ${gravity.toFixed(1)} N`, 'down');
        
        // Draw tension arrow (upward)
        this.drawForceArrowInDiagram(ctx, centerX, centerY - boxSize/2, 0, -tensionLength, '#3498db', `T = ${tension.toFixed(1)} N`, 'up');
    }
    
    drawForceArrowInDiagram(ctx, x, y, dx, dy, color, label, direction) {
        if (Math.abs(dy) < 2) return;
        
        ctx.save();
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = 2.5;
        
        // Draw arrow line
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + dx, y + dy);
        ctx.stroke();
        
        // Draw arrowhead
        const angle = Math.atan2(dy, dx);
        const headLength = 8;
        ctx.beginPath();
        ctx.moveTo(x + dx, y + dy);
        ctx.lineTo(
            x + dx - headLength * Math.cos(angle - Math.PI / 6),
            y + dy - headLength * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
            x + dx - headLength * Math.cos(angle + Math.PI / 6),
            y + dy - headLength * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fill();
        
        // Draw label beside arrow
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'left';
        ctx.fillStyle = color;
        ctx.fillText(label, x + 5, y + dy / 2 + (direction === 'down' ? 5 : -5));
        
        ctx.restore();
    }
    
    drawVelocityArrow(x, y, velocity, color, label) {
        if (Math.abs(velocity) < 0.05) return;
        const scale = 20; // pixels per m/s
        const arrowLength = velocity * scale;
        const startY = y;
        const endY = y + arrowLength;
        const arrowX = x;
        
        // Double arrow shaft (vertical lines)
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 4;
        this.ctx.beginPath();
        this.ctx.moveTo(arrowX - 6, startY);
        this.ctx.lineTo(arrowX - 6, endY);
        this.ctx.moveTo(arrowX + 6, startY);
        this.ctx.lineTo(arrowX + 6, endY);
        this.ctx.stroke();
        
        // Arrow heads
        const headSize = 12;
        const direction = arrowLength > 0 ? 1 : -1;
        this.ctx.fillStyle = color;
        
        // Left arrow head
        this.ctx.beginPath();
        this.ctx.moveTo(arrowX - 6, endY);
        this.ctx.lineTo(arrowX - 6 - headSize/2, endY - direction * headSize);
        this.ctx.lineTo(arrowX - 6 + headSize/2, endY - direction * headSize);
        this.ctx.closePath();
        this.ctx.fill();
        
        // Right arrow head
        this.ctx.beginPath();
        this.ctx.moveTo(arrowX + 6, endY);
        this.ctx.lineTo(arrowX + 6 - headSize/2, endY - direction * headSize);
        this.ctx.lineTo(arrowX + 6 + headSize/2, endY - direction * headSize);
        this.ctx.closePath();
        this.ctx.fill();
        
        // Just the label, no numbers
        this.ctx.fillStyle = color;
        this.ctx.font = 'bold 16px Arial';
        this.ctx.textAlign = 'center';
        const labelY = startY + (endY - startY)/2;
        this.ctx.fillText(label, arrowX + 25, labelY);
    }
    
    drawAccelerationArrow(x, y, acceleration, color, label) {
        if (Math.abs(acceleration) < 0.01) return;
        const scale = 20; // pixels per m/s²
        const arrowLength = acceleration * scale;
        const startY = y;
        const endY = y + arrowLength;
        const arrowX = x;
        
        // Double dashed arrow shaft (vertical lines)
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 3;
        this.ctx.setLineDash([7, 5]);
        this.ctx.beginPath();
        this.ctx.moveTo(arrowX - 5, startY);
        this.ctx.lineTo(arrowX - 5, endY);
        this.ctx.moveTo(arrowX + 5, startY);
        this.ctx.lineTo(arrowX + 5, endY);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
        
        // Arrow heads
        const headSize = 10;
        const direction = arrowLength > 0 ? 1 : -1;
        this.ctx.fillStyle = color;
        
        // Left arrow head
        this.ctx.beginPath();
        this.ctx.moveTo(arrowX - 5, endY);
        this.ctx.lineTo(arrowX - 5 - headSize/2, endY - direction * headSize);
        this.ctx.lineTo(arrowX - 5 + headSize/2, endY - direction * headSize);
        this.ctx.closePath();
        this.ctx.fill();
        
        // Right arrow head
        this.ctx.beginPath();
        this.ctx.moveTo(arrowX + 5, endY);
        this.ctx.lineTo(arrowX + 5 - headSize/2, endY - direction * headSize);
        this.ctx.lineTo(arrowX + 5 + headSize/2, endY - direction * headSize);
        this.ctx.closePath();
        this.ctx.fill();
        
        // Just the label, no numbers
        this.ctx.fillStyle = color;
        this.ctx.font = 'bold 16px Arial';
        this.ctx.textAlign = 'center';
        const labelY = startY + (endY - startY)/2;
        this.ctx.fillText(label, arrowX + 25, labelY);
    }
    
    drawMass(x, y, mass, color, label) {
        const width = 50;
        const height = 50;
        
        // Draw mass box
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x - width/2, y - height/2, width, height);
        this.ctx.strokeStyle = '#2c3e50';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(x - width/2, y - height/2, width, height);
        
        // Draw mass label
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(label, x, y - 8);
        this.ctx.font = '12px Arial';
                this.ctx.fillText(mass.toFixed(1) + ' kg', x, y + 8);
    }
    
    drawForceArrowsInBoxes() {
        // Draw force diagrams directly on the canvas in the upper corners
        const boxWidth = 110;
        const boxHeight = 140;
        const padding = 15;
        
        // Left box position (Mass 1)
        const leftBoxX = padding;
        const leftBoxY = 150;
        this.drawForceBoxOnCanvas(leftBoxX, leftBoxY, boxWidth, boxHeight, this.mass1, 'm₁');
        
        // Right box position (Mass 2)
        const rightBoxX = this.canvasWidth - boxWidth - padding;
        const rightBoxY = 150;
        this.drawForceBoxOnCanvas(rightBoxX, rightBoxY, boxWidth, boxHeight, this.mass2, 'm₂');
    }
    
    drawForceBoxOnCanvas(boxX, boxY, boxWidth, boxHeight, mass, label) {
        const ctx = this.ctx;
        const centerX = boxX + boxWidth / 2;
        const centerY = boxY + boxHeight / 2;
        
        // Draw box background
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
        
        // Draw box border
        ctx.strokeStyle = '#2fa4e7';
        ctx.lineWidth = 2;
        ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);
        
        // Draw title
        ctx.fillStyle = '#2c3e50';
        ctx.font = 'bold 11px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${label} Forces`, centerX, boxY + 12);
        
        // Calculate forces
        const gravity = mass * this.g;
        const arrowScale = 2.5;
        const gravityLength = Math.min(gravity * arrowScale, 40);
        const tensionLength = Math.min(this.tension * arrowScale, 40);
        
        // Draw mass box (center of mass)
        const massBoxSize = 20;
        ctx.fillStyle = label === 'm₁' ? '#2fa4e7' : '#e74c3c';
        ctx.fillRect(centerX - massBoxSize/2, centerY - massBoxSize/2, massBoxSize, massBoxSize);
        ctx.strokeStyle = '#2c3e50';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(centerX - massBoxSize/2, centerY - massBoxSize/2, massBoxSize, massBoxSize);
        
        // Draw mass label
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px Arial';
        ctx.fillText(label, centerX, centerY + 3);
        
        // Draw gravity arrow (downward - red)
        ctx.strokeStyle = '#e74c3c';
        ctx.fillStyle = '#e74c3c';
        ctx.lineWidth = 2.5;
        
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(centerX, centerY + gravityLength);
        ctx.stroke();
        
        // Arrow head
        ctx.beginPath();
        ctx.moveTo(centerX, centerY + gravityLength);
        ctx.lineTo(centerX - 5, centerY + gravityLength - 8);
        ctx.lineTo(centerX + 5, centerY + gravityLength - 8);
        ctx.closePath();
        ctx.fill();
        
        // Label for gravity
        ctx.fillStyle = '#2c3e50';
        ctx.font = 'bold 9px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`${label}g`, centerX + 8, centerY + gravityLength / 2 - 3);
        ctx.font = '9px Arial';
        ctx.fillText(`${gravity.toFixed(1)}N`, centerX + 8, centerY + gravityLength / 2 + 8);
        
        // Draw tension arrow (upward - blue)
        ctx.strokeStyle = '#3498db';
        ctx.fillStyle = '#3498db';
        ctx.lineWidth = 2.5;
        
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(centerX, centerY - tensionLength);
        ctx.stroke();
        
        // Arrow head
        ctx.beginPath();
        ctx.moveTo(centerX, centerY - tensionLength);
        ctx.lineTo(centerX - 5, centerY - tensionLength + 8);
        ctx.lineTo(centerX + 5, centerY - tensionLength + 8);
        ctx.closePath();
        ctx.fill();
        
        // Label for tension
        ctx.fillStyle = '#2c3e50';
        ctx.font = 'bold 9px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('T', centerX + 8, centerY - tensionLength / 2 - 3);
        ctx.font = '9px Arial';
        ctx.fillText(`${this.tension.toFixed(1)}N`, centerX + 8, centerY - tensionLength / 2 + 8);
    }
    
    drawForceArrows(mass1X, mass1Y, mass2X, mass2Y) {
        const arrowScale = 5; // pixels per Newton
        const maxArrowLength = 80;
        
        // Calculate force magnitudes
        const gravity1 = this.mass1 * this.g;
        const gravity2 = this.mass2 * this.g;
        
        // Mass 1 forces
        // Gravity (downward)
        const gravity1Length = Math.min(gravity1 * arrowScale, maxArrowLength);
        this.drawForce(mass1X + 20, mass1Y, 0, gravity1Length, '#e74c3c', `m₁g\n${gravity1.toFixed(1)}N`);
        
        // Tension (upward)
        const tensionLength = Math.min(this.tension * arrowScale, maxArrowLength);
        this.drawForce(mass1X + 40, mass1Y, 0, -tensionLength, '#3498db', `T\n${this.tension.toFixed(1)}N`);
        
        // Mass 2 forces
        // Gravity (downward)
        const gravity2Length = Math.min(gravity2 * arrowScale, maxArrowLength);
        this.drawForce(mass2X - 20, mass2Y, 0, gravity2Length, '#e74c3c', `m₂g\n${gravity2.toFixed(1)}N`);
        
        // Tension (upward)
        this.drawForce(mass2X - 40, mass2Y, 0, -tensionLength, '#3498db', `T\n${this.tension.toFixed(1)}N`);
    }
    
    drawForce(x, y, dx, dy, color, label) {
        if (Math.abs(dy) < 2) return;
        
        this.ctx.save();
        this.ctx.strokeStyle = color;
        this.ctx.fillStyle = color;
        this.ctx.lineWidth = 2.5;
        
        // Draw arrow line
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
        this.ctx.lineTo(x + dx, y + dy);
        this.ctx.stroke();
        
        // Draw arrowhead
        const angle = Math.atan2(dy, dx);
        const headLength = 8;
        this.ctx.beginPath();
        this.ctx.moveTo(x + dx, y + dy);
        this.ctx.lineTo(
            x + dx - headLength * Math.cos(angle - Math.PI / 6),
            y + dy - headLength * Math.sin(angle - Math.PI / 6)
        );
        this.ctx.lineTo(
            x + dx - headLength * Math.cos(angle + Math.PI / 6),
            y + dy - headLength * Math.sin(angle + Math.PI / 6)
        );
        this.ctx.closePath();
        this.ctx.fill();
        
        // Draw label
        this.ctx.font = 'bold 10px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillStyle = color;
        const lines = label.split('\n');
        lines.forEach((line, i) => {
            this.ctx.fillText(line, x + dx + (dx < 0 ? -15 : 15), y + dy / 2 + i * 12);
        });
        
        this.ctx.restore();
    }

    drawLabels() {
        // Sign convention is now shown in the initial velocity help text
        // No need for the box with green line that won't go away
    }
    
    updateDisplay() {
        document.getElementById('currentAcceleration').textContent = this.acceleration.toFixed(2) + ' m/s²';
        document.getElementById('currentVelocity').textContent = this.velocity.toFixed(2) + ' m/s';
        document.getElementById('currentTension').textContent = this.tension.toFixed(2) + ' N';
        document.getElementById('currentTime').textContent = this.time.toFixed(2) + ' s';
    }
    
    setMass1(mass) {
        this.mass1 = parseFloat(mass);
        if (this.mass1 < 0.1) this.mass1 = 0.1;
        if (this.mass1 > 10) this.mass1 = 10;
        this.calculate();
        this.draw();
        this.updateDisplay();
    }
    
    setMass2(mass) {
        this.mass2 = parseFloat(mass);
        if (this.mass2 < 0.1) this.mass2 = 0.1;
        if (this.mass2 > 10) this.mass2 = 10;
        this.calculate();
        this.draw();
        this.updateDisplay();
    }
    
    setInitialVelocity(velocity) {
        this.initialVelocity = parseFloat(velocity);
        if (this.initialVelocity < -5) this.initialVelocity = -5;
        if (this.initialVelocity > 5) this.initialVelocity = 5;
        this.velocity = this.initialVelocity;
        this.draw();
        this.updateDisplay();
    }
    
    setShowForceArrows(show) {
        this.showForceArrows = show;
        this.draw();
    }
}

// Theme toggle (same top-right placement pattern as Half Atwood sim)
var themeToggleButton = document.getElementById('themeToggleButton');
var currentTheme = localStorage.getItem('atwood_theme') ||
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

function applyTheme(theme) {
    document.body.setAttribute('data-theme', theme);
    if (themeToggleButton) {
        themeToggleButton.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
        themeToggleButton.textContent = theme === 'dark' ? '☀️ Switch to Light Theme' : '🌙 Switch to Dark Theme';
    }
}

applyTheme(currentTheme);

if (themeToggleButton) {
    themeToggleButton.addEventListener('click', () => {
        currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
        localStorage.setItem('atwood_theme', currentTheme);
        applyTheme(currentTheme);
    });
}

// Initialize simulation
var canvas = document.getElementById('atwoodCanvas');
var simulation = new AtwoodMachine(canvas);

// Control elements
var mass1Input = document.getElementById('mass1');
var mass2Input = document.getElementById('mass2');
var velocityInput = document.getElementById('initialVelocity');
var startBtn = document.getElementById('startBtn');
var pauseBtn = document.getElementById('pauseBtn');
var resetBtn = document.getElementById('resetBtn');

// Display elements
var mass1Display = document.getElementById('mass1Display');
var mass2Display = document.getElementById('mass2Display');
var velocityDisplay = document.getElementById('velocityDisplay');

// Toggle elements
var showForceArrowsToggle = document.getElementById('showForceArrows');

// Input validation
function validateMassInput(input, display) {
    let value = parseFloat(input.value);
    if (isNaN(value) || value < 0.1) {
        value = 0.1;
        input.value = value;
    } else if (value > 20) {
        value = 20;
        input.value = value;
    }
    return value;
}

// Event listeners
mass1Input.addEventListener('input', (e) => {
    const value = validateMassInput(e.target, mass1Display);
    simulation.setMass1(value);
    mass1Display.textContent = value.toFixed(1) + ' kg';
    announceToScreenReader(`Mass 1 set to ${value.toFixed(1)} kilograms`);
});

mass2Input.addEventListener('input', (e) => {
    const value = validateMassInput(e.target, mass2Display);
    simulation.setMass2(value);
    mass2Display.textContent = value.toFixed(1) + ' kg';
    announceToScreenReader(`Mass 2 set to ${value.toFixed(1)} kilograms`);
});

velocityInput.addEventListener('input', (e) => {
    simulation.setInitialVelocity(e.target.value);
    velocityDisplay.textContent = parseFloat(e.target.value).toFixed(1) + ' m/s';
});

startBtn.addEventListener('click', () => {
    simulation.start();
    startBtn.disabled = true;
    pauseBtn.disabled = false;
    announceToScreenReader('Simulation started');
});

pauseBtn.addEventListener('click', () => {
    simulation.pause();
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    announceToScreenReader('Simulation paused');
});

resetBtn.addEventListener('click', () => {
    simulation.pause();
    simulation.reset();
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    announceToScreenReader('Simulation reset');
});

// Visualization toggles
showForceArrowsToggle.addEventListener('change', (e) => {
    simulation.setShowForceArrows(e.target.checked);
    announceToScreenReader(e.target.checked ? 'Force arrows shown' : 'Force arrows hidden');
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Space bar: Start/Pause
    if (e.code === 'Space' && !e.target.matches('input')) {
        e.preventDefault();
        if (simulation.isRunning) {
            pauseBtn.click();
        } else {
            startBtn.click();
        }
    }
    // R key: Reset
    else if (e.code === 'KeyR' && !e.target.matches('input')) {
        e.preventDefault();
        resetBtn.click();
    }
});

// Screen reader announcements
function announceToScreenReader(message) {
    const announcement = document.getElementById('sr-announcements');
    if (announcement) {
        announcement.textContent = message;
    }
}

// Initialize button states
pauseBtn.disabled = true;

// Initialize displays
mass1Display.textContent = simulation.mass1.toFixed(1) + ' kg';
mass2Display.textContent = simulation.mass2.toFixed(1) + ' kg';
velocityDisplay.textContent = simulation.initialVelocity.toFixed(1) + ' m/s';

// Tab switching functionality
const tabButtons = document.querySelectorAll('.tab-button');
const tabContents = document.querySelectorAll('.tab-content');

tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        const tabName = button.getAttribute('data-tab');
        
        // Remove active class from all buttons and contents
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));
        
        // Add active class to clicked button and corresponding content
        button.classList.add('active');
        document.getElementById(`${tabName}-tab`).classList.add('active');
    });
});
