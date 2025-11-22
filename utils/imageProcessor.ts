
import { TransformValues, BasicValues, EffectsValues, BeautyValues, FilterValues, Point, CropData, HistogramData } from '../types';

const BEAUTY_BACKEND_URL = import.meta.env.VITE_BEAUTY_BACKEND || 'http://127.0.0.1:8000';

/**
 * CLIENT-SIDE IMAGE PROCESSOR
 * High-performance canvas-based processing simulating OpenCV/NumPy
 */

// Helper: Clamp value between 0 and 255
const clamp = (val: number) => Math.max(0, Math.min(255, val));

/**
 * Apply a 3x3 Convolution Kernel
 */
const applyConvolution = (
    pixels: Uint8ClampedArray, 
    width: number, 
    height: number, 
    kernel: number[], 
    amount: number
) => {
    const side = Math.round(Math.sqrt(kernel.length));
    const halfSide = Math.floor(side / 2);
    const src = new Uint8ClampedArray(pixels);
    const w = width;
    const h = height;

    for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
            let r = 0, g = 0, b = 0;
            const dstOff = (y * w + x) * 4;

            for (let ky = 0; ky < side; ky++) {
                for (let kx = 0; kx < side; kx++) {
                    const srcOff = ((y + ky - halfSide) * w + (x + kx - halfSide)) * 4;
                    const weight = kernel[ky * side + kx];
                    
                    r += src[srcOff] * weight;
                    g += src[srcOff + 1] * weight;
                    b += src[srcOff + 2] * weight;
                }
            }

            const originalR = src[dstOff];
            const originalG = src[dstOff + 1];
            const originalB = src[dstOff + 2];

            pixels[dstOff] = clamp(originalR + r * amount);
            pixels[dstOff + 1] = clamp(originalG + g * amount);
            pixels[dstOff + 2] = clamp(originalB + b * amount);
        }
    }
};

// Helper: Calculate Gradient Magnitude (Edge Detection) to protect features
const computeGradientMap = (data: Uint8ClampedArray, width: number, height: number): Uint8Array => {
    const edges = new Uint8Array(width * height);
    const gray = new Uint8Array(width * height);
    
    // Convert to grayscale first for speed
    for(let i = 0; i < data.length; i += 4) {
        gray[i/4] = 0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2];
    }

    // Sobel Kernels
    const w = width;
    const h = height;

    for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
            // Gx
            const gx = 
                (-1 * gray[(y-1)*w + (x-1)]) + (1 * gray[(y-1)*w + (x+1)]) +
                (-2 * gray[y*w     + (x-1)]) + (2 * gray[y*w     + (x+1)]) +
                (-1 * gray[(y+1)*w + (x-1)]) + (1 * gray[(y+1)*w + (x+1)]);
            
            // Gy
            const gy = 
                (-1 * gray[(y-1)*w + (x-1)]) + (-2 * gray[(y-1)*w + x]) + (-1 * gray[(y-1)*w + (x+1)]) +
                (1 * gray[(y+1)*w + (x-1)]) + (2 * gray[(y+1)*w + x]) + (1 * gray[(y+1)*w + (x+1)]);

            const mag = Math.abs(gx) + Math.abs(gy);
            edges[y*w + x] = Math.min(255, mag);
        }
    }
    return edges;
};

// Helper: Robust Skin Detection (Returns Probability 0-1)
const getSkinProbability = (r: number, g: number, b: number): number => {
    // RGB to YCbCr
    const y = 0.299 * r + 0.587 * g + 0.114 * b;
    const cb = 128 + (-0.168736 * r) + (-0.331264 * g) + (0.5 * b);
    const cr = 128 + (0.5 * r) + (-0.418688 * g) + (-0.081312 * b);
    
    // Heuristic ranges for skin
    const cbSkin = (cb >= 80 && cb <= 135); // Slightly wider Cb
    const crSkin = (cr >= 130 && cr <= 185); // Slightly wider Cr
    
    // Additional check for reddish tint common in skin
    const rDominant = r > g && r > b;
    
    if (cbSkin && crSkin && rDominant) {
        // Calculate distance from "ideal" skin center in CbCr plane
        const dist = Math.sqrt(Math.pow(cb - 105, 2) + Math.pow(cr - 152, 2));
        // Max distance allowed is roughly 25, smooth falloff
        return Math.max(0, 1 - (dist / 40)); 
    }
    return 0;
};

// Helper: RGB to YCbCr
const rgbToYcbcr = (r: number, g: number, b: number) => {
    const y = 0.299 * r + 0.587 * g + 0.114 * b;
    const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
    const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
    return { y, cb, cr };
};

// Helper: YCbCr to RGB
const ycbcrToRgb = (y: number, cb: number, cr: number) => {
    const r = y + 1.402 * (cr - 128);
    const g = y - 0.344136 * (cb - 128) - 0.714136 * (cr - 128);
    const b = y + 1.772 * (cb - 128);
    return { r: clamp(r), g: clamp(g), b: clamp(b) };
};


/**
 * Analyze image and return recommended auto-adjustment settings
 */
export const calculateAutoSettings = (imgSource: string): Promise<BasicValues> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = imgSource;
        
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const size = 128; 
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');
            if (!ctx) { reject("Context error"); return; }
            ctx.drawImage(img, 0, 0, size, size);
            const data = ctx.getImageData(0, 0, size, size).data;
            
            let totalLuma = 0;
            const lumaArray = [];
            const pixelCount = size * size;

            for (let i = 0; i < data.length; i += 4) {
                const luma = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
                totalLuma += luma;
                lumaArray.push(luma);
            }

            const avgLuma = totalLuma / pixelCount;
            let sumDiffSq = 0;
            for (let l of lumaArray) sumDiffSq += Math.pow(l - avgLuma, 2);
            const stdDev = Math.sqrt(sumDiffSq / pixelCount);

            const settings: BasicValues = {
                exposure: 0, brightness: 0, contrast: 0, highlights: 0, shadows: 0, whites: 0, blacks: 0,
                temp: 0, tint: 0, vibrance: 0, saturation: 0, hue: 0, grayscale: 0,
                sharpen: 0, blur: 0, clarity: 0, texture: 0, dehaze: 0, denoise: 0
            };

            const targetLuma = 120;
            const expDiff = targetLuma - avgLuma;
            settings.exposure = Math.round(Math.max(-40, Math.min(40, expDiff * 0.6)));

            const targetStdDev = 60;
            if (stdDev < targetStdDev) {
                settings.contrast = Math.round(Math.min(30, (targetStdDev - stdDev) * 1.2));
            }

            // Enrich colors
            settings.vibrance = 20;
            settings.sharpen = 15;
            settings.clarity = 10;

            resolve(settings);
        };
        img.onerror = (e) => reject(e);
    });
}

/**
 * Calculate Histogram
 */
