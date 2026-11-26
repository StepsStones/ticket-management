import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { NotificationItem } from '../types';
import { api } from '../services/api';
import { useAuth } from './AuthContext';

interface NotificationContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  refreshNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  toast: { title: string; message: string; type?: string } | null;
  clearToast: () => void;
  showToast: (title: string, message: string, type?: string) => void;
  requestPushPermission: () => Promise<NotificationPermission>;
  permissionStatus: NotificationPermission;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Synthesized audio alert chime using Web Audio API
const playNotificationChime = () => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    // Friendly 2-tone melodic notification chime
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now); // D5
    osc1.frequency.exponentialRampToValueAtTime(880.00, now + 0.12); // A5

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(440.00, now); // A4
    osc2.frequency.exponentialRampToValueAtTime(659.25, now + 0.12); // E5

    gainNode.gain.setValueAtTime(0.18, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.45);
    osc2.stop(now + 0.45);
  } catch (err) {
    // Suppress browser autoplay restrictions if user hasn't interacted yet
  }
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [toast, setToast] = useState<{ title: string; message: string; type?: string } | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );
  const wsRef = useRef<WebSocket | null>(null);

  const clearToast = () => setToast(null);

  const showToast = (title: string, message: string, type?: string) => {
    playNotificationChime();
    setToast({ title, message, type });
    setTimeout(() => {
      setToast((curr) => (curr?.title === title ? null : curr));
    }, 5000);
  };

  // Request browser desktop push notification permission
  const requestPushPermission = async (): Promise<NotificationPermission> => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }
    try {
      const perm = await Notification.requestPermission();
      setPermissionStatus(perm);
      return perm;
    } catch {
      return 'denied';
    }
  };

  const refreshNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const data = await api.getNotifications(0, 30);
      setNotifications(data.notifications);
      setUnreadCount(data.unread_count);
    } catch {
      // ignore
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      refreshNotifications();
      // Auto-prompt browser push permission if in default state
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().then((p) => setPermissionStatus(p)).catch(() => {});
      }
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [user, refreshNotifications]);

  // WebSocket Connection for Real-Time Push Notifications
  useEffect(() => {
    if (!user) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      return;
    }

    const token = localStorage.getItem('stepsstone_access_token');
    if (!token) return;

    const rawApiUrl = import.meta.env.VITE_API_URL?.trim();
    let wsUrl: string;

    if (rawApiUrl) {
      const cleanUrl = rawApiUrl.replace(/\/+$/, '');
      const wsBase = cleanUrl.replace(/^https?:\/\//i, (match: string) =>
        match.toLowerCase().startsWith('https') ? 'wss://' : 'ws://'
      );
      wsUrl = `${wsBase}/api/v1/ws?token=${encodeURIComponent(token)}`;
    } else {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      wsUrl = `${protocol}//${host}/api/v1/ws?token=${encodeURIComponent(token)}`;
    }

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        if (parsed.event === 'NOTIFICATION') {
          const newNotif = parsed.data;
          setNotifications((prev) => [newNotif, ...prev]);
          setUnreadCount((cnt) => cnt + 1);

          // 1. Play audio chime
          playNotificationChime();

          // 2. Trigger HTML5 Native Desktop Push Notification
          if ('Notification' in window && Notification.permission === 'granted') {
            try {
              new Notification(newNotif.title, {
                body: newNotif.message,
                icon: '/favicon.svg',
                tag: newNotif.id || String(Date.now()),
              });
            } catch (desktopErr) {
              console.warn('Native notification suppressed:', desktopErr);
            }
          }

          // 3. Show in-app banner toast
          setToast({
            title: newNotif.title,
            message: newNotif.message,
            type: newNotif.type,
          });

          // Auto-clear toast after 5s
          setTimeout(() => {
            setToast((current) => (current?.title === newNotif.title ? null : current));
          }, 5000);
        }
      } catch {
        // ping or non-json message
      }
    };

    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send('ping');
      }
    }, 25000);

    return () => {
      clearInterval(pingInterval);
      ws.close();
      wsRef.current = null;
    };
  }, [user]);

  const markAsRead = async (id: string) => {
    await api.markNotificationRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    setUnreadCount((cnt) => Math.max(0, cnt - 1));
  };

  const markAllAsRead = async () => {
    await api.markAllNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        refreshNotifications,
        markAsRead,
        markAllAsRead,
        toast,
        clearToast,
        showToast,
        requestPushPermission,
        permissionStatus,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
