
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

        } else if (moduleId === 'ai_beauty_full') {
            // Tự chỉnh toàn diện - Chuyên nghiệp: Cân bằng ánh sáng, màu sắc, độ nét cho TOÀN BỘ ẢNH
            // Phù hợp: Phong cảnh, sản phẩm, kiến trúc, chân dung, mọi loại ảnh
            const adjustmentSchema: Schema = {
                type: Type.OBJECT,
                properties: {
                    exposure: { type: Type.INTEGER, description: "Exposure correction (-80 to 80). Analyze histogram and correct overall brightness for optimal exposure." },
                    contrast: { type: Type.INTEGER, description: "Contrast enhancement (-50 to 50). Add depth and dimension while maintaining natural look." },
                    highlights: { type: Type.INTEGER, description: "Highlights recovery (-80 to 0). Recover blown highlights and preserve detail in bright areas." },
                    shadows: { type: Type.INTEGER, description: "Shadows lift (0 to 80). Lift dark areas to reveal hidden details without creating artificial look." },
                    whites: { type: Type.INTEGER, description: "Whites adjustment (-50 to 50). Fine-tune brightest points for proper white balance." },
                    blacks: { type: Type.INTEGER, description: "Blacks adjustment (-50 to 50). Fine-tune darkest points for proper black point." },
                    saturation: { type: Type.INTEGER, description: "Saturation adjustment (-30 to 30). Subtle color enhancement, avoid oversaturation." },
                    vibrance: { type: Type.INTEGER, description: "Vibrance boost (0 to 40). Enhance muted colors while protecting already vibrant areas." },
                    temp: { type: Type.INTEGER, description: "Color temperature (-40 to 40). Correct white balance for natural, accurate colors." },
                    tint: { type: Type.INTEGER, description: "Tint correction (-30 to 30). Remove color cast (green/magenta) for neutral appearance." },
                    clarity: { type: Type.INTEGER, description: "Clarity enhancement (0 to 50). Enhance mid-tone contrast and local detail definition." },
                    dehaze: { type: Type.INTEGER, description: "Dehaze (0 to 60). Remove atmospheric haze and improve overall clarity." },
                    denoise: { type: Type.INTEGER, description: "Noise reduction (0 to 40). Reduce digital noise while preserving detail." }
                },
                required: ["exposure", "contrast", "highlights", "shadows", "vibrance", "clarity"]
            };

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: {
                    parts: [
                        { text: `You are a master photo editor with 20+ years of experience. Your task is to perform PROFESSIONAL, BALANCED, and HARMONIOUS image correction for the ENTIRE image (not just faces).

ANALYSIS APPROACH:
1. Examine the image type: landscape, portrait, product, architecture, street, etc.
2. Analyze histogram: Check for proper exposure distribution
3. Assess color balance: Look for color casts, white balance issues
4. Evaluate dynamic range: Check if highlights are blown or shadows are crushed
5. Check sharpness: Assess overall image clarity and detail

PROFESSIONAL CORRECTION PRINCIPLES:
- EXPOSURE: Aim for balanced histogram, avoid clipping. If image is well-exposed, make minimal changes (0-10)
- CONTRAST: Enhance depth subtly. For flat images, add 15-25. For already contrasty images, reduce 5-15
- HIGHLIGHTS: Always recover if blown (-30 to -60). If not blown, minimal adjustment (-10 to 0)
- SHADOWS: Lift crushed shadows (20-50). If shadows are fine, minimal lift (0-15)
- COLOR: Use vibrance (10-30) more than saturation (0-15) to protect skin tones and avoid oversaturation
- TEMPERATURE: Correct white balance naturally. Only adjust if there's clear color cast (-20 to 20)
- CLARITY: Moderate enhancement (15-35). Higher for soft images, lower for already sharp images
- DEHAZE: Apply if atmospheric haze is present (20-50), otherwise 0-10

QUALITY STANDARDS:
- Results must look NATURAL and PROFESSIONAL, not over-processed
- Preserve original mood and atmosphere
- Maintain color accuracy
- Enhance without destroying original character
- If image is already excellent, make minimal adjustments

Return integer values only.` },
                        { inlineData: { mimeType, data: base64Data } }
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
                
                // Apply intensity scaling with professional dampening
                const factor = (intensity / 100) * 0.85; // 15% dampening for professional results
                const scaledAdjustments: Record<string, number> = {};
                
                Object.keys(adjustments).forEach(key => {
                    const value = adjustments[key];
                    if (key === 'clarity' || key === 'dehaze' || key === 'denoise') {
                        scaledAdjustments[key] = Math.round(value * factor);
                    } else {
                        scaledAdjustments[key] = Math.round(value * factor);
                    }
                });

                result.adjustments = {
                    basic: scaledAdjustments
                };
                result.summary = "Đã tự động cân bằng ánh sáng, màu sắc và độ nét toàn diện cho toàn bộ ảnh.";
                result.steps = [
                    "Phân tích loại ảnh và histogram để xác định vấn đề",
                    "Cân bằng exposure và dynamic range (highlights/shadows)",
                    "Điều chỉnh màu sắc tự nhiên (vibrance, temperature, tint)",
                    "Tăng độ nét và loại bỏ noise/haze một cách chuyên nghiệp"
                ];
            }

        } else if (moduleId === 'ai_beauty_portrait') {
            // Tối ưu chân dung - Chuyên biệt: Chỉ làm đẹp DA và ánh sáng KHUÔN MẶT
            // KHÔNG có điều chỉnh mắt - chỉ tập trung vào da và lighting
            const adjustmentSchema: Schema = {
                type: Type.OBJECT,
                properties: {
                    // Face lighting adjustments (subtle, only for face area)
                    faceExposure: { type: Type.INTEGER, description: "Face exposure adjustment (-30 to 30). Slightly brighten face if needed, very subtle." },
                    faceHighlights: { type: Type.INTEGER, description: "Face highlights (-40 to 0). Soften harsh highlights on face, recover detail." },
                    faceShadows: { type: Type.INTEGER, description: "Face shadows lift (0 to 40). Gently lift shadows on face to reveal details." },
                    // Skin beauty adjustments (main focus)
                    skinSmooth: { type: Type.INTEGER, description: "Skin smoothing (20 to 70). Smooth skin texture while preserving natural pores and details. Moderate for natural look." },
                    skinWhiten: { type: Type.INTEGER, description: "Skin brightening (5 to 35). Naturally brighten skin tone. Keep subtle for professional look." },
                    skinEven: { type: Type.INTEGER, description: "Skin evenness (15 to 80). Even out skin tone, reduce discoloration, blemishes, and redness." },
                    // Subtle color enhancement for portrait
                    portraitVibrance: { type: Type.INTEGER, description: "Portrait vibrance (0 to 25). Subtle color enhancement for natural, healthy skin glow." }
                },
                required: ["skinSmooth", "skinWhiten", "skinEven"]
            };

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: {
                    parts: [
                        { text: `You are a professional portrait retoucher specializing in SKIN ENHANCEMENT and FACE LIGHTING. Your expertise is making skin look flawless while maintaining natural texture and character.

PORTRAIT ANALYSIS:
1. Assess skin condition: texture, tone, blemishes, discoloration
2. Evaluate face lighting: harsh highlights, deep shadows, overall exposure
3. Check skin color: redness, unevenness, overall tone
4. Identify areas needing enhancement: forehead, cheeks, chin, neck

PROFESSIONAL SKIN RETOUCHING PRINCIPLES:
- SKIN SMOOTHING: Moderate level (35-55) to preserve natural texture. Higher (55-70) only if skin is very rough. Lower (20-35) if skin is already smooth.
- SKIN WHITENING: Subtle and natural (10-25). Higher (25-35) only if skin is significantly dark. Always maintain natural skin tone.
- SKIN EVENNESS: Focus on reducing discoloration and blemishes (30-65). Higher if there are visible blemishes/redness. Lower if skin is already even.
- FACE LIGHTING: Very subtle adjustments. Only lift shadows (10-30) if face is too dark. Only reduce highlights (-20 to -5) if there are harsh highlights.
- COLOR: Minimal vibrance boost (5-20) for healthy glow, avoid oversaturation

QUALITY STANDARDS:
- Skin must look NATURAL and PROFESSIONAL, not plastic or over-processed
- Preserve skin texture and pores (especially in strong mode)
- Maintain natural skin color and undertones
- Face lighting should be balanced and flattering
- Overall result: Professional magazine-quality portrait

IMPORTANT: DO NOT adjust eyes. Focus ONLY on skin and face lighting.
Return integer values only.` },
                        { inlineData: { mimeType, data: base64Data } }
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
                
                // Apply intensity scaling with professional dampening
                const factor = (intensity / 100) * 0.9; // 10% dampening for natural results
                
                // Scale beauty values (0-100 range)
                const beautyValues: Record<string, number> = {};
                if (adjustments.skinSmooth !== undefined) beautyValues.smooth = Math.round(adjustments.skinSmooth * factor);
                if (adjustments.skinWhiten !== undefined) beautyValues.whiten = Math.round(adjustments.skinWhiten * factor);
                if (adjustments.skinEven !== undefined) beautyValues.even = Math.round(adjustments.skinEven * factor);

                // Scale basic adjustments for face lighting (very subtle)
                const basicAdjustments: Record<string, number> = {};
                if (adjustments.faceExposure !== undefined) basicAdjustments.exposure = Math.round(adjustments.faceExposure * factor);
                if (adjustments.faceHighlights !== undefined) basicAdjustments.highlights = Math.round(adjustments.faceHighlights * factor);
                if (adjustments.faceShadows !== undefined) basicAdjustments.shadows = Math.round(adjustments.faceShadows * factor);
                if (adjustments.portraitVibrance !== undefined) basicAdjustments.vibrance = Math.round(adjustments.portraitVibrance * factor);

                result.adjustments = {
                    basic: basicAdjustments,
                    beauty: {
                        skinValues: beautyValues
                    }
                };
                result.summary = "Đã tối ưu chân dung: làm đẹp da và cân bằng ánh sáng khuôn mặt chuyên nghiệp.";
                result.steps = [
                    "Phân tích tình trạng da và ánh sáng khuôn mặt",
                    "Làm mịn da tự nhiên, giữ nguyên kết cấu da",
                    "Làm sáng và làm đều tone màu da một cách chuyên nghiệp",
                    "Cân bằng ánh sáng khuôn mặt để tạo vẻ đẹp tự nhiên"
                ];
            }

        } else if (moduleId === 'ai_beauty_tone') {
            // AI Smart Tone - Sáng tạo: Phân tích và tạo phong cách màu sắc chuyên nghiệp
            // Tập trung vào tạo mood và style thông qua color grading
            const toneSchema: Schema = {
                type: Type.OBJECT,
                properties: {
                    recommendedTone: { 
                        type: Type.STRING, 
                        description: "Creative color style: 'warm_golden', 'cool_teal', 'cinematic_drama', 'vintage_film', 'modern_clean', 'soft_dreamy', 'vibrant_energetic', 'moody_dark', 'pastel_gentle', 'monochrome_artistic'" 
                    },
                    temp: { type: Type.INTEGER, description: "Temperature shift (-80 to 80) to achieve the creative tone mood." },
                    tint: { type: Type.INTEGER, description: "Tint shift (-60 to 60) for creative color direction (green/magenta)." },
                    saturation: { type: Type.INTEGER, description: "Saturation adjustment (-50 to 50) for tone style. Negative for desaturated looks, positive for rich colors." },
                    vibrance: { type: Type.INTEGER, description: "Vibrance boost (0 to 60) for tone richness. Higher for vibrant styles, lower for muted styles." },
                    contrast: { type: Type.INTEGER, description: "Contrast adjustment (-40 to 60) for tone drama. Higher for cinematic, lower for soft." },
                    highlights: { type: Type.INTEGER, description: "Highlights adjustment (-60 to 40) for tone mood. Lower for moody, higher for bright." },
                    shadows: { type: Type.INTEGER, description: "Shadows adjustment (-40 to 60) for tone depth. Higher for lifted, lower for crushed." },
                    clarity: { type: Type.INTEGER, description: "Clarity for tone definition (0 to 50). Higher for sharp modern, lower for soft dreamy." },
                    explanation: { type: Type.STRING, description: "Creative explanation of the chosen tone style and its artistic intent (max 120 characters)." }
                },
                required: ["recommendedTone", "temp", "tint", "saturation", "vibrance", "contrast", "explanation"]
            };

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: {
                    parts: [
                        { text: `You are a CREATIVE COLORIST and FILM GRADER with expertise in artistic color styling. Your role is to analyze images and create PROFESSIONAL, CREATIVE, and HARMONIOUS color grades that enhance mood and style.

CREATIVE TONE STYLES AVAILABLE:
- 'warm_golden': Golden hour warmth, sunset glow, warm shadows (temp +30 to +60, warm shadows)
- 'cool_teal': Modern teal/orange split, crisp cool tones (temp -30 to -60, cool highlights)
- 'cinematic_drama': High contrast, rich colors, movie-like grading (high contrast, vibrant, dramatic shadows)
- 'vintage_film': Retro film look, faded colors, nostalgic warmth (desaturate -15 to -30, warm temp +20 to +40)
- 'modern_clean': Clean, vibrant, contemporary, balanced (moderate vibrance +20 to +40, balanced temp)
- 'soft_dreamy': Gentle pastels, low contrast, dreamy atmosphere (reduce contrast -20 to -30, soft colors)
- 'vibrant_energetic': Rich, saturated, energetic, bold colors (high saturation +25 to +45, high vibrance)
- 'moody_dark': Dark, moody, atmospheric, crushed shadows (lower highlights -30 to -50, lower shadows -20 to -40)
- 'pastel_gentle': Soft pastels, gentle colors, light and airy (reduce saturation -20 to -35, lift shadows +20 to +40)
- 'monochrome_artistic': Artistic black & white or desaturated with color accent (desaturate -40 to -60, high contrast)

CREATIVE ANALYSIS PROCESS:
1. Analyze image CONTENT: portrait, landscape, urban, nature, product, etc.
2. Assess CURRENT MOOD: bright, dark, neutral, energetic, calm, dramatic
3. Identify COLOR PALETTE: dominant colors, color harmony, color temperature
4. Determine ARTISTIC DIRECTION: What mood/style would enhance this image creatively?
5. Choose the MOST SUITABLE tone that would transform this image artistically

PROFESSIONAL COLOR GRADING PRINCIPLES:
- TEMPERATURE: Shift significantly for warm/cool styles (30-60), minimal for neutral styles (0-20)
- TINT: Use for creative color direction. Teal/orange split: tint -20 to -40. Warm vintage: tint +10 to +30
- SATURATION: Desaturate for vintage/moody (-20 to -40). Boost for vibrant (+20 to +40). Keep moderate for natural
- VIBRANCE: Higher for vibrant/cinematic (30-50). Lower for soft/vintage (5-20)
- CONTRAST: High for cinematic/drama (+30 to +50). Low for soft/dreamy (-20 to -30). Moderate for clean
- HIGHLIGHTS: Lower for moody (-30 to -50). Higher for bright/clean (+15 to +30)
- SHADOWS: Lift for soft/pastel (+25 to +45). Crush for moody (-20 to -35). Moderate for balanced
- CLARITY: Higher for modern/sharp (25-40). Lower for soft/dreamy (5-20)

CREATIVE QUALITY STANDARDS:
- Color grade must be ARTISTIC and PROFESSIONAL, not gimmicky
- Enhance the image's inherent mood and character
- Create visual harmony and balance
- Be bold but tasteful
- Result should look like professional film/photo color grading

Return integer values only.` },
                        { inlineData: { mimeType, data: base64Data } }
                    ]
                },
                config: {
                    responseMimeType: "application/json",
                    responseSchema: toneSchema
                }
            });

            const jsonText = response.text;
            if (jsonText) {
                const toneData = JSON.parse(jsonText);
                
                // Apply intensity scaling with creative dampening
                const factor = (intensity / 100) * 0.9; // 10% dampening for professional creative results
                const scaledAdjustments: Record<string, number> = {};
                
                // Scale numeric adjustments
                ['temp', 'tint', 'saturation', 'vibrance', 'contrast', 'highlights', 'shadows', 'clarity'].forEach(key => {
                    if (toneData[key] !== undefined) {
                        scaledAdjustments[key] = Math.round(toneData[key] * factor);
                    }
                });

                result.adjustments = {
                    basic: scaledAdjustments
                };
                
                // Create creative tone description
                const toneNames: Record<string, string> = {
                    'warm_golden': 'Vàng ấm áp',
                    'cool_teal': 'Xanh mát mẻ',
                    'cinematic_drama': 'Điện ảnh kịch tính',
                    'vintage_film': 'Phim cổ điển',
                    'modern_clean': 'Hiện đại sạch sẽ',
                    'soft_dreamy': 'Mơ màng nhẹ nhàng',
                    'vibrant_energetic': 'Rực rỡ năng động',
                    'moody_dark': 'Tối tâm trạng',
                    'pastel_gentle': 'Pastel dịu dàng',
                    'monochrome_artistic': 'Đơn sắc nghệ thuật'
                };
                
                const toneName = toneNames[toneData.recommendedTone] || toneData.recommendedTone;
                result.summary = `Đã áp dụng phong cách màu: ${toneName}. ${toneData.explanation || ''}`;
                result.steps = [
                    "Phân tích nội dung, tâm trạng và bảng màu hiện tại",
                    `Xác định phong cách màu sáng tạo: ${toneName}`,
                    "Điều chỉnh nhiệt độ màu và hướng màu (tint) cho tone đã chọn",
                    "Tối ưu độ tương phản, highlights/shadows và clarity để tạo mood"
                ];
                result.metrics = {
                    recommendedTone: toneData.recommendedTone,
                    toneName: toneName
                };
            }

        } else {
             result.summary = `Module ${moduleId} executed successfully.`;
        }
    } catch (e: any) {
        console.error("AI Module Error", e);
        throw new Error(e.message || "AI Processing Failed");
    }

    return result;
};
