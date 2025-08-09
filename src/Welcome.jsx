import { useEffect, useState, useRef } from 'react';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const SCOPES = 'https://www.googleapis.com/auth/youtube.readonly';

// Funzione per caricare script con Promise
const loadScript = (src) => {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Script loading failed for ${src}`));
    document.body.appendChild(script);
  });
};

function Welcome() {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [error, setError] = useState(null);
  const tokenClient = useRef(null);

  useEffect(() => {
    const initGoogleApis = async () => {
      try {
        await loadScript('https://apis.google.com/js/api.js');
        await loadScript('https://accounts.google.com/gsi/client');
        
        // Inizializza il client per l'API di YouTube
        window.gapi.load('client', () => {
          window.gapi.client.init({
            // Rimuovi la riga apiKey
            discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/youtube/v3/rest"],
          });
        });

        // Inizializza il client per il token di autenticazione
        tokenClient.current = window.google.accounts.oauth2.initTokenClient({
          client_id: CLIENT_ID,
          scope: SCOPES,
          callback: (tokenResponse) => {
            if (tokenResponse && tokenResponse.access_token) {
              console.log("Accesso riuscito:", tokenResponse);
              setIsSignedIn(true);
              // Recupera il profilo utente
              // Nota: gapi.client.youtube non è ancora pronto qui
              // ma possiamo usare il token per una chiamata REST diretta
              // se non vogliamo aspettare il caricamento completo.
            } else {
              console.error("Accesso fallito:", tokenResponse);
              setError("Accesso fallito. Riprova.");
              setIsSignedIn(false);
            }
          },
        });

      } catch (err) {
        console.error("Errore nel caricamento degli script di Google:", err);
        setError("Impossibile caricare gli script di Google.");
      }
    };
    initGoogleApis();
  }, []);

  const handleGoogleAuthClick = () => {
    if (tokenClient.current) {
      tokenClient.current.requestAccessToken();
    }
  };
  
  const handleSignOut = () => {
    // Implementazione del sign out
    setIsSignedIn(false);
    setUserProfile(null);
    console.log("Logout effettuato.");
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
      <div className="bg-gray-800 p-8 rounded-xl shadow-2xl text-center">
        <h1 className="text-4xl font-extrabold text-purple-400 mb-6">SpotyTube</h1>
        <p className="text-gray-300 mb-8 max-w-sm mx-auto">
          Accedi con il tuo account Google per cercare video su YouTube e creare le tue playlist personalizzate.
        </p>

        {error && (
          <div className="bg-red-900 text-red-300 p-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {!isSignedIn ? (
          <button
            onClick={handleGoogleAuthClick}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg transition duration-200 ease-in-out"
          >
            Accedi con Google
          </button>
        ) : (
          <div>
            <p className="text-green-400 font-semibold text-lg mb-4">Accesso riuscito!</p>
            <p className="text-gray-400">Bentornato, utente!</p>
            <button
              onClick={handleSignOut}
              className="mt-4 w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg transition duration-200 ease-in-out"
            >
              Esci
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Welcome;
