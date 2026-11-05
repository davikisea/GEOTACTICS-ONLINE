import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  const rootDir = process.cwd();
  const inputPath = path.join(rootDir, 'public', 'logo.jpg');
  const outputPath = path.join(rootDir, 'public', 'logo.png');
  const croppedOutputPath = path.join(rootDir, 'public', 'logo-cropped.png');

  console.log('Loading image buffer from:', inputPath);
  const imgBuffer = fs.readFileSync(inputPath);
  const base64Jpg = 'data:image/jpeg;base64,' + imgBuffer.toString('base64');
  console.log('Image buffer size in bytes:', imgBuffer.length);

  await page.setContent('<canvas id="canvas"></canvas>');

  const result = await page.evaluate(async (dataUri) => {
    const img = new Image();
    img.src = dataUri;
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = (e) => reject(new Error('Failed to load image data URL'));
    });

    const w = img.naturalWidth;
    const h = img.naturalHeight;

    const canvas = document.getElementById('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    // Sample corner colors to understand background green
    const corners = [
      [10, 10], [w - 10, 10], [10, h - 10], [w - 10, h - 10],
      [50, 50], [w - 50, 50], [50, h - 50], [w - 50, h - 50]
    ];
    const sampledGreens = corners.map(([x, y]) => {
      const idx = (y * w + x) * 4;
      return [data[idx], data[idx + 1], data[idx + 2]];
    });

    // Average key green
    let avgKeyR = 0, avgKeyG = 0, avgKeyB = 0;
    for (const [r, g, b] of sampledGreens) {
      avgKeyR += r; avgKeyG += g; avgKeyB += b;
    }
    avgKeyR /= sampledGreens.length;
    avgKeyG /= sampledGreens.length;
    avgKeyB /= sampledGreens.length;

    let minX = w, maxX = 0, minY = h, maxY = 0;

    // Chroma key removal with spill suppression & smooth alpha
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // Green dominance: how much greener is G than max(R, B)
      const maxRB = Math.max(r, b);
      const greenDominance = g - maxRB;

      let alpha = 255;
      
      // Thresholds for chroma key
      const lowerThreshold = 20; // start softening alpha
      const upperThreshold = 55; // fully transparent

      if (greenDominance > upperThreshold) {
        alpha = 0;
      } else if (greenDominance > lowerThreshold) {
        // Transition band
        const t = (greenDominance - lowerThreshold) / (upperThreshold - lowerThreshold);
        alpha = Math.round(255 * (1 - t));
        // Despill: pull G down to maxRB to prevent green fringe
        data[i + 1] = Math.round(maxRB * 0.95);
      } else {
        // Foreground - check if slight spill
        if (g > maxRB && maxRB > 15) {
          // Despill green fringe on edge of subject
          data[i + 1] = Math.min(g, Math.round(maxRB * 1.02));
        }
      }

      data[i + 3] = alpha;

      if (alpha > 20) {
        const px = (i / 4) % w;
        const py = Math.floor((i / 4) / w);
        if (px < minX) minX = px;
        if (px > maxX) maxX = px;
        if (py < minY) minY = py;
        if (py > maxY) maxY = py;
      }
    }

    ctx.putImageData(imgData, 0, 0);
    const fullDataUrl = canvas.toDataURL('image/png');

    // Create cropped canvas
    const cropPadding = 16;
    const cropX = Math.max(0, minX - cropPadding);
    const cropY = Math.max(0, minY - cropPadding);
    const cropW = Math.min(w - cropX, (maxX - minX) + cropPadding * 2);
    const cropH = Math.min(h - cropY, (maxY - minY) + cropPadding * 2);

    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = cropW;
    cropCanvas.height = cropH;
    const cropCtx = cropCanvas.getContext('2d');
    cropCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
    const croppedDataUrl = cropCanvas.toDataURL('image/png');
    const croppedWebpDataUrl = cropCanvas.toDataURL('image/webp', 0.92);

    return {
      w, h,
      avgKey: [avgKeyR, avgKeyG, avgKeyB],
      bounds: { minX, maxX, minY, maxY, cropW, cropH },
      fullDataUrl,
      croppedDataUrl,
      croppedWebpDataUrl
    };
  }, base64Jpg);

  console.log('Processed image info:', {
    originalSize: `${result.w}x${result.h}`,
    detectedGreenKey: result.avgKey,
    bounds: result.bounds
  });

  // Save files
  const base64Data = result.fullDataUrl.replace(/^data:image\/png;base64,/, '');
  fs.writeFileSync(outputPath, Buffer.from(base64Data, 'base64'));
  console.log('Saved transparent logo to:', outputPath);

  const croppedBase64 = result.croppedDataUrl.replace(/^data:image\/png;base64,/, '');
  fs.writeFileSync(croppedOutputPath, Buffer.from(croppedBase64, 'base64'));
  console.log('Saved cropped transparent logo to:', croppedOutputPath);

  const croppedWebpPath = path.join(rootDir, 'public', 'logo-cropped.webp');
  const croppedWebpBase64 = result.croppedWebpDataUrl.replace(/^data:image\/webp;base64,/, '');
  fs.writeFileSync(croppedWebpPath, Buffer.from(croppedWebpBase64, 'base64'));
  console.log('Saved cropped transparent webp logo to:', croppedWebpPath);

  await browser.close();
}

main().catch(err => {
  console.error('Error processing chroma:', err);
  process.exit(1);
});