export const calculateHistogram = (imgSource: string): Promise<HistogramData> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = imgSource;
        
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let w = img.width;
            let h = img.height;
            
            // Optimization: Downscale for histogram calculation
            const maxDim = 600;
            if (w > maxDim || h > maxDim) {
                const ratio = Math.min(maxDim / w, maxDim / h);
                w = Math.floor(w * ratio);
                h = Math.floor(h * ratio);
            }
            
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (!ctx) { reject("Canvas Error"); return; }
            
            ctx.drawImage(img, 0, 0, w, h);
            const data = ctx.getImageData(0, 0, w, h).data;
            
            const r = new Uint32Array(256);
            const g = new Uint32Array(256);
            const b = new Uint32Array(256);
            const l = new Uint32Array(256);
            
            for (let i = 0; i < data.length; i += 4) {
                const red = data[i];
                const green = data[i+1];
                const blue = data[i+2];
                
                r[red]++;
                g[green]++;
                b[blue]++;
                
                // Luminance
                const val = Math.round(0.299 * red + 0.587 * green + 0.114 * blue);
                l[val]++;
            }
            
            resolve({
                r: Array.from(r),
                g: Array.from(g),
                b: Array.from(b),
                l: Array.from(l)
            });
        };
        img.onerror = reject;
    });
};

/**
 * TRANSFORM PROCESSOR
 */
export const processImageTransform = (
    imgSource: string,
    values: TransformValues
): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) { reject('No context'); return; }

            // Determine canvas size based on 90 degree rotations
            const isRotated90 = Math.abs(values.rotate % 180) === 90;
            let canvasW = isRotated90 ? img.height : img.width;
            let canvasH = isRotated90 ? img.width : img.height;

            canvas.width = canvasW;
            canvas.height = canvasH;

            ctx.translate(canvasW / 2, canvasH / 2);
            const degToRad = Math.PI / 180;
            
            const totalRotation = values.rotate + values.straighten + values.rotateFree;
            ctx.rotate(totalRotation * degToRad);

            ctx.scale(
                values.flipHorizontal ? -1 : 1,
                values.flipVertical ? -1 : 1
            );

            ctx.drawImage(img, -img.width / 2, -img.height / 2);

            // Handle Crop
            if (values.crop) {
                const { x, y, width, height } = values.crop;
                
                // Convert percentages to pixels relative to current canvas
                const cx = (x / 100) * canvasW;
                const cy = (y / 100) * canvasH;
                const cw = (width / 100) * canvasW;
                const ch = (height / 100) * canvasH;

                const cropCanvas = document.createElement('canvas');
                cropCanvas.width = cw;
                cropCanvas.height = ch;
                const cropCtx = cropCanvas.getContext('2d');
                
                if (cropCtx) {
                    cropCtx.drawImage(canvas, cx, cy, cw, ch, 0, 0, cw, ch);
                    resolve(cropCanvas.toDataURL('image/jpeg', 0.95));
                    return;
                }
            } else if (values.aspectRatio !== 'original' && values.aspectRatio !== 'free') {
                // Fallback to centered crop if no manual crop but ratio selected
                const parts = values.aspectRatio.split(':');
                const targetRatio = parseFloat(parts[0]) / parseFloat(parts[1]);
                const currentRatio = canvasW / canvasH;

                let cropW = canvasW;
                let cropH = canvasH;

                if (currentRatio > targetRatio) {
                    cropW = canvasH * targetRatio;
                } else {
                    cropH = canvasW / targetRatio;
                }

                const cropCanvas = document.createElement('canvas');
                cropCanvas.width = cropW;
                cropCanvas.height = cropH;
                const cropCtx = cropCanvas.getContext('2d');
                if (cropCtx) {
                    const sx = (canvasW - cropW) / 2;
                    const sy = (canvasH - cropH) / 2;
                    cropCtx.drawImage(canvas, sx, sy, cropW, cropH, 0, 0, cropW, cropH);
                    resolve(cropCanvas.toDataURL('image/jpeg', 0.95));
                    return;
                }
            }
            resolve(canvas.toDataURL('image/jpeg', 0.95));
        };
        img.onerror = reject;
        img.src = imgSource;
    });
};

/**
 * BASIC PROCESSOR (Color/Light)
 */
