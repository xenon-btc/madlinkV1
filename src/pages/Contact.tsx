import React, { useState, useRef } from 'react';
import { Send, Mail, Loader2, AlertTriangle } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

export function Contact() {
  const formRef = useRef<HTMLFormElement>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();
  const isInDashboard = location.pathname.startsWith('/dashboard');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formRef.current) return;

    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      // Récupérer les données du formulaire
      const formData = new FormData(formRef.current);
      const userName = formData.get('user_name') as string;
      const userEmail = formData.get('user_email') as string;
      const subject = formData.get('subject') as string;
      const message = formData.get('message') as string;

      // Sauvegarder d'abord dans Firestore
      await addDoc(collection(db, 'contact_messages'), {
        user_name: userName,
        user_email: userEmail,
        subject: subject,
        message: message,
        read: false,
        status: 'pending',
        createdAt: serverTimestamp()
      });

      // Essayer d'envoyer l'email via Firebase Function
      try {
        const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
        const functionUrl = `https://europe-west1-${projectId}.cloudfunctions.net/sendContactEmail`;

        const emailResponse = await fetch(functionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_name: userName,
            user_email: userEmail,
            subject: subject,
            message: message,
          }),
        });

        if (!emailResponse.ok) {
          console.warn('Email sending failed, but message saved to database');
        }
      } catch (emailError) {
        console.warn('Email function error, but message saved to database:', emailError);
      }

      setSuccess(true);
      formRef.current.reset();
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Une erreur est survenue lors de l\'envoi du message. Veuillez réessayer ou nous contacter directement à contact@madlink.fr');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Navigation - Only show if not in dashboard */}
      {!isInDashboard && (
        <nav className="bg-white dark:bg-gray-800 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <Link to="/" className="flex items-center">
                <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent dark:from-blue-400 dark:to-blue-200">
                  Mad<span className="text-blue-600 dark:text-blue-400">lin</span>K
                </h1>
              </Link>
              <div className="flex items-center space-x-4">
                <Link
                  to="/auth"
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Se connecter
                </Link>
              </div>
            </div>
          </div>
        </nav>
      )}

      <div className="max-w-2xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Contactez-nous</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Nous sommes là pour vous aider. Envoyez-nous un message et nous vous répondrons dans les plus brefs délais.
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 md:p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg">
              Votre message a été envoyé avec succès ! Nous vous répondrons dans les plus brefs délais.
            </div>
          )}

          <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="user_name" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                Nom
              </label>
              <input
                type="text"
                id="user_name"
                name="user_name"
                className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                required
              />
            </div>

            <div>
              <label htmlFor="user_email" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                Email
              </label>
              <input
                type="email"
                id="user_email"
                name="user_email"
                className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                required
              />
            </div>

            <div>
              <label htmlFor="subject" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                Sujet
              </label>
              <input
                type="text"
                id="subject"
                name="subject"
                className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                required
              />
            </div>

            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                Message
              </label>
              <textarea
                id="message"
                name="message"
                rows={4}
                className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Envoyer le message
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-start gap-4">
              <Mail className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">Email</h3>
                <p className="text-gray-600 dark:text-gray-400">contact@madlink.fr</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer - Only show if not in dashboard */}
      {!isInDashboard && (
        <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="text-center">
              <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent dark:from-blue-400 dark:to-blue-200">
                Mad<span className="text-blue-600 dark:text-blue-400">lin</span>K
              </h1>
              <p className="mt-4 text-gray-500 dark:text-gray-400">
                © 2024 MadlinK. Tous droits réservés.
              </p>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}