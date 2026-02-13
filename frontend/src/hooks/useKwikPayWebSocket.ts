import { useEffect, useRef, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import api from '../api/client';

interface WebSocketMessage {
  type: 'connected' | 'transaction' | 'payment_status' | 'subscribed' | 'refund';
  data?: any;
  message?: string;
  timestamp?: string;
}

interface UseKwikPayWebSocketOptions {
  businessId: string;
  token: string;
  onTransaction?: (data: any) => void;
  onPaymentStatus?: (data: any) => void;
  onRefund?: (data: any) => void;
  autoReconnect?: boolean;
}

export function useKwikPayWebSocket(options: UseKwikPayWebSocketOptions) {
  const { businessId, token, onTransaction, onPaymentStatus, onRefund, autoReconnect = true } = options;
  
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const getWebSocketUrl = useCallback(() => {
    // Get base URL from API client
    const baseUrl = api.defaults.baseURL || '';
    
    // Convert HTTP(S) to WS(S)
    let wsUrl = baseUrl.replace(/^https?/, (match) => match === 'https' ? 'wss' : 'ws');
    
    // Remove /api suffix if present
    wsUrl = wsUrl.replace(/\/api$/, '');
    
    return `${wsUrl}/ws/kwikpay/${businessId}?token=${token}`;
  }, [businessId, token]);

  const connect = useCallback(() => {
    // Only connect in web browser - React Native would need a different WebSocket approach
    if (Platform.OS !== 'web') {
      console.log('WebSocket only supported on web platform');
      return;
    }

    if (!businessId || !token) {
      return;
    }

    try {
      const url = getWebSocketUrl();
      console.log('Connecting to WebSocket:', url.substring(0, 50) + '...');
      
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setError(null);
        
        // Subscribe to all events
        ws.send('subscribe_all');
        
        // Start ping interval to keep connection alive
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send('ping');
          }
        }, 30000);
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          setLastMessage(message);
          
          switch (message.type) {
            case 'transaction':
              onTransaction?.(message.data);
              break;
            case 'payment_status':
              onPaymentStatus?.(message.data);
              break;
            case 'refund':
              onRefund?.(message.data);
              break;
            case 'connected':
              console.log('WebSocket handshake complete:', message.message);
              break;
            case 'subscribed':
              console.log('Subscribed to channels:', message.data?.channels);
              break;
          }
        } catch (e) {
          // Handle non-JSON messages (like pong)
          if (event.data !== 'pong') {
            console.log('Non-JSON WebSocket message:', event.data);
          }
        }
      };

      ws.onerror = (event) => {
        console.error('WebSocket error:', event);
        setError('WebSocket connection error');
      };

      ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        setIsConnected(false);
        
        // Clear ping interval
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
        }
        
        // Auto-reconnect if enabled and not intentional close
        if (autoReconnect && event.code !== 1000 && event.code !== 4001 && event.code !== 4002 && event.code !== 4003) {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('Attempting to reconnect WebSocket...');
            connect();
          }, 5000);
        }
      };
    } catch (e) {
      console.error('Failed to create WebSocket:', e);
      setError('Failed to create WebSocket connection');
    }
  }, [businessId, token, getWebSocketUrl, onTransaction, onPaymentStatus, onRefund, autoReconnect]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnect');
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const sendMessage = useCallback((message: string | object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const data = typeof message === 'string' ? message : JSON.stringify(message);
      wsRef.current.send(data);
    }
  }, []);

  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    lastMessage,
    error,
    sendMessage,
    connect,
    disconnect,
  };
}

export default useKwikPayWebSocket;
