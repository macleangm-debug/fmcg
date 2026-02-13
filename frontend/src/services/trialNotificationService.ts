/**
 * Trial Notification Service
 * Handles trial expiration reminders and upgrade prompts
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Platform } from 'react-native';

const TRIAL_WARNING_DAYS = [7, 3, 1, 0]; // Days before expiration to send warnings
const NOTIFICATION_STORAGE_KEY = 'trial_notifications_sent';

interface TrialProduct {
  product_id: string;
  product_name: string;
  status: 'trial' | 'active' | 'inactive';
  linked_at?: string;
  trial_ends_at?: string;
}

interface NotificationRecord {
  [productId: string]: {
    [days: string]: boolean;
  };
}

class TrialNotificationService {
  private notificationsSent: NotificationRecord = {};

  async initialize() {
    try {
      const stored = await AsyncStorage.getItem(NOTIFICATION_STORAGE_KEY);
      if (stored) {
        this.notificationsSent = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load notification records:', error);
    }
  }

  async checkTrialExpirations(products: TrialProduct[]): Promise<TrialProduct[]> {
    const expiringProducts: TrialProduct[] = [];

    for (const product of products) {
      if (product.status !== 'trial') continue;

      const daysRemaining = this.calculateDaysRemaining(product);
      
      if (daysRemaining !== null && daysRemaining <= 7) {
        expiringProducts.push(product);
        
        // Check if we should show notification for this day threshold
        for (const warningDay of TRIAL_WARNING_DAYS) {
          if (daysRemaining <= warningDay && !this.hasNotificationBeenSent(product.product_id, warningDay)) {
            this.showTrialWarning(product, daysRemaining);
            await this.markNotificationSent(product.product_id, warningDay);
            break; // Only show one notification per check
          }
        }
      }
    }

    return expiringProducts;
  }

  private calculateDaysRemaining(product: TrialProduct): number | null {
    if (product.trial_ends_at) {
      const endDate = new Date(product.trial_ends_at);
      const now = new Date();
      return Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    }

    if (product.linked_at) {
      const linkedDate = new Date(product.linked_at);
      const trialEndDate = new Date(linkedDate);
      trialEndDate.setDate(trialEndDate.getDate() + 14);
      const now = new Date();
      return Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    }

    return null;
  }

  private hasNotificationBeenSent(productId: string, days: number): boolean {
    return this.notificationsSent[productId]?.[days.toString()] === true;
  }

  private async markNotificationSent(productId: string, days: number) {
    if (!this.notificationsSent[productId]) {
      this.notificationsSent[productId] = {};
    }
    this.notificationsSent[productId][days.toString()] = true;
    
    try {
      await AsyncStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(this.notificationsSent));
    } catch (error) {
      console.error('Failed to save notification record:', error);
    }
  }

  private showTrialWarning(product: TrialProduct, daysRemaining: number) {
    const title = daysRemaining <= 0 
      ? `${product.product_name} Trial Expired`
      : `${product.product_name} Trial Expiring`;
    
    const message = daysRemaining <= 0
      ? `Your free trial has ended. Upgrade now to continue using ${product.product_name}.`
      : daysRemaining === 1
        ? `Your trial expires tomorrow! Upgrade to keep your data and access.`
        : `Your trial expires in ${daysRemaining} days. Don't lose access to your data!`;

    if (Platform.OS === 'web') {
      // Use browser notification if available
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body: message });
      }
    }

    // Always show in-app alert
    // This will be shown by the component that calls checkTrialExpirations
  }

  getTrialStatus(product: TrialProduct): { 
    status: 'active' | 'expiring' | 'expired' | null; 
    daysRemaining: number;
    message: string;
  } {
    if (product.status !== 'trial') {
      return { status: null, daysRemaining: 0, message: '' };
    }

    const daysRemaining = this.calculateDaysRemaining(product) ?? 0;

    if (daysRemaining <= 0) {
      return { 
        status: 'expired', 
        daysRemaining: 0, 
        message: 'Trial has expired. Upgrade to continue.' 
      };
    }

    if (daysRemaining <= 3) {
      return { 
        status: 'expiring', 
        daysRemaining, 
        message: `Trial expires in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}` 
      };
    }

    return { 
      status: 'active', 
      daysRemaining, 
      message: `${daysRemaining} days remaining in trial` 
    };
  }

  async requestNotificationPermission(): Promise<boolean> {
    if (Platform.OS === 'web' && 'Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  }

  async clearNotificationRecords() {
    this.notificationsSent = {};
    await AsyncStorage.removeItem(NOTIFICATION_STORAGE_KEY);
  }
}

export const trialNotificationService = new TrialNotificationService();
