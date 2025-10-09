/**
 * Microsoft Clarity Tracking Utilities
 *
 * This module provides utility functions for tracking user behavior
 * and events using Microsoft Clarity.
 */

declare global {
  interface Window {
    clarity?: (action: string, ...args: any[]) => void;
  }
}

/**
 * Checks if Clarity is loaded and available
 */
const isClarityLoaded = (): boolean => {
  return typeof window !== 'undefined' && typeof window.clarity === 'function';
};

/**
 * Identifies a user in Clarity with a unique ID and optional session/page ID
 * @param userId - Unique identifier for the user
 * @param sessionId - Optional session identifier
 * @param pageId - Optional page identifier
 * @param friendlyName - Optional friendly name for the user
 *
 * @example
 * identifyUser('user123', 'session456', 'page789', 'John Doe');
 */
export const identifyUser = (
  userId: string,
  sessionId?: string,
  pageId?: string,
  friendlyName?: string
): void => {
  if (!isClarityLoaded()) {
    console.warn('Clarity is not loaded yet');
    return;
  }

  try {
    window.clarity!('identify', userId, sessionId, pageId, friendlyName);
  } catch (error) {
    console.error('Error identifying user in Clarity:', error);
  }
};

/**
 * Sets a custom tag for the current session
 * @param key - Tag key
 * @param value - Tag value (string or array of strings)
 *
 * @example
 * setCustomTag('plan', 'premium');
 * setCustomTag('features', ['feature1', 'feature2']);
 */
export const setCustomTag = (
  key: string,
  value: string | string[]
): void => {
  if (!isClarityLoaded()) {
    console.warn('Clarity is not loaded yet');
    return;
  }

  try {
    window.clarity!('set', key, value);
  } catch (error) {
    console.error('Error setting custom tag in Clarity:', error);
  }
};

/**
 * Tracks a custom event in Clarity
 * @param eventName - Name of the event to track
 *
 * @example
 * trackEvent('download_clicked');
 * trackEvent('documentation_search');
 */
export const trackEvent = (eventName: string): void => {
  if (!isClarityLoaded()) {
    console.warn('Clarity is not loaded yet');
    return;
  }

  try {
    window.clarity!('event', eventName);
  } catch (error) {
    console.error('Error tracking event in Clarity:', error);
  }
};

/**
 * Sets cookie consent status
 * @param hasConsent - Whether the user has given consent
 *
 * @example
 * setCookieConsent(true);
 */
export const setCookieConsent = (hasConsent: boolean): void => {
  if (!isClarityLoaded()) {
    console.warn('Clarity is not loaded yet');
    return;
  }

  try {
    window.clarity!('consent', hasConsent);
  } catch (error) {
    console.error('Error setting cookie consent in Clarity:', error);
  }
};

/**
 * Upgrades the current session to be recorded in full
 * Useful for marking important user journeys
 * @param reason - Optional reason for upgrading the session
 *
 * @example
 * upgradeSession('critical_path');
 * upgradeSession('conversion_flow');
 */
export const upgradeSession = (reason?: string): void => {
  if (!isClarityLoaded()) {
    console.warn('Clarity is not loaded yet');
    return;
  }

  try {
    window.clarity!('upgrade', reason || 'manual_upgrade');
  } catch (error) {
    console.error('Error upgrading session in Clarity:', error);
  }
};

/**
 * Tracks page navigation within the documentation
 * @param pagePath - Path of the page being navigated to
 *
 * @example
 * trackPageNavigation('/getting-started/overview');
 */
export const trackPageNavigation = (pagePath: string): void => {
  trackEvent(`page_navigation_${pagePath.replace(/\//g, '_')}`);
};

/**
 * Tracks search queries in the documentation
 * @param query - Search query string
 *
 * @example
 * trackSearchQuery('remote server setup');
 */
export const trackSearchQuery = (query: string): void => {
  setCustomTag('search_query', query);
  trackEvent('documentation_search');
};

/**
 * Tracks download button clicks
 * @param platform - Platform being downloaded (e.g., 'macOS', 'Windows')
 *
 * @example
 * trackDownload('macOS');
 */
export const trackDownload = (platform?: string): void => {
  if (platform) {
    setCustomTag('download_platform', platform);
  }
  trackEvent('download_clicked');
};

/**
 * Tracks external link clicks
 * @param url - URL of the external link
 *
 * @example
 * trackExternalLink('https://github.com/Tunji17/actvt-docs');
 */
export const trackExternalLink = (url: string): void => {
  setCustomTag('external_link', url);
  trackEvent('external_link_clicked');
};
