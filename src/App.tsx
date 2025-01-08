import React from 'react';
import { Box } from 'lucide-react';
import { CapsuleForm } from './components/CapsuleForm';

export default function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-12">
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-24 animate-fade-up space-y-8 relative z-10">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-white p-4 rounded-2xl shadow-lg transform hover:scale-105 transition-transform">
              <Box className="w-12 h-12 text-indigo-600" />
            </div>
          </div>
          <div className="py-2">
            <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 px-4 whitespace-nowrap">
              Digital Time Capsule
            </h1>
            <div className="h-12" />
          </div>
          <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Preserve your memories and send them to the future. Create a time capsule with photos,
            messages, and more to be opened on a date of your choosing.
          </p>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 md:p-8 animate-fade-up relative z-0">
          <CapsuleForm />
        </div>
      </div>
    </div>
  );
}