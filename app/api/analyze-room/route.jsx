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
        try {
            const imageResponse = await axios.get(imageUrl, {
                responseType: 'arraybuffer'
            });

            console.log('Image fetch details:', {
                size: imageResponse.data.length,
                contentType: imageResponse.headers['content-type'],
                status: imageResponse.status,
                headers: imageResponse.headers
            });

            // Convert to base64
            const base64Image = Buffer.from(imageResponse.data).toString('base64');
            console.log('Base64 conversion details:', {
                originalSize: imageResponse.data.length,
                base64Length: base64Image.length,
                base64Preview: base64Image.substring(0, 50) + '...'
            });

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

            // Log request details before sending
            console.log('Gemini request details:', {
                model: "gemini-pro-vision",
                promptLength: prompt.length,
                imageSize: base64Image.length,
                mimeType: imageResponse.headers['content-type'] || 'image/jpeg'
            });

            // Send to Gemini
            try {
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
                console.log('Gemini response received:', {
                    responseLength: response.text().length,
                    preview: response.text().substring(0, 100) + '...'
                });

                try {
                    const analysis = JSON.parse(response.text());
                    console.log('Response parsed successfully');
                    return NextResponse.json({ analysis });
                } catch (parseError) {
                    console.error('Parse error:', {
                        error: parseError.message,
                        responseText: response.text()
                    });
                    throw new Error('Failed to parse Gemini response: ' + parseError.message);
                }
            } catch (geminiError) {
                console.error('Gemini API error:', {
                    message: geminiError.message,
                    stack: geminiError.stack,
                    details: geminiError.details || 'No additional details'
                });
                throw new Error('Gemini API error: ' + geminiError.message);
            }
        } catch (fetchError) {
            console.error('Image fetch error:', {
                message: fetchError.message,
                status: fetchError.response?.status,
                statusText: fetchError.response?.statusText,
                headers: fetchError.response?.headers
            });
            throw new Error('Failed to fetch image: ' + fetchError.message);
        }
    } catch (error) {
        console.error('Analysis error:', {
            phase: error.phase || 'unknown',
            message: error.message,
            stack: error.stack,
            response: error.response?.data,
            status: error.response?.status,
            headers: error.response?.headers
        });
        return NextResponse.json({ 
            error: error.message,
            phase: error.phase || 'unknown'
        }, { 
            status: 500 
        });
    }
} 