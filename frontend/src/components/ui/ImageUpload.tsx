import React, { useState, useRef } from 'react';
import { Upload, X } from 'lucide-react';
import { clsx } from 'clsx';
import { api } from '../../api';

interface ImageUploadProps {
  onChange: (file: File | null) => void;
  value?: string;
  className?: string;
  isUploading?: boolean;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ 
  onChange, 
  value, 
  className, 
  isUploading = false 
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | undefined>(value);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleFile(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleFile = (file: File) => {
    // Create preview URL
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    onChange(file);
  };


  const handleRemove = () => {
    setPreview(undefined);
    onChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={className}>
      <div
        className={clsx(
          'relative border-2 border-dashed rounded-lg p-4 text-center',
          isDragging ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-primary-500',
          'transition-colors duration-200',
          isUploading && 'opacity-50 pointer-events-none'
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {preview ? (
          <div className="relative inline-block">
            <img
              src={preview}
              alt="Preview"
              className="max-w-[200px] max-h-[200px] rounded-lg"
            />
            <button
              type="button"
              onClick={handleRemove}
              className="absolute -top-2 -right-2 p-1 bg-danger-100 text-danger-600 rounded-full hover:bg-danger-200"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <div
            className="cursor-pointer"
            onClick={() => !isUploading && fileInputRef.current?.click()}
          >
            {isUploading ? (
              <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mb-2"></div>
                <p className="text-sm text-primary-600">Uploading...</p>
              </div>
            ) : (
              <>
                <Upload
                  size={32}
                  className="mx-auto text-gray-400"
                />
                <p className="mt-2 text-sm text-gray-600">
                  Drag and drop an image here, or click to select
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  PNG, JPG up to 5MB
                </p>
              </>
            )}
          </div>
        )}
        {isUploading && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          disabled={isUploading}
        />
      </div>
    </div>
  );
};

export default ImageUpload;