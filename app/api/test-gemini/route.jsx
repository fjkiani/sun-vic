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
    try {
        const { imageUrl } = await req.json();
        const model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });

        // Try URL approach first
        try {
            console.log("Attempting URL approach with:", imageUrl);
            const urlResult = await model.generateContent([
                "Describe this room's style and key features",
                {
                    fileUri: imageUrl
                }
            ]);
            return NextResponse.json({ 
                success: true, 
                method: "url",
                result: urlResult.response.text() 
            });
        } catch (urlError) {
            console.log("URL approach failed:", urlError.message);
            
            // Fallback to base64 approach
            const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
            const base64Image = Buffer.from(imageResponse.data, 'binary').toString('base64');
            
            console.log("Base64 length:", base64Image.length);
            console.log("Base64 start:", base64Image.substring(0, 100));
            
            const base64Result = await model.generateContent([
                "Describe this room's style and key features",
                {
                    inlineData: {
                        mimeType: "image/jpeg",
                        data: base64Image
                    }
                }
            ]);

            return NextResponse.json({ 
                success: true, 
                method: "base64",
                result: base64Result.response.text() 
            });
        }
    } catch (error) {
        console.error("Analysis failed:", error);
        return NextResponse.json({ 
            success: false, 
            error: error.message 
        }, { status: 500 });
    }
} 