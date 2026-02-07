import React, { useState, useEffect } from 'react';
import { Users, TrendingUp, Receipt, Eye, Search, Download, FileText, Mail, Trash2, MessageSquare, Calendar, ChevronLeft, ChevronRight, Bell } from 'lucide-react';
import { collection, getDocs, query, where, orderBy, deleteDoc, doc, Timestamp, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, parse, addMonths, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface UserStats {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  paymentStatus: string;
  totalRevenue: number;
  monthlyRevenue: number;
  weeklyRevenue: number;
  totalExpenses: number;
  monthlyExpenses: number;
  totalInterventions: number;
  monthlyInterventions: number;
  createdAt: Date;
  lastActivity: Date;
  trialDaysRemaining: number;
  hasUsedTrial: boolean;
}

interface ContactMessage {
  id: string;
  user_name: string;
  user_email: string;
  subject: string;
  message: string;
  createdAt: Date;
  read: boolean;
}

export function Admin() {
  const [users, setUsers] = useState<UserStats[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserStats[]>([]);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserStats | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [userDetailsMonth, setUserDetailsMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [userMonthlyStats, setUserMonthlyStats] = useState({
    revenue: 0,
    expenses: 0,
    interventions: 0,
    netResult: 0
  });
  const [activeTab, setActiveTab] = useState<'users' | 'messages'>('users');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [monthlyStats, setMonthlyStats] = useState({
    totalRevenue: 0,
    totalExpenses: 0,
    totalInterventions: 0,
    netResult: 0
  });

  const navigateMonth = (direction: 'prev' | 'next') => {
    const currentDate = parse(selectedMonth, 'yyyy-MM', new Date());
    const newDate = direction === 'prev' ? subMonths(currentDate, 1) : addMonths(currentDate, 1);
    setSelectedMonth(format(newDate, 'yyyy-MM'));
  };

  useEffect(() => {
    fetchUsersStats();
    fetchMessages();
    fetchMonthlyStats();
    fixMissingReadField();
  }, []);

  const fixMissingReadField = async () => {
    try {
      const messagesRef = collection(db, 'contact_messages');
      const querySnapshot = await getDocs(messagesRef);

      const updates: Promise<void>[] = [];
      querySnapshot.docs.forEach((docSnapshot) => {
        const data = docSnapshot.data();
        if (data.read === undefined) {
          updates.push(
            updateDoc(doc(db, 'contact_messages', docSnapshot.id), {
              read: false
            })
          );
        }
      });

      if (updates.length > 0) {
        await Promise.all(updates);
        console.log(`Fixed ${updates.length} messages without read field`);
      }
    } catch (error) {
      console.error('Erreur lors de la correction des messages:', error);
    }
  };

  useEffect(() => {
    fetchMonthlyStats();
  }, [selectedMonth]);

  useEffect(() => {
    const filtered = users.filter(user => 
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredUsers(filtered);
  }, [searchTerm, users]);

  const fetchMessages = async () => {
    try {
      setMessagesLoading(true);
      const messagesRef = collection(db, 'contact_messages');
      const q = query(messagesRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const fetchedMessages = querySnapshot.docs.map(doc => ({
        id: doc.id,
        user_name: doc.data().user_name || '',
        user_email: doc.data().user_email || '',
        subject: doc.data().subject || '',
        message: doc.data().message || '',
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        read: doc.data().read || false
      }));

      setMessages(fetchedMessages);
    } catch (error) {
      console.error('Erreur lors de la récupération des messages:', error);
    } finally {
      setMessagesLoading(false);
    }
  };

  const fetchMonthlyStats = async () => {
    try {
      const start = startOfMonth(parse(selectedMonth, 'yyyy-MM', new Date()));
      const end = endOfMonth(start);
      
      // Récupérer toutes les interventions du mois sélectionné
      const interventionsRef = collection(db, 'interventions');
      const interventionsQuery = query(
        interventionsRef,
        where('date', '>=', Timestamp.fromDate(start)),
        where('date', '<=', Timestamp.fromDate(end)),
        orderBy('date', 'desc')
      );
      const interventionsSnapshot = await getDocs(interventionsQuery);
      
      let totalRevenue = 0;
      let totalInterventions = 0;
      
      interventionsSnapshot.forEach((doc) => {
        const intervention = doc.data();
        totalRevenue += intervention.totalPrice || 0;
        totalInterventions++;
      });
      
      // Récupérer toutes les dépenses du mois sélectionné
      const expensesRef = collection(db, 'expenses');
      const expensesQuery = query(
        expensesRef,
        where('date', '>=', Timestamp.fromDate(start)),
        where('date', '<=', Timestamp.fromDate(end))
      );
      const expensesSnapshot = await getDocs(expensesQuery);
      
      let totalExpenses = 0;
      expensesSnapshot.forEach((doc) => {
        const expense = doc.data();
        totalExpenses += expense.amount || 0;
      });
      
      setMonthlyStats({
        totalRevenue,
        totalExpenses,
        totalInterventions,
        netResult: totalRevenue - totalExpenses
      });
      
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques mensuelles:', error);
    }
  };

  const fetchUsersStats = async () => {
    try {
      setLoading(true);
      
      // Récupérer tous les utilisateurs
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);
      
      const userStatsPromises = usersSnapshot.docs.map(async (userDoc) => {
        const userData = userDoc.data();
        const userId = userDoc.id;
        
        // Récupérer les interventions de l'utilisateur
        const interventionsRef = collection(db, 'interventions');
        const interventionsQuery = query(
          interventionsRef,
          where('userId', '==', userId),
          orderBy('date', 'desc')
        );
        const interventionsSnapshot = await getDocs(interventionsQuery);
        
        // Récupérer les dépenses de l'utilisateur
        const expensesRef = collection(db, 'expenses');
        const expensesQuery = query(
          expensesRef,
          where('userId', '==', userId),
          orderBy('date', 'desc')
        );
        const expensesSnapshot = await getDocs(expensesQuery);
        
        // Calculer les statistiques
        const now = new Date();
        const startOfCurrentMonth = startOfMonth(now);
        const endOfCurrentMonth = endOfMonth(now);
        const startOfCurrentWeek = startOfWeek(now, { weekStartsOn: 1 }); // Lundi comme premier jour
        const endOfCurrentWeek = endOfWeek(now, { weekStartsOn: 1 });
        
        let totalRevenue = 0;
        let monthlyRevenue = 0;
        let weeklyRevenue = 0;
        let totalInterventions = 0;
        let monthlyInterventions = 0;
        let lastActivity = userData.createdAt?.toDate() || new Date();
        
        interventionsSnapshot.forEach((doc) => {
          const intervention = doc.data();
          const interventionDate = intervention.date?.toDate();
          const price = intervention.totalPrice || 0;
          
          totalRevenue += price;
          totalInterventions++;
          
          if (interventionDate >= startOfCurrentMonth && interventionDate <= endOfCurrentMonth) {
            monthlyRevenue += price;
            monthlyInterventions++;
          }
          
          if (interventionDate >= startOfCurrentWeek && interventionDate <= endOfCurrentWeek) {
            weeklyRevenue += price;
          }
          
          if (interventionDate > lastActivity) {
            lastActivity = interventionDate;
          }
        });
        
        let totalExpenses = 0;
        let monthlyExpenses = 0;
        
        expensesSnapshot.forEach((doc) => {
          const expense = doc.data();
          const expenseDate = expense.date?.toDate();
          const amount = expense.amount || 0;
          
          totalExpenses += amount;
          
          if (expenseDate >= startOfCurrentMonth && expenseDate <= endOfCurrentMonth) {
            monthlyExpenses += amount;
          }
          
          if (expenseDate > lastActivity) {
            lastActivity = expenseDate;
          }
        });
        
        // Calculer les jours d'essai restants
        const createdAt = userData.createdAt?.toDate() || new Date();
        const accountAge = Math.floor((new Date().getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
        const hasUsedTrialFromDB = userData.hasUsedTrial || false;
        const effectiveHasUsedTrial = hasUsedTrialFromDB || (accountAge > 90);

        let trialDaysRemaining = 0;
        if (!effectiveHasUsedTrial && userData.payment_status !== 'paid') {
          const trialEndDate = new Date(createdAt);
          trialEndDate.setDate(trialEndDate.getDate() + 90);
          const daysLeft = Math.ceil((trialEndDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
          trialDaysRemaining = Math.max(0, daysLeft);
        }

        return {
          userId,
          email: userData.email || '',
          firstName: userData.firstName || '',
          lastName: userData.lastName || '',
          phone: userData.phone || '',
          paymentStatus: userData.payment_status || 'unpaid',
          totalRevenue,
          monthlyRevenue,
          weeklyRevenue,
          totalExpenses,
          monthlyExpenses,
          totalInterventions,
          monthlyInterventions,
          createdAt,
          lastActivity,
          trialDaysRemaining,
          hasUsedTrial: effectiveHasUsedTrial
        };
      });
      
      const userStats = await Promise.all(userStatsPromises);
      setUsers(userStats.sort((a, b) => b.totalRevenue - a.totalRevenue));
      
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteMessage = async (messageId: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce message ?')) {
      try {
        await deleteDoc(doc(db, 'contact_messages', messageId));
        await fetchMessages();
      } catch (error) {
        console.error('Erreur lors de la suppression du message:', error);
      }
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // En-tête
    doc.setFontSize(20);
    doc.setTextColor(59, 130, 246);
    doc.text("Mad", 14, 20);
    doc.setTextColor(0, 0, 0);
    doc.text("lin", 32, 20);
    doc.setTextColor(59, 130, 246);
    doc.text("K", 42, 20);
    
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text(`Rapport Administrateur - ${format(new Date(), 'MMMM yyyy', { locale: fr })}`, 14, 35);
    
    // Tableau des utilisateurs avec la colonne CA Semaine et Jours d'essai
    (doc as any).autoTable({
      head: [['Nom', 'Email', 'Statut', 'Essai', 'CA Total', 'CA Mois', 'CA Semaine', 'Dépenses', 'Interv.']],
      body: filteredUsers.map(user => [
        `${user.firstName} ${user.lastName}`,
        user.email,
        user.paymentStatus === 'paid' ? 'Payé' : 'Non payé',
        user.paymentStatus === 'paid' ? '-' : user.hasUsedTrial ? 'Expiré' : `${user.trialDaysRemaining}j`,
        `${user.totalRevenue.toLocaleString('fr-FR')} €`,
        `${user.monthlyRevenue.toLocaleString('fr-FR')} €`,
        `${user.weeklyRevenue.toLocaleString('fr-FR')} €`,
        `${user.totalExpenses.toLocaleString('fr-FR')} €`,
        user.totalInterventions.toString()
      ]),
      startY: 45,
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [59, 130, 246] },
      columnStyles: {
        0: { cellWidth: 23 },
        1: { cellWidth: 32 },
        2: { cellWidth: 15 },
        3: { cellWidth: 13 },
        4: { cellWidth: 20 },
        5: { cellWidth: 20 },
        6: { cellWidth: 20 },
        7: { cellWidth: 20 },
        8: { cellWidth: 15 }
      }
    });
    
    // Statistiques globales
    const totalUsers = filteredUsers.length;
    const paidUsers = filteredUsers.filter(u => u.paymentStatus === 'paid').length;
    const totalRevenue = filteredUsers.reduce((sum, u) => sum + u.totalRevenue, 0);
    const totalWeeklyRevenue = filteredUsers.reduce((sum, u) => sum + u.weeklyRevenue, 0);
    const totalExpenses = filteredUsers.reduce((sum, u) => sum + u.totalExpenses, 0);
    
    const finalY = (doc as any).lastAutoTable.finalY || 45;
    
    doc.setFontSize(12);
    doc.text(`Total utilisateurs: ${totalUsers}`, 14, finalY + 15);
    doc.text(`Utilisateurs payants: ${paidUsers}`, 14, finalY + 25);
    doc.text(`CA total plateforme: ${totalRevenue.toLocaleString('fr-FR')} €`, 14, finalY + 35);
    doc.text(`CA cette semaine: ${totalWeeklyRevenue.toLocaleString('fr-FR')} €`, 14, finalY + 45);
    doc.text(`Dépenses totales: ${totalExpenses.toLocaleString('fr-FR')} €`, 14, finalY + 55);
    
    doc.save(`rapport-admin-${format(new Date(), 'yyyy-MM')}.pdf`);
  };

  const viewUserDetails = (user: UserStats) => {
    setSelectedUser(user);
    setUserDetailsMonth(format(new Date(), 'yyyy-MM'));
    setShowModal(true);
    fetchUserMonthlyStats(user.userId, format(new Date(), 'yyyy-MM'));
  };

  const fetchUserMonthlyStats = async (userId: string, month: string) => {
    try {
      const start = startOfMonth(parse(month, 'yyyy-MM', new Date()));
      const end = endOfMonth(start);
      
      // Récupérer les interventions du mois pour cet utilisateur
      const interventionsRef = collection(db, 'interventions');
      const interventionsQuery = query(
        interventionsRef,
        where('userId', '==', userId),
        where('date', '>=', Timestamp.fromDate(start)),
        where('date', '<=', Timestamp.fromDate(end)),
        orderBy('date', 'desc')
      );
      const interventionsSnapshot = await getDocs(interventionsQuery);
      
      let revenue = 0;
      let interventions = 0;
      
      interventionsSnapshot.forEach((doc) => {
        const intervention = doc.data();
        revenue += intervention.totalPrice || 0;
        interventions++;
      });
      
      // Récupérer les dépenses du mois pour cet utilisateur
      const expensesRef = collection(db, 'expenses');
      const expensesQuery = query(
        expensesRef,
        where('userId', '==', userId),
        where('date', '>=', Timestamp.fromDate(start)),
        where('date', '<=', Timestamp.fromDate(end))
      );
      const expensesSnapshot = await getDocs(expensesQuery);
      
      let expenses = 0;
      expensesSnapshot.forEach((doc) => {
        const expense = doc.data();
        expenses += expense.amount || 0;
      });
      
      setUserMonthlyStats({
        revenue,
        expenses,
        interventions,
        netResult: revenue - expenses
      });
      
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques utilisateur:', error);
    }
  };

  const handleUserMonthChange = (month: string) => {
    setUserDetailsMonth(month);
    if (selectedUser) {
      fetchUserMonthlyStats(selectedUser.userId, month);
    }
  };

  const markMessageAsRead = async (messageId: string) => {
    try {
      await updateDoc(doc(db, 'contact_messages', messageId), {
        read: true
      });
      // Mettre à jour l'état local
      setMessages(prevMessages =>
        prevMessages.map(msg =>
          msg.id === messageId ? { ...msg, read: true } : msg
        )
      );
    } catch (error) {
      console.error('Erreur lors du marquage du message comme lu:', error);
    }
  };

  const viewMessageDetails = (message: ContactMessage) => {
    setSelectedMessage(message);
    setShowMessageModal(true);
  };

  const markAsReadAndView = async (message: ContactMessage) => {
    // Marquer le message comme lu lors du premier clic sur l'icône œil
    if (!message.read) {
      // Mettre à jour l'état local immédiatement
      setMessages(prevMessages =>
        prevMessages.map(msg =>
          msg.id === message.id ? { ...msg, read: true } : msg
        )
      );
      // Mettre à jour Firestore
      try {
        await updateDoc(doc(db, 'contact_messages', message.id), {
          read: true
        });
      } catch (error) {
        console.error('Erreur lors du marquage du message comme lu:', error);
      }
    }
    // Ouvrir le modal avec le message mis à jour
    viewMessageDetails({ ...message, read: true });
  };

  const totalPlatformRevenue = users.reduce((sum, user) => sum + user.totalRevenue, 0);
  const totalWeeklyRevenue = users.reduce((sum, user) => sum + user.weeklyRevenue, 0);
  const totalPlatformExpenses = users.reduce((sum, user) => sum + user.totalExpenses, 0);
  const paidUsers = users.filter(user => user.paymentStatus === 'paid').length;
  const unreadMessagesCount = messages.filter(msg => !msg.read).length;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Administration</h1>
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="flex items-center gap-2">
            <label htmlFor="month-select" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Mois sélectionné
            </label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigateMonth('prev')}
                className="p-2 rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="text-center min-w-[140px]">
                <div className="text-lg font-semibold text-gray-900 dark:text-white">
                  {format(parse(selectedMonth, 'yyyy-MM', new Date()), 'MMMM yyyy', { locale: fr })}
                </div>
              </div>
              <button
                onClick={() => navigateMonth('next')}
                className="p-2 rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
          <button
            onClick={exportToPDF}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 mt-6 sm:mt-0"
          >
            <FileText className="w-4 h-4" />
            Exporter PDF
          </button>
        </div>
      </div>

      {/* Statistiques du mois sélectionné */}
      <div className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Statistiques pour {format(parse(selectedMonth, 'yyyy-MM', new Date()), 'MMMM yyyy', { locale: fr })}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">CA du mois</p>
                <p className="text-2xl font-semibold mt-1 text-gray-900 dark:text-white">
                  {monthlyStats.totalRevenue.toLocaleString('fr-FR')} €
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Dépenses du mois</p>
                <p className="text-2xl font-semibold mt-1 text-gray-900 dark:text-white">
                  {monthlyStats.totalExpenses.toLocaleString('fr-FR')} €
                </p>
              </div>
              <Receipt className="w-8 h-8 text-red-500" />
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Résultat net</p>
                <p className={`text-2xl font-semibold mt-1 ${
                  monthlyStats.netResult >= 0 
                    ? 'text-green-600 dark:text-green-400' 
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {monthlyStats.netResult.toLocaleString('fr-FR')} €
                </p>
              </div>
              <TrendingUp className={`w-8 h-8 ${
                monthlyStats.netResult >= 0 ? 'text-green-500' : 'text-red-500'
              }`} />
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Interventions</p>
                <p className="text-2xl font-semibold mt-1 text-gray-900 dark:text-white">
                  {monthlyStats.totalInterventions}
                </p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Statistiques globales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Utilisateurs</p>
              <p className="text-2xl font-semibold mt-2 text-gray-900 dark:text-white">{users.length}</p>
            </div>
            <Users className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Utilisateurs Payants</p>
              <p className="text-2xl font-semibold mt-2 text-gray-900 dark:text-white">{paidUsers}</p>
            </div>
            <Users className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">CA Total Plateforme</p>
              <p className="text-2xl font-semibold mt-2 text-gray-900 dark:text-white">
                {totalPlatformRevenue.toLocaleString('fr-FR')} €
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">CA Cette Semaine</p>
              <p className="text-2xl font-semibold mt-2 text-gray-900 dark:text-white">
                {totalWeeklyRevenue.toLocaleString('fr-FR')} €
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Messages Reçus</p>
              <p className="text-2xl font-semibold mt-2 text-gray-900 dark:text-white">{messages.length}</p>
              {unreadMessagesCount > 0 && (
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 font-medium">
                  {unreadMessagesCount} non lu{unreadMessagesCount > 1 ? 's' : ''}
                </p>
              )}
            </div>
            <MessageSquare className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Onglets */}
      <div className="mb-6">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('users')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'users'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Utilisateurs
              </div>
            </button>
            <button
              onClick={() => setActiveTab('messages')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'messages'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Messages
                {unreadMessagesCount > 0 && (
                  <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-blue-500 rounded-full">
                    {unreadMessagesCount}
                  </span>
                )}
                <span className="text-gray-400">({messages.length})</span>
              </div>
            </button>
          </nav>
        </div>
      </div>

      {activeTab === 'users' && (
        <>
          {/* Barre de recherche */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Rechercher par nom ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          {/* Tableau des utilisateurs */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
            {loading ? (
              <div className="flex justify-center items-center p-8">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Utilisateur
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Statut
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Jours d'essai
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        CA Total
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        CA Mois
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        CA Semaine
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Dépenses
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Interventions
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredUsers.map((user) => (
                      <tr key={user.userId} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {user.firstName} {user.lastName}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {user.email}
                            </div>
                            <div className="text-xs text-gray-400 dark:text-gray-500">
                              {user.phone}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            user.paymentStatus === 'paid'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                              : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                          }`}>
                            {user.paymentStatus === 'paid' ? 'Payé' : 'Non payé'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {user.paymentStatus === 'paid' ? (
                            <span className="text-sm text-gray-400 dark:text-gray-500">-</span>
                          ) : user.hasUsedTrial ? (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400">
                              Expiré
                            </span>
                          ) : user.trialDaysRemaining === 0 ? (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400">
                              Dernier jour
                            </span>
                          ) : user.trialDaysRemaining <= 7 ? (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400">
                              {user.trialDaysRemaining}j restants
                            </span>
                          ) : (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                              {user.trialDaysRemaining}j restants
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right text-sm text-gray-900 dark:text-white">
                          {user.totalRevenue.toLocaleString('fr-FR')} €
                        </td>
                        <td className="px-6 py-4 text-right text-sm text-gray-900 dark:text-white">
                          {user.monthlyRevenue.toLocaleString('fr-FR')} €
                        </td>
                        <td className="px-6 py-4 text-right text-sm text-gray-900 dark:text-white">
                          {user.weeklyRevenue.toLocaleString('fr-FR')} €
                        </td>
                        <td className="px-6 py-4 text-right text-sm text-gray-900 dark:text-white">
                          {user.totalExpenses.toLocaleString('fr-FR')} €
                        </td>
                        <td className="px-6 py-4 text-right text-sm text-gray-900 dark:text-white">
                          {user.totalInterventions}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => viewUserDetails(user)}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'messages' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
          {messagesLoading ? (
            <div className="flex justify-center items-center p-8">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Expéditeur
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Sujet
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Message
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {messages.map((message) => (
                    <tr key={message.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${
                      !message.read ? 'bg-blue-50 dark:bg-blue-900/10' : ''
                    }`}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        <div className="flex items-center gap-2">
                          {!message.read && (
                            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                          )}
                          <Calendar className="w-4 h-4 text-gray-400" />
                          {format(message.createdAt, 'dd/MM/yyyy HH:mm')}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {message.user_name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {message.user_email}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                        {message.subject}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white max-w-xs">
                        <div className="truncate">
                          {message.message}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => markAsReadAndView(message)}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                            title="Voir le message (marque comme lu au premier clic)"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => deleteMessage(message.id)}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {messages.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                        Aucun message reçu
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal détails utilisateur */}
      {showModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                Détails de {selectedUser.firstName} {selectedUser.lastName}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">Informations personnelles</h4>
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium">Email:</span> {selectedUser.email}</p>
                  <p><span className="font-medium">Téléphone:</span> {selectedUser.phone}</p>
                  <p><span className="font-medium">Inscription:</span> {format(selectedUser.createdAt, 'dd/MM/yyyy', { locale: fr })}</p>
                  <p><span className="font-medium">Dernière activité:</span> {format(selectedUser.lastActivity, 'dd/MM/yyyy', { locale: fr })}</p>
                  <p>
                    <span className="font-medium">Période d'essai:</span>
                    {selectedUser.paymentStatus === 'paid' ? (
                      <span className="ml-1 text-green-600 dark:text-green-400">Utilisateur payant</span>
                    ) : selectedUser.hasUsedTrial ? (
                      <span className="ml-1 text-gray-600 dark:text-gray-400">Expirée</span>
                    ) : selectedUser.trialDaysRemaining === 0 ? (
                      <span className="ml-1 text-orange-600 dark:text-orange-400">Dernier jour</span>
                    ) : (
                      <span className={`ml-1 ${
                        selectedUser.trialDaysRemaining <= 7
                          ? 'text-orange-600 dark:text-orange-400'
                          : 'text-blue-600 dark:text-blue-400'
                      }`}>
                        {selectedUser.trialDaysRemaining} jours restants
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">Statistiques globales</h4>
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium">CA total:</span> {selectedUser.totalRevenue.toLocaleString('fr-FR')} €</p>
                  <p><span className="font-medium">CA ce mois:</span> {selectedUser.monthlyRevenue.toLocaleString('fr-FR')} €</p>
                  <p><span className="font-medium">CA cette semaine:</span> {selectedUser.weeklyRevenue.toLocaleString('fr-FR')} €</p>
                  <p><span className="font-medium">Dépenses totales:</span> {selectedUser.totalExpenses.toLocaleString('fr-FR')} €</p>
                  <p><span className="font-medium">Dépenses ce mois:</span> {selectedUser.monthlyExpenses.toLocaleString('fr-FR')} €</p>
                  <p><span className="font-medium">Total interventions:</span> {selectedUser.totalInterventions}</p>
                  <p><span className="font-medium">Interventions ce mois:</span> {selectedUser.monthlyInterventions}</p>
                </div>
              </div>
            </div>

            {/* Section statistiques mensuelles */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <h4 className="text-lg font-medium text-gray-900 dark:text-white">Statistiques mensuelles</h4>
                <div className="flex items-center gap-2">
                  <label htmlFor="user-month-select" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                    Mois sélectionné
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const currentDate = parse(userDetailsMonth, 'yyyy-MM', new Date());
                        const newDate = subMonths(currentDate, 1);
                        handleUserMonthChange(format(newDate, 'yyyy-MM'));
                      }}
                      className="p-2 rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <div className="text-center min-w-[140px]">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {format(parse(userDetailsMonth, 'yyyy-MM', new Date()), 'MMMM yyyy', { locale: fr })}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        const currentDate = parse(userDetailsMonth, 'yyyy-MM', new Date());
                        const newDate = addMonths(currentDate, 1);
                        handleUserMonthChange(format(newDate, 'yyyy-MM'));
                      }}
                      className="p-2 rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
                <h5 className="text-md font-semibold text-blue-900 dark:text-blue-100 mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Statistiques pour {format(parse(userDetailsMonth, 'yyyy-MM', new Date()), 'MMMM yyyy', { locale: fr })}
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">CA du mois</p>
                    <p className="text-xl font-semibold mt-1 text-gray-900 dark:text-white">
                      {userMonthlyStats.revenue.toLocaleString('fr-FR')} €
                    </p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Dépenses du mois</p>
                    <p className="text-xl font-semibold mt-1 text-gray-900 dark:text-white">
                      {userMonthlyStats.expenses.toLocaleString('fr-FR')} €
                    </p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Résultat net</p>
                    <p className={`text-xl font-semibold mt-1 ${
                      userMonthlyStats.netResult >= 0 
                        ? 'text-green-600 dark:text-green-400' 
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      {userMonthlyStats.netResult.toLocaleString('fr-FR')} €
                    </p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Interventions</p>
                    <p className="text-xl font-semibold mt-1 text-gray-900 dark:text-white">
                      {userMonthlyStats.interventions}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white px-4 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal détails message */}
      {showMessageModal && selectedMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Message de {selectedMessage.user_name}
                </h3>
                {selectedMessage.read ? (
                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                    Lu
                  </span>
                ) : (
                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                    Non lu
                  </span>
                )}
              </div>
              <button
                onClick={() => setShowMessageModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Informations</h4>
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium">Nom:</span> {selectedMessage.user_name}</p>
                  <p><span className="font-medium">Email:</span> {selectedMessage.user_email}</p>
                  <p><span className="font-medium">Date:</span> {format(selectedMessage.createdAt, 'dd/MM/yyyy à HH:mm', { locale: fr })}</p>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Sujet</h4>
                <p className="text-gray-700 dark:text-gray-300">{selectedMessage.subject}</p>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Message</h4>
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{selectedMessage.message}</p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-between items-center">
              <div className="flex gap-2">
                <a
                  href={`mailto:${selectedMessage.user_email}?subject=Re: ${selectedMessage.subject}`}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <Mail className="w-4 h-4" />
                  Répondre
                </a>
                <button
                  onClick={async () => {
                    const newReadState = !selectedMessage.read;
                    try {
                      await updateDoc(doc(db, 'contact_messages', selectedMessage.id), {
                        read: newReadState
                      });
                      setSelectedMessage({ ...selectedMessage, read: newReadState });
                      setMessages(prevMessages =>
                        prevMessages.map(msg =>
                          msg.id === selectedMessage.id ? { ...msg, read: newReadState } : msg
                        )
                      );
                    } catch (error) {
                      console.error('Erreur:', error);
                    }
                  }}
                  className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                    selectedMessage.read
                      ? 'bg-orange-600 text-white hover:bg-orange-700'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  {selectedMessage.read ? 'Marquer non lu' : 'Marquer lu'}
                </button>
              </div>
              <button
                onClick={() => setShowMessageModal(false)}
                className="bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white px-4 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}