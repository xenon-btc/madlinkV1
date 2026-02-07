import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

interface ScheduleNotificationOptions {
  id: number;
  title: string;
  body: string;
  scheduleAt: Date;
  data?: any;
}

class NotificationService {
  private isInitialized = false;
  private isPlatformReady = false;

  constructor() {
    this.isPlatformReady = Capacitor.isNativePlatform();
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      if (this.isPlatformReady) {
        // Demander les permissions pour les notifications locales
        const permission = await LocalNotifications.checkPermissions();

        if (permission.display === 'prompt' || permission.display === 'prompt-with-rationale') {
          await LocalNotifications.requestPermissions();
        }

        // Écouter les événements de notification
        await LocalNotifications.addListener('localNotificationReceived', (notification) => {
          console.log('Notification reçue:', notification);
        });

        await LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
          console.log('Notification cliquée:', notification);
          // Ici vous pouvez rediriger l'utilisateur vers la page des rappels
        });

        this.isInitialized = true;
      } else {
        // Sur le web, utiliser l'API Notification native du navigateur
        if ('Notification' in window) {
          if (Notification.permission === 'default') {
            await Notification.requestPermission();
          }
          this.isInitialized = true;
        }
      }
    } catch (error) {
      console.error('Erreur lors de l\'initialisation des notifications:', error);
    }
  }

  async scheduleNotification(options: ScheduleNotificationOptions) {
    try {
      await this.initialize();

      if (this.isPlatformReady) {
        // Pour mobile (iOS/Android)
        await LocalNotifications.schedule({
          notifications: [
            {
              id: options.id,
              title: options.title,
              body: options.body,
              schedule: {
                at: options.scheduleAt,
              },
              sound: undefined,
              attachments: undefined,
              actionTypeId: '',
              extra: options.data || {},
            },
          ],
        });
      } else {
        // Pour le web - vérifier si la date est future
        const now = new Date().getTime();
        const scheduleTime = options.scheduleAt.getTime();
        const delay = scheduleTime - now;

        if (delay > 0) {
          // Programmer la notification web
          setTimeout(() => {
            this.showWebNotification(options.title, options.body);
          }, delay);

          // Stocker dans localStorage pour persistance
          this.storeScheduledNotification(options);
        }
      }

      return true;
    } catch (error) {
      console.error('Erreur lors de la programmation de la notification:', error);
      return false;
    }
  }

  private showWebNotification(title: string, body: string) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'reminder',
        requireInteraction: false,
      });
    }
  }

  private storeScheduledNotification(options: ScheduleNotificationOptions) {
    try {
      const stored = localStorage.getItem('scheduledNotifications');
      const notifications = stored ? JSON.parse(stored) : [];

      notifications.push({
        ...options,
        scheduleAt: options.scheduleAt.toISOString(),
      });

      localStorage.setItem('scheduledNotifications', JSON.stringify(notifications));
    } catch (error) {
      console.error('Erreur lors du stockage de la notification:', error);
    }
  }

  async cancelNotification(id: number) {
    try {
      if (this.isPlatformReady) {
        await LocalNotifications.cancel({
          notifications: [{ id }],
        });
      } else {
        // Pour le web, retirer du localStorage
        const stored = localStorage.getItem('scheduledNotifications');
        if (stored) {
          const notifications = JSON.parse(stored);
          const filtered = notifications.filter((n: any) => n.id !== id);
          localStorage.setItem('scheduledNotifications', JSON.stringify(filtered));
        }
      }
      return true;
    } catch (error) {
      console.error('Erreur lors de l\'annulation de la notification:', error);
      return false;
    }
  }

  async cancelAllNotifications() {
    try {
      if (this.isPlatformReady) {
        await LocalNotifications.removeAllDeliveredNotifications();
        const pending = await LocalNotifications.getPending();
        if (pending.notifications.length > 0) {
          await LocalNotifications.cancel({
            notifications: pending.notifications,
          });
        }
      } else {
        localStorage.removeItem('scheduledNotifications');
      }
      return true;
    } catch (error) {
      console.error('Erreur lors de l\'annulation de toutes les notifications:', error);
      return false;
    }
  }

  async getPendingNotifications() {
    try {
      if (this.isPlatformReady) {
        const result = await LocalNotifications.getPending();
        return result.notifications;
      } else {
        const stored = localStorage.getItem('scheduledNotifications');
        return stored ? JSON.parse(stored) : [];
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des notifications en attente:', error);
      return [];
    }
  }

  async checkPermissions() {
    try {
      if (this.isPlatformReady) {
        const result = await LocalNotifications.checkPermissions();
        return result.display === 'granted';
      } else {
        return Notification.permission === 'granted';
      }
    } catch (error) {
      console.error('Erreur lors de la vérification des permissions:', error);
      return false;
    }
  }

  async requestPermissions() {
    try {
      if (this.isPlatformReady) {
        const result = await LocalNotifications.requestPermissions();
        return result.display === 'granted';
      } else {
        if ('Notification' in window) {
          const permission = await Notification.requestPermission();
          return permission === 'granted';
        }
        return false;
      }
    } catch (error) {
      console.error('Erreur lors de la demande de permissions:', error);
      return false;
    }
  }

  // Fonction pour restaurer les notifications web au chargement de la page
  async restoreWebNotifications() {
    if (this.isPlatformReady) return;

    try {
      const stored = localStorage.getItem('scheduledNotifications');
      if (!stored) return;

      const notifications = JSON.parse(stored);
      const now = new Date().getTime();
      const validNotifications: any[] = [];

      notifications.forEach((notif: any) => {
        const scheduleTime = new Date(notif.scheduleAt).getTime();
        const delay = scheduleTime - now;

        if (delay > 0) {
          // Re-programmer la notification
          setTimeout(() => {
            this.showWebNotification(notif.title, notif.body);
          }, delay);

          validNotifications.push(notif);
        }
      });

      // Nettoyer les notifications expirées
      localStorage.setItem('scheduledNotifications', JSON.stringify(validNotifications));
    } catch (error) {
      console.error('Erreur lors de la restauration des notifications:', error);
    }
  }
}

// Instance singleton
export const notificationService = new NotificationService();
