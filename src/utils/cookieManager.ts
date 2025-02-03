export const CookieManager = {
    setConsent(type: 'accepted' | 'declined') {
        localStorage.setItem('cookieConsent', type);
    },

    hasConsent(): boolean {
        return localStorage.getItem('cookieConsent') === 'accepted';
    },

    getConsentStatus(): string | null {
        return localStorage.getItem('cookieConsent');
    },

    // Use this before setting any cookies
    canSetCookies(): boolean {
        return this.hasConsent();
    }
}; 