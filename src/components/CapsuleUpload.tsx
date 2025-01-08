import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload } from 'lucide-react';
import { Button } from './ui/Button';

interface CapsuleUploadProps {
  onFilesAdded: (files: File[]) => void;
}

export const CapsuleUpload: React.FC<CapsuleUploadProps> = ({ onFilesAdded }) => {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    onFilesAdded(acceptedFiles);
  }, [onFilesAdded]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true
  });

  return (
    <div
      {...getRootProps()}
      className={`p-8 border-2 border-dashed rounded-lg transition-all ${
        isDragActive 
          ? 'border-indigo-500 bg-indigo-50 scale-102' 
          : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'
      }`}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center justify-center space-y-4">
        <div className={`p-3 rounded-full ${isDragActive ? 'bg-indigo-100' : 'bg-gray-100'}`}>
          <Upload className={`w-8 h-8 ${isDragActive ? 'text-indigo-600' : 'text-gray-400'}`} />
        </div>
        <div className="text-center">
          <p className="text-lg font-medium text-gray-700">
            {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
          </p>
          <p className="text-sm text-gray-500 mt-1">or</p>
        </div>
        <Button type="button" variant="outline" className="hover:bg-indigo-50 hover:text-indigo-600">
          Browse Files
        </Button>
      </div>
    </div>
  );
};