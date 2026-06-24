// js/floating-lines.js — Canvas 浮动线条背景动画
const FloatingLines = (() => {

  /**
   * 创建浮动线条背景
   * @param {Object} options
   */
  function init(options = {}) {
    const defaults = {
      container: document.body,
      enabledWaves: ['top', 'middle', 'bottom'],
      lineCount: 6,           // 每层线条数
      lineDistance: 10,       // 每层线条间距 (px)
      bendRadius: 120,        // 弯曲幅度
      bendStrength: -2,       // 弯曲方向/强度
      animationSpeed: 0.8,    // 动画速度
      gradientStart: '#e945f5',
      gradientMid: '#6f6f6f',
      gradientEnd: '#4A90D9',
      interactive: true,
      parallax: true,
      opacity: 0.35
    };

    const cfg = { ...defaults, ...options };

    // 创建 Canvas
    const canvas = document.createElement('canvas');
    canvas.id = 'floatingLinesBg';
    canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:-1;pointer-events:none;';
    cfg.container.insertBefore(canvas, cfg.container.firstChild);

    const ctx = canvas.getContext('2d');
    let animId;
    let mouseX = 0.5, mouseY = 0.5;       // 归一化鼠标位置 (0-1)
    let targetMouseX = 0.5, targetMouseY = 0.5;
    let phase = 0;

    // 响应式尺寸
    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2); // 限制像素比以保证性能
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + 'px';
      canvas.style.height = window.innerHeight + 'px';
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    }
    resize();
    window.addEventListener('resize', resize);

    // 鼠标交互
    if (cfg.interactive) {
      document.addEventListener('mousemove', (e) => {
        targetMouseX = e.clientX / window.innerWidth;
        targetMouseY = e.clientY / window.innerHeight;
      });
      document.addEventListener('touchmove', (e) => {
        if (e.touches.length > 0) {
          targetMouseX = e.touches[0].clientX / window.innerWidth;
          targetMouseY = e.touches[0].clientY / window.innerHeight;
        }
      }, { passive: true });
    }

    // 解析颜色
    function parseColor(str) {
      if (!str) return [128, 128, 128];
      if (str.startsWith('#')) {
        const h = str.slice(1);
        if (h.length === 6) return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
        if (h.length === 3) return [parseInt(h[0]+h[0],16), parseInt(h[1]+h[1],16), parseInt(h[2]+h[2],16)];
      }
      return [128, 128, 128];
    }

    const cStart = parseColor(cfg.gradientStart);
    const cMid = parseColor(cfg.gradientMid);
    const cEnd = parseColor(cfg.gradientEnd);

    function lerpColor(c1, c2, t) {
      return [Math.round(c1[0]+(c2[0]-c1[0])*t), Math.round(c1[1]+(c2[1]-c1[1])*t), Math.round(c1[2]+(c2[2]-c1[2])*t)];
    }

    function getWaveColor(t) {
      // t: 0-1, 波浪中的位置
      if (t < 0.33) {
        return lerpColor(cStart, cMid, t / 0.33);
      } else if (t < 0.66) {
        return lerpColor(cMid, cEnd, (t - 0.33) / 0.33);
      } else {
        return lerpColor(cEnd, cStart, (t - 0.66) / 0.34);
      }
    }

    function draw() {
      const W = window.innerWidth;
      const H = window.innerHeight;

      ctx.clearRect(0, 0, W, H);

      // 平滑鼠标追踪
      mouseX += (targetMouseX - mouseX) * 0.05;
      mouseY += (targetMouseY - mouseY) * 0.05;

      phase += 0.008 * cfg.animationSpeed;

      // 绘制每层波浪
      const waveDefs = [];
      if (cfg.enabledWaves.includes('top'))    waveDefs.push({ name: 'top',    yRatio: 0.15, parallax: 0.08 });
      if (cfg.enabledWaves.includes('middle')) waveDefs.push({ name: 'middle', yRatio: 0.45, parallax: 0.14 });
      if (cfg.enabledWaves.includes('bottom')) waveDefs.push({ name: 'bottom', yRatio: 0.75, parallax: 0.20 });

      waveDefs.forEach((waveDef) => {
        const baseY = H * waveDef.yRatio;
        const count = Array.isArray(cfg.lineCount) ? (cfg.lineCount[waveDefs.indexOf(waveDef)] || 4) : cfg.lineCount;
        const dist = Array.isArray(cfg.lineDistance) ? (cfg.lineDistance[waveDefs.indexOf(waveDef)] || 8) : cfg.lineDistance;

        for (let i = 0; i < count; i++) {
          const offsetY = (i - (count - 1) / 2) * dist;
          const y = baseY + offsetY;
          const t = y / H; // 归一化Y，用于颜色渐变

          // 视差偏移
          let parallaxX = 0;
          if (cfg.parallax) {
            parallaxX = (mouseX - 0.5) * waveDef.parallax * W;
          }

          const [r, g, b] = getWaveColor(t);

          ctx.beginPath();
          ctx.moveTo(-10, y);

          const step = 8; // 每段像素，平滑度和性能平衡
          const radius = cfg.bendRadius * (1 + i * 0.15);
          const strength = cfg.bendStrength;

          for (let x = 0; x <= W + 10; x += step) {
            const xNorm = x / W;
            // 复合波形：多个正弦波叠加，创造自然流动感
            const wave = Math.sin(xNorm * Math.PI * 2 + phase + i * 0.5) * radius * 0.5
                       + Math.sin(xNorm * Math.PI * 3.5 + phase * 1.3 + i * 0.3) * radius * 0.3
                       + Math.sin(xNorm * Math.PI * 1.7 + phase * 0.7 + i * 0.8) * radius * 0.2;

            const py = y + wave + parallaxX * Math.sin(xNorm * Math.PI + phase * strength) * 0.3;
            ctx.lineTo(x, py);
          }

          // 线条样式
          const alpha = cfg.opacity * (1 - Math.abs(i - (count - 1) / 2) / (count / 2) * 0.45);
          ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
          ctx.lineWidth = 2.2 - Math.abs(i - (count - 1) / 2) / (count / 2) * 0.8;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.stroke();
        }
      });

      animId = requestAnimationFrame(draw);
    }

    draw();

    // 销毁方法
    return {
      destroy() {
        cancelAnimationFrame(animId);
        canvas.remove();
        window.removeEventListener('resize', resize);
      },
      resize
    };
  }

  return { init };
})();
