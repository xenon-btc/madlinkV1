import React, { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, Download, AlertTriangle, CheckCircle2, X, FileDown, Calendar } from 'lucide-react';
import * as XLSX from 'xlsx';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from '../store/auth';
import { useAccountsStore } from '../store/accounts';
import { format, startOfMonth, endOfMonth, subMonths, parse } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ComparisonResult {
  missingInDatabase: string[];
  missingInExcel: string[];
}

export function InterventionVerification() {
  const { user } = useAuthStore();
  const { getCurrentAccount } = useAccountsStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [columns, setColumns] = useState<string[]>([]);
  const [selectedColumn, setSelectedColumn] = useState<string>('');
  const [excelNumbers, setExcelNumbers] = useState<string[]>([]);
  const [databaseNumbers, setDatabaseNumbers] = useState<string[]>([]);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(format(subMonths(new Date(), 1), 'yyyy-MM'));

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setError(null);
      setLoading(true);
      
      // Vérifier le format du fichier
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      if (!['xlsx', 'xls', 'csv'].includes(fileExtension || '')) {
        throw new Error('Format de fichier non supporté. Veuillez utiliser .xlsx, .xls ou .csv');
      }

      setUploadedFile(file);
      
      // Lire le fichier
      const arrayBuffer = await file.arrayBuffer();
      const wb = XLSX.read(arrayBuffer, { type: 'array' });
      
      setWorkbook(wb);
      setSheetNames(wb.SheetNames);
      
      // Réinitialiser les sélections
      setSelectedSheet('');
      setColumns([]);
      setSelectedColumn('');
      setExcelNumbers([]);
      setComparisonResult(null);
      
    } catch (error) {
      console.error('Erreur lors du téléchargement du fichier:', error);
      setError(error instanceof Error ? error.message : 'Erreur lors du téléchargement du fichier');
    } finally {
      setLoading(false);
    }
  };

  const handleSheetSelection = (sheetName: string) => {
    if (!workbook) return;

    try {
      setSelectedSheet(sheetName);
      
      // Lire la feuille sélectionnée
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      // Extraire les en-têtes (première ligne)
      const headers = jsonData[0] as string[];
      setColumns(headers.filter(header => header && header.toString().trim() !== ''));
      
      // Réinitialiser la sélection de colonne
      setSelectedColumn('');
      setExcelNumbers([]);
      setComparisonResult(null);
      
    } catch (error) {
      console.error('Erreur lors de la lecture de la feuille:', error);
      setError('Erreur lors de la lecture de la feuille sélectionnée');
    }
  };

  const handleColumnSelection = (columnName: string) => {
    if (!workbook || !selectedSheet) return;

    try {
      setSelectedColumn(columnName);
      
      // Lire la feuille et extraire les données de la colonne
      const worksheet = workbook.Sheets[selectedSheet];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
        header: 1,
        defval: '', // Valeur par défaut pour les cellules vides
        blankrows: false // Ignorer les lignes complètement vides
      });
      
      // Trouver l'index de la colonne
      const headers = jsonData[0] as string[];
      const columnIndex = headers.findIndex(header => header === columnName);
      
      if (columnIndex === -1) {
        throw new Error('Colonne non trouvée');
      }
      
      // Extraire UNIQUEMENT les valeurs visibles et significatives
      const columnValues = jsonData
        .slice(1) // Ignorer l'en-tête
        .map((row: any) => {
          const value = row[columnIndex];
          return value;
        })
        .filter(value => {
          // Filtrage strict : ne garder QUE les valeurs réellement visibles et significatives
          if (value === undefined || value === null || value === '') return false;
          
          const stringValue = value.toString().trim();
          
          // Ignorer TOUTES les valeurs non significatives
          if (stringValue === '' || 
              stringValue.toLowerCase() === 'nd' || 
              stringValue.toLowerCase() === 'n/a' || 
              stringValue === '-' ||
              stringValue === '0' ||
              stringValue === '00' ||
              stringValue === '000' ||
              stringValue.toLowerCase() === 'null' ||
              stringValue.toLowerCase() === 'vide' ||
              stringValue.toLowerCase() === 'empty' ||
              stringValue.toLowerCase() === 'néant' ||
              stringValue.toLowerCase() === 'na' ||
              stringValue.toLowerCase() === 'non' ||
              stringValue.toLowerCase() === 'aucun' ||
              stringValue.toLowerCase() === 'sans' ||
              stringValue.toLowerCase() === 'pas' ||
              stringValue === '/' ||
              stringValue === '//' ||
              stringValue === '///' ||
              stringValue === '#N/A' ||
              stringValue === '#REF!' ||
              stringValue === '#VALUE!' ||
              stringValue === '#DIV/0!' ||
              stringValue === '#NAME?' ||
              stringValue === '#NULL!' ||
              stringValue === '#NUM!' ||
              stringValue === '#ERROR!' ||
              /^[\s\-_\.0]*$/.test(stringValue) || // Ignorer espaces, tirets, underscores, points, zéros
              /^[0]+$/.test(stringValue) || // Ignorer les chaînes de zéros uniquement
              /^\s*$/.test(stringValue)) { // Ignorer les espaces uniquement
            return false;
          }
          
          // Ignorer les formules et erreurs
          if (stringValue.startsWith('#') || stringValue.startsWith('=')) {
            return false;
          }
          
          // Ignorer les valeurs trop courtes (moins de 2 caractères) sauf si c'est un nombre valide
          if (stringValue.length < 2 && !/^\d+$/.test(stringValue)) {
            return false;
          }
          
          // Ignorer les valeurs qui ne ressemblent pas à des numéros d'intervention
          // Ignorer les valeurs qui ne ressemblent pas à des références d'intervention
          // (par exemple, des dates, des pourcentages, etc.)
          if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(stringValue) || // Dates
              /^\d+%$/.test(stringValue) || // Pourcentages
              /^\d+\.\d+$/.test(stringValue) && parseFloat(stringValue) < 1) { // Décimaux < 1
            return false;
          }
          
          return true;
        })
        .map(value => value.toString().trim())
        .filter((value, index, array) => {
          // Supprimer les doublons tout en gardant l'ordre
          return array.indexOf(value) === index;
        });
      
      setExcelNumbers(columnValues);
      setComparisonResult(null);
      
    } catch (error) {
      console.error('Erreur lors de l\'extraction de la colonne:', error);
      setError('Erreur lors de l\'extraction des données de la colonne');
    }
  };

  const fetchDatabaseNumbers = async (monthString: string) => {
    if (!user?.uid) return [];

    const currentAccount = getCurrentAccount();
    if (!currentAccount) return [];

    try {
      // Récupérer les interventions du mois sélectionné
      const selectedDate = parse(monthString, 'yyyy-MM', new Date());
      const startDate = startOfMonth(selectedDate);
      const endDate = endOfMonth(selectedDate);

      const interventionsRef = collection(db, 'interventions');
      const q = query(
        interventionsRef,
        where('userId', '==', user.uid),
        where('accountId', '==', currentAccount.id),
        where('date', '>=', Timestamp.fromDate(startDate)),
        where('date', '<=', Timestamp.fromDate(endDate))
      );

      const querySnapshot = await getDocs(q);
      const numbers = querySnapshot.docs
        .map(doc => doc.data().clientNumber)
        .filter(number => number && number.toString().trim() !== '')
        .map(number => number.toString().trim());

      return numbers;
    } catch (error) {
      console.error('Erreur lors de la récupération des données:', error);
      throw new Error('Erreur lors de la récupération des interventions de la base de données');
    }
  };

  const performComparison = async () => {
    if (!excelNumbers.length) {
      setError('Aucune référence d\'intervention trouvée dans le fichier Excel');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Récupérer les numéros de la base de données
      const dbNumbers = await fetchDatabaseNumbers(selectedMonth);
      setDatabaseNumbers(dbNumbers);

      // Effectuer la comparaison
      const excelSet = new Set(excelNumbers.map(num => num.toLowerCase()));
      const dbSet = new Set(dbNumbers.map(num => num.toLowerCase()));

      const missingInDatabase = excelNumbers.filter(num => !dbSet.has(num.toLowerCase()));
      const missingInExcel = dbNumbers.filter(num => !excelSet.has(num.toLowerCase()));

       // Calculer les interventions communes (présentes dans les deux)
       const commonInterventions = excelNumbers.filter(num => dbSet.has(num.toLowerCase()));

      setComparisonResult({
        missingInDatabase,
        missingInExcel,
        commonInterventions
      });

    } catch (error) {
      console.error('Erreur lors de la comparaison:', error);
      setError(error instanceof Error ? error.message : 'Erreur lors de la comparaison');
    } finally {
      setLoading(false);
    }
  };

  const exportResults = (type: 'missing-db' | 'missing-excel' | 'both') => {
    if (!comparisonResult) return;

    const wb = XLSX.utils.book_new();

    if (type === 'missing-db' || type === 'both') {
      const missingDbData = [
        ['Interventions manquantes dans la base de données'],
        ['Référence d\'intervention'],
        ...comparisonResult.missingInDatabase.map(num => [num])
      ];
      const ws1 = XLSX.utils.aoa_to_sheet(missingDbData);
      XLSX.utils.book_append_sheet(wb, ws1, 'Manquantes en base');
    }

    if (type === 'missing-excel' || type === 'both') {
      const missingExcelData = [
        ['Interventions manquantes dans le fichier Excel'],
        ['Référence d\'intervention'],
        ...comparisonResult.missingInExcel.map(num => [num])
      ];
      const ws2 = XLSX.utils.aoa_to_sheet(missingExcelData);
      XLSX.utils.book_append_sheet(wb, ws2, 'Manquantes dans Excel');
    }

    const fileName = `verification-interventions-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const resetAll = () => {
    setUploadedFile(null);
    setWorkbook(null);
    setSheetNames([]);
    setSelectedSheet('');
    setColumns([]);
    setSelectedColumn('');
    setExcelNumbers([]);
    setDatabaseNumbers([]);
    setComparisonResult(null);
    setError(null);
    setSelectedMonth(format(subMonths(new Date(), 1), 'yyyy-MM'));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Contrôle d'intervention</h1>
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            <div>
              <label htmlFor="month-select" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                Mois à comparer
              </label>
              <input
                type="month"
                id="month-select"
                value={selectedMonth}
                onChange={(e) => {
                  setSelectedMonth(e.target.value);
                  // Réinitialiser les résultats si ils existent
                  if (comparisonResult) {
                    setComparisonResult(null);
                    setDatabaseNumbers([]);
                  }
                }}
                className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
          {(uploadedFile || comparisonResult) && (
            <button
              onClick={resetAll}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-700 w-full sm:w-auto justify-center"
            >
              <X className="w-4 h-4" />
              Recommencer
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Étape 1: Upload du fichier */}
      {!uploadedFile && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            1. Télécharger le fichier Excel
          </h2>
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
            <FileSpreadsheet className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Sélectionnez un fichier Excel (.xlsx, .xls) ou CSV contenant les numéros d'intervention
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg flex items-center gap-2 hover:bg-blue-700 disabled:opacity-50 mx-auto"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Traitement...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  Choisir un fichier
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Étape 2: Sélection de la feuille */}
      {uploadedFile && sheetNames.length > 0 && !selectedSheet && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            2. Sélectionner la feuille Excel
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Fichier: <span className="font-medium">{uploadedFile.name}</span>
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {sheetNames.map((sheetName, index) => (
              <button
                key={index}
                onClick={() => handleSheetSelection(sheetName)}
                className="p-4 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-500 transition-colors text-left"
              >
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <span className="text-gray-900 dark:text-white font-medium">{sheetName}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Étape 3: Sélection de la colonne */}
      {selectedSheet && columns.length > 0 && !selectedColumn && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            3. Sélectionner la colonne des références d'intervention
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Feuille sélectionnée: <span className="font-medium">{selectedSheet}</span>
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {columns.map((columnName, index) => (
              <button
                key={index}
                onClick={() => handleColumnSelection(columnName)}
                className="p-4 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 hover:border-green-500 transition-colors text-left"
              >
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-green-100 dark:bg-green-900/30 rounded text-green-600 dark:text-green-400 flex items-center justify-center text-xs font-bold">
                    {String.fromCharCode(65 + index)}
                  </div>
                  <span className="text-gray-900 dark:text-white font-medium">{columnName}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Étape 4: Lancement de la comparaison */}
      {selectedColumn && excelNumbers.length > 0 && !comparisonResult && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            4. Lancer la vérification
          </h2>
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div>
                <p className="text-blue-800 dark:text-blue-200 text-sm">
                  {excelNumbers.length} références d'intervention trouvées dans la colonne "{selectedColumn}"
                </p>
              </div>
            </div>
          </div>
          <button
            disabled={loading}
            onClick={performComparison}
            className="bg-green-600 text-white px-6 py-3 rounded-lg flex items-center gap-2 hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Comparaison en cours...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" />
                Lancer la vérification
              </>
            )}
          </button>
        </div>
      )}

      {/* Résultats de la comparaison */}
      {comparisonResult && (
        <div className="space-y-6">
          {/* Résumé */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Résumé de la comparaison
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {excelNumbers.length}
                </div>
                <div className="text-sm text-blue-800 dark:text-blue-200">
                  Interventions dans Excel
                </div>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {databaseNumbers.length}
                </div>
                <div className="text-sm text-green-800 dark:text-green-200">
                  Interventions dans Madlink ({format(parse(selectedMonth, 'yyyy-MM', new Date()), 'MMMM yyyy', { locale: fr })})
                </div>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {Math.max(0, Math.min(excelNumbers.length, databaseNumbers.length) - Math.max(0, comparisonResult.missingInDatabase.length + comparisonResult.missingInExcel.length - Math.abs(excelNumbers.length - databaseNumbers.length)))}
                </div>
                <div className="text-sm text-purple-800 dark:text-purple-200">
                  Interventions communes
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-orange-600 dark:text-orange-400 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Interventions manquantes dans le fichier Excel ({comparisonResult.missingInExcel.length})
            </h3>
            {comparisonResult.missingInExcel.length > 0 ? (
              <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                <p className="text-orange-800 dark:text-orange-200 text-sm mb-3">
                  Ces interventions sont présentes dans votre base de données mais absentes du fichier Excel :
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                  {comparisonResult.missingInExcel.map((number, index) => (
                    <div
                      key={index}
                      className="bg-white dark:bg-gray-800 px-3 py-2 rounded border text-center text-sm font-mono text-gray-900 dark:text-white"
                    >
                      {number}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <p className="text-green-800 dark:text-green-200 text-sm flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <CheckCircle2 className="w-4 h-4" />
                  Toutes les interventions du fichier Excel sont présentes dans votre base de données.
                </p>
              </div>
            )}
          </div>

          {/* Interventions manquantes dans la base de données */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Interventions manquantes dans Madlink ({comparisonResult.missingInDatabase.length})
            </h3>
            {comparisonResult.missingInDatabase.length > 0 ? (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <p className="text-red-800 dark:text-red-200 text-sm mb-3">
                  Ces interventions sont présentes dans le fichier Excel mais absentes de votre base de données :
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                  {comparisonResult.missingInDatabase.map((number, index) => (
                    <div
                      key={index}
                      className="bg-white dark:bg-gray-800 px-3 py-2 rounded border text-center text-sm font-mono text-gray-900 dark:text-white"
                    >
                      {number}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <p className="text-green-800 dark:text-green-200 text-sm flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Toutes les interventions du fichier Excel sont présentes dans votre base de données.
                </p>
              </div>
            )}
          </div>

          {/* Boutons d'export globaux */}
          {(comparisonResult.missingInDatabase.length > 0 || comparisonResult.missingInExcel.length > 0) && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Exporter les résultats
              </h3>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => exportResults('both')}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg flex items-center gap-2 hover:bg-blue-700"
                >
                  <FileDown className="w-5 h-5" />
                  Exporter tout
                </button>
                {comparisonResult.missingInExcel.length > 0 && (
                  <button
                    onClick={() => exportResults('missing-excel')}
                    className="bg-orange-600 text-white px-6 py-3 rounded-lg flex items-center gap-2 hover:bg-orange-700"
                  >
                    <FileDown className="w-5 h-5" />
                    Manquantes dans Excel
                  </button>
                )}
                {comparisonResult.missingInDatabase.length > 0 && (
                  <button
                    onClick={() => exportResults('missing-db')}
                    className="bg-red-600 text-white px-6 py-3 rounded-lg flex items-center gap-2 hover:bg-red-700"
                  >
                    <FileDown className="w-5 h-5" />
                    Manquantes dans Madlink
                  </button>
                )}
              </div>
            </div>
          )}
          {/* Interventions manquantes dans Excel */}
        </div>
      )}
    </div>
  );
}