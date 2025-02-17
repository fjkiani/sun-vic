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
        console.log('Starting Gemini analysis process...');
        const { imageUrl, roomType, designType } = await req.json();
        
        if (!imageUrl || !roomType || !designType) {
            throw new Error('Missing required fields');
        }

        console.log('Analysis request for:', { roomType, designType });
        console.log('Image URL:', imageUrl);

        // Fetch the image first to ensure we have access
        console.log('Fetching image...');
        const imageResponse = await axios.get(imageUrl, {
            responseType: 'arraybuffer'
        });

        if (!imageResponse.data) {
            throw new Error('Failed to fetch image');
        }

        console.log('Image fetched successfully:', {
            size: imageResponse.data.length,
            contentType: imageResponse.headers['content-type']
        });

        // Convert to base64
        const base64Image = Buffer.from(imageResponse.data).toString('base64');
        console.log('Image converted to base64, length:', base64Image.length);

        // Initialize model
        const model = genAI.getGenerativeModel({ 
            model: "gemini-pro-vision"
        });

        // Create structured prompt
        const prompt = `Analyze this ${roomType} image designed in ${designType} style. 
        Focus on identifying specific items that could be purchased to recreate this look.
        Provide a detailed analysis in the following JSON structure:
        {
            "furniture": [
                {
                    "type": "specific item name",
                    "style": ["specific style descriptors"],
                    "materials": ["specific materials"],
                    "colors": ["specific colors"],
                    "dimensions": "approximate size",
                    "searchTerms": ["suggested shopping search terms"]
                }
            ],
            "decor": [
                {
                    "type": "specific item name",
                    "style": ["specific style descriptors"],
                    "colors": ["specific colors"],
                    "searchTerms": ["suggested shopping search terms"]
                }
            ],
            "structural": {
                "walls": ["specific wall treatments"],
                "flooring": ["specific flooring types"],
                "windows": ["specific window styles"]
            }
        }`;

        // Send to Gemini
        console.log('Sending to Gemini...');
        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    mimeType: 'image/jpeg',  // We know it's JPEG from curl response
                    data: base64Image
                }
            }
        ]);

        const response = await result.response;
        console.log('Received response from Gemini');

        try {
            const analysis = JSON.parse(response.text());
            console.log('Successfully parsed response');
            return NextResponse.json({ analysis });
        } catch (parseError) {
            console.error('Failed to parse response:', response.text());
            throw new Error('Failed to parse Gemini response');
        }

    } catch (error) {
        console.error('Analysis error:', {
            message: error.message,
            stack: error.stack
        });
        return NextResponse.json({ 
            error: error.message 
        }, { 
            status: 500 
        });
    }
} 