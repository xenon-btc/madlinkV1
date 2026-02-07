import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './index.css';
import { notificationService } from './lib/notifications';

// Initialiser le service de notifications au démarrage de l'application
notificationService.initialize();

// Restaurer les notifications web programmées (pour le navigateur uniquement)
if (!('Capacitor' in window)) {
  notificationService.restoreWebNotifications();
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);