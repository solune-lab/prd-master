import React from 'react';

export const runtime = 'edge';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 py-12 px-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-black text-white mb-2">Terms of Service</h1>
        <p className="text-sm text-slate-500 mb-8">Last Updated: July 6, 2026</p>
        <div className="space-y-6 text-slate-300">
          <p>
            These Terms of Service ("Terms") govern your use of AI PRD Master and its
            services available at soluneai.com/prd-master. By using our services, you
            agree to these Terms.
          </p>

          <h2 className="text-xl font-bold text-white mt-8">1. Acceptance of Terms</h2>
          <p>
            By accessing or using AI PRD Master, you confirm that you are at least 18
            years old, have read and understood these Terms, and agree to be bound by
            them. If you do not agree, please do not use our services.
          </p>

          <h2 className="text-xl font-bold text-white mt-8">2. Description of Service</h2>
          <p>
            AI PRD Master uses AI models to help you generate Product Requirements
            Documents (PRDs) and related planning content from your input. We offer a
            free tier and paid plans with expanded capabilities. Features, pricing, and
            download allowances are described on our pricing page and are subject to
            change with reasonable notice.
          </p>

          <h2 className="text-xl font-bold text-white mt-8">3. User Accounts</h2>
          <p>
            You may create an account to use our services. You are responsible for
            maintaining the confidentiality of your account and for all activity that
            occurs under it. Notify us immediately at{' '}
            <a href="mailto:info@soluneai.com" className="text-indigo-400 hover:text-indigo-300">
              info@soluneai.com
            </a>{' '}
            if you suspect unauthorized access.
          </p>

          <h2 className="text-xl font-bold text-white mt-8">4. Acceptable Use</h2>
          <p>You agree not to use our services to:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Generate, upload, or share content that violates applicable laws.</li>
            <li>Process or submit data you do not have the right to use.</li>
            <li>Attempt to reverse-engineer, scrape, or abuse our AI models or API endpoints.</li>
            <li>Circumvent rate limits, download quotas, or access restrictions through automated means.</li>
            <li>Use our services for any purpose that violates local, national, or international law.</li>
          </ul>
          <p>
            We reserve the right to suspend or terminate accounts that violate these
            Terms without refund.
          </p>

          <h2 className="text-xl font-bold text-white mt-8">5. Intellectual Property</h2>
          <p>
            You retain all rights to the input you provide and the PRDs generated for
            you. By submitting content, you grant us a limited, non-exclusive license to
            process it solely for the purpose of providing the requested service. We do
            not claim ownership of your content.
          </p>
          <p>
            The AI PRD Master platform, software, and branding are owned by Solune AI
            and protected by applicable intellectual property laws. You may not copy,
            modify, or distribute our proprietary technology.
          </p>

          <h2 className="text-xl font-bold text-white mt-8">6. Subscriptions and Billing</h2>
          <p>
            Paid plans are billed through Stripe. By subscribing, you authorize
            recurring charges to your payment method at the selected frequency.
            Subscriptions auto-renew unless cancelled before the renewal date. Some
            annual plans include a trial period, disclosed at checkout, during which you
            may cancel before being charged.
          </p>
          <p>
            Plan features, including download allowances, are as described on our
            pricing page at the time of purchase and may change for future billing
            cycles with reasonable notice.
          </p>

          <h2 className="text-xl font-bold text-white mt-8">7. Refund Policy</h2>
          <p>
            We do not offer refunds for amounts already charged. You may cancel your
            subscription at any time to stop future renewals; your access continues
            until the end of the current billing period. If you experience a technical
            failure caused by our systems, contact us at{' '}
            <a href="mailto:info@soluneai.com" className="text-indigo-400 hover:text-indigo-300">
              info@soluneai.com
            </a>{' '}
            and we will review the case.
          </p>

          <h2 className="text-xl font-bold text-white mt-8">8. AI-Generated Content Disclaimer</h2>
          <p>
            PRDs and other content generated by our AI tools are provided for reference
            and drafting assistance only. We do not guarantee that AI-generated output
            is accurate, complete, or fit for any particular purpose. You are
            responsible for reviewing and validating all generated content before
            relying on it for business, legal, or technical decisions.
          </p>

          <h2 className="text-xl font-bold text-white mt-8">9. Disclaimers</h2>
          <p>
            Our services are provided "as is" without warranties of any kind. We do not
            guarantee that the service will be uninterrupted or error-free. Results vary
            depending on input quality and content.
          </p>

          <h2 className="text-xl font-bold text-white mt-8">10. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, Solune AI shall not be liable for
            any indirect, incidental, special, consequential, or punitive damages
            arising from your use of our services. Our total liability for any claims
            shall not exceed the amount you paid to us in the 12 months preceding the
            claim.
          </p>

          <h2 className="text-xl font-bold text-white mt-8">11. Governing Law</h2>
          <p>
            These Terms are governed by applicable law. Any disputes shall be resolved
            through binding arbitration or in the courts of competent jurisdiction.
          </p>

          <h2 className="text-xl font-bold text-white mt-8">12. Changes to Terms</h2>
          <p>
            We may modify these Terms at any time. Continued use of our services after
            changes constitutes acceptance of the revised Terms. Material changes will
            be communicated via email or a prominent notice on our website.
          </p>

          <h2 className="text-xl font-bold text-white mt-8">13. Contact</h2>
          <p>
            For questions about these Terms, contact us at{' '}
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
