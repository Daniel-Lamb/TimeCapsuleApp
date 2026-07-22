import { useEffect, useState } from 'react';
import { Box } from 'lucide-react';
import { CapsuleForm } from './components/CapsuleForm';
import { ManageCapsule } from './components/ManageCapsule';

/** Manage links are handed out by email as `#/manage/<token>`. */
function manageTokenFromHash(): string | null {
  const match = window.location.hash.match(/^#\/manage\/([0-9a-f-]{36})$/i);
  return match ? match[1] : null;
}

export default function App() {
  const [manageToken, setManageToken] = useState(manageTokenFromHash);

  useEffect(() => {
    const onHashChange = () => setManageToken(manageTokenFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

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
            {manageToken
              ? 'Check on a capsule you already sealed, move it to another date, or call it off.'
              : 'Preserve your memories and send them to the future. Create a time capsule with photos, messages, and more to be opened on a date of your choosing.'}
          </p>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 md:p-8 animate-fade-up relative z-0">
          {manageToken ? <ManageCapsule manageToken={manageToken} /> : <CapsuleForm />}
        </div>
      </div>
    </div>
  );
}