export const processImageBasic = (
    imgSource: HTMLImageElement | string,
    values: BasicValues
): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const maxDim = 2000;
            let w = img.width;
            let h = img.height;
            if (w > maxDim || h > maxDim) {
                const ratio = Math.min(maxDim / w, maxDim / h);
                w = Math.floor(w * ratio);
                h = Math.floor(h * ratio);
            }

            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });

            if (!ctx) { reject("Canvas context error"); return; }

            if (values.denoise > 0 || values.blur > 0) {
                const blurAmount = (values.blur + values.denoise * 0.5) / 10;
                if (blurAmount > 0) {
                    ctx.filter = `blur(${blurAmount}px)`;
                }
            }
            
            ctx.drawImage(img, 0, 0, w, h);
            ctx.filter = 'none';

            const imageData = ctx.getImageData(0, 0, w, h);
            const data = imageData.data;

            const brightnessOffset = values.brightness * 1.5;
            const exposureFactor = Math.pow(2, values.exposure / 100); 
            const contrastFactor = (259 * (values.contrast * 2 + 255)) / (255 * (259 - values.contrast * 2));
            
            for (let i = 0; i < data.length; i += 4) {
                let r = data[i];
                let g = data[i + 1];
                let b = data[i + 2];

                // Exposure/Brightness
                r = r * exposureFactor + brightnessOffset;
                g = g * exposureFactor + brightnessOffset;
                b = b * exposureFactor + brightnessOffset;

                // Contrast
                r = contrastFactor * (r - 128) + 128;
                g = contrastFactor * (g - 128) + 128;
                b = contrastFactor * (b - 128) + 128;

                // Shadows/Highlights
                const luma = 0.299 * r + 0.587 * g + 0.114 * b;
                const lumaNorm = luma / 255;
                let lumaAdjust = 0;

                if (values.shadows !== 0) lumaAdjust += (values.shadows * 0.5) * Math.max(0, 1 - lumaNorm * 2);
                if (values.highlights !== 0) lumaAdjust += (values.highlights * 0.5) * Math.max(0, (lumaNorm - 0.5) * 2);
                
                if (lumaAdjust !== 0) { r += lumaAdjust; g += lumaAdjust; b += lumaAdjust; }

                if (values.whites !== 0) { const v = (values.whites * 0.5) * lumaNorm * lumaNorm; r += v; g += v; b += v; }
                if (values.blacks !== 0) { const v = (values.blacks * 0.5) * (1-lumaNorm) * (1-lumaNorm); r += v; g += v; b += v; }

                // Temp/Tint
                if (values.temp !== 0 || values.tint !== 0) {
                    r += values.temp + (values.tint);
                    g += -(values.tint);
                    b += -(values.temp) + (values.tint);
                }

                r = clamp(r); g = clamp(g); b = clamp(b);

                // Saturation/Vibrance/Grayscale
                if (values.saturation !== 0 || values.vibrance !== 0 || values.grayscale !== 0 || values.hue !== 0) {
                    const rN = r/255, gN = g/255, bN = b/255;
                    const max = Math.max(rN, gN, bN), min = Math.min(rN, gN, bN);
                    let h = 0, s = 0, l = (max + min) / 2;

                    if (max !== min) {
                        const d = max - min;
                        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
                        switch(max) {
                            case rN: h = (gN - bN) / d + (gN < bN ? 6 : 0); break;
                            case gN: h = (bN - rN) / d + 2; break;
                            case bN: h = (rN - gN) / d + 4; break;
                        }
                        h /= 6;
                    }

                    if (values.grayscale > 0) s *= (1 - values.grayscale / 100);
                    if (values.saturation !== 0) s *= (1 + values.saturation / 100);
                    if (values.vibrance !== 0) s += (values.vibrance / 100) * (1 - s) * s;
                    
                    if (values.hue !== 0) {
                        h = (h + values.hue / 360) % 1;
                        if (h < 0) h += 1;
                    }

                    s = Math.max(0, Math.min(1, s));
                    
                    if (s === 0) {
                        r = g = b = l * 255;
                    } else {
                        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
                        const p = 2 * l - q;
                        const hue2rgb = (t: number) => {
                            if(t < 0) t += 1; if(t > 1) t -= 1;
                            if(t < 1/6) return p + (q - p) * 6 * t;
                            if(t < 1/2) return q;
                            if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                            return p;
                        };
                        r = hue2rgb(h + 1/3) * 255;
                        g = hue2rgb(h) * 255;
                        b = hue2rgb(h - 1/3) * 255;
                    }
                }

                data[i] = clamp(r); data[i+1] = clamp(g); data[i+2] = clamp(b);
            }
            
            ctx.putImageData(imageData, 0, 0);

            if (values.clarity !== 0) {
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = w; tempCanvas.height = h;
                const tCtx = tempCanvas.getContext('2d');
                if (tCtx) {
                    tCtx.drawImage(canvas, 0, 0);
                    tCtx.filter = 'blur(20px)';
                    tCtx.drawImage(canvas, 0, 0);
                    tCtx.filter = 'none';
                    
                    ctx.globalCompositeOperation = values.clarity > 0 ? 'overlay' : 'source-over';
                    ctx.globalAlpha = Math.abs(values.clarity) / (values.clarity > 0 ? 200 : 100);
                    ctx.drawImage(tempCanvas, 0, 0);
                    ctx.globalAlpha = 1.0;
                    ctx.globalCompositeOperation = 'source-over';
                }
            }

            if (values.sharpen > 0 || values.texture > 0) {
                const totalSharpen = (values.sharpen + values.texture) / 200; 
                const finalData = ctx.getImageData(0, 0, w, h);
                const sharpenKernel = [0, -1, 0, -1, 4, -1, 0, -1, 0];
                applyConvolution(finalData.data, w, h, sharpenKernel, totalSharpen);
                ctx.putImageData(finalData, 0, 0);
            }

            resolve(canvas.toDataURL('image/jpeg', 0.9));
        };
        img.onerror = reject;
        if (typeof imgSource === 'string') img.src = imgSource;
    });
};

// --- AI FACE WARP ENGINE (LIQUIFY) ---
// Simulates Face Mesh Reshaping using localized warping

interface WarpPoint {
    x: number;
    y: number;
    radius: number;
    strX: number;
    strY: number;
}

interface Landmarks {
    leftEye: {x: number, y: number};
    rightEye: {x: number, y: number};
    nose: {x: number, y: number};
    mouth: {x: number, y: number};
    chin: {x: number, y: number};
    cheekLeft: {x: number, y: number};
    cheekRight: {x: number, y: number};
    jawLeft: {x: number, y: number};
    jawRight: {x: number, y: number};
    faceBounds: {x: number, y: number, w: number, h: number};
}

