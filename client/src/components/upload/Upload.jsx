import { IKContext, IKUpload } from 'imagekitio-react';
import { useRef, useEffect } from 'react';
import { IoImageOutline } from 'react-icons/io5';
import { motion } from 'framer-motion';

const urlEndpoint = import.meta.env.VITE_IMAGE_KIT_ENDPOINT;
const publicKey = import.meta.env.VITE_IMAGE_KIT_PUBLIC_KEY;


const authenticator = async () => {
  try {
    // Changed from localhost to the environment variable to ensure correct API endpoint
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/upload`);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Request failed with status ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const { signature, expire, token } = data;
    return { signature, expire, token };
  } catch (error) {
    throw new Error(`Authentication request failed: ${error.message}`);
  }
};

const Upload = ({ setImg }) => {
  const ikUploadRef = useRef(null);
  
  const onError = err => {
    console.log("Error", err);
    setImg((prev) => ({ ...prev, error: err.message, isLoading: false }));
  };

  const onSuccess = res => {
    console.log("Success", res);
    setImg((prev) => ({ ...prev, isLoading: false, dbData: res }));
  };

  const onUploadProgress = progress => {
    console.log("Progress", progress);
  };

  const onUploadStart = evt => {
    const file = evt.target.files[0];
    
    if (!file) return; // Guard against null file selection
    
    console.log("Upload started", file.name);
    setImg((prev) => ({ ...prev, isLoading: true, error: "" }));

    const reader = new FileReader();
    reader.onloadend = () => {
      setImg((prev) => ({
        ...prev, 
        isLoading: true, 
        aiData: {
          inlineData: {
            data: reader.result.split(",")[1],
            mimeType: file.type,
          }
        }
      }));
    };
    
    reader.onerror = () => {
      setImg((prev) => ({ ...prev, error: "Failed to read file", isLoading: false }));
    };
    
    reader.readAsDataURL(file);
  };

  const handleUploadClick = () => {
    console.log("Upload button clicked");
    if (ikUploadRef.current) {
      ikUploadRef.current.click();
    } else {
      console.error("Upload reference is not available");
    }
  };

  return (
    <IKContext
      urlEndpoint={urlEndpoint}
      publicKey={publicKey}
      authenticator={authenticator}
    >
      <IKUpload
        fileName="chat-upload.png"
        onError={onError}
        onSuccess={onSuccess}
        useUniqueFileName={true}
        onUploadProgress={onUploadProgress}
        onUploadStart={onUploadStart}
        style={{ display: "none" }}
        ref={ikUploadRef}
        accept="image/*" // Accept only images
      />
      <motion.label
        onClick={handleUploadClick} 
        role="button" 
        aria-label="Upload image"
        className="upload-button"
        style={{ 
          cursor: 'pointer',
          backgroundColor: '#2c3657',
          width: '38px',
          height: '38px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 5px rgba(59, 130, 246, 0.2)'
        }}
        whileHover={{ 
          scale: 1.05, 
          backgroundColor: '#3a477a' 
        }}
        whileTap={{ scale: 0.95 }}
      >
        <IoImageOutline 
          size={20} 
          color="#d1d5db" 
        />
      </motion.label>
    </IKContext>
  );
};

export default Upload;