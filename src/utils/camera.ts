// Wrapper pour l'API caméra compatible web
// Version simplifiée sans Capacitor

// Détection de la plateforme
export const isMobile = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

// Fonction pour prendre une photo
export const takePicture = async (): Promise<string> => {
  return takePictureWeb();
};

// Choisir depuis la galerie
export const pickFromGallery = async (): Promise<string> => {
  return pickFromGalleryWeb();
};

// Version web pour caméra
export const takePictureWeb = (): Promise<string> => {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment' as any;

    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (!file) {
        reject(new Error('No file selected'));
        return;
      }

      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    };

    input.click();
  });
};

// Version web pour galerie
export const pickFromGalleryWeb = (): Promise<string> => {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';

    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (!file) {
        reject(new Error('No file selected'));
        return;
      }

      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    };

    input.click();
  });
};

// Partager un fichier (pour export PDF)
export const shareFile = async (
  title: string,
  text: string,
  url?: string
): Promise<void> => {
  // Fallback web
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url });
    } catch (error) {
      console.error('Error sharing (web):', error);
      throw error;
    }
  } else {
    // Copier dans le presse-papier
    if (url) {
      await navigator.clipboard.writeText(url);
      alert('Lien copié dans le presse-papier');
    }
  }
};

// Vérifier l'état du réseau
export const getNetworkStatus = async () => {
  return {
    connected: navigator.onLine,
    connectionType: 'unknown'
  };
};

// Vibration haptique
export const vibrate = async (type: 'light' | 'medium' | 'heavy' = 'light') => {
  // Fallback web
  if (navigator.vibrate) {
    const duration = type === 'heavy' ? 50 : type === 'medium' ? 30 : 10;
    navigator.vibrate(duration);
  }
};

// Sauvegarder un fichier localement
export const saveFile = async (
  fileName: string,
  data: string,
  directory: 'DOCUMENTS' | 'DOWNLOADS' = 'DOCUMENTS'
) => {
  // Fallback web - téléchargement
  const link = document.createElement('a');
  link.href = data;
  link.download = fileName;
  link.click();
};
