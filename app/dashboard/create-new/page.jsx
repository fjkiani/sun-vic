"use client"
import React, { useContext, useState } from 'react'
import ImageSelection from './_components/ImageSelection'
import RoomType from './_components/RoomType'
import DesignType from './_components/DesignType'
import AdditionalReq from './_components/AdditionalReq'
import { Button } from '@/components/ui/button'
import axios from 'axios'
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { storage } from '@/config/firebaseConfig'
import { useUser } from '@clerk/nextjs'
import CustomLoading from './_components/CustomLoading'
import AiOutputDialog from '../_components/AiOutputDialog'
import { db } from '@/config/db'
import { Users } from '@/config/schema'
import { UserDetailContext } from '@/app/_context/UserDetailContext'

function CreateNew() {

  const {user} = useUser();
  const [formData,setFormData]=useState([]);
  const [loading,setLoading]=useState(false);
  const [aiOutputImage,setAiOutputImage]=useState()
  const [openOutputDialog,setOpenOutputDialog]=useState(false);
  const [orgImage,setOrgImage]=useState();
  const {userDetail,setUserDetail}=useContext(UserDetailContext);
  const [error, setError] = useState(null);

  const onHandleInputChange=(value,fieldName)=>{
    if (fieldName === 'image') {
      console.log('Selected image:', value);
    }
    setFormData(prev=>({
      ...prev,
      [fieldName]:value
    }))
    console.log('Updated formData:', formData);
  }

  const GenerateAiImage=async()=>{
    try {
      setLoading(true);
      setError(null);

      if (!formData.image || !formData.roomType || !formData.designType) {
        throw new Error('Please select an image, room type, and design type');
      }

      console.log('Uploading image to Firebase...');
      const rawImageUrl = await SaveRawImageToFirebase();
      
      console.log('Starting room generation process...');
      const response = await axios.post('/api/redesign-room', {
        imageUrl: rawImageUrl,
        roomType: formData.roomType,
        designType: formData.designType,
        additionalReq: formData.additionalReq || '',
        userEmail: user?.emailAddresses[0]?.emailAddress || 'guest'
      });

      console.log('Room generation response:', response.data);

      if (response.data.error) {
        throw new Error(response.data.error);
      }

      setAiOutputImage(response.data.result);
      
      // Check if we got analysis data
      if (response.data.analysis) {
        console.log('Received room analysis:', response.data.analysis);
        // Handle the analysis data here
      } else {
        console.log('No analysis data received');
      }

      if (user) {
        await updateUserCredits();
      }

      setOpenOutputDialog(true);
    } catch (error) {
      console.error('Error generating image:', error);
      setError(error.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  const SaveRawImageToFirebase=async()=>{
    console.log('Starting Firebase upload with image:', formData.image);
    // Save Raw File Image to Firebase 
    const fileName=Date.now()+"_raw.png";
    const imageRef=ref(storage,'room-redesign/'+fileName);

    await uploadBytes(imageRef,formData.image).then(resp=>{
      console.log('File Upload response:', resp);
    })
    
    // Uploaded File Image URL
    const downloadUrl=await getDownloadURL(imageRef);
    console.log('Firebase download URL:', downloadUrl);
    setOrgImage(downloadUrl);
    return downloadUrl;

  }

  /**
   * Update the user credits
   * @returns 
   */
  const updateUserCredits=async()=>{
    const result=await db.update(Users).set({
      credits:userDetail?.credits-1
    }).returning({id:Users.id});

    if(result)
    {
       
        setUserDetail(prev=>({
          ...prev,
          credits:userDetail?.credits-1
      }))
        return result[0].id
    }
  }

  return (
    <div>
        <h2 className='font-bold text-4xl text-primary text-center'>Experience the Magic of AI Remodeling</h2>
        <p className='text-center text-gray-500'>Transform any room with a click. Select a space, choose a style, and watch as AI instantly reimagines your environment.</p>

        <div className='grid grid-cols-1 md:grid-cols-2 
         mt-10 gap-10'>
          {/* Image Selection  */}
          <ImageSelection selectedImage={(value)=>onHandleInputChange(value,'image')}/>
          {/* Form Input Section  */}
          <div>
            {/* Room type  */}
            <RoomType selectedRoomType={(value)=>onHandleInputChange(value,'roomType')}/>
            {/* Design Type  */}
            <DesignType selectedDesignType={(value)=>onHandleInputChange(value,'designType')}/>
            {/* Additonal Requirement TextArea (Optional) */}
            <AdditionalReq additionalRequirementInput={(value)=>onHandleInputChange(value,'additionalReq')}/>
            {/* Button To Generate Image  */}
            <Button className="w-full mt-5" onClick={GenerateAiImage}>Generate</Button>
            <p className='text-sm text-gray-400 mb-52'>NOTE: 1 Credit will use to redesign your room</p>
          </div>
        </div>
        <CustomLoading loading={loading} />
        <AiOutputDialog aiImage={aiOutputImage} orgImage={orgImage}
        closeDialog={()=>setOpenOutputDialog(false)}
        openDialog={openOutputDialog}
        />
    </div>
  )
}

export default CreateNew