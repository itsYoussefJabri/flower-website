import React, { useEffect, useRef } from "react";

const DISPLAY_TEXT = "CHAIMAE";

function SpringParticles() {
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    let particles = [];
    const mouse = { x: -9999, y: -9999, radius: 120 };

    // Events
    const onMouseMove = (e) => { mouse.x = e.clientX; mouse.y = e.clientY; };
    const onTouchMove = (e) => {
      if (e.targetTouches.length) {
        mouse.x = e.targetTouches[0].clientX;
        mouse.y = e.targetTouches[0].clientY;
      }
    };
    const onTouchEnd = () => { mouse.x = -9999; mouse.y = -9999; };
    const onMouseLeave = () => { mouse.x = -9999; mouse.y = -9999; };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd);
    window.addEventListener("mouseleave", onMouseLeave);

    // Sprite
    const sprite = new Image();
    sprite.crossOrigin = "anonymous";
    sprite.src = "https://i.ibb.co/DGqfJpG/butterflies-and-flowers.png";

    function buildParticles() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      // Font size based on screen — keep it readable on mobile
      let fontSize;
      if (canvas.width < 400) {
        fontSize = 14;
      } else if (canvas.width < 768) {
        fontSize = 18;
      } else {
        fontSize = 22;
      }

      ctx.font = `bold ${fontSize}px Verdana`;
      ctx.fillStyle = "white";
      ctx.fillText(DISPLAY_TEXT, 0, fontSize);

      const textW = ctx.measureText(DISPLAY_TEXT).width;
      const scanW = Math.min(Math.ceil(textW) + 4, canvas.width);
      const scanH = fontSize + 6;
      const data = ctx.getImageData(0, 0, scanW, scanH);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Collect lit pixels
      const pixels = [];
      for (let y = 0; y < data.height; y++) {
        for (let x = 0; x < data.width; x++) {
          if (data.data[(y * data.width + x) * 4 + 3] > 128) {
            pixels.push({ x, y });
          }
        }
      }

      // Scale to fit nicely centered
      const targetW = canvas.width * (canvas.width < 500 ? 0.85 : 0.65);
      const targetH = canvas.height * 0.25;
      const scale = Math.min(targetW / textW, targetH / scanH);

      const actualW = textW * scale;
      const actualH = scanH * scale;
      const offX = (canvas.width - actualW) / 2;
      const offY = (canvas.height - actualH) / 2;

      // Cap particles for performance
      const maxP = canvas.width < 500 ? 350 : 550;
      let step = 1;
      if (pixels.length > maxP) step = Math.ceil(pixels.length / maxP);

      particles = [];
      for (let i = 0; i < pixels.length; i += step) {
        const px = offX + pixels[i].x * scale;
        const py = offY + pixels[i].y * scale;
        particles.push({
          x: px, y: py,
          baseX: px, baseY: py,
          size: 3,
          density: Math.random() * 30 + 1,
          isSprite: Math.random() < 0.04,
          spriteSize: Math.random() * 40 + 35,
          frameX: Math.floor(Math.random() * 3),
          frameY: Math.floor(Math.random() * 8),
          angle: Math.random() * 2,
        });
      }
    }

    function draw(p) {
      if (!p.isSprite) {
        ctx.fillStyle = "white";
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.closePath();
        ctx.fill();
      } else if (sprite.complete && sprite.naturalWidth > 0) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.drawImage(sprite, p.frameX * 213.3, p.frameY * 213.3, 213.3, 213.3,
          -p.spriteSize / 2, -p.spriteSize / 2, p.spriteSize, p.spriteSize);
        ctx.restore();
      }
    }

    function update(p) {
      const dx = mouse.x - p.x;
      const dy = mouse.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0 && dist < mouse.radius + p.size) {
        const f = Math.max(0, (mouse.radius - dist) / mouse.radius);
        p.x -= (dx / dist) * f * p.density;
        p.y -= (dy / dist) * f * p.density;
      } else {
        p.x += (p.baseX - p.x) * 0.1;
        p.y += (p.baseY - p.y) * 0.1;
      }
    }

    function connect() {
      const len = particles.length;
      for (let a = 0; a < len; a++) {
        for (let b = a + 1; b < len; b++) {
          const dx = particles[a].x - particles[b].x;
          const dy = particles[a].y - particles[b].y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 2600) {
            const op = 1 - d2 / 2600;
            const mx = mouse.x - particles[a].x;
            const my = mouse.y - particles[a].y;
            const md = Math.sqrt(mx * mx + my * my);
            if (md < mouse.radius / 2) ctx.strokeStyle = `rgba(255,255,0,${op})`;
            else if (md < mouse.radius - 50) ctx.strokeStyle = `rgba(255,255,140,${op})`;
            else if (md < mouse.radius + 20) ctx.strokeStyle = `rgba(255,255,210,${op})`;
            else ctx.strokeStyle = `rgba(255,255,255,${op})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(particles[a].x, particles[a].y);
            ctx.lineTo(particles[b].x, particles[b].y);
            ctx.stroke();
          }
        }
      }
    }

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (particles.length) {
        connect();
        for (let i = 0; i < particles.length; i++) {
          update(particles[i]);
          draw(particles[i]);
        }
      }
      animFrameRef.current = requestAnimationFrame(animate);
    }

    const onResize = () => buildParticles();
    window.addEventListener("resize", onResize);

    const start = () => { buildParticles(); animate(); };
    if (sprite.complete && sprite.naturalWidth > 0) start();
    else { sprite.onload = start; sprite.onerror = start; }

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("mouseleave", onMouseLeave);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <div className="canvas-page particles-page">
      <canvas ref={canvasRef} />
    </div>
  );
}

export default SpringParticles;