// DETECT FACIAL LANDMARKS USING LUMINANCE PROFILING
const detectLandmarks = (ctx: CanvasRenderingContext2D, width: number, height: number): Landmarks | null => {
    if (width <= 0 || height <= 0) return null;

    // Work on a small scale for performance and noise reduction
    const scale = Math.min(1, 200 / width);
    const w = Math.max(10, Math.floor(width * scale));
    const h = Math.max(10, Math.floor(height * scale));
    
    const smallCanvas = document.createElement('canvas');
    smallCanvas.width = w;
    smallCanvas.height = h;
    const sCtx = smallCanvas.getContext('2d', {willReadFrequently: true});
    if(!sCtx) return null;
    
    sCtx.drawImage(ctx.canvas, 0, 0, w, h);
    const data = sCtx.getImageData(0, 0, w, h).data;

    // 1. Find Skin Box
    let minX = w, maxX = 0, minY = h, maxY = 0;
    let hasSkin = false;
    for(let i=0; i<data.length; i+=4) {
        if(getSkinProbability(data[i], data[i+1], data[i+2]) > 0.6) {
            const x = (i/4) % w;
            const y = Math.floor((i/4) / w);
            if(x < minX) minX = x;
            if(x > maxX) maxX = x;
            if(y < minY) minY = y;
            if(y > maxY) maxY = y;
            hasSkin = true;
        }
    }

    if(!hasSkin || (maxX - minX) < 20) return null;

    const faceW = maxX - minX;
    const faceH = maxY - minY;
    const centerX = minX + faceW/2;

    // 2. Relative Landmarks (Robust Heuristic)
    // A. Eyes (Approx 38% down from skin top)
    const eyesY = minY + faceH * 0.38;
    const leftEye = {x: minX + faceW*0.3, y: eyesY};
    const rightEye = {x: minX + faceW*0.7, y: eyesY};

    // B. Nose (Approx 60% down)
    const noseY = minY + faceH * 0.60;
    const nose = {x: centerX, y: noseY};

    // C. Mouth (Approx 75% down)
    const mouthY = minY + faceH * 0.75;
    const mouth = {x: centerX, y: mouthY};

    // E. Chin Detection (Triple Ray Scan with Look-ahead)
    let foundChinY = maxY; 
    const startScanY = Math.floor(mouthY + (faceH * 0.12)); // Safely below mouth
    const scanXCenter = Math.floor(centerX);
    const scanXLeft = Math.floor(centerX - faceW * 0.15);
    const scanXRight = Math.floor(centerX + faceW * 0.15);
    
    const scanRay = (scanX: number): number => {
        if (startScanY < h && scanX >= 0 && scanX < w) {
            for (let y = startScanY; y < h; y++) {
                const idx = (y * w + scanX) * 4;
                const prob = getSkinProbability(data[idx], data[idx+1], data[idx+2]);
                
                if (prob < 0.3) {
                    // Look ahead 5 pixels
                    let confirmed = true;
                    for(let k = 1; k <= 5; k++) {
                        if (y + k >= h) break;
                        const lIdx = ((y + k) * w + scanX) * 4;
                        if (getSkinProbability(data[lIdx], data[lIdx+1], data[lIdx+2]) > 0.4) {
                            confirmed = false;
                            break;
                        }
                    }
                    if (confirmed) return y;
                }
            }
        }
        return maxY;
    };

    const chinYCenter = scanRay(scanXCenter);
    const chinYLeft = scanRay(scanXLeft);
    const chinYRight = scanRay(scanXRight);
    
    // Use the median or max to be safe? Usually the lowest point (max Y) is the chin tip
    foundChinY = Math.max(chinYCenter, chinYLeft, chinYRight);

    // Anthropometric sanity Check
    const noseToMouth = Math.abs(mouthY - noseY);
    const mouthToChin = Math.abs(foundChinY - mouthY);
    
    // Chin is typically 1.6 - 2.2x the nose-mouth distance
    if (mouthToChin > noseToMouth * 2.8 || mouthToChin < noseToMouth * 0.8) {
        foundChinY = mouthY + noseToMouth * 1.8; // Reset to average proportion
    }

    const chin = {x: centerX, y: foundChinY};

    // D. Cheek Detection (Zygomatic Arch Scan)
    // CHEEK UPDATE: Scan higher, just below the eyes (about 15% of eye-to-nose dist)
    // This targets the bony prominence of the cheekbone
    let cheekLeftX = minX;
    let cheekRightX = maxX;
    const cheekScanY = Math.floor(eyesY + (noseY - eyesY) * 0.5); 
    
    if (cheekScanY < h && cheekScanY >= 0) {
        // Scan Left Side
        for(let x = Math.floor(centerX); x >= 0; x--) {
            const idx = (cheekScanY * w + x) * 4;
            if (getSkinProbability(data[idx], data[idx+1], data[idx+2]) < 0.3) {
                cheekLeftX = x;
                break;
            }
        }
        // Scan Right Side
        for(let x = Math.floor(centerX); x < w; x++) {
            const idx = (cheekScanY * w + x) * 4;
            if (getSkinProbability(data[idx], data[idx+1], data[idx+2]) < 0.3) {
                cheekRightX = x;
                break;
            }
        }
    }
    // Fallback if scan fails
    if (cheekLeftX === minX) cheekLeftX = minX + faceW * 0.15;
    if (cheekRightX === maxX) cheekRightX = maxX - faceW * 0.15;

    const cheekLeft = { x: cheekLeftX, y: cheekScanY };
    const cheekRight = { x: cheekRightX, y: cheekScanY };

    // F. Jaw Detection (Gonial Angle)
    // JAW UPDATE: Scan lower, between mouth and chin (about 55% of chin-mouth dist from mouth is typically gonial angle, but here we approximate)
    let jawLeftX = minX;
    let jawRightX = maxX;
    const jawScanY = Math.floor(mouthY + (foundChinY - mouthY) * 0.55);
    
    for(let x = Math.floor(centerX); x >= 0; x--) {
        const idx = (jawScanY * w + x) * 4;
        if (getSkinProbability(data[idx], data[idx+1], data[idx+2]) < 0.3) {
            jawLeftX = x;
            break;
        }
    }
    for(let x = Math.floor(centerX); x < w; x++) {
        const idx = (jawScanY * w + x) * 4;
        if (getSkinProbability(data[idx], data[idx+1], data[idx+2]) < 0.3) {
            jawRightX = x;
            break;
        }
    }
    // Fallback
    if (jawLeftX <= minX + 2) jawLeftX = cheekLeftX + (chin.x - cheekLeftX) * 0.3;
    if (jawRightX >= maxX - 2) jawRightX = cheekRightX + (chin.x - cheekRightX) * 0.3;

    const invScale = 1 / scale;
    return {
        leftEye: {x: leftEye.x * invScale, y: leftEye.y * invScale},
        rightEye: {x: rightEye.x * invScale, y: rightEye.y * invScale},
        nose: {x: nose.x * invScale, y: nose.y * invScale},
        mouth: {x: mouth.x * invScale, y: mouth.y * invScale},
        chin: {x: chin.x * invScale, y: chin.y * invScale},
        cheekLeft: {x: cheekLeft.x * invScale, y: cheekLeft.y * invScale},
        cheekRight: {x: cheekRight.x * invScale, y: cheekRight.y * invScale},
        jawLeft: {x: jawLeftX * invScale, y: jawScanY * invScale},
        jawRight: {x: jawRightX * invScale, y: jawScanY * invScale},
        faceBounds: {
            x: minX * invScale, 
            y: minY * invScale, 
            w: faceW * invScale, 
            h: faceH * invScale
        }
    };
};


// Apply list of warps using reverse mapping (to avoid holes)
const applyLiquify = (ctx: CanvasRenderingContext2D, w: number, h: number, warps: WarpPoint[], faceBounds: {x: number, y: number, w: number, h: number}) => {
    if (warps.length === 0) return;

    const srcData = ctx.getImageData(0, 0, w, h);
    const src = srcData.data;
    const dstData = ctx.createImageData(w, h);
    const dst = dstData.data;

    const margin = Math.max(w, h) * 0.15; 
    const startX = Math.max(0, Math.floor(faceBounds.x - margin));
    const startY = Math.max(0, Math.floor(faceBounds.y - margin));
    const endX = Math.min(w, Math.ceil(faceBounds.x + faceBounds.w + margin));
    const endY = Math.min(h, Math.ceil(faceBounds.y + faceBounds.h + margin));

    // Copy everything first
    dst.set(src);

    for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
            let srcX = x;
            let srcY = y;

            // Calculate total displacement from all warps
            for (const warp of warps) {
                const dx = x - warp.x;
                const dy = y - warp.y;
                const distSq = dx*dx + dy*dy;
                const radSq = warp.radius * warp.radius;

                if (distSq < radSq) {
                    const dist = Math.sqrt(distSq);
                    const ratio = dist / warp.radius;
                    
                    // Smooth quadratic falloff for natural skin stretch
                    const factor = Math.pow(1 - ratio*ratio, 2);
                    
                    srcX -= warp.strX * factor;
                    srcY -= warp.strY * factor;
                }
            }

            // CLAMP TO EDGES
            srcX = Math.max(0, Math.min(w - 1.01, srcX));
            srcY = Math.max(0, Math.min(h - 1.01, srcY));

            // Bilinear Interpolation
            const x0 = Math.floor(srcX);
            const x1 = x0 + 1;
            const y0 = Math.floor(srcY);
            const y1 = y0 + 1;

            const wx = srcX - x0;
            const wy = srcY - y0;
            
            const i00 = (y0 * w + x0) * 4;
            const i10 = (y0 * w + x1) * 4;
            const i01 = (y1 * w + x0) * 4;
            const i11 = (y1 * w + x1) * 4;
            
            const dstIdx = (y * w + x) * 4;

            for (let c = 0; c < 4; c++) {
                const top = src[i00 + c] * (1 - wx) + src[i10 + c] * wx;
                const bottom = src[i01 + c] * (1 - wx) + src[i11 + c] * wx;
                dst[dstIdx + c] = top * (1 - wy) + bottom * wy;
            }
        }
    }
    
    ctx.putImageData(dstData, 0, 0);
};

