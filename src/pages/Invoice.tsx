import React, { useState, useRef, useEffect } from 'react';
import { useThemeStore } from '../store/theme';
import { useInvoiceStore } from '../store/invoice';
import { Settings, Download, Plus, Trash2, Image, RotateCcw } from 'lucide-react';
import html2pdf from 'html2pdf.js';

interface InvoiceItem {
  description: string;
  quantity: number;
  price: number;
}

export function Invoice() {
  const invoiceRef = useRef<HTMLDivElement>(null);
  const pdfTemplateRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<InvoiceItem[]>([{ description: '', quantity: 1, price: 0 }]);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [isDownloading, setIsDownloading] = useState(false);
  
  // Utilisation du store pour les données persistantes
  const {
    sender,
    client,
    logo,
    updateSender,
    updateClient,
    setLogo,
    clearLogo,
    resetClientForNewInvoice
  } = useInvoiceStore();

  const {
    showSenderSiret,
    showSenderTva,
    showClientSiret,
    showClientPhone,
    showSenderPhone,
    showTva,
    showSenderEmail,
    showClientEmail,
    showSenderName,
    showLogo,
    toggleSenderSiret,
    toggleSenderTva,
    toggleClientSiret,
    toggleClientPhone,
    toggleSenderPhone,
    toggleTva,
    toggleSenderEmail,
    toggleClientEmail,
    toggleSenderName,
    toggleLogo
  } = useThemeStore();

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const logoData = e.target?.result as string;
        setLogo(logoData);
      };
      reader.readAsDataURL(file);
    }
  };

  const addItem = () => {
    setItems([...items, { description: '', quantity: 1, price: 0 }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: string | number) => {
    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      [field]: field === 'description' ? value : Number(value)
    };
    setItems(newItems);
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  };

  const downloadInvoice = async () => {
    if (!pdfTemplateRef.current) return;

    try {
      setIsDownloading(true);

      const opt = {
        margin: [10, 10],
        filename: `facture-${invoiceNumber || 'sans-numero'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          letterRendering: true
        },
        jsPDF: { 
          unit: 'mm', 
          format: 'a4', 
          orientation: 'portrait'
        }
      };

      await html2pdf().set(opt).from(pdfTemplateRef.current).save();
    } finally {
      setIsDownloading(false);
    }
  };

  const handleNewInvoice = () => {
    // Réinitialiser les données de la facture mais garder les infos émetteur
    setItems([{ description: '', quantity: 1, price: 0 }]);
    setInvoiceNumber('');
    setInvoiceDate(new Date().toISOString().split('T')[0]);
    resetClientForNewInvoice();
  };

  return (
    <div className="max-w-5xl mx-auto p-2 sm:p-6">
      <div className="flex flex-col sm:flex-row items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-0">Facture</h1>
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <button
            onClick={handleNewInvoice}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <RotateCcw className="w-5 h-5" />
            Nouvelle facture
          </button>
          <button
            onClick={() => document.getElementById('settingsModal')?.showModal()}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            <Settings className="w-5 h-5" />
            Paramètres
          </button>
          <button
            onClick={downloadInvoice}
            disabled={isDownloading}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Download className="w-5 h-5" />
            Télécharger
          </button>
        </div>
      </div>

      {/* Notification d'aide */}
      <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
            💡
          </div>
          <div>
            <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
              Informations automatiquement sauvegardées
            </h3>
            <p className="text-blue-800 dark:text-blue-200 text-sm">
              Vos informations d'émetteur (nom, adresse, SIRET, logo) sont automatiquement sauvegardées et apparaîtront sur toutes vos futures factures. 
              Vous pouvez les modifier à tout moment et utiliser le bouton "Nouvelle facture" pour réinitialiser uniquement les informations client.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6" ref={invoiceRef}>
        <div className="flex justify-between mb-8">
          <div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleLogoChange}
              accept="image/*"
              className="hidden"
            />
            {showLogo && (
              <>
                {logo ? (
                  <div className="relative group">
                    <img src={logo} alt="Logo" className="h-20 object-contain" />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute inset-0 bg-black bg-opacity-50 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-sm"
                    >
                      Changer
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <Image className="w-5 h-5" />
                    Ajouter un logo
                  </button>
                )}
              </>
            )}
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">FACTURE</h2>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="N°"
                className="border-none p-0 focus:ring-0 text-gray-900 dark:text-white bg-transparent w-24"
              />
            </div>
            <div className="space-y-1">
              <div className="flex gap-2 justify-end">
                <label className="text-gray-600 dark:text-gray-400">Date :</label>
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="text-right border-none p-0 focus:ring-0 text-gray-900 dark:text-white bg-transparent"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mb-8 flex flex-col items-end">
          <div className="w-full flex justify-between">
            <div className="space-y-2 max-w-[50%]">
              {showSenderName && (
                <input
                  type="text"
                  value={sender.name}
                  onChange={(e) => updateSender({ name: e.target.value })}
                  placeholder="Votre nom ou société"
                  className="w-full border-none p-0 focus:ring-0 text-gray-900 dark:text-white bg-transparent font-medium"
                />
              )}
              <input
                type="text"
                value={sender.address}
                onChange={(e) => updateSender({ address: e.target.value })}
                placeholder="Adresse"
                className="w-full border-none p-0 focus:ring-0 text-gray-900 dark:text-white bg-transparent"
              />
              <input
                type="text"
                value={sender.city}
                onChange={(e) => updateSender({ city: e.target.value })}
                placeholder="Code postal et ville"
                className="w-full border-none p-0 focus:ring-0 text-gray-900 dark:text-white bg-transparent"
              />
              {showSenderPhone && (
                <input
                  type="text"
                  value={sender.phone}
                  onChange={(e) => updateSender({ phone: e.target.value })}
                  placeholder="Téléphone"
                  className="w-full border-none p-0 focus:ring-0 text-gray-900 dark:text-white bg-transparent"
                />
              )}
              {showSenderEmail && (
                <input
                  type="email"
                  value={sender.email}
                  onChange={(e) => updateSender({ email: e.target.value })}
                  placeholder="Email"
                  className="w-full border-none p-0 focus:ring-0 text-gray-900 dark:text-white bg-transparent"
                />
              )}
              {showSenderSiret && (
                <input
                  type="text"
                  value={sender.siret}
                  onChange={(e) => updateSender({ siret: e.target.value })}
                  placeholder="SIRET"
                  className="w-full border-none p-0 focus:ring-0 text-gray-900 dark:text-white bg-transparent"
                />
              )}
              {showSenderTva && (
                <input
                  type="text"
                  value={sender.tva}
                  onChange={(e) => updateSender({ tva: e.target.value })}
                  placeholder="Numéro de TVA"
                  className="w-full border-none p-0 focus:ring-0 text-gray-900 dark:text-white bg-transparent"
                />
              )}
            </div>
          </div>

          <div className="space-y-2 max-w-[50%] text-right mt-8">
            <input
              type="text"
              value={client.name}
              onChange={(e) => updateClient({ name: e.target.value })}
              placeholder="Nom du client ou société"
              className="w-full border-none p-0 focus:ring-0 text-gray-900 dark:text-white bg-transparent text-right font-medium"
            />
            <input
              type="text"
              value={client.address}
              onChange={(e) => updateClient({ address: e.target.value })}
              placeholder="Adresse"
              className="w-full border-none p-0 focus:ring-0 text-gray-900 dark:text-white bg-transparent text-right"
            />
            <input
              type="text"
              value={client.city}
              onChange={(e) => updateClient({ city: e.target.value })}
              placeholder="Code postal et ville"
              className="w-full border-none p-0 focus:ring-0 text-gray-900 dark:text-white bg-transparent text-right"
            />
            {showClientPhone && (
              <input
                type="text"
                value={client.phone}
                onChange={(e) => updateClient({ phone: e.target.value })}
                placeholder="Téléphone"
                className="w-full border-none p-0 focus:ring-0 text-gray-900 dark:text-white bg-transparent text-right"
              />
            )}
            {showClientEmail && (
              <input
                type="email"
                value={client.email}
                onChange={(e) => updateClient({ email: e.target.value })}
                placeholder="Email"
                className="w-full border-none p-0 focus:ring-0 text-gray-900 dark:text-white bg-transparent text-right"
              />
            )}
            {showClientSiret && (
              <input
                type="text"
                value={client.siret}
                onChange={(e) => updateClient({ siret: e.target.value })}
                placeholder="SIRET"
                className="w-full border-none p-0 focus:ring-0 text-gray-900 dark:text-white bg-transparent text-right"
              />
            )}
          </div>
        </div>

        <table className="w-full mb-8">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left py-2 text-gray-600 dark:text-gray-400">Description</th>
              <th className="text-right py-2 text-gray-600 dark:text-gray-400">Quantité</th>
              <th className="text-right py-2 text-gray-600 dark:text-gray-400">Prix unitaire</th>
              <th className="text-right py-2 text-gray-600 dark:text-gray-400">Total</th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={index} className="border-b border-gray-200 dark:border-gray-700">
                <td className="py-2">
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => updateItem(index, 'description', e.target.value)}
                    placeholder="Description"
                    className="w-full border-none p-0 focus:ring-0 text-gray-900 dark:text-white bg-transparent"
                  />
                </td>
                <td className="py-2">
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                    min="1"
                    className="w-full text-right border-none p-0 focus:ring-0 text-gray-900 dark:text-white bg-transparent"
                  />
                </td>
                <td className="py-2">
                  <input
                    type="number"
                    value={item.price}
                    onChange={(e) => updateItem(index, 'price', e.target.value)}
                    min="0"
                    step="0.01"
                    className="w-full text-right border-none p-0 focus:ring-0 text-gray-900 dark:text-white bg-transparent"
                  />
                </td>
                <td className="text-right py-2 text-gray-900 dark:text-white">
                  {(item.quantity * item.price).toFixed(2)} €
                </td>
                <td className="py-2">
                  <button
                    onClick={() => removeItem(index)}
                    className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <button
          onClick={addItem}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 mb-8"
        >
          <Plus className="w-4 h-4" />
          Ajouter une ligne
        </button>

        <div className="flex justify-end mb-8">
          <div className="w-64">
            <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
              <span className="font-semibold text-gray-900 dark:text-white">Total HT</span>
              <span className="text-gray-900 dark:text-white">{calculateTotal().toFixed(2)} €</span>
            </div>
            {showTva && (
              <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                <span className="font-semibold text-gray-900 dark:text-white">TVA (20%)</span>
                <span className="text-gray-900 dark:text-white">{(calculateTotal() * 0.2).toFixed(2)} €</span>
              </div>
            )}
            <div className="flex justify-between py-2 font-bold">
              <span className="text-gray-900 dark:text-white">Total {showTva ? 'TTC' : ''}</span>
              <span className="text-gray-900 dark:text-white">
                {(showTva ? calculateTotal() * 1.2 : calculateTotal()).toFixed(2)} €
              </span>
            </div>
          </div>
        </div>

        <div className="text-sm text-gray-600 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 pt-4 text-center">
          En cas de retard, des pénalités légales et une indemnité forfaitaire de 40 € seront exigées, conformément au Code de commerce.
        </div>
      </div>

      {/* Template PDF caché */}
      <div className="hidden">
        <div ref={pdfTemplateRef} className="bg-white p-8 a4">
          <style>
            {`
              .a4 {
                width: 210mm;
                min-height: 297mm;
                padding: 20mm;
                margin: 0 auto;
                position: relative;
              }
              .footer-text {
                position: absolute;
                bottom: 40mm;
                left: 20mm;
                right: 20mm;
                text-align: center;
                font-size: 12px;
                color: #666;
              }
              @page {
                size: A4;
                margin: 0;
              }
              @media print {
                .a4 {
                  margin: 0;
                  border: initial;
                  border-radius: initial;
                  width: initial;
                  min-height: initial;
                  box-shadow: initial;
                  background: initial;
                  page-break-after: always;
                }
              }
            `}
          </style>
          
          <div className="flex justify-between mb-8">
            <div>
              {showLogo && logo && <img src={logo} alt="Logo" className="h-20 object-contain" />}
            </div>
            <div className="text-right">
              <h2 className="text-2xl font-bold mb-2">FACTURE {invoiceNumber}</h2>
              <div>
                <div>Date : {invoiceDate}</div>
              </div>
            </div>
          </div>

          <div className="flex justify-between mb-8">
            <div className="space-y-1">
              {showSenderName && <div className="font-medium">{sender.name}</div>}
              <div>{sender.address}</div>
              <div>{sender.city}</div>
              {showSenderPhone && <div>{sender.phone}</div>}
              {showSenderEmail && <div>{sender.email}</div>}
              {showSenderSiret && <div>SIRET : {sender.siret}</div>}
              {showSenderTva && <div>TVA : {sender.tva}</div>}
            </div>
            <div className="text-right space-y-1">
              <div className="font-medium">{client.name}</div>
              <div>{client.address}</div>
              <div>{client.city}</div>
              {showClientPhone && <div>{client.phone}</div>}
              {showClientEmail && <div>{client.email}</div>}
              {showClientSiret && <div>SIRET : {client.siret}</div>}
            </div>
          </div>

          <table className="w-full mb-8">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Description</th>
                <th className="text-right py-2">Quantité</th>
                <th className="text-right py-2">Prix unitaire</th>
                <th className="text-right py-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={index} className="border-b">
                  <td className="py-2">{item.description}</td>
                  <td className="text-right py-2">{item.quantity}</td>
                  <td className="text-right py-2">{item.price.toFixed(2)} €</td>
                  <td className="text-right py-2">{(item.quantity * item.price).toFixed(2)} €</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-end mb-8">
            <div className="w-64">
              <div className="flex justify-between py-2 border-b">
                <span className="font-semibold">Total HT</span>
                <span>{calculateTotal().toFixed(2)} €</span>
              </div>
              {showTva && (
                <div className="flex justify-between py-2 border-b">
                  <span className="font-semibold">TVA (20%)</span>
                  <span>{(calculateTotal() * 0.2).toFixed(2)} €</span>
                </div>
              )}
              <div className="flex justify-between py-2 font-bold">
                <span>Total {showTva ? 'TTC' : ''}</span>
                <span>{(showTva ? calculateTotal() * 1.2 : calculateTotal()).toFixed(2)} €</span>
              </div>
            </div>
          </div>

          <div className="footer-text">
            En cas de retard, des pénalités légales et une indemnité forfaitaire de 40 € seront exigées, conformément au Code de commerce.
          </div>
        </div>
      </div>

      <dialog id="settingsModal" className="modal p-6 rounded-lg bg-white dark:bg-gray-800 shadow-xl">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Paramètres de la facture</h2>
        <div className="space-y-6">
          {/* TVA Toggle */}
          <div className="flex items-center justify-between">
            <label htmlFor="showTva" className="text-gray-700 dark:text-gray-200">
              Afficher la TVA
            </label>
            <button
              onClick={toggleTva}
              className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              style={{ backgroundColor: showTva ? '#2563eb' : '#e5e7eb' }}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                  showTva ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Émetteur Section */}
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">Émetteur</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label htmlFor="showLogo" className="text-gray-700 dark:text-gray-200">
                  Afficher le logo
                </label>
                <button
                  onClick={toggleLogo}
                  className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  style={{ backgroundColor: showLogo ? '#2563eb' : '#e5e7eb' }}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                      showLogo ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <label htmlFor="showSenderName" className="text-gray-700 dark:text-gray-200">
                  Afficher le nom/société
                </label>
                <button
                  onClick={toggleSenderName}
                  className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  style={{ backgroundColor: showSenderName ? '#2563eb' : '#e5e7eb' }}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                      showSenderName ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <label htmlFor="showSenderSiret" className="text-gray-700 dark:text-gray-200">
                  Afficher le SIRET
                </label>
                <button
                  onClick={toggleSenderSiret}
                  className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  style={{ backgroundColor: showSenderSiret ? '#2563eb' : '#e5e7eb' }}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                      showSenderSiret ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <label htmlFor="showSenderPhone" className="text-gray-700 dark:text-gray-200">
                  Afficher le téléphone
                </label>
                <button
                  onClick={toggleSenderPhone}
                  className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  style={{ backgroundColor: showSenderPhone ? '#2563eb' : '#e5e7eb' }}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                      showSenderPhone ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <label htmlFor="showSenderEmail" className="text-gray-700 dark:text-gray-200">
                  Afficher l'email
                </label>
                <button
                  onClick={toggleSenderEmail}
                  className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  style={{ backgroundColor: showSenderEmail ? '#2563eb' : '#e5e7eb' }}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                      showSenderEmail ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <label htmlFor="showSenderTva" className="text-gray-700 dark:text-gray-200">
                  Afficher le numéro de TVA
                </label>
                <button
                  onClick={toggleSenderTva}
                  className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  style={{ backgroundColor: showSenderTva ? '#2563eb' : '#e5e7eb' }}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                      showSenderTva ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Client Section */}
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">Client</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label htmlFor="showClientSiret" className="text-gray-700 dark:text-gray-200">
                  Afficher le SIRET
                </label>
                <button
                  onClick={toggleClientSiret}
                  className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  style={{ backgroundColor: showClientSiret ? '#2563eb' : '#e5e7eb' }}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                      showClientSiret ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <label htmlFor="showClientPhone" className="text-gray-700 dark:text-gray-200">
                  Afficher le téléphone
                </label>
                <button
                  onClick={toggleClientPhone}
                  className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  style={{ backgroundColor: showClientPhone ? '#2563eb' : '#e5e7eb' }}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                      showClientPhone ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <label htmlFor="showClientEmail" className="text-gray-700 dark:text-gray-200">
                  Afficher l'email
                </label>
                <button
                  onClick={toggleClientEmail}
                  className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  style={{ backgroundColor: showClientEmail ? '#2563eb' : '#e5e7eb' }}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                      showClientEmail ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={() => (document.getElementById('settingsModal') as HTMLDialogElement).close()}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            Fermer
          </button>
        </div>
      </dialog>
    </div>
  );
}