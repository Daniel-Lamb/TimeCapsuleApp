import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload } from 'lucide-react';
import { Button } from './ui/Button';
import { formatBytes, MAX_FILE_BYTES, MAX_FILES } from '../lib/limits';

interface CapsuleUploadProps {
  onFilesAdded: (files: File[]) => void;
  /** When the capsule is already at a limit, the zone stops accepting drops. */
  disabled?: boolean;
}

export const CapsuleUpload: React.FC<CapsuleUploadProps> = ({ onFilesAdded, disabled = false }) => {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    onFilesAdded(acceptedFiles);
  }, [onFilesAdded]);

  // Size and count are checked by the form, which can see the files already
  // staged and explain exactly which one was turned away and why.
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    disabled,
  });

  return (
    <div
      {...getRootProps()}
      className={`p-8 border-2 border-dashed rounded-lg transition-all ${
        disabled
          ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
          : isDragActive
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
            {disabled
              ? 'This capsule is full'
              : isDragActive
                ? 'Drop files here'
                : 'Drag & drop files here'}
          </p>
          {!disabled && <p className="text-sm text-gray-500 mt-1">or</p>}
        </div>
        {!disabled && (
          <Button type="button" variant="outline" className="hover:bg-indigo-50 hover:text-indigo-600">
            Browse Files
          </Button>
        )}
        <p className="text-xs text-gray-400 text-center">
          Up to {MAX_FILES} files, {formatBytes(MAX_FILE_BYTES)} each
        </p>
      </div>
    </div>
  );
};