/**
 * BEAUTY PROCESSOR (Backend API Integration)
 * Uses backend API for advanced beauty processing with MediaPipe face detection
 */
/**
 * Convert BeautyValues to backend-compatible format
 * Backend model only accepts specific fields (matches BeautyConfig in backend/models.py)
 */
const formatBeautyConfigForBackend = (values: BeautyValues) => {
    return {
        skinMode: values.skinMode,
        faceMode: values.faceMode,
        skinValues: values.skinValues,
        acneMode: {
            auto: values.acneMode.auto,
            manualPoints: values.acneMode.manualPoints.map(p => ({
                x: p.x,
                y: p.y
            }))
        },
        faceValues: values.faceValues,
        eyeValues: values.eyeValues,
        eyeMakeup: values.eyeMakeup,
        mouthValues: {
            smile: values.mouthValues.smile
            // Backend only accepts 'smile', ignore volume, heart, teethWhiten
        },
        lipstick: values.lipstick,
        hairValues: values.hairValues,
        hairColor: values.hairColor
    };
};

export const processImageBeauty = async (
    imgSource: string,
    values: BeautyValues
): Promise<string> => {
    try {
        const response = await fetch(imgSource);
        const blob = await response.blob();
        const formData = new FormData();
        formData.append('image', blob, `beauty-${Date.now()}.jpg`);
        
        // Format values to match backend BeautyConfig model exactly
        const backendConfig = formatBeautyConfigForBackend(values);
        formData.append('beautyConfig', JSON.stringify(backendConfig));

        const apiResponse = await fetch(`${BEAUTY_BACKEND_URL}/api/beauty/apply`, {
            method: 'POST',
            body: formData
        });

        if (!apiResponse.ok) {
            const errorText = await apiResponse.text();
            throw new Error(`Beauty backend error (${apiResponse.status}): ${errorText}`);
        }

        const payload = await apiResponse.json();
        if (!payload?.image) {
            throw new Error('Beauty backend response missing image data');
        }
        return payload.image;
    } catch (error) {
        console.error('processImageBeauty failed, fallback to client-side processing', error);
        // Fallback to client-side processing if backend fails
        return processImageBeautyClientSide(imgSource, values);
    }
};

/**
 * CLIENT-SIDE BEAUTY PROCESSOR (Fallback)
 * Used when backend is unavailable
 */
