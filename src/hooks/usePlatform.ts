import { useState, useEffect } from 'react';

interface PlatformInfo {
  isNative: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isWeb: boolean;
  isMobile: boolean;
  isTablet: boolean;
  platform: 'ios' | 'android' | 'web';
}

export function usePlatform(): PlatformInfo {
  const [platform, setPlatform] = useState<PlatformInfo>(() => {
    // Détection initiale
    const isNative = checkIfNative();
    const platformName = getPlatformName();

    return {
      isNative,
      isIOS: platformName === 'ios',
      isAndroid: platformName === 'android',
      isWeb: platformName === 'web',
      isMobile: checkIfMobile(),
      isTablet: checkIfTablet(),
      platform: platformName
    };
  });

  useEffect(() => {
    // Vérifier si Capacitor est disponible
    const checkPlatform = async () => {
      try {
        const { Capacitor } = await import('@capacitor/core');

        setPlatform({
          isNative: Capacitor.isNativePlatform(),
          isIOS: Capacitor.getPlatform() === 'ios',
          isAndroid: Capacitor.getPlatform() === 'android',
          isWeb: Capacitor.getPlatform() === 'web',
          isMobile: checkIfMobile(),
          isTablet: checkIfTablet(),
          platform: Capacitor.getPlatform() as any
        });
      } catch {
        // Capacitor non disponible, on reste sur la détection basique
      }
    };

    checkPlatform();
  }, []);

  return platform;
}

// Détection si l'app est native (Capacitor)
function checkIfNative(): boolean {
  try {
    // Vérifier si window.Capacitor existe
    return !!(window as any).Capacitor?.isNativePlatform?.();
  } catch {
    return false;
  }
}

// Obtenir le nom de la plateforme
function getPlatformName(): 'ios' | 'android' | 'web' {
  try {
    const platform = (window as any).Capacitor?.getPlatform?.();
    if (platform === 'ios' || platform === 'android') {
      return platform;
    }
  } catch {
    // Continuer avec la détection fallback
  }

  // Fallback: détection via userAgent
  const ua = navigator.userAgent.toLowerCase();

  if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')) {
    return 'ios';
  } else if (ua.includes('android')) {
    return 'android';
  }

  return 'web';
}

// Détection si c'est un mobile (taille d'écran)
function checkIfMobile(): boolean {
  return window.innerWidth <= 768;
}

// Détection si c'est une tablette
function checkIfTablet(): boolean {
  const width = window.innerWidth;
  return width > 768 && width <= 1024;
}

// Hook pour écouter les changements d'orientation
export function useOrientation() {
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>(() => {
    return window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
  });

  useEffect(() => {
    const handleOrientationChange = () => {
      setOrientation(
        window.innerHeight > window.innerWidth ? 'portrait' : 'landscape'
      );
    };

    window.addEventListener('resize', handleOrientationChange);
    window.addEventListener('orientationchange', handleOrientationChange);

    return () => {
      window.removeEventListener('resize', handleOrientationChange);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, []);

  return orientation;
}

// Hook pour gérer le clavier virtuel
export function useKeyboard() {
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const setupKeyboardListeners = async () => {
      try {
        const { Keyboard } = await import('@capacitor/keyboard');

        const showListener = Keyboard.addListener('keyboardWillShow', (info) => {
          setIsKeyboardVisible(true);
          setKeyboardHeight(info.keyboardHeight);
        });

        const hideListener = Keyboard.addListener('keyboardWillHide', () => {
          setIsKeyboardVisible(false);
          setKeyboardHeight(0);
        });

        return () => {
          showListener.remove();
          hideListener.remove();
        };
      } catch {
        // Capacitor Keyboard plugin non disponible
      }
    };

    setupKeyboardListeners();
  }, []);

  return { isKeyboardVisible, keyboardHeight };
}

// Hook pour gérer la barre de statut
export function useStatusBar(style: 'light' | 'dark' = 'dark') {
  const { isNative } = usePlatform();

  useEffect(() => {
    if (!isNative) return;

    const setupStatusBar = async () => {
      try {
        const { StatusBar, Style } = await import('@capacitor/status-bar');

        await StatusBar.setStyle({
          style: style === 'light' ? Style.Light : Style.Dark
        });
      } catch (error) {
        console.error('Error setting status bar:', error);
      }
    };

    setupStatusBar();
  }, [isNative, style]);
}

// Hook pour gérer le splash screen
export function useSplashScreen() {
  const { isNative } = usePlatform();

  const hide = async () => {
    if (!isNative) return;

    try {
      const { SplashScreen } = await import('@capacitor/splash-screen');
      await SplashScreen.hide();
    } catch (error) {
      console.error('Error hiding splash screen:', error);
    }
  };

  const show = async () => {
    if (!isNative) return;

    try {
      const { SplashScreen } = await import('@capacitor/splash-screen');
      await SplashScreen.show({
        showDuration: 2000,
        autoHide: true
      });
    } catch (error) {
      console.error('Error showing splash screen:', error);
    }
  };

  return { hide, show };
}

// Hook pour gérer le back button Android
export function useBackButton(handler?: () => boolean | void) {
  const { isAndroid } = usePlatform();

  useEffect(() => {
    if (!isAndroid) return;

    const setupBackButton = async () => {
      try {
        const { App } = await import('@capacitor/app');

        const listener = App.addListener('backButton', ({ canGoBack }) => {
          if (handler) {
            const shouldPreventDefault = handler();
            if (shouldPreventDefault !== false) {
              return;
            }
          }

          if (!canGoBack) {
            App.exitApp();
          } else {
            window.history.back();
          }
        });

        return () => {
          listener.remove();
        };
      } catch (error) {
        console.error('Error setting up back button:', error);
      }
    };

    setupBackButton();
  }, [isAndroid, handler]);
}
