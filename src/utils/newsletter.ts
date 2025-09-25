import { promises as fs } from 'fs';
import path from 'path';
import type { NewsletterSubscriber } from '../types';

const NEWSLETTER_DIR = '.cache/newsletter';
const SUBSCRIBERS_FILE = 'subscribers.json';

/**
 * Ensure newsletter directory exists
 */
async function ensureNewsletterDir(): Promise<void> {
  try {
    await fs.mkdir(NEWSLETTER_DIR, { recursive: true });
  } catch (error) {
    console.error('Failed to create newsletter directory:', error);
    throw error;
  }
}

/**
 * Get subscribers file path
 */
function getSubscribersFilePath(): string {
  return path.join(NEWSLETTER_DIR, SUBSCRIBERS_FILE);
}

/**
 * Load all subscribers from file
 */
export async function loadSubscribers(): Promise<NewsletterSubscriber[]> {
  try {
    const filepath = getSubscribersFilePath();
    const content = await fs.readFile(filepath, 'utf-8');
    const data = JSON.parse(content);
    return data.subscribers || [];
  } catch (error) {
    // File doesn't exist or other error - return empty array
    return [];
  }
}

/**
 * Save subscribers to file
 */
export async function saveSubscribers(subscribers: NewsletterSubscriber[]): Promise<void> {
  try {
    await ensureNewsletterDir();
    const filepath = getSubscribersFilePath();

    const data = {
      subscribers,
      lastUpdated: new Date().toISOString(),
      count: subscribers.length
    };

    await fs.writeFile(filepath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error saving subscribers:', error);
    throw error;
  }
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.toLowerCase());
}

/**
 * Subscribe an email address
 */
export async function subscribeEmail(email: string): Promise<{
  success: boolean;
  message: string;
  subscriber?: NewsletterSubscriber;
}> {
  try {
    // Validate email
    if (!email || !isValidEmail(email)) {
      return {
        success: false,
        message: 'Invalid email address'
      };
    }

    const normalizedEmail = email.toLowerCase().trim();
    const subscribers = await loadSubscribers();

    // Check if already subscribed
    const existingSubscriber = subscribers.find(sub => sub.email === normalizedEmail);
    if (existingSubscriber) {
      if (existingSubscriber.active) {
        return {
          success: false,
          message: 'Email is already subscribed'
        };
      } else {
        // Reactivate subscription
        existingSubscriber.active = true;
        existingSubscriber.subscribedAt = new Date().toISOString();
        await saveSubscribers(subscribers);

        return {
          success: true,
          message: 'Successfully resubscribed',
          subscriber: existingSubscriber
        };
      }
    }

    // Add new subscriber
    const newSubscriber: NewsletterSubscriber = {
      email: normalizedEmail,
      subscribedAt: new Date().toISOString(),
      active: true
    };

    subscribers.push(newSubscriber);
    await saveSubscribers(subscribers);

    return {
      success: true,
      message: 'Successfully subscribed',
      subscriber: newSubscriber
    };
  } catch (error) {
    console.error('Error subscribing email:', error);
    return {
      success: false,
      message: 'An error occurred while subscribing'
    };
  }
}

/**
 * Unsubscribe an email address
 */
export async function unsubscribeEmail(email: string): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    if (!email || !isValidEmail(email)) {
      return {
        success: false,
        message: 'Invalid email address'
      };
    }

    const normalizedEmail = email.toLowerCase().trim();
    const subscribers = await loadSubscribers();

    const subscriber = subscribers.find(sub => sub.email === normalizedEmail);
    if (!subscriber) {
      return {
        success: false,
        message: 'Email not found in subscription list'
      };
    }

    if (!subscriber.active) {
      return {
        success: false,
        message: 'Email is already unsubscribed'
      };
    }

    // Deactivate subscription
    subscriber.active = false;
    await saveSubscribers(subscribers);

    return {
      success: true,
      message: 'Successfully unsubscribed'
    };
  } catch (error) {
    console.error('Error unsubscribing email:', error);
    return {
      success: false,
      message: 'An error occurred while unsubscribing'
    };
  }
}

/**
 * Get all active subscribers
 */
export async function getActiveSubscribers(): Promise<NewsletterSubscriber[]> {
  try {
    const subscribers = await loadSubscribers();
    return subscribers.filter(sub => sub.active);
  } catch (error) {
    console.error('Error getting active subscribers:', error);
    return [];
  }
}

/**
 * Get subscription statistics
 */
export async function getSubscriptionStats(): Promise<{
  total: number;
  active: number;
  inactive: number;
}> {
  try {
    const subscribers = await loadSubscribers();
    const active = subscribers.filter(sub => sub.active).length;
    const inactive = subscribers.length - active;

    return {
      total: subscribers.length,
      active,
      inactive
    };
  } catch (error) {
    console.error('Error getting subscription stats:', error);
    return {
      total: 0,
      active: 0,
      inactive: 0
    };
  }
}

/**
 * Export subscribers as CSV
 */
export async function exportSubscribersCSV(): Promise<string> {
  try {
    const subscribers = await loadSubscribers();

    const csvHeader = 'Email,Subscribed At,Active\n';
    const csvRows = subscribers.map(sub =>
      `${sub.email},${sub.subscribedAt},${sub.active}`
    ).join('\n');

    return csvHeader + csvRows;
  } catch (error) {
    console.error('Error exporting subscribers as CSV:', error);
    throw error;
  }
}

/**
 * Export subscribers as JSON
 */
export async function exportSubscribersJSON(): Promise<string> {
  try {
    const subscribers = await loadSubscribers();
    return JSON.stringify({
      subscribers,
      exportedAt: new Date().toISOString(),
      count: subscribers.length
    }, null, 2);
  } catch (error) {
    console.error('Error exporting subscribers as JSON:', error);
    throw error;
  }
}
