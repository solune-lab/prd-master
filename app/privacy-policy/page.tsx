import React from 'react';

export const runtime = 'edge';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 py-12 px-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-black text-white mb-2">Privacy Policy</h1>
        <p className="text-sm text-slate-500 mb-8">Last Updated: July 6, 2026</p>
        <div className="space-y-6 text-slate-300">
          <p>
            This Privacy Policy describes how AI PRD Master ("we", "us", or "our")
            collects, uses, and shares information about you when you use our services
            at soluneai.com/prd-master.
          </p>

          <h2 className="text-xl font-bold text-white mt-8">1. Information We Collect</h2>
          <p>
            We collect information you provide directly and information collected
            automatically when you use our services:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Account information:</strong> Email address when you register or sign in.</li>
            <li><strong>Submitted content:</strong> The product ideas, prompts, and other text you enter to generate PRDs. This is sent to our AI model provider solely to produce your requested output.</li>
            <li><strong>Payment information:</strong> Handled entirely by Stripe. We do not store card numbers or payment details on our servers.</li>
            <li><strong>Usage data:</strong> Pages visited, features used, browser type, operating system, and IP address.</li>
            <li><strong>Cookies and local storage:</strong> Session tokens, user preferences, and referral codes stored in your browser.</li>
          </ul>

          <h2 className="text-xl font-bold text-white mt-8">2. How We Use Your Information</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>To provide, operate, and improve our AI-powered PRD generation tools.</li>
            <li>To process payments and manage your subscription.</li>
            <li>To prevent abuse, fraud, and unauthorized access.</li>
            <li>To communicate with you about your account, transactions, and service updates.</li>
            <li>To comply with applicable legal obligations.</li>
          </ul>

          <h2 className="text-xl font-bold text-white mt-8">3. Cookies</h2>
          <p>Our website uses the following types of cookies:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Essential cookies:</strong> Required for authentication and session management.</li>
            <li><strong>Analytics cookies:</strong> Used to understand how visitors interact with our website to improve usability and content.</li>
            <li><strong>Preference cookies:</strong> Store your settings such as billing cycle selection or language preference.</li>
          </ul>
          <p>
            By continuing to use our website, you consent to the use of cookies as
            described in this policy. You can control cookie settings through your
            browser settings at any time.
          </p>

          <h2 className="text-xl font-bold text-white mt-8">4. Data Sharing</h2>
          <p>
            We do not sell your personal data. We share information only with the
            following service providers who process it on our behalf:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Supabase:</strong> Authentication and database hosting.</li>
            <li><strong>Stripe:</strong> Payment processing.</li>
            <li><strong>Google (Gemini API):</strong> AI processing of your submitted content to generate PRDs.</li>
            <li><strong>Cloudflare:</strong> Content delivery, security, and hosting infrastructure.</li>
          </ul>

          <h2 className="text-xl font-bold text-white mt-8">5. Data Retention</h2>
          <p>
            Content you submit for PRD generation is processed and retained only as
            needed to provide the service and maintain your document history. Account
            data is retained for as long as your account is active. You may request
            deletion by contacting us at{' '}
            <a href="mailto:info@soluneai.com" className="text-indigo-400 hover:text-indigo-300">
              info@soluneai.com
            </a>
            .
          </p>

          <h2 className="text-xl font-bold text-white mt-8">6. Your Rights</h2>
          <p>
            Depending on your jurisdiction, you may have the right to access, correct,
            delete, or restrict the processing of your personal data. To exercise these
            rights, contact us at{' '}
            <a href="mailto:info@soluneai.com" className="text-indigo-400 hover:text-indigo-300">
              info@soluneai.com
            </a>
            .
          </p>

          <h2 className="text-xl font-bold text-white mt-8">7. Children's Privacy</h2>
          <p>
            Our services are not directed to children under 13. We do not knowingly
            collect personal information from children under 13. If we become aware
            that we have collected such information, we will delete it promptly.
          </p>

          <h2 className="text-xl font-bold text-white mt-8">8. Security</h2>
          <p>
            We use reasonable technical and organizational measures to protect your
            information. However, no method of transmission or storage is completely
            secure, and we cannot guarantee absolute security.
          </p>

          <h2 className="text-xl font-bold text-white mt-8">9. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. Material changes will
            be communicated by posting the updated policy on this page with a revised
            date. Continued use of our services after changes constitutes acceptance of
            the revised policy.
          </p>

          <h2 className="text-xl font-bold text-white mt-8">10. Contact</h2>
          <p>
            For privacy-related questions or data requests, contact us at{' '}
            <a href="mailto:info@soluneai.com" className="text-indigo-400 hover:text-indigo-300">
              info@soluneai.com
            </a>
            .
          </p>

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
