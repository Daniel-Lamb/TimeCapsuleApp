import React, { useState } from 'react';
import { Calendar, Mail, Type, Clock } from 'lucide-react';
import { Button } from './ui/Button';
import { CapsuleUpload } from './CapsuleUpload';

export const CapsuleForm: React.FC = () => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState('');
  const [unlockDate, setUnlockDate] = useState('');
  const [unlockTime, setUnlockTime] = useState('12:00');
  const [files, setFiles] = useState<File[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement form submission with Supabase
    const unlockDateTime = `${unlockDate}T${unlockTime}:00`;
    console.log('Unlock DateTime:', unlockDateTime);
  };

  const handleFilesAdded = (newFiles: File[]) => {
    setFiles((prev) => [...prev, ...newFiles]);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="space-y-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
            Capsule Name
          </label>
          <div className="relative group">
            <Type className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors group-hover:text-indigo-500" size={20} />
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="pl-10 block w-full rounded-lg border-gray-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 transition-colors hover:border-indigo-300"
              required
            />
          </div>
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="block w-full rounded-lg border-gray-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 transition-colors hover:border-indigo-300"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
            Recipient Email
          </label>
          <div className="relative group">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors group-hover:text-indigo-500" size={20} />
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 block w-full rounded-lg border-gray-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 transition-colors hover:border-indigo-300"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="unlockDate" className="block text-sm font-medium text-gray-700 mb-2">
              Unlock Date
            </label>
            <div className="relative group">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors group-hover:text-indigo-500" size={20} />
              <input
                type="date"
                id="unlockDate"
                value={unlockDate}
                onChange={(e) => setUnlockDate(e.target.value)}
                className="pl-10 block w-full rounded-lg border-gray-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 transition-colors hover:border-indigo-300"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="unlockTime" className="block text-sm font-medium text-gray-700 mb-2">
              Unlock Time
            </label>
            <div className="relative group">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors group-hover:text-indigo-500" size={20} />
              <input
                type="time"
                id="unlockTime"
                value={unlockTime}
                onChange={(e) => setUnlockTime(e.target.value)}
                className="pl-10 block w-full rounded-lg border-gray-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 transition-colors hover:border-indigo-300"
                required
              />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <label className="block text-sm font-medium text-gray-700">
          Add Content
        </label>
        <CapsuleUpload onFilesAdded={handleFilesAdded} />
      </div>

      {files.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Selected Files</h3>
          <ul className="space-y-2">
            {files.map((file, index) => (
              <li key={index} className="flex items-center space-x-2 text-gray-600 bg-white p-2 rounded-md">
                <File size={16} className="text-indigo-500" />
                <span className="text-sm">{file.name}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Button type="submit" size="lg" className="w-full">
        Create Time Capsule
      </Button>
    </form>
  );
};