const processImageBeautyClientSide = (
    imgSource: string,
    values: BeautyValues
): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = imgSource;
        
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (!ctx) { reject('No context'); return; }

            const w = canvas.width;
            const h = canvas.height;
            
            ctx.drawImage(img, 0, 0);

            const { smooth, whiten, even, korean, texture } = values.skinValues;
            const { auto: autoAcne, manualPoints } = values.acneMode;
            const isStrongMode = values.skinMode === 'strong';
            const fv = values.faceValues;

            // 1. DETECT LANDMARKS & SKIN MASK
            const landmarks = detectLandmarks(ctx, w, h);
            
            // Skin mask generation (Full Resolution)
            const imageData = ctx.getImageData(0, 0, w, h);
            const data = imageData.data;
            const skinMask = new Float32Array(w * h); 
            const edgeMap = computeGradientMap(data, w, h);
            let totalCb = 0, totalCr = 0, totalY = 0;
            let skinSum = 0;

            for (let i = 0; i < data.length; i += 4) {
                const r = data[i], g = data[i+1], b = data[i+2];
                const prob = getSkinProbability(r, g, b);
                skinMask[i/4] = prob;
                
                if (prob > 0.5) {
                    const { y, cb, cr } = rgbToYcbcr(r, g, b);
                    totalCb += cb; totalCr += cr; totalY += y;
                    skinSum++;
                }
            }
            const avgCb = skinSum > 0 ? totalCb / skinSum : 128;
            const avgCr = skinSum > 0 ? totalCr / skinSum : 128;

            
            // 2. APPLY FACE WARPS (LIQUIFY) with DETECTED LANDMARKS
            if (landmarks) {
                const { nose, chin, mouth, faceBounds: fb, jawLeft, jawRight, cheekLeft, cheekRight } = landmarks;
                const faceW = fb.w;
                const faceH = fb.h;
                const warps: WarpPoint[] = [];

                if (fv.slim !== 0) {
                    const maxDisp = faceW * 0.05; 
                    const str = (fv.slim / 100) * maxDisp;
                    warps.push({ x: cheekLeft.x, y: cheekLeft.y, radius: faceW * 0.2, strX: str * 0.8, strY: 0 });
                    warps.push({ x: cheekRight.x, y: cheekRight.y, radius: faceW * 0.2, strX: -str * 0.8, strY: 0 });
                    warps.push({ x: jawLeft.x, y: jawLeft.y, radius: faceW * 0.25, strX: str, strY: -str*0.2 });
                    warps.push({ x: jawRight.x, y: jawRight.y, radius: faceW * 0.25, strX: -str, strY: -str*0.2 });
                }
                if (fv.vline !== 0) {
                    const maxDisp = faceW * 0.05;
                    const str = (fv.vline / 100) * maxDisp;
                    const jawY = jawLeft.y * 0.9 + chin.y * 0.1; 
                    warps.push({ x: jawLeft.x + faceW*0.05, y: jawY, radius: faceW*0.2, strX: str, strY: -str*0.2 });
                    warps.push({ x: jawRight.x - faceW*0.05, y: jawY, radius: faceW*0.2, strX: -str, strY: -str*0.2 });
                    const chinSideLeft = {x: chin.x - faceW*0.15, y: chin.y - faceH*0.05};
                    const chinSideRight = {x: chin.x + faceW*0.15, y: chin.y - faceH*0.05};
                    warps.push({ x: chinSideLeft.x, y: chinSideLeft.y, radius: faceW*0.12, strX: str*0.5, strY: -str*0.1 });
                    warps.push({ x: chinSideRight.x, y: chinSideRight.y, radius: faceW*0.12, strX: -str*0.5, strY: -str*0.1 });
                }
                if (fv.chinShrink !== 0) {
                     const chinToMouthDist = Math.max(10, Math.abs(chin.y - mouth.y));
                     const radius = chinToMouthDist * 1.2; 
                     const anchorY = chin.y + radius * 0.2; 
                     const str = fv.chinShrink * (faceH * 0.001); 
                     warps.push({ x: chin.x, y: anchorY, radius: radius, strX: 0, strY: -str });
                }
                if (fv.forehead !== 0) {
                    const str = fv.forehead * (faceH * 0.0008); 
                    const foreheadY = fb.y + faceH * 0.1;
                    warps.push({ x: nose.x, y: foreheadY, radius: faceW*0.5, strX: 0, strY: str });
                }
                if (fv.jaw !== 0) {
                    const str = fv.jaw * (faceW * 0.0006); 
                    warps.push({ x: jawLeft.x, y: jawLeft.y, radius: faceW*0.18, strX: str, strY: -str * 0.3 });
                    warps.push({ x: jawRight.x, y: jawRight.y, radius: faceW*0.18, strX: -str, strY: -str * 0.3 });
                }
                const noseW = faceW * 0.12; 
                if (fv.noseSlim !== 0) {
                    const str = fv.noseSlim * (faceW * 0.0004);
                    warps.push({ x: nose.x - noseW, y: nose.y, radius: noseW * 0.8, strX: str, strY: 0 });
                    warps.push({ x: nose.x + noseW, y: nose.y, radius: noseW * 0.8, strX: -str, strY: 0 });
                }
                if (fv.noseBridge !== 0) {
                    const str = fv.noseBridge * (faceW * 0.0005);
                    const bridgeY = nose.y - faceH * 0.15;
                    warps.push({ x: nose.x - noseW*0.5, y: bridgeY, radius: noseW*0.7, strX: str, strY: 0 });
                    warps.push({ x: nose.x + noseW*0.5, y: bridgeY, radius: noseW*0.7, strX: -str, strY: 0 });
                }

                applyLiquify(ctx, w, h, warps, fb);
            }

            // 3. PREPARE LAYERS FOR SMOOTHING & ACNE
            const warpedImageData = ctx.getImageData(0, 0, w, h);
            const warpedData = warpedImageData.data; 

            let smoothData: Uint8ClampedArray | null = null;
            let acneCleanData: Uint8ClampedArray | null = null;
            let acneDetailData: Uint8ClampedArray | null = null;
            let healedSkinData: Uint8ClampedArray | null = null;

            if (smooth > 0 || autoAcne) {
                const offCanvas = document.createElement('canvas');
                offCanvas.width = w; offCanvas.height = h;
                const oCtx = offCanvas.getContext('2d');
                if (oCtx) {
                    oCtx.putImageData(warpedImageData, 0, 0); 
                    
                    // A. For Smoothing
                    const smoothRad = isStrongMode ? 12 : 6;
                    oCtx.filter = `blur(${smoothRad}px)`;
                    oCtx.drawImage(offCanvas, 0, 0); 
                    smoothData = oCtx.getImageData(0, 0, w, h).data;
                    
                    // B. For Acne Logic
                    if (autoAcne) {
                        oCtx.putImageData(warpedImageData, 0, 0);
                        oCtx.filter = `blur(16px)`; 
                        oCtx.drawImage(offCanvas, 0, 0);
                        acneCleanData = oCtx.getImageData(0, 0, w, h).data;

                        oCtx.putImageData(warpedImageData, 0, 0);
                        oCtx.filter = `blur(4px)`; 
                        oCtx.drawImage(offCanvas, 0, 0);
                        acneDetailData = oCtx.getImageData(0, 0, w, h).data;

                        oCtx.putImageData(warpedImageData, 0, 0);
                        oCtx.filter = `blur(12px)`;
                        oCtx.drawImage(offCanvas, 0, 0);
                        healedSkinData = oCtx.getImageData(0, 0, w, h).data;
                        
                        for(let k=0; k<healedSkinData.length; k+=4) {
                            const noise = (Math.random() - 0.5) * 10;
                            healedSkinData[k] = clamp(healedSkinData[k] + noise);
                            healedSkinData[k+1] = clamp(healedSkinData[k+1] + noise);
                            healedSkinData[k+2] = clamp(healedSkinData[k+2] + noise);
                        }
                    }
                }
            }

            // 4. MAIN PIXEL LOOP
            const whitenStr = whiten / 100;
            const evenStr = even / 100;
            const koreanStr = korean / 100;
            const smoothStr = smooth / 100;

            for (let i = 0; i < warpedData.length; i += 4) {
                const idx = i / 4;
                const maskVal = skinMask[idx]; 
                
                if (maskVal > 0.1) {
                    let r = warpedData[i], g = warpedData[i+1], b = warpedData[i+2];
                    const { y, cb, cr } = rgbToYcbcr(r, g, b);

                    // A. AI ACNE
                    if (autoAcne && acneCleanData && acneDetailData && healedSkinData) {
                        const isSafeLuma = y > 50; 
                        const isLips = (cr > 150 && cb < 120); 
                        const isEdge = edgeMap[idx] > 40; 

                        if (isSafeLuma && !isLips && !isEdge) {
                            const dr = acneDetailData[i], dg = acneDetailData[i+1], db = acneDetailData[i+2];
                            const ar = acneCleanData[i], ag = acneCleanData[i+1], ab = acneCleanData[i+2];

                            const { y: dy, cr: dcr } = rgbToYcbcr(dr, dg, db);
                            const { y: ay, cr: acr } = rgbToYcbcr(ar, ag, ab);

                            const isDarker = (ay - dy) > 5;
                            const isRedder = (dcr - acr) > 2; 
                            const isMole = (ay - dy) > 45; 

                            let acneScore = 0;
                            if (!isMole && isDarker) {
                                if (isRedder) {
                                    acneScore = (dcr - acr) * 3 + (ay - dy); 
                                } else if ((ay - dy) > 10 && (ay - dy) < 35) {
                                    acneScore = (ay - dy) * 1.5;
                                }
                            }

                            if (acneScore > 15) {
                                let factor = Math.min(1, (acneScore - 15) / 30);
                                factor *= maskVal; 

                                const hr = healedSkinData[i], hg = healedSkinData[i+1], hb = healedSkinData[i+2];
                                r = r * (1-factor) + hr * factor;
                                g = g * (1-factor) + hg * factor;
                                b = b * (1-factor) + hb * factor;
                            }
                        }
                    }

                    // B. SMOOTHING
                    if (smoothData && smooth > 0) {
                        const sr = smoothData[i], sg = smoothData[i+1], sb = smoothData[i+2];
                        const diff = Math.abs(r - sr) + Math.abs(g - sg) + Math.abs(b - sb);
                        const threshold = isStrongMode ? 60 : 30;
                        
                        if (diff < threshold) {
                             const alpha = smoothStr * maskVal * (1 - diff/threshold); 
                             r = r * (1 - alpha) + sr * alpha;
                             g = g * (1 - alpha) + sg * alpha;
                             b = b * (1 - alpha) + sb * alpha;
                        }
                    }
                    
                    let curY = 0.299*r + 0.587*g + 0.114*b;
                    let curCb = 128 - 0.168736*r - 0.331264*g + 0.5*b;
                    let curCr = 128 + 0.5*r - 0.418688*g - 0.081312*b;

                    // C. WHITENING
                    if (whiten > 0) {
                        const boost = Math.log10(curY + 1) * (whitenStr * 40); 
                        curY = Math.min(255, curY + boost);
                    }

                    // D. EVEN TONE
                    if (even > 0) {
                        const strength = evenStr * maskVal * 0.5;
                        curCb = curCb * (1 - strength) + avgCb * strength;
                        curCr = curCr * (1 - strength) + avgCr * strength;
                    }

                    // E. KOREAN DEWY
                    if (korean > 0) {
                        if (curY > 180) {
                            const glow = (curY - 180) * koreanStr * 0.8;
                            curY = Math.min(255, curY + glow);
                        }
                    }

                    const newRgb = ycbcrToRgb(curY, curCb, curCr);
                    r = newRgb.r; g = newRgb.g; b = newRgb.b;

                    // F. TEXTURE KEEPER
                    if (texture > 0) {
                         const noise = (Math.random() - 0.5) * (texture * 0.3);
                         r = clamp(r + noise);
                         g = clamp(g + noise);
                         b = clamp(b + noise);
                    }

                    warpedData[i] = r; warpedData[i+1] = g; warpedData[i+2] = b;
                }
            }
            
            ctx.putImageData(warpedImageData, 0, 0);

            // 5. MANUAL ACNE REMOVAL
            if (manualPoints.length > 0) {
                const healRadius = Math.max(3, Math.min(w, h) * 0.008); 
                
                manualPoints.forEach(p => {
                    const cx = (p.x / 100) * w;
                    const cy = (p.y / 100) * h;
                    
                    const sx = Math.max(0, Math.floor(cx - healRadius));
                    const sy = Math.max(0, Math.floor(cy - healRadius));
                    const sw = Math.min(w - sx, healRadius * 2);
                    const sh = Math.min(h - sy, healRadius * 2);
                    
                    if (sw > 0 && sh > 0) {
                        const pCanvas = document.createElement('canvas');
                        pCanvas.width = sw; pCanvas.height = sh;
                        const pCtx = pCanvas.getContext('2d');
                        if(pCtx) {
                            pCtx.drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh);
                            pCtx.filter = `blur(${healRadius * 0.6}px)`; 
                            pCtx.drawImage(pCanvas, 0, 0); 
                            pCtx.drawImage(pCanvas, 0, 0);
                            
                            const pData = pCtx.getImageData(0, 0, sw, sh);
                            const pd = pData.data;
                            for(let k=0; k<pd.length; k+=4) {
                                const noise = (Math.random() - 0.5) * 4;
                                pd[k] = clamp(pd[k] + noise);
                                pd[k+1] = clamp(pd[k+1] + noise);
                                pd[k+2] = clamp(pd[k+2] + noise);
                            }
                            pCtx.putImageData(pData, 0, 0);

                            ctx.save();
                            ctx.beginPath();
                            ctx.arc(cx, cy, healRadius * 0.7, 0, Math.PI * 2);
                            ctx.closePath();
                            
                            const grad = ctx.createRadialGradient(cx, cy, healRadius*0.3, cx, cy, healRadius*0.8);
                            grad.addColorStop(0, "rgba(0,0,0,1)");
                            grad.addColorStop(1, "rgba(0,0,0,0)");
                            
                            ctx.clip();
                            ctx.drawImage(pCanvas, sx, sy);
                            ctx.restore();
                        }
                    }
                });
            }

            resolve(canvas.toDataURL('image/jpeg', 0.95));
        };
        img.onerror = reject;
    });
};

