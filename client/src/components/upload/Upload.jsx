import { IKContext, IKUpload } from 'imagekitio-react';
import { useRef, useEffect } from 'react';
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
      <label 
        onClick={handleUploadClick} 
        role="button" 
        aria-label="Upload image"
        className="upload-button"
        style={{ cursor: 'pointer' }}
      >
        <img 
          src="/attachment.png" 
          alt="Upload attachment" 
          style={{ width: '20px', height: '20px' }} 
        />
      </label>
    </IKContext>
  );
};

export default Upload;