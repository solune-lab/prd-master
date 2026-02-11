
import { load } from '@fingerprintjs/fingerprintjs';

// Initialize FingerprintJS
export const getFingerprint = async (): Promise<string> => {
    try {
        const fp = await load();
        const result = await fp.get();
        return result.visitorId;
    } catch (error) {
        console.error('Fingerprint error:', error);
        return 'unknown-' + Math.random().toString(36).substring(7);
    }
};

// Disposable email check (Enhanced list)
const DISPOSABLE_DOMAINS = [
    'yopmail.com', 'temp-mail.org', 'guerrillamail.com', '10minutemail.com',
    'mailinator.com', 'throwawaymail.com', 'sharklasers.com', 'getnada.com',
    'maildrop.cc', 'dispostable.com'
];

export const isDisposableEmail = (email: string): boolean => {
    const domain = email.split('@')[1];
    if (!domain) return false;
    return DISPOSABLE_DOMAINS.includes(domain.toLowerCase());
};
