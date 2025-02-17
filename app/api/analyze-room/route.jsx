import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import axios from "axios";

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Configure the model
const generationConfig = {
    temperature: 0.7,
    topP: 0.95,
    topK: 64,
    maxOutputTokens: 65536,
};

export async function POST(req) {
    console.log('analyze-room endpoint hit');
    
    try {
        const { imageUrl, roomType, designType } = await req.json();
        console.log('Request received:', { roomType, designType });

        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash-thinking-exp-01-21",
            generationConfig
        });

        // Fetch image
        const imageResponse = await axios.get(imageUrl, { 
            responseType: 'arraybuffer' 
        });
        
        const base64Image = Buffer.from(imageResponse.data).toString('base64');
        
        // Even more explicit prompt about format
        const prompt = `Analyze this ${roomType} designed in ${designType} style.
        IMPORTANT: Return ONLY a raw JSON object with no markdown formatting, no backticks, and no code block indicators.
        Use exactly this format:
        {
            "furniture": [
                {
                    "type": "string",
                    "style": ["string"],
                    "materials": ["string"],
                    "colors": ["string"],
                    "dimensions": "string",
                    "searchTerms": ["string"]
                }
            ],
            "decor": [
                {
                    "type": "string",
                    "style": ["string"],
                    "colors": ["string"],
                    "searchTerms": ["string"]
                }
            ],
            "structural": {
                "walls": ["string"],
                "flooring": ["string"],
                "windows": ["string"]
            }
        }

        DO NOT include any text before or after the JSON. DO NOT use markdown formatting.`;

        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    mimeType: 'image/jpeg',
                    data: base64Image
                }
            }
        ]);

        const response = await result.response;
        const rawText = response.text();
        
        // Log the raw response to see what we're getting
        console.log('Raw Gemini response:', rawText);

        try {
            // More thorough cleaning of the response
            const cleanedText = rawText
                .replace(/^```json\s*/g, '')     // Remove leading ```json
                .replace(/\s*```$/g, '')         // Remove trailing ```
                .replace(/^```\s*/g, '')         // Remove other code block starts
                .replace(/^{/m, '{')             // Ensure clean JSON start
                .replace(/}$/m, '}')             // Ensure clean JSON end
                .trim();                         // Remove extra whitespace
            
            console.log('Cleaned response:', cleanedText);
            
            const analysis = JSON.parse(cleanedText);
            return NextResponse.json({ analysis });
        } catch (parseError) {
            console.error('Parse error. Raw response:', {
                rawResponse: rawText,
                error: parseError.message
            });
            throw new Error(`Failed to parse Gemini response: ${parseError.message}`);
        }
    } catch (error) {
        console.error('Analysis error:', {
            message: error.message,
            rawError: error
        });
        return NextResponse.json({ 
            error: error.message,
            phase: error.phase || 'unknown'
        }, { 
            status: 500 
        });
    }
} 