(() => {
  const thresholdHeight = 1000;
  const downloadDelayMs = 800;
  const scriptId = "html2canvas-lib";
  const loadHtml2Canvas = () =>
    new Promise((resolve, reject) => {
      if (window.html2canvas) {
        resolve();
        return;
      }
      const script = document.createElement("script");
      script.id = scriptId;
      script.src =
        "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("html2canvasの読み込みに失敗しました。"));
      document.head.appendChild(script);
    });

  const sanitize = (text) =>
    (text || "page")
      .replace(/[\\/:*?"<>|]/g, "_")
      .replace(/\s+/g, "_")
      .slice(0, 60);

  const downloadCanvas = (canvas, filename) => {
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const sleep = (ms) =>
    new Promise((resolve) => {
      setTimeout(resolve, ms);
    });

  const isFullyTransparent = (canvas) => {
    try {
      const ctx = canvas.getContext("2d");
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] !== 0) return false;
      }
      return true;
    } catch (err) {
      return false;
    }
  };

  const cropTransparent = (canvas) => {
    try {
      const ctx = canvas.getContext("2d");
      const { width, height } = canvas;
      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;
      let minX = width;
      let minY = height;
      let maxX = -1;
      let maxY = -1;
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          const alpha = data[(y * width + x) * 4 + 3];
          if (alpha === 0) continue;
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
      if (maxX < minX || maxY < minY) return canvas;
      const cropWidth = maxX - minX + 1;
      const cropHeight = maxY - minY + 1;
      const cropped = document.createElement("canvas");
      cropped.width = cropWidth;
      cropped.height = cropHeight;
      const croppedCtx = cropped.getContext("2d");
      croppedCtx.drawImage(
        canvas,
        minX,
        minY,
        cropWidth,
        cropHeight,
        0,
        0,
        cropWidth,
        cropHeight,
      );
      return cropped;
    } catch (err) {
      return canvas;
    }
  };

  const capture = async () => {
    await loadHtml2Canvas();

    const root = document.documentElement;
    const totalWidth = Math.max(root.scrollWidth, document.body.scrollWidth);
    const totalHeight = Math.max(root.scrollHeight, document.body.scrollHeight);
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const title = sanitize(document.title);
    const now = new Date();
    const stamp = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0"),
      "_",
      String(now.getHours()).padStart(2, "0"),
      String(now.getMinutes()).padStart(2, "0"),
      String(now.getSeconds()).padStart(2, "0"),
    ].join("");

    const turns = Array.from(document.querySelectorAll("section.turn"));
    const turnStarts = turns
      .map((section) => {
        const rect = section.getBoundingClientRect();
        return rect.top + window.scrollY;
      })
      .filter((value) => Number.isFinite(value) && value > 0)
      .sort((a, b) => a - b);
    const turnEnds = turns
      .map((section) => {
        const rect = section.getBoundingClientRect();
        return rect.bottom + window.scrollY;
      })
      .filter((value) => Number.isFinite(value) && value > 0)
      .sort((a, b) => a - b);
    const boundaries = [...turnStarts, ...turnEnds].sort((a, b) => a - b);

    const ranges = [];
    let startY = 0;
    boundaries.forEach((end) => {
      if (end <= startY) return;
      if (end - startY > thresholdHeight) {
        ranges.push({ startY, end });
        startY = end;
      }
    });
    if (totalHeight > startY) {
      ranges.push({ startY, end: totalHeight });
    }
    if (!ranges.length) {
      ranges.push({ startY: 0, end: totalHeight });
    }

    let index = 1;
    for (const range of ranges) {
      const height = Math.max(1, range.end - range.startY);
      // html2canvas の viewport をずらして部分キャプチャする
      const canvas = await window.html2canvas(document.body, {
        useCORS: true,
        backgroundColor: null,
        width: totalWidth,
        height,
        windowWidth: viewportWidth,
        windowHeight: viewportHeight,
        x: 0,
        y: range.startY,
        scrollX: 0,
        scrollY: 0,
      });
      if (isFullyTransparent(canvas)) {
        continue;
      }
      const croppedCanvas = cropTransparent(canvas);
      const filename = `${title}_${stamp}_part${String(index).padStart(2, "0")}.png`;
      downloadCanvas(croppedCanvas, filename);
      await sleep(downloadDelayMs);
      index += 1;
    }
  };

  capture().catch((err) => alert(err.message));
})();
