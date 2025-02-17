import { db } from "@/config/db";
import { storage } from "@/config/firebaseConfig";
import { AiGeneratedImage } from "@/config/schema";
import axios from "axios";
import { getDownloadURL, ref, uploadString } from "firebase/storage";
import { NextResponse } from "next/server";
import Replicate from "replicate";
import sharp from 'sharp';

const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN
});

const ANALYZE_ROOM_URL = process.env.NEXT_PUBLIC_BASE_URL 
    ? `${process.env.NEXT_PUBLIC_BASE_URL}/api/analyze-room`
    : 'http://localhost:3000/api/analyze-room';

export async function POST(req){
    const {imageUrl, roomType, designType, additionalReq, userEmail} = await req.json();

    try{
        // First convert the input image to base64
        console.log('Converting input image to base64...');
        const inputBase64 = await ConvertImageToBase64(imageUrl);
        
        const input = {
            image: inputBase64,
            prompt: 'A '+roomType+' with a '+designType+" style interior "+additionalReq
        };
        
        console.log('Calling Replicate API...');
        const output = await replicate.run(
            "adirik/interior-design:76604baddc85b1b4616e1c6475eca080da339c8875bd4996705440484a6eac38",
            { input }
        );    

        if (!output) {
            throw new Error('No output received from Replicate');
        }

        console.log('Replicate generated image URL:', output);

        // Convert Output Url to BASE64 Image 
        const base64Image = await ConvertImageToBase64(output);
        
        // Save Base64 to Firebase 
        const fileName = Date.now()+'.png';
        const storageRef = ref(storage,'room-redesign/'+fileName);
        await uploadString(storageRef, base64Image, 'data_url');
        const firebaseUrl = await getDownloadURL(storageRef);
        
        console.log('Image saved to Firebase:', firebaseUrl);

        // Now analyze with Gemini
        try {
            console.log('Starting Gemini analysis request to:', ANALYZE_ROOM_URL);
            console.log('Analysis request payload:', {
                imageUrl: firebaseUrl,
                roomType,
                designType
            });

            const analysisResponse = await fetch(ANALYZE_ROOM_URL, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    imageUrl: firebaseUrl,
                    roomType,
                    designType
                })
            });

            console.log('Analysis response status:', analysisResponse.status);
            
            if (!analysisResponse.ok) {
                const errorText = await analysisResponse.text();
                console.error('Analysis response error:', errorText);
                throw new Error(`Analysis failed with status: ${analysisResponse.status}`);
            }

            const analysisResult = await analysisResponse.json();
            console.log('Raw Gemini analysis result:', analysisResult);

            if (analysisResult.error) {
                throw new Error(`Analysis error: ${analysisResult.error}`);
            }

            // Save to database if not guest
            if (userEmail !== 'guest') {
                await db.insert(AiGeneratedImage).values({
                    roomType,
                    designType,
                    orgImage: imageUrl,
                    aiImage: firebaseUrl,
                    userEmail,
                    analysis: JSON.stringify(analysisResult.analysis)
                });
            }

            return NextResponse.json({
                result: firebaseUrl,
                analysis: analysisResult.analysis
            });
        } catch (analysisError) {
            // If analysis fails, still return the generated image
            console.error('Analysis failed:', {
                error: analysisError.message,
                stack: analysisError.stack
            });
            
            if (userEmail !== 'guest') {
                await db.insert(AiGeneratedImage).values({
                    roomType,
                    designType,
                    orgImage: imageUrl,
                    aiImage: firebaseUrl,
                    userEmail
                });
            }

            return NextResponse.json({
                result: firebaseUrl,
                analysisError: analysisError.message
            });
        }
        
    } catch(e) {
        console.error('Detailed error:', e);
        return NextResponse.json({
            error: e.message || 'An error occurred',
            details: e.stack
        }, { status: 500 });
    }
}

async function ConvertImageToBase64(imageUrl) {
    try {
        // Download the image
        const response = await axios.get(imageUrl, {
            responseType: 'arraybuffer'
        });

        // Process with Sharp
        const processedImageBuffer = await sharp(response.data)
            .jpeg() // Convert to JPEG
            .toBuffer();

        // Convert to base64
        const base64 = processedImageBuffer.toString('base64');
        return `data:image/jpeg;base64,${base64}`;
    } catch (error) {
        console.error('Error converting image:', error);
        throw new Error('Failed to convert image: ' + error.message);
    }
}