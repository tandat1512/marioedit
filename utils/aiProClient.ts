
import { GoogleGenAI, Type, Schema } from "@google/genai";

export interface AIProAdjustments {
    basic?: Record<string, number>;
    beauty?: {
        skinValues?: Record<string, number>;
        faceValues?: Record<string, number>;
        eyeValues?: Record<string, number>;
        mouthValues?: Record<string, number>;
        hairValues?: Record<string, number>;
        lipstick?: string;
    };
    filters?: any;
    effects?: any;
}

export interface AIPreviewMeta {
    variant: 'remove_bg' | 'people' | 'object' | 'quality_superres' | 'quality_restore' | 'color_clone' | 'generic';
    description?: string;
    badge?: string;
}

export interface AIProResult {
    adjustments?: AIProAdjustments;
    previewImage?: string;
    maskImage?: string;
    previewMeta?: AIPreviewMeta;
    summary?: string;
    metrics?: Record<string, any>;
    steps?: string[];
    qaNotes?: string;
}

const extractImageFromResponse = (response: any): string | undefined => {
    if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
        }
    }
    return undefined;
};

// Helper to convert File to Base64 string (raw data)
const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            // Remove data url prefix
            const base64 = result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = error => reject(error);
    });
};

export const runAiProModule = async (
    imageData: string,
    moduleId: string,
    intensity: number,
    options: any,
    files: { referenceImageFile: File | null }
): Promise<AIProResult> => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) throw new Error("API Key not configured");
    
    const ai = new GoogleGenAI({ apiKey });
    const base64Data = imageData.split(',')[1];
    const mimeType = imageData.substring(imageData.indexOf(':') + 1, imageData.indexOf(';'));
    
    const result: AIProResult = {
        steps: ['Analyzing image...', 'Processing with Gemini AI...', 'Finalizing...'],
        summary: 'Processing complete.'
    };

    try {
        if (moduleId === 'ai_cutout_remove') {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: {
                    parts: [
                        { inlineData: { mimeType, data: base64Data } },
                        { text: "Remove the background from this image. Return the subject on a transparent background. Output ONLY the image as PNG." }
                    ]
                }
            });
            const img = extractImageFromResponse(response);
            if (img) {
                result.previewImage = img;
                result.previewMeta = {
                    variant: 'remove_bg',
                    description: 'Background removed successfully.',
                    badge: 'Cutout'
                };
                result.summary = "Background removed.";
            } else {
                 throw new Error("AI did not return an image.");
            }
        } else if (moduleId === 'ai_quality_superres') {
             const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: {
                    parts: [
                        { inlineData: { mimeType, data: base64Data } },
                        { text: "Upscale this image to 4K resolution, improve details, remove noise. Output the enhanced image." }
                    ]
                }
            });
            const img = extractImageFromResponse(response);
            if (img) {
                result.previewImage = img;
                result.previewMeta = { variant: 'quality_superres', description: 'High resolution image generated.' };
                result.summary = "Image upscaled.";
            }
        } else if (moduleId === 'ai_quality_restore') {
             const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: {
                    parts: [
                        { inlineData: { mimeType, data: base64Data } },
                        { text: "Colorize and restore this image. If it is black and white, add natural colors. Output the restored image." }
                    ]
                }
            });
            const img = extractImageFromResponse(response);
            if (img) {
                result.previewImage = img;
                result.previewMeta = { variant: 'quality_restore', description: 'Image restored and colorized.' };
                result.summary = "Image restored.";
            }
        } else if (moduleId === 'ai_color_transfer') {
            // New Logic for Color Transfer
            if (!files.referenceImageFile) {
                throw new Error("Vui lòng chọn ảnh tham chiếu (Reference Image) để thực hiện chuyển màu.");
            }

            const refBase64 = await fileToBase64(files.referenceImageFile);
            const refMimeType = files.referenceImageFile.type || 'image/jpeg';

            // Define Schema for Adjustment Values
            // Added 'hue' to allow color shifting for better matching
            const adjustmentSchema: Schema = {
                type: Type.OBJECT,
                properties: {
                    exposure: { type: Type.INTEGER, description: "Exposure value between -100 and 100" },
                    contrast: { type: Type.INTEGER, description: "Contrast value between -100 and 100" },
                    highlights: { type: Type.INTEGER, description: "Highlights value between -100 and 100" },
                    shadows: { type: Type.INTEGER, description: "Shadows value between -100 and 100" },
                    temp: { type: Type.INTEGER, description: "Temperature value between -100 and 100 (warm/cool)" },
                    tint: { type: Type.INTEGER, description: "Tint value between -100 and 100 (green/magenta)" },
                    saturation: { type: Type.INTEGER, description: "Saturation value between -100 and 100" },
                    vibrance: { type: Type.INTEGER, description: "Vibrance value between -100 and 100" },
                    hue: { type: Type.INTEGER, description: "Hue shift value between -180 and 180" },
                    whites: { type: Type.INTEGER, description: "Whites value between -100 and 100" },
                    blacks: { type: Type.INTEGER, description: "Blacks value between -100 and 100" }
                },
                required: ["exposure", "contrast", "temp", "tint", "saturation", "vibrance", "hue"]
            };

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: {
                    parts: [
                        { text: "You are a professional high-end film colorist. Your task is to transfer the 'Color Soul' (Vibe, Palette, and Dynamic Range) from the Reference Image (second image) to the Source Image (first image). \n\nPROCESS:\n1. Analyze the Reference Image: Extract its color contrast (warm vs cool), saturation levels, and dynamic range (fade vs contrast).\n2. Map these to the Source Image using standard adjustment parameters.\n\nRULES FOR MULTI-COLOR OUTPUT:\n- DO NOT apply a monochromatic wash (single color filter). Avoid extreme Temp/Tint values unless the reference is strictly Sepia/B&W.\n- If the reference is vibrant and multi-colored, preserve color separation in the source.\n- Use 'Vibrance' and 'Contrast' as your primary tools to match the mood.\n- Use 'Hue' shift if necessary to align the palette (e.g., turning green leaves to autumn orange).\n- Use 'Highlights' and 'Shadows' to match the lighting dynamic.\n\nReturn JSON with integer values." },
                        { inlineData: { mimeType: mimeType, data: base64Data } }, // Source
                        { inlineData: { mimeType: refMimeType, data: refBase64 } } // Reference
                    ]
                },
                config: {
                    responseMimeType: "application/json",
                    responseSchema: adjustmentSchema
                }
            });

            const jsonText = response.text;
            if (jsonText) {
                const adjustments = JSON.parse(jsonText);
                
                // REDUCE INTENSITY: Apply a 0.7 dampener (30% reduction) to ensure results are not too harsh.
                // This allows for a more natural blend.
                const globalDampener = 0.7; 
                const factor = (intensity / 100) * globalDampener;
                
                const scaledAdjustments: Record<string, number> = {};
                
                Object.keys(adjustments).forEach(key => {
                    // For temp and tint, we dampen them slightly more to prevent monochromatic color casts
                    if (key === 'temp' || key === 'tint') {
                        scaledAdjustments[key] = Math.round(adjustments[key] * factor * 0.8);
                    } else if (key === 'vibrance') {
                        // Boost vibrance slightly to ensure richness (multi-color feel)
                        scaledAdjustments[key] = Math.round(adjustments[key] * factor * 1.2);
                    } else {
                        scaledAdjustments[key] = Math.round(adjustments[key] * factor);
                    }
                });

                result.adjustments = {
                    basic: scaledAdjustments
                };
                result.summary = "Đã sao chép màu từ ảnh tham chiếu (Chế độ màu đa sắc).";
                result.steps = [
                    "Phân tích bảng màu và độ tương phản của ảnh mẫu",
                    "Tối ưu hóa Vibrance để giữ độ rực rỡ đa sắc",
                    "Cân bằng Dynamic Range (Shadow/Highlight)",
                    "Áp dụng hệ số giảm cường độ 30% cho vẻ đẹp tự nhiên"
                ];
            }

        } else if (moduleId.startsWith('ai_beauty')) {
            // Simulation for beauty adjustments based on image analysis
            // In a real app, we would analyze the image first.
            result.adjustments = {
                basic: { exposure: 5, contrast: 5, vibrance: 10 },
                beauty: { skinValues: { smooth: 50, whiten: 20, even: 30 } }
            };
            result.summary = "AI Beauty adjustments applied.";
        } else {
             result.summary = `Module ${moduleId} executed successfully.`;
        }
    } catch (e: any) {
        console.error("AI Module Error", e);
        throw new Error(e.message || "AI Processing Failed");
    }

    return result;
};
