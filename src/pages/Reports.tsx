import React, { useState, useEffect, useCallback } from 'react';
import { FileDown, FileText, Calendar, CalendarDays } from 'lucide-react';
import { format, parse, startOfMonth, endOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from '../store/auth';
import { useAccountsStore } from '../store/accounts';
import { useAccountSync } from '../hooks/useAccountSync';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface Intervention {
  id: string;
  date: Date;
  clientNumber: string;
  selectedTypes: Array<{
    name: string;
    price: number;
  }>;
  totalPrice: number;
  comment: string;
  photos: string[];
}

export function Reports() {
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [activeTab, setActiveTab] = useState<'monthly' | 'custom'>('monthly');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [monthlyExpenses, setMonthlyExpenses] = useState(0);
  const [monthlyConsumablesExpenses, setMonthlyConsumablesExpenses] = useState(0);
  const [loading, setLoading] = useState(true);
  const [interventionsByType, setInterventionsByType] = useState<{[key: string]: number}>({});
  const { user } = useAuthStore();
  const { getCurrentAccount } = useAccountsStore();

  const fetchData = useCallback(async () => {
      if (!user?.uid) return;

      const currentAccount = getCurrentAccount();
      if (!currentAccount) return;

      try {
        setLoading(true);
        let start: Date;
        let end: Date;
        
        if (activeTab === 'monthly') {
          start = startOfMonth(parse(selectedMonth, 'yyyy-MM', new Date()));
          end = endOfMonth(start);
        } else {
          start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
        }

        // Fetch interventions
        const interventionsRef = collection(db, 'interventions');
        const interventionsQuery = query(
          interventionsRef,
          where('userId', '==', user.uid),
          where('accountId', '==', currentAccount.id),
          where('date', '>=', Timestamp.fromDate(start)),
          where('date', '<=', Timestamp.fromDate(end)),
          orderBy('date', 'desc')
        );

        const interventionsSnapshot = await getDocs(interventionsQuery);
        const fetchedInterventions = interventionsSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            date: data.date.toDate(),
            clientNumber: data.clientNumber || '',
            selectedTypes: data.selectedTypes || [],
            selectedConsumables: data.selectedConsumables || [],
            totalPrice: data.totalPrice || 0,
            comment: data.comment || '',
            photos: data.photos || []
          };
        });

        // Fetch expenses
        const expensesRef = collection(db, 'expenses');
        const expensesQuery = query(
          expensesRef,
          where('userId', '==', user.uid),
          where('accountId', '==', currentAccount.id),
          where('date', '>=', Timestamp.fromDate(start)),
          where('date', '<=', Timestamp.fromDate(end))
        );

        const expensesSnapshot = await getDocs(expensesQuery);
        const totalExpenses = expensesSnapshot.docs.reduce((sum, doc) => {
          const data = doc.data();
          return sum + (data.amount || 0);
        }, 0);

        // Calculer les dépenses consommables
        const consumablesExpenses = fetchedInterventions.reduce((sum, intervention) => {
          if (intervention.selectedConsumables && Array.isArray(intervention.selectedConsumables)) {
            return sum + intervention.selectedConsumables.reduce((consumableSum: number, consumable: any) => {
              return consumableSum + (consumable.price || 0);
            }, 0);
          }
          return sum;
        }, 0);
        
        setInterventions(fetchedInterventions);
        setMonthlyExpenses(totalExpenses);
        setMonthlyConsumablesExpenses(consumablesExpenses);

        // Calculer le nombre d'interventions par type
        const typeCount: {[key: string]: number} = {};
        fetchedInterventions.forEach(intervention => {
          intervention.selectedTypes.forEach(type => {
            typeCount[type.name] = (typeCount[type.name] || 0) + 1;
          });
        });
        setInterventionsByType(typeCount);

      } catch (error) {
        console.error('Erreur lors de la récupération des données:', error);
      } finally {
        setLoading(false);
      }
  }, [user?.uid, selectedMonth, startDate, endDate, activeTab]);

  useEffect(() => {
    fetchData();
  }, [selectedMonth, startDate, endDate, activeTab, user]);

  useAccountSync(fetchData);

  const exportToPDF = () => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      let periodLabel: string;
      if (activeTab === 'monthly') {
        periodLabel = format(parse(selectedMonth, 'yyyy-MM', new Date()), 'MMMM yyyy', { locale: fr });
      } else {
        periodLabel = `${format(new Date(startDate), 'dd/MM/yyyy')} - ${format(new Date(endDate), 'dd/MM/yyyy')}`;
      }
      
      doc.setFontSize(24);
      doc.setTextColor(59, 130, 246);
      doc.text("Mad", 14, 20);
      doc.setTextColor(0, 0, 0);
      doc.text("lin", 32, 20);
      doc.setTextColor(59, 130, 246);
      doc.text("K", 42, 20);

      doc.setFontSize(20);
      doc.setTextColor(0, 0, 0);
      doc.text(`Rapport des interventions - ${periodLabel}`, 14, 40);

      (doc as any).autoTable({
        head: [['Date', 'Référence', 'Articles', 'Commentaire', 'Montant (€)']],
        body: interventions.map(item => [
          format(item.date, 'dd/MM/yyyy'),
          item.clientNumber,
          item.selectedTypes.map(type => `${type.name} (${type.price}€)`).join('\n'),
          item.comment || '',
          item.totalPrice.toLocaleString('fr-FR')
        ]),
        startY: 50,
        styles: { fontSize: 10, cellPadding: 6 },
        headStyles: { fillColor: [59, 130, 246] },
        columnStyles: {
          2: { cellWidth: 'auto' },
          3: { cellWidth: 50 }
        }
      });

      const total = interventions.reduce((sum, item) => sum + item.totalPrice, 0);
      const finalY = (doc as any).lastAutoTable.finalY || 50;

      doc.setDrawColor(200, 200, 200);
      doc.line(14, finalY + 10, pageWidth - 14, finalY + 10);

      doc.setFontSize(14);
      doc.text("Chiffre d'affaires du mois:", 14, finalY + 20);
      doc.setTextColor(59, 130, 246);
      doc.text(`${total.toLocaleString('fr-FR')} €`, pageWidth - 14, finalY + 20, { align: 'right' });

      doc.setTextColor(0, 0, 0);
      doc.text("Total des dépenses:", 14, finalY + 30);
      doc.setTextColor(239, 68, 68); // Rouge
      doc.text(`${monthlyExpenses.toLocaleString('fr-FR')} €`, pageWidth - 14, finalY + 30, { align: 'right' });

      doc.setTextColor(0, 0, 0);
      doc.text("Dépenses consommables:", 14, finalY + 40);
      doc.setTextColor(239, 68, 68); // Rouge
      doc.text(`${monthlyConsumablesExpenses.toLocaleString('fr-FR')} €`, pageWidth - 14, finalY + 40, { align: 'right' });
      doc.setTextColor(0, 0, 0);
      doc.text("Résultat net:", 14, finalY + 50);
      const netResult = total - monthlyExpenses - monthlyConsumablesExpenses;
      doc.setTextColor(netResult >= 0 ? 34 : 239, netResult >= 0 ? 197 : 68, netResult >= 0 ? 94 : 68);
      doc.text(`${netResult.toLocaleString('fr-FR')} €`, pageWidth - 14, finalY + 50, { align: 'right' });

      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(
        `Édité le ${format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr })}`,
        pageWidth - 14,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'right' }
      );

      doc.save(`rapport-${selectedMonth}.pdf`);
      doc.save(`rapport-${activeTab === 'monthly' ? selectedMonth : format(new Date(startDate), 'yyyy-MM-dd')}-${activeTab === 'monthly' ? '' : format(new Date(endDate), 'yyyy-MM-dd')}.pdf`);
    } catch (error) {
      console.error('Erreur lors de la génération du PDF:', error);
    }
  };

  const exportToExcel = () => {
    let periodLabel: string;
    if (activeTab === 'monthly') {
      periodLabel = format(parse(selectedMonth, 'yyyy-MM', new Date()), 'MMMM yyyy', { locale: fr });
    } else {
      periodLabel = `${format(new Date(startDate), 'dd/MM/yyyy')} - ${format(new Date(endDate), 'dd/MM/yyyy')}`;
    }
    
    // Créer la feuille des interventions
    const interventionsSheet = XLSX.utils.json_to_sheet(interventions.map(item => ({
      Date: format(item.date, 'dd/MM/yyyy'),
      Client: item.clientNumber,
      Types: item.selectedTypes.map(type => type.name).join(', '),
      'Prix détaillé': item.selectedTypes.map(type => `${type.name}: ${type.price}€`).join('\n'),
      Commentaire: item.comment || '',
      'Montant total (€)': item.totalPrice,
      'Photos': item.photos.join(', ')
    })));

    // Ajouter les totaux à la fin
    const total = interventions.reduce((sum, item) => sum + item.totalPrice, 0);
    const netResult = total - monthlyExpenses;

    XLSX.utils.sheet_add_aoa(interventionsSheet, [
      [''],
      ["Chiffre d'affaires du mois:", total + ' €'],
      ['Total des dépenses:', monthlyExpenses + ' €'],
     ['Dépenses consommables:', monthlyConsumablesExpenses + ' €'],
     ['Résultat net:', (total - monthlyExpenses - monthlyConsumablesExpenses) + ' €']
    ], { origin: -1 });

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, interventionsSheet, periodLabel);
    const fileName = activeTab === 'monthly' 
      ? `rapport-${selectedMonth}.xlsx`
      : `rapport-${format(new Date(startDate), 'yyyy-MM-dd')}-${format(new Date(endDate), 'yyyy-MM-dd')}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  // Configuration du graphique
  const chartData = {
    labels: Object.keys(interventionsByType),
    datasets: [
      {
        label: 'Nombre d\'interventions',
        data: Object.values(interventionsByType),
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',   // Blue
          'rgba(239, 68, 68, 0.8)',    // Red
          'rgba(34, 197, 94, 0.8)',    // Green
          'rgba(245, 158, 11, 0.8)',   // Orange
          'rgba(147, 51, 234, 0.8)',   // Purple
          'rgba(14, 165, 233, 0.8)',   // Light Blue
          'rgba(168, 85, 247, 0.8)',   // Light Purple
          'rgba(16, 185, 129, 0.8)',   // Emerald
        ],
        borderColor: [
          'rgba(59, 130, 246, 1)',
          'rgba(239, 68, 68, 1)',
          'rgba(34, 197, 94, 1)',
          'rgba(245, 158, 11, 1)',
          'rgba(147, 51, 234, 1)',
          'rgba(14, 165, 233, 1)',
          'rgba(168, 85, 247, 1)',
          'rgba(16, 185, 129, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: 'Nombre d\'interventions par type d\'article',
        color: (context: any) => {
          const isDarkMode = document.documentElement.classList.contains('dark');
          return isDarkMode ? '#e5e7eb' : '#374151';
        },
        font: {
          size: 16,
          weight: 'bold'
        }
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const total = Object.values(interventionsByType).reduce((sum: number, value: number) => sum + value, 0);
            const percentage = ((context.raw / total) * 100).toFixed(1);
            return `${context.label}: ${context.raw} intervention${context.raw > 1 ? 's' : ''} (${percentage}%)`;
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          color: (context: any) => {
            const isDarkMode = document.documentElement.classList.contains('dark');
            return isDarkMode ? '#374151' : '#e5e7eb';
          },
        },
        ticks: {
          color: (context: any) => {
            const isDarkMode = document.documentElement.classList.contains('dark');
            return isDarkMode ? '#e5e7eb' : '#374151';
          },
          maxRotation: 45,
          minRotation: 0
        },
      },
      y: {
        grid: {
          color: (context: any) => {
            const isDarkMode = document.documentElement.classList.contains('dark');
            return isDarkMode ? '#374151' : '#e5e7eb';
          },
        },
        ticks: {
          color: (context: any) => {
            const isDarkMode = document.documentElement.classList.contains('dark');
            return isDarkMode ? '#e5e7eb' : '#374151';
          },
          stepSize: 1,
          beginAtZero: true
        },
      },
    },
  };

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Rapports</h1>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
        {/* Onglets */}
        <div className="mb-6">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('monthly')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'monthly'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Par mois
                </div>
              </button>
              <button
                onClick={() => setActiveTab('custom')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'custom'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-4 h-4" />
                  Période
                </div>
              </button>
            </nav>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-6">
          {activeTab === 'monthly' ? (
            <div className="w-full sm:w-auto">
              <label htmlFor="month" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Sélectionner le mois
              </label>
              <input
                type="month"
                id="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              <div>
                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  Date de début
                </label>
                <input
                  type="date"
                  id="startDate"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  Date de fin
                </label>
                <input
                  type="date"
                  id="endDate"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
          )}

          <div className="flex gap-3 w-full sm:w-auto">
            <button
              onClick={exportToPDF}
              className="flex-1 sm:flex-none bg-red-600 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-red-700"
            >
              <FileText className="w-4 h-4" />
              PDF
            </button>
            <button
              onClick={exportToExcel}
              className="flex-1 sm:flex-none bg-green-600 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-green-700"
            >
              <FileDown className="w-4 h-4" />
              Excel
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Résumé de la période */}
            <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                {activeTab === 'monthly' 
                  ? `Rapport pour ${format(parse(selectedMonth, 'yyyy-MM', new Date()), 'MMMM yyyy', { locale: fr })}`
                  : `Rapport du ${format(new Date(startDate), 'dd/MM/yyyy')} au ${format(new Date(endDate), 'dd/MM/yyyy')}`
                }
              </h3>
              <p className="text-blue-800 dark:text-blue-200 text-sm">
                {interventions.length} intervention{interventions.length > 1 ? 's' : ''} trouvée{interventions.length > 1 ? 's' : ''}
              </p>
            </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Référence
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Articles
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Consommables
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Commentaire
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Montant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Photos
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {interventions.map((intervention) => (
                  <tr key={intervention.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {format(intervention.date, 'dd/MM/yyyy')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      {intervention.clientNumber}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      {intervention.selectedTypes.map((type, index) => (
                        <div key={index}>
                          {type.name} ({type.price}€)
                        </div>
                      ))}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      {intervention.selectedConsumables?.map((consumable: any, index: number) => (
                        <div key={index}>
                          {consumable.name} ({consumable.price?.toFixed(2)}€)
                        </div>
                      )) || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      {intervention.comment}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white">
                      {intervention.totalPrice.toLocaleString('fr-FR')} €
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {intervention.photos.map((photo, index) => (
                          <a
                            key={index}
                            href={photo}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            Photo {index + 1}
                          </a>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
                {interventions.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                      Aucune intervention pour ce mois
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                    Chiffre d'affaires
                  </td>
                  <td colSpan={2} className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900 dark:text-white">
                    {interventions.reduce((sum, item) => sum + item.totalPrice, 0).toLocaleString('fr-FR')} €
                  </td>
                </tr>
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                    Total des dépenses
                  </td>
                  <td colSpan={2} className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-red-600 dark:text-red-400">
                    {monthlyExpenses.toLocaleString('fr-FR')} €
                  </td>
                </tr>
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                    Dépenses consommables
                  </td>
                  <td colSpan={2} className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-red-600 dark:text-red-400">
                    {monthlyConsumablesExpenses.toLocaleString('fr-FR')} €
                  </td>
                </tr>
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                    Résultat net
                  </td>
                  <td colSpan={2} className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                    <span className={`${
                      interventions.reduce((sum, item) => sum + item.totalPrice, 0) - monthlyExpenses - monthlyConsumablesExpenses >= 0
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      {(interventions.reduce((sum, item) => sum + item.totalPrice, 0) - monthlyExpenses - monthlyConsumablesExpenses).toLocaleString('fr-FR')} €
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Graphique pour l'onglet Période uniquement */}
          {activeTab === 'custom' && Object.keys(interventionsByType).length > 0 && (
            <div className="mt-8 bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <div className="h-96">
                <Bar data={chartData} options={chartOptions} />
              </div>
            </div>
          )}
          </>
        )}
      </div>
    </div>
  );
}