// MAP Filter IDs to Gradients/Colors
const FILTER_PRESETS: Record<string, { type: 'gradient' | 'color', value: string, mode: GlobalCompositeOperation, opacityBase: number }> = {
    'trend_glow': { type: 'gradient', value: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)', mode: 'soft-light', opacityBase: 0.6 },
    'trend_city': { type: 'gradient', value: 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)', mode: 'overlay', opacityBase: 0.5 },
    'kor_peach': { type: 'gradient', value: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)', mode: 'soft-light', opacityBase: 0.5 },
    'kor_beige': { type: 'gradient', value: 'linear-gradient(135deg, #eacda3 0%, #d6ae7b 100%)', mode: 'soft-light', opacityBase: 0.5 },
    'kor_snow': { type: 'gradient', value: 'linear-gradient(135deg, #dfe9f3 0%, #ffffff 100%)', mode: 'screen', opacityBase: 0.4 },
    'jp_fuji': { type: 'gradient', value: 'linear-gradient(135deg, #96fbc4 0%, #f9f586 100%)', mode: 'overlay', opacityBase: 0.4 },
    'jp_street': { type: 'gradient', value: 'linear-gradient(135deg, #09203f 0%, #537895 100%)', mode: 'exclusion', opacityBase: 0.3 },
    'jp_sakura': { type: 'gradient', value: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)', mode: 'soft-light', opacityBase: 0.5 },
    'pastel_milk': { type: 'gradient', value: 'linear-gradient(135deg, #fff1eb 0%, #ace0f9 100%)', mode: 'screen', opacityBase: 0.4 },
    'pastel_lilac': { type: 'gradient', value: 'linear-gradient(135deg, #c471f5 0%, #fa71cd 100%)', mode: 'soft-light', opacityBase: 0.4 },
    'pastel_cloud': { type: 'gradient', value: 'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)', mode: 'overlay', opacityBase: 0.4 },
    'film_gold': { type: 'gradient', value: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', mode: 'soft-light', opacityBase: 0.5 },
    'film_retro': { type: 'gradient', value: 'linear-gradient(135deg, #243949 0%, #517fa4 100%)', mode: 'overlay', opacityBase: 0.5 },
    'bw_soft': { type: 'gradient', value: 'linear-gradient(135deg, #c9c9c9 0%, #f2f2f2 100%)', mode: 'luminosity', opacityBase: 1.0 },
    'bw_noir': { type: 'gradient', value: 'linear-gradient(135deg, #000000 0%, #434343 100%)', mode: 'color', opacityBase: 1.0 },
};

/**
 * FILTER PROCESSOR
 */
export const processImageFilters = (
    imgSource: string,
    values: FilterValues
): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = imgSource;

        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) { reject('No context'); return; }

            const w = canvas.width;
            const h = canvas.height;

            // Draw base image
            ctx.drawImage(img, 0, 0);

            if (values.selectedPreset && FILTER_PRESETS[values.selectedPreset]) {
                const preset = FILTER_PRESETS[values.selectedPreset];
                const intensity = values.intensity / 100;
                
                ctx.save();
                
                // Parse linear-gradient string to create CanvasGradient
                // Simple parser for "linear-gradient(deg, color stop, color stop)"
                // For robust parsing, we'd need regex, but here we approximate based on known strings.
                // Actually, simpler approach: Draw gradient on a temp canvas then blend.
                
                if (preset.type === 'gradient') {
                    const gradStr = preset.value;
                    // Match colors roughly: #[0-9a-f]{6}
                    const colors = gradStr.match(/#[0-9a-fA-F]{6}/g);
                    
                    if (colors && colors.length >= 2) {
                        const gradient = ctx.createLinearGradient(0, 0, w, h);
                        gradient.addColorStop(0, colors[0]);
                        gradient.addColorStop(1, colors[1]);
                        
                        ctx.globalCompositeOperation = preset.mode;
                        ctx.globalAlpha = preset.opacityBase * intensity;
                        ctx.fillStyle = gradient;
                        ctx.fillRect(0, 0, w, h);
                    }
                    
                    // If it's B&W or special modes, we might need extra steps
                    if (preset.mode === 'luminosity' || preset.mode === 'color') {
                         // Ensure grayscale underneath if needed, but blend mode handles most
                    }
                }
                
                ctx.restore();
            }

            resolve(canvas.toDataURL('image/jpeg', 0.95));
        };
        img.onerror = reject;
    });
};

