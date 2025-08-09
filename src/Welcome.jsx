import { useEffect, useState } from 'react';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const SCOPES = 'https://www.googleapis.com/auth/youtube.readonly';
const REDIRECT_URI = 'https://spotytubegemini.netlify.app'; // Sostituisci con l'URL della tua applicazione

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
  const [isApiReady, setIsApiReady] = useState(false);

  useEffect(() => {
    const initGoogleApis = async () => {
      try {
        await loadScript('https://apis.google.com/js/api.js');
        await loadScript('https://accounts.google.com/gsi/client');
        
        // Inizializza il client per l'API di YouTube
        window.gapi.load('client', () => {
          window.gapi.client.init({
            discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/youtube/v3/rest"],
          }).then(() => {
            setIsApiReady(true);
            console.log("GAPI Client e API di YouTube pronti per l'uso!");
          }).catch((err) => {
            console.error("Errore nell'inizializzazione del client GAPI:", err);
            setError("Impossibile caricare il client API di Google.");
          });
        });
      } catch (err) {
        console.error("Errore nel caricamento degli script di Google:", err);
        setError("Impossibile caricare gli script di Google.");
      }
    };
    initGoogleApis();
  }, []);

  useEffect(() => {
    // Gestione dell'autenticazione tramite URL
    const params = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = params.get('access_token');
    
    if (accessToken && isApiReady) {
      console.log("Accesso riuscito tramite redirect:", accessToken);
      setIsSignedIn(true);
      window.gapi.client.setToken({ access_token: accessToken });
      
      const fetchUserProfile = async () => {
        try {
          const response = await window.gapi.client.youtube.channels.list({
            'part': ['snippet'],
            'mine': true
          });
          if (response.result.items.length > 0) {
            const profile = response.result.items[0].snippet;
            setUserProfile({
              name: profile.title,
              imageUrl: profile.thumbnails.default.url
            });
            console.log("Profilo utente recuperato:", profile.title);
          }
        } catch (err) {
          console.error("Errore nel recupero del profilo YouTube:", err);
          setError("Impossibile recuperare il profilo utente.");
        }
      };

      fetchUserProfile();
      
      // Rimuovi il token dall'URL per sicurezza e pulizia
      window.history.pushState("", document.title, window.location.pathname + window.location.search);
    }
  }, [isApiReady]); // Questo useEffect viene eseguito ogni volta che isApiReady cambia

  const handleGoogleAuthClick = () => {
    // Reindirizzamento diretto per l'autenticazione
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=token&scope=${SCOPES}`;
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
            <p className="text-green-400 font-semibold text-lg mb-4">
              Accesso riuscito!
            </p>
            <p className="text-gray-400">
              Bentornato, <span className="font-bold text-purple-300">{userProfile ? userProfile.name : "Utente"}</span>!
            </p>
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
