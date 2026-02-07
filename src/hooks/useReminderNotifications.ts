import { useEffect } from 'react';
import { notificationService } from '../lib/notifications';

interface Reminder {
  id: string;
  clientReference: string;
  article: string;
  price?: number;
  reminderDate: Date;
  reminderTime?: string;
}

export function useReminderNotifications(reminders: Reminder[]) {
  useEffect(() => {
    if (reminders.length === 0) return;

    const scheduleNotifications = async () => {
      const hasPermission = await notificationService.checkPermissions();

      if (!hasPermission) {
        const granted = await notificationService.requestPermissions();
        if (!granted) {
          console.log('Permissions de notification refusées');
          return;
        }
      }

      // Annuler toutes les notifications existantes pour éviter les doublons
      await notificationService.cancelAllNotifications();

      // Programmer une notification pour chaque rappel futur
      const now = new Date();

      for (const reminder of reminders) {
        let notificationDate = new Date(reminder.reminderDate);

        // Si une heure est spécifiée, l'utiliser
        if (reminder.reminderTime) {
          const [hours, minutes] = reminder.reminderTime.split(':');
          notificationDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        } else {
          // Par défaut, notifier à 9h le jour du rappel
          notificationDate.setHours(9, 0, 0, 0);
        }

        // Ne programmer que les notifications futures
        if (notificationDate > now) {
          const notificationId = parseInt(reminder.id.replace(/\D/g, '').slice(-9)) || Math.floor(Math.random() * 1000000);

          let body = `Client: ${reminder.clientReference} - ${reminder.article}`;
          if (reminder.price) {
            body += ` (${reminder.price.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €)`;
          }

          await notificationService.scheduleNotification({
            id: notificationId,
            title: '🔔 Rappel Client',
            body,
            scheduleAt: notificationDate,
            data: {
              reminderId: reminder.id,
              type: 'reminder',
            },
          });

          console.log(`Notification programmée pour ${notificationDate.toLocaleString('fr-FR')}`);
        }
      }
    };

    scheduleNotifications();
  }, [reminders]);

  // Fonction pour vérifier les rappels du jour
  const checkTodayReminders = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayReminders = reminders.filter((reminder) => {
      const reminderDate = new Date(reminder.reminderDate);
      reminderDate.setHours(0, 0, 0, 0);
      return reminderDate.getTime() === today.getTime();
    });

    return todayReminders;
  };

  // Fonction pour vérifier les rappels en retard
  const checkOverdueReminders = () => {
    const now = new Date();

    const overdueReminders = reminders.filter((reminder) => {
      return new Date(reminder.reminderDate) < now;
    });

    return overdueReminders;
  };

  return {
    checkTodayReminders,
    checkOverdueReminders,
  };
}
