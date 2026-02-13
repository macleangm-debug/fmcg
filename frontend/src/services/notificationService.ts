/**
 * Real-time Notification Service
 * Uses WebSocket for push notifications
 */

import { Platform } from 'react-native';

type NotificationListener = (notification: Notification) => void;

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  timestamp: string;
  read: boolean;
}

class NotificationService {
  private ws: WebSocket | null = null;
  private listeners: Set<NotificationListener> = new Set();
  private notifications: Notification[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private connected = false;
  private userId: string | null = null;

  connect(userId?: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected');
      return;
    }

    this.userId = userId || null;

    // Get WebSocket URL from environment
    const baseUrl = process.env.EXPO_PUBLIC_API_URL || process.env.REACT_APP_BACKEND_URL || '';
    const wsUrl = baseUrl.replace('https://', 'wss://').replace('http://', 'ws://');
    
    if (!wsUrl) {
      console.warn('No WebSocket URL available');
      return;
    }

    try {
      this.ws = new WebSocket(`${wsUrl}/api/superadmin/ws/notifications`);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.connected = true;
        this.reconnectAttempts = 0;

        // Subscribe with user ID if available
        if (this.userId) {
          this.send({ type: 'subscribe', user_id: this.userId });
        }

        // Start heartbeat
        this.startHeartbeat();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.connected = false;
        this.attemptReconnect();
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
  }

  private send(data: object) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  private handleMessage(data: any) {
    switch (data.type) {
      case 'connected':
      case 'subscribed':
      case 'pong':
      case 'heartbeat':
        // Connection management messages
        break;

      case 'notification':
      case 'new_merchant':
      case 'new_approval':
      case 'large_transaction':
      case 'system_alert':
      case 'settings_updated':
        this.addNotification({
          id: `notif_${Date.now()}`,
          type: data.type,
          title: this.getNotificationTitle(data.type),
          message: data.data?.message || data.message || 'New notification',
          data: data.data,
          timestamp: data.timestamp || new Date().toISOString(),
          read: false,
        });
        break;

      default:
        console.log('Unknown message type:', data.type);
    }
  }

  private getNotificationTitle(type: string): string {
    const titles: Record<string, string> = {
      new_merchant: 'New Merchant Application',
      new_approval: 'New Approval Required',
      large_transaction: 'Large Transaction Alert',
      system_alert: 'System Alert',
      settings_updated: 'Settings Updated',
      notification: 'Notification',
    };
    return titles[type] || 'Notification';
  }

  private addNotification(notification: Notification) {
    this.notifications.unshift(notification);
    
    // Keep only last 100 notifications
    if (this.notifications.length > 100) {
      this.notifications = this.notifications.slice(0, 100);
    }

    // Notify all listeners
    this.listeners.forEach((listener) => listener(notification));
  }

  private startHeartbeat() {
    setInterval(() => {
      if (this.connected) {
        this.send({ type: 'ping' });
      }
    }, 25000);
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      
      setTimeout(() => {
        this.connect(this.userId || undefined);
      }, this.reconnectDelay * this.reconnectAttempts);
    }
  }

  subscribe(listener: NotificationListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getNotifications(): Notification[] {
    return [...this.notifications];
  }

  getUnreadCount(): number {
    return this.notifications.filter((n) => !n.read).length;
  }

  markAsRead(notificationId: string) {
    const notification = this.notifications.find((n) => n.id === notificationId);
    if (notification) {
      notification.read = true;
    }
  }

  markAllAsRead() {
    this.notifications.forEach((n) => {
      n.read = true;
    });
  }

  clearAll() {
    this.notifications = [];
  }

  isConnected(): boolean {
    return this.connected;
  }
}

// Singleton instance
export const notificationService = new NotificationService();

// React hook for using notifications
export const useNotifications = () => {
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);

  React.useEffect(() => {
    // Connect to WebSocket
    notificationService.connect();

    // Subscribe to new notifications
    const unsubscribe = notificationService.subscribe((notification) => {
      setNotifications(notificationService.getNotifications());
      setUnreadCount(notificationService.getUnreadCount());
    });

    // Initial state
    setNotifications(notificationService.getNotifications());
    setUnreadCount(notificationService.getUnreadCount());

    return () => {
      unsubscribe();
    };
  }, []);

  return {
    notifications,
    unreadCount,
    markAsRead: (id: string) => {
      notificationService.markAsRead(id);
      setUnreadCount(notificationService.getUnreadCount());
    },
    markAllAsRead: () => {
      notificationService.markAllAsRead();
      setUnreadCount(0);
    },
    clearAll: () => {
      notificationService.clearAll();
      setNotifications([]);
      setUnreadCount(0);
    },
    isConnected: notificationService.isConnected(),
  };
};

// Import React for the hook
import React from 'react';