/**
 * EFFECTS PROCESSOR
 */
export const processImageEffects = (
    imgSource: string,
    values: EffectsValues
): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = imgSource;
        
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (!ctx) { reject('No context'); return; }

            const w = canvas.width;
            const h = canvas.height;
            
            // Draw original
            ctx.drawImage(img, 0, 0);
            
            const intensityMap: Record<string, number> = {
                 'bokeh': values.bokeh.intensity,
                 'lightLeak': values.lightLeak.intensity,
                 'filmGrain': values.filmGrain,
                 'vignette': values.vignette,
                 'portraitBlur': values.portraitBlur
            };

            // 1. GRAIN
            if (values.filmGrain > 0) {
                const imageData = ctx.getImageData(0, 0, w, h);
                const data = imageData.data;
                const strength = values.filmGrain * 0.8;
                
                for (let i = 0; i < data.length; i += 4) {
                    const noise = (Math.random() - 0.5) * strength;
                    data[i] = clamp(data[i] + noise);
                    data[i+1] = clamp(data[i+1] + noise);
                    data[i+2] = clamp(data[i+2] + noise);
                }
                ctx.putImageData(imageData, 0, 0);
            }

            // 2. BOKEH
            if (values.bokeh.intensity > 0) {
                 const intensity = values.bokeh.intensity / 100;
                 const count = Math.floor(20 * intensity);
                 ctx.save();
                 ctx.globalCompositeOperation = 'screen';
                 const colors = values.bokeh.preset === 'soft_pink' ? 'rgba(255,192,203,' : 
                                values.bokeh.preset === 'golden_orbit' ? 'rgba(255,215,0,' : 'rgba(173,216,230,';
                 
                 for(let i=0; i<count; i++) {
                    const x = Math.random() * w;
                    const y = Math.random() * h;
                    const r = (Math.min(w,h) * 0.05) * (0.5 + Math.random());
                    const opacity = Math.random() * 0.3 * intensity;
                    
                    ctx.beginPath();
                    ctx.arc(x, y, r, 0, Math.PI * 2);
                    ctx.fillStyle = `${colors}${opacity})`;
                    ctx.fill();
                 }
                 ctx.restore();
            }

            // 3. LIGHT LEAK
            if (values.lightLeak.intensity > 0) {
                 const intensity = values.lightLeak.intensity / 100;
                 ctx.save();
                 ctx.globalCompositeOperation = 'screen';
                 ctx.globalAlpha = intensity;
                 
                 const grad = ctx.createLinearGradient(0, 0, w*0.5, h);
                 if (values.lightLeak.preset === 'warm_sun') {
                     grad.addColorStop(0, 'rgba(255,152,0,0.5)');
                     grad.addColorStop(1, 'transparent');
                 } else if (values.lightLeak.preset === 'rose_glow') {
                     grad.addColorStop(0, 'rgba(233,30,99,0.5)');
                     grad.addColorStop(1, 'transparent');
                 } else {
                     grad.addColorStop(0, 'rgba(33,150,243,0.5)');
                     grad.addColorStop(1, 'transparent');
                 }
                 
                 ctx.fillStyle = grad;
                 ctx.fillRect(0, 0, w, h);
                 ctx.restore();
            }

            // 4. VIGNETTE
            if (values.vignette > 0) {
                 const intensity = values.vignette / 100;
                 ctx.save();
                 const grad = ctx.createRadialGradient(w/2, h/2, Math.min(w,h)*0.4, w/2, h/2, Math.max(w,h)*0.8);
                 grad.addColorStop(0, 'rgba(0,0,0,0)');
                 grad.addColorStop(1, `rgba(0,0,0,${intensity * 0.8})`);
                 ctx.globalCompositeOperation = 'multiply';
                 ctx.fillStyle = grad;
                 ctx.fillRect(0, 0, w, h);
                 ctx.restore();
            }

            // 5. PORTRAIT BLUR (Simple Tilt-Shift approx)
            if (values.portraitBlur > 0) {
                 // Since we don't have depth map, we apply radial blur around center
                 const intensity = values.portraitBlur / 100;
                 // Create blur canvas
                 const blurCanvas = document.createElement('canvas');
                 blurCanvas.width = w; blurCanvas.height = h;
                 const bCtx = blurCanvas.getContext('2d');
                 if (bCtx) {
                     bCtx.filter = `blur(${intensity * 10}px)`;
                     bCtx.drawImage(canvas, 0, 0);
                     bCtx.filter = 'none';
                     
                     // Masking: clear center of blur canvas
                     bCtx.globalCompositeOperation = 'destination-out';
                     const grad = bCtx.createRadialGradient(w/2, h/2, Math.min(w,h)*0.2, w/2, h/2, Math.max(w,h)*0.7);
                     grad.addColorStop(0, 'rgba(0,0,0,1)');
                     grad.addColorStop(1, 'rgba(0,0,0,0)');
                     bCtx.fillStyle = grad;
                     bCtx.fillRect(0, 0, w, h);
                     
                     ctx.save();
                     ctx.drawImage(blurCanvas, 0, 0);
                     ctx.restore();
                 }
            }
            
            resolve(canvas.toDataURL('image/jpeg', 0.95));
        };
        img.onerror = reject;
    });
};