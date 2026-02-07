import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Bell, Calendar, Tag, DollarSign, FileText, Clock, MessageSquare, BellRing } from 'lucide-react';
import { collection, addDoc, deleteDoc, doc, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from '../store/auth';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useReminderNotifications } from '../hooks/useReminderNotifications';
import { notificationService } from '../lib/notifications';

interface Reminder {
  id: string;
  userId: string;
  clientReference: string;
  article: string;
  price?: number;
  reminderDate: Date;
  reminderTime?: string;
  comment?: string;
  createdAt: Date;
}

export function Reminders() {
  const { user } = useAuthStore();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [formData, setFormData] = useState({
    clientReference: '',
    article: '',
    price: '',
    reminderDate: '',
    reminderTime: '',
    comment: '',
  });

  // Utiliser le hook de notifications
  const { checkTodayReminders, checkOverdueReminders } = useReminderNotifications(reminders);

  useEffect(() => {
    if (user?.uid) {
      fetchReminders();
      checkNotificationPermissions();
    }
  }, [user]);

  const checkNotificationPermissions = async () => {
    const hasPermission = await notificationService.checkPermissions();
    setNotificationsEnabled(hasPermission);
  };

  const handleEnableNotifications = async () => {
    const granted = await notificationService.requestPermissions();
    setNotificationsEnabled(granted);
    if (granted) {
      alert('✅ Notifications activées ! Vous serez notifié pour vos rappels.');
    } else {
      alert('❌ Permissions refusées. Activez les notifications dans les paramètres de votre navigateur/appareil.');
    }
  };

  const fetchReminders = async () => {
    if (!user?.uid) return;

    try {
      setLoading(true);
      const remindersRef = collection(db, 'reminders');
      const q = query(
        remindersRef,
        where('userId', '==', user.uid),
        orderBy('reminderDate', 'asc')
      );

      const querySnapshot = await getDocs(q);
      const remindersData: Reminder[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        remindersData.push({
          id: doc.id,
          userId: data.userId,
          clientReference: data.clientReference,
          article: data.article,
          price: data.price,
          reminderDate: data.reminderDate.toDate(),
          reminderTime: data.reminderTime,
          comment: data.comment,
          createdAt: data.createdAt.toDate(),
        });
      });

      setReminders(remindersData);
    } catch (error) {
      console.error('Erreur lors de la récupération des rappels:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.uid || !formData.clientReference || !formData.article || !formData.reminderDate) {
      alert('Veuillez remplir les champs obligatoires');
      return;
    }

    try {
      const reminderData: any = {
        userId: user.uid,
        clientReference: formData.clientReference,
        article: formData.article,
        reminderDate: Timestamp.fromDate(new Date(formData.reminderDate)),
        createdAt: Timestamp.now(),
      };

      if (formData.price) {
        reminderData.price = parseFloat(formData.price);
      }

      if (formData.reminderTime) {
        reminderData.reminderTime = formData.reminderTime;
      }

      if (formData.comment) {
        reminderData.comment = formData.comment;
      }

      await addDoc(collection(db, 'reminders'), reminderData);

      setFormData({
        clientReference: '',
        article: '',
        price: '',
        reminderDate: '',
        reminderTime: '',
        comment: '',
      });
      setShowForm(false);
      fetchReminders();
    } catch (error: any) {
      console.error('Erreur lors de la création du rappel:', error);
      const errorMessage = error?.message || 'Erreur lors de la création du rappel';
      alert(`Erreur: ${errorMessage}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce rappel ?')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'reminders', id));
      fetchReminders();
    } catch (error) {
      console.error('Erreur lors de la suppression du rappel:', error);
      alert('Erreur lors de la suppression du rappel');
    }
  };

  const isPastDue = (date: Date) => {
    return date < new Date();
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const todayReminders = checkTodayReminders();
  const overdueReminders = checkOverdueReminders();

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Rappels</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Gérez vos rappels clients et notifications
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          {!notificationsEnabled && (
            <button
              onClick={handleEnableNotifications}
              className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
            >
              <BellRing className="w-5 h-5" />
              Activer les notifications
            </button>
          )}
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            Nouveau rappel
          </button>
        </div>
      </div>

      {/* Alertes pour les rappels du jour et en retard */}
      {(todayReminders.length > 0 || overdueReminders.length > 0) && (
        <div className="space-y-3 mb-6">
          {todayReminders.length > 0 && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                <div>
                  <h3 className="text-sm font-semibold text-yellow-900 dark:text-yellow-100">
                    {todayReminders.length} rappel{todayReminders.length > 1 ? 's' : ''} aujourd'hui
                  </h3>
                  <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                    {todayReminders.map(r => r.clientReference).join(', ')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {overdueReminders.length > 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-red-600 dark:text-red-400" />
                <div>
                  <h3 className="text-sm font-semibold text-red-900 dark:text-red-100">
                    {overdueReminders.length} rappel{overdueReminders.length > 1 ? 's' : ''} en retard
                  </h3>
                  <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                    {overdueReminders.map(r => r.clientReference).join(', ')}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Créer un rappel
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <FileText className="w-4 h-4 inline mr-2" />
                Référence client
              </label>
              <input
                type="text"
                value={formData.clientReference}
                onChange={(e) => setFormData({ ...formData, clientReference: e.target.value })}
                className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:text-white"
                placeholder="Ex: CLIENT-001"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Tag className="w-4 h-4 inline mr-2" />
                Article
              </label>
              <input
                type="text"
                value={formData.article}
                onChange={(e) => setFormData({ ...formData, article: e.target.value })}
                className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:text-white"
                placeholder="Ex: Installation fibre"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <DollarSign className="w-4 h-4 inline mr-2" />
                Prix (€) <span className="text-gray-400 text-xs">(optionnel)</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:text-white"
                placeholder="0.00"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Calendar className="w-4 h-4 inline mr-2" />
                  Date du rappel
                </label>
                <input
                  type="date"
                  value={formData.reminderDate}
                  onChange={(e) => setFormData({ ...formData, reminderDate: e.target.value })}
                  className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Clock className="w-4 h-4 inline mr-2" />
                  Heure <span className="text-gray-400 text-xs">(optionnel)</span>
                </label>
                <input
                  type="time"
                  value={formData.reminderTime}
                  onChange={(e) => setFormData({ ...formData, reminderTime: e.target.value })}
                  className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <MessageSquare className="w-4 h-4 inline mr-2" />
                Commentaire <span className="text-gray-400 text-xs">(optionnel)</span>
              </label>
              <textarea
                value={formData.comment}
                onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:text-white"
                placeholder="Notes ou informations complémentaires..."
                rows={3}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors"
              >
                Créer le rappel
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 py-2 px-4 rounded-lg transition-colors"
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : reminders.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-12 text-center">
          <Bell className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
           Cette fonctionnalité sera disponible prochainement.
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Créez votre premier rappel pour ne plus oublier vos clients
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reminders.map((reminder) => (
            <div
              key={reminder.id}
              className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border-l-4 ${
                isPastDue(reminder.reminderDate)
                  ? 'border-red-500'
                  : isToday(reminder.reminderDate)
                  ? 'border-yellow-500'
                  : 'border-green-500'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    {isPastDue(reminder.reminderDate) && (
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
                        En retard
                      </span>
                    )}
                    {isToday(reminder.reminderDate) && (
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
                        Aujourd'hui
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Référence client</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {reminder.clientReference}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Article</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {reminder.article}
                      </p>
                    </div>
                    {reminder.price !== undefined && reminder.price !== null && (
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Prix</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {reminder.price.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Date du rappel</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {format(reminder.reminderDate, 'dd MMMM yyyy', { locale: fr })}
                        {reminder.reminderTime && (
                          <span className="ml-2 text-blue-600 dark:text-blue-400">
                            à {reminder.reminderTime}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {reminder.comment && (
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                        <MessageSquare className="w-3 h-3 inline mr-1" />
                        Commentaire
                      </p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {reminder.comment}
                      </p>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handleDelete(reminder.id)}
                  className="flex-shrink-0 p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  title="Supprimer le rappel"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
