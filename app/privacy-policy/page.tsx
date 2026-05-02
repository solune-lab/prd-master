import React from 'react';

export const runtime = 'edge';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 py-12 px-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-black text-white mb-8">Privacy Policy</h1>
        <div className="space-y-6 text-slate-300">
          <p>
            This Privacy Policy describes how your personal information is collected,
            used, and shared when you visit or make a purchase from our website.
          </p>
          <h2 className="text-xl font-bold text-white mt-8">Personal Information We Collect</h2>
          <p>
            When you visit the site, we automatically collect certain information about
            your device, including information about your web browser, IP address, time
            zone, and some of the cookies that are installed on your device.
          </p>
          <h2 className="text-xl font-bold text-white mt-8">How We Use Your Information</h2>
          <p>
            We use the order information that we collect generally to fulfill any orders
            placed through the site (including processing your payment information,
            arranging for shipping, and providing you with invoices and/or order
            confirmations).
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
