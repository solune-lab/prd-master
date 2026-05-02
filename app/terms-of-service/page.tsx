import React from 'react';

export const runtime = 'edge';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 py-12 px-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-black text-white mb-8">Terms of Service</h1>
        <div className="space-y-6 text-slate-300">
          <p>
            Welcome to our application. By accessing or using our website and services, 
            you agree to be bound by these Terms of Service and all applicable laws and regulations.
          </p>
          <h2 className="text-xl font-bold text-white mt-8">Use License</h2>
          <p>
            Permission is granted to temporarily download one copy of the materials 
            (information or software) on our website for personal, non-commercial 
            transitory viewing only.
          </p>
          <h2 className="text-xl font-bold text-white mt-8">Disclaimer</h2>
          <p>
            The materials on our website are provided on an 'as is' basis. We make no 
            warranties, expressed or implied, and hereby disclaim and negate all other warranties 
            including, without limitation, implied warranties or conditions of merchantability.
          </p>
          {/* Add more sections as necessary */}
          <div className="mt-12 pt-8 border-t border-slate-800">
            <a href="/" className="text-indigo-400 hover:text-indigo-300 font-bold transition-colors">
              ← Back to Home
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
