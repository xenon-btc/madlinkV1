import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

export async function uploadInterventionImage(file: File, interventionId: string): Promise<string> {
  try {
    // Créer une référence unique pour l'image
    const imageRef = ref(storage, `interventions/${interventionId}/${Date.now()}-${file.name}`);
    
    // Uploader l'image
    const snapshot = await uploadBytes(imageRef, file);
    
    // Récupérer l'URL de téléchargement
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    return downloadURL;
  } catch (error) {
    console.error('Erreur lors du téléchargement de l\'image:', error);
    throw error;
  }
}