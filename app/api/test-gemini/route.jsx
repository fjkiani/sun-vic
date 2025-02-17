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

// Add GET method for simple environment testing
export async function GET(req) {
    try {
        console.log('Test Gemini - Environment check:', {
            geminiKeyPresent: !!process.env.GEMINI_API_KEY,
            keyLength: process.env.GEMINI_API_KEY?.length
        });

        return NextResponse.json({ 
            success: true, 
            environment: {
                geminiKeyPresent: !!process.env.GEMINI_API_KEY,
                keyLength: process.env.GEMINI_API_KEY?.length
            }
        });
    } catch (error) {
        console.error("Test Gemini - Environment check failed:", error);
        return NextResponse.json({ 
            success: false, 
            error: error.message 
        }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const { imageUrl } = await req.json();
        
        // Log environment check
        console.log('Test Gemini - Environment check:', {
            geminiKeyPresent: !!process.env.GEMINI_API_KEY,
            keyLength: process.env.GEMINI_API_KEY?.length
        });

        if (!process.env.GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY not found in environment');
        }

        // Initialize model with correct model name and config
        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash-thinking-exp-01-21",
            generationConfig
        });

        // Fetch and convert image
        const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const base64Image = Buffer.from(imageResponse.data).toString('base64');
        
        console.log("Test Gemini - Base64 details:", {
            imageSize: imageResponse.data.length,
            base64Length: base64Image.length,
            contentType: imageResponse.headers['content-type']
        });
        
        const result = await model.generateContent([
            "Describe this room's style and key features",
            {
                inlineData: {
                    mimeType: "image/jpeg",
                    data: base64Image
                }
            }
        ]);

        const response = await result.response;
        return NextResponse.json({ 
            success: true, 
            result: response.text() 
        });
    } catch (error) {
        console.error("Test Gemini - Analysis failed:", error);
        return NextResponse.json({ 
            success: false, 
            error: error.message,
            stack: error.stack
        }, { status: 500 });
    }
}