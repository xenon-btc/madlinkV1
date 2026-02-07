import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { LogIn, UserPlus, AlertTriangle, Loader2, Info } from 'lucide-react';
import { useAuthStore } from '../store/auth';

export function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const { signIn, signUp, error, loading, resetPassword } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get('register') === 'true') {
      setIsLogin(false);
    }
  }, [searchParams]);

  const validatePassword = (value: string) => {
    if (value.length < 6) {
      return 'Le mot de passe doit contenir au moins 6 caractères';
    }
    if (!/[A-Z]/.test(value)) {
      return 'Le mot de passe doit contenir au moins une majuscule';
    }
    return '';
  };

  const validatePhone = (value: string) => {
    // Supprimer tous les caractères non numériques
    const cleanPhone = value.replace(/\D/g, '');
    
    if (cleanPhone.length === 0) {
      return 'Le numéro de téléphone est requis';
    }
    if (cleanPhone.length !== 10) {
      return 'Le numéro de téléphone doit contenir exactement 10 chiffres';
    }
    return '';
  };

  const formatPhone = (value: string) => {
    // Supprimer tous les caractères non numériques
    const cleanPhone = value.replace(/\D/g, '');
    
    // Limiter à 10 chiffres
    const limitedPhone = cleanPhone.slice(0, 10);
    
    // Formater avec des espaces (XX XX XX XX XX)
    if (limitedPhone.length >= 2) {
      return limitedPhone.replace(/(\d{2})(?=\d)/g, '$1 ').trim();
    }
    
    return limitedPhone;
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPassword(value);
    if (!isLogin) {
      setPasswordError(validatePassword(value));
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const formattedPhone = formatPhone(value);
    setPhone(formattedPhone);
    
    if (!isLogin) {
      setPhoneError(validatePhone(formattedPhone));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isLogin) {
      if (passwordError) {
        return;
      }
      
      const phoneValidationError = validatePhone(phone);
      if (phoneValidationError) {
        setPhoneError(phoneValidationError);
        return;
      }
      
      if (!acceptTerms) {
        return;
      }
    }

    try {
      if (isForgotPassword) {
        await resetPassword(email);
      } else if (isLogin) {
        await signIn(email, password);
        navigate('/dashboard');
      } else {
        // Nettoyer le numéro de téléphone avant l'envoi (supprimer les espaces)
        const cleanPhone = phone.replace(/\s/g, '');
        await signUp(email, password, firstName, lastName, cleanPhone);
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Authentication error:', error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent dark:from-blue-400 dark:to-blue-200">
            Mad<span className="text-blue-600 dark:text-blue-400">lin</span>K
          </h1>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            {isForgotPassword ? 'Réinitialiser le mot de passe' : (isLogin ? 'Connexion' : 'Inscription')}
          </h2>

          {error && (
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && !isForgotPassword && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                      Prénom
                    </label>
                    <input
                      type="text"
                      id="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                      Nom
                    </label>
                    <input
                      type="text"
                      id="lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                    Numéro de téléphone
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    value={phone}
                    onChange={handlePhoneChange}
                    className={`block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
                      phoneError ? 'border-red-500' : ''
                    }`}
                    placeholder="06 12 34 56 78"
                    required
                  />
                  {!isLogin && phoneError && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                      {phoneError}
                    </p>
                  )}
                  {!isLogin && !phoneError && phone.length > 0 && (
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Format: 10 chiffres (ex: 06 12 34 56 78)
                    </p>
                  )}
                </div>
              </>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                Email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                required
              />
            </div>

            {!isForgotPassword && (
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                    Mot de passe
                  </label>
                  {!isLogin && (
                    <div className="relative group">
                      <Info className="w-4 h-4 text-gray-400 cursor-help" />
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                        Au moins 6 caractères et une majuscule
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                      </div>
                    </div>
                  )}
                </div>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={handlePasswordChange}
                  className={`block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
                    passwordError ? 'border-red-500' : ''
                  }`}
                  required
                  minLength={6}
                />
                {!isLogin && passwordError && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {passwordError}
                  </p>
                )}
              </div>
            )}

            {!isLogin && !isForgotPassword && (
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="acceptTerms"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  required
                />
                <label htmlFor="acceptTerms" className="text-sm text-gray-700 dark:text-gray-200">
                  En m'inscrivant, je reconnais avoir pris connaissance et accepter les{' '}
                  <a
                    href="/conditions-utilisation"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Conditions d'utilisation
                  </a>
                  {' '}de Madlink.
                </label>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || (!isLogin && (passwordError || phoneError || !acceptTerms))}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : isForgotPassword ? (
                'Envoyer le lien de réinitialisation'
              ) : isLogin ? (
                <>
                  <LogIn className="w-5 h-5" />
                  Se connecter
                </>
              ) : (
                <>
                  <UserPlus className="w-5 h-5" />
                  S'inscrire
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center space-y-2">
            {!isForgotPassword && (
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setFirstName('');
                  setLastName('');
                  setPhone('');
                  setEmail('');
                  setPassword('');
                  setPasswordError('');
                  setPhoneError('');
                  setAcceptTerms(false);
                }}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline block w-full"
              >
                {isLogin ? "Pas encore de compte ? S'inscrire" : 'Déjà un compte ? Se connecter'}
              </button>
            )}
            
            {!isForgotPassword ? (
              <button
                onClick={() => setIsForgotPassword(true)}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline block w-full"
              >
                Mot de passe oublié ?
              </button>
            ) : (
              <button
                onClick={() => {
                  setIsForgotPassword(false);
                  setEmail('');
                  setAcceptTerms(false);
                }}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline block w-full"
              >
                Retour à la connexion
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}