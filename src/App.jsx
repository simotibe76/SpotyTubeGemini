import { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';

// Importazioni Icone
import {
  HeartIcon,
  PlusIcon,
  TrashIcon,
  ListBulletIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/solid';
import { HeartIcon as HeartOutlineIcon } from '@heroicons/react/24/outline';

// Importazioni Componenti
import Header from './components/Header';
import Navigation from './components/Navigation';
import PlayerControls from './components/PlayerControls';
import SearchResults from './components/SearchResults';
import FavoritesList from './components/FavoritesList';
import HistoryList from './components/HistoryList';
import PlaylistsOverview from './components/PlaylistsOverview';
import PlaylistDetail from './components/PlaylistDetail';

// Importazioni funzioni del database locale
import {
  addFavorite,
  removeFavorite,
  getFavorites,
  isFavorite,
  addHistoryEntry,
  getHistory,
  createPlaylist,
  getPlaylists,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  deletePlaylist,
  getPlaylist
} from './db';

const YOUTUBE_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
// UPDATED: Aggiunto lo scope per la scrittura
const SCOPES = 'https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/youtube';
const REDIRECT_URI = 'https://spotytubegemini.netlify.app';

const SECTIONS = {
  SEARCH: 'search',
  FAVORITES: 'favorites',
  HISTORY: 'history',
  PLAYLISTS: 'playlists',
  VIEW_PLAYLIST: 'viewPlaylist',
};

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

function AppContent() {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [playingVideoId, setPlayingVideoId] = useState(null);
  const [currentPlayingTitle, setCurrentPlayingTitle] = useState('');
  const [playerInstance, setPlayerInstance] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeSection, setActiveSection] = useState(SECTIONS.SEARCH);
  const [favorites, setFavorites] = useState([]);
  const [history, setHistory] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [currentPlaylist, setCurrentPlaylist] = useState(null);
  const [currentViewedPlaylistId, setCurrentViewedPlaylistId] = useState(null);
  const [currentPlaylistPlayingId, setCurrentPlaylistPlayingId] = useState(null);
  const [currentPlaylistVideos, setCurrentPlaylistVideos] = useState([]);
  const [currentPlaylistIndex, setCurrentPlaylistIndex] = useState(0);
  const [showAddToPlaylistModal, setShowAddToPlaylistModal] = useState(false);
  const [videoToAdd, setVideoToAdd] = useState(null);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const intervalRef = useRef(null);

  // STATI PER GOOGLE API E AUTENTICAZIONE
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [isApiReady, setIsApiReady] = useState(false);
  
  // STATO PER LA SINCRONIZZAZIONE GENERICA
  const [isSyncing, setIsSyncing] = useState(false);
  
  // NUOVO STATO PER LA SINCRONIZZAZIONE DEI PREFERITI
  const [isSyncingFavorites, setIsSyncingFavorites] = useState(false);

  const isSearchDisabled = !isSignedIn || loading || !isApiReady;

  // Caricamento e inizializzazione delle API di Google e dati iniziali
  useEffect(() => {
    const initGoogleApis = async () => {
      try {
        await loadScript('https://apis.google.com/js/api.js');
        await loadScript('https://accounts.google.com/gsi/client');
        
        // Inizializzazione di gapi.client
        window.gapi.load('client', () => {
          window.gapi.client.init({
            apiKey: YOUTUBE_API_KEY,
            discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/youtube/v3/rest"],
          }).then(() => {
            console.log("GAPI Client e API di YouTube pronti per l'uso!");
            setIsApiReady(true);
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

    const fetchFavoritesOnLoad = async () => {
      const favs = await getFavorites();
      setFavorites(favs);
    };
    fetchFavoritesOnLoad();
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Gestione dell'autenticazione tramite URL e recupero del profilo utente
  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.substring(1));
    const tokenFromUrl = params.get('access_token');
    
    // Attendiamo che l'API sia pronta prima di usare il token
    if (tokenFromUrl && isApiReady) {
      setAccessToken(tokenFromUrl);
      setIsSignedIn(true);
      window.gapi.client.setToken({ access_token: tokenFromUrl });
      
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
      
      window.history.pushState("", document.title, window.location.pathname + window.location.search);
    }
  }, [isApiReady]);

  useEffect(() => {
    if (isSignedIn) {
      loadData(activeSection);
    }
  }, [activeSection, currentViewedPlaylistId, isSignedIn]);
  
  const handleGoogleAuthClick = () => {
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=token&scope=${SCOPES}`;
  };

  const handleSignOut = () => {
    if (accessToken) {
      window.google.accounts.oauth2.revoke(accessToken, () => {
        setAccessToken(null);
        setIsSignedIn(false);
        setUserProfile(null);
        window.gapi.client.setToken(null);
      });
    }
  };

  const loadData = async (section) => {
    try {
      if (section === SECTIONS.FAVORITES) {
        const favs = await getFavorites();
        setFavorites(favs);
      } else if (section === SECTIONS.HISTORY) {
        const hist = await getHistory();
        setHistory(hist);
      } else if (section === SECTIONS.PLAYLISTS) {
        const pls = await getPlaylists();
        setPlaylists(pls);
      } else if (section === SECTIONS.VIEW_PLAYLIST && typeof currentViewedPlaylistId === 'number') {
        const pl = await getPlaylist(currentViewedPlaylistId);
        setCurrentPlaylist(pl);
      } else if (section === SECTIONS.VIEW_PLAYLIST && currentViewedPlaylistId === null) {
        setActiveSection(SECTIONS.PLAYLISTS);
      }
    } catch (err) {
      console.error("Error loading data for section:", section, err);
      setError(`Impossibile caricare i dati per ${section}.`);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!isSignedIn) {
      setError('Devi prima accedere con il tuo account Google.');
      return;
    }
    
    // Controlliamo che l'API sia pronta E che l'oggetto Youtube esista
    if (!isApiReady || !window.gapi.client.youtube?.search) {
      setError('Le API di Google non sono ancora pronte. Riprova fra qualche istante.');
      console.error("Tentativo di ricerca fallito: GAPI non è pronto.");
      return;
    }
    
    if (!searchTerm.trim()) return;

    setLoading(true);
    setError(null);
    setSearchResults([]);
    setActiveSection(SECTIONS.SEARCH);
    setCurrentViewedPlaylistId(null);

    try {
      // La chiamata API è ora sicura ma con chatgpt window.gapi.client.youtube.search.list
      const response = await window.gapi.client.youtube.search.list({
        part: 'snippet',
        q: searchTerm,
        type: 'video',
        maxResults: 10,
      });

      const videos = response.result.items.filter(item => item.id.kind === 'youtube#video');
      const formattedVideos = videos.map(video => ({
        videoId: video.id.videoId,
        title: video.snippet.title,
        channelTitle: video.snippet.channelTitle,
        thumbnail: video.snippet.thumbnails.default.url,
      }));
      setSearchResults(formattedVideos);
    } catch (err) {
      console.error("Error during search:", err);
      if (err.result && err.result.error && err.result.error.code === 403) {
        setError("Errore 403: La chiave API non è valida o non ha i permessi necessari.");
      } else {
        setError("Si è verificato un errore durante la ricerca. Riprova più tardi.");
      }
    } finally {
      setLoading(false);
    }
  };

  const playVideo = async (videoData) => {
    setPlayingVideoId(videoData.videoId);
    setCurrentPlayingTitle(videoData.title);
    setIsPlaying(true);
    setVideoCurrentTime(0);
    setVideoDuration(0);
    await addHistoryEntry(videoData);
    if (activeSection === SECTIONS.HISTORY) {
      loadData(SECTIONS.HISTORY);
    }
  };

  const onPlayerReady = (event) => {
    setPlayerInstance(event.target);
    event.target.playVideo();
    setIsPlaying(true);
  };

  const onPlayerStateChange = (event) => {
    if (event.data === window.YT.PlayerState.PLAYING) {
      setIsPlaying(true);
      if (playerInstance) {
        setVideoDuration(playerInstance.getDuration());
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        intervalRef.current = setInterval(() => {
          if (playerInstance && !isSeeking) {
            setVideoCurrentTime(playerInstance.getCurrentTime());
          }
        }, 1000);
      }
    } else if (event.data === window.YT.PlayerState.PAUSED) {
      setIsPlaying(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    } else if (event.data === window.YT.PlayerState.ENDED) {
      setIsPlaying(false);
      setVideoCurrentTime(0);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (currentPlaylistPlayingId && currentPlaylistVideos.length > 0) {
        playNextVideo();
      } else {
        handleClosePlayer();
      }
    }
  };

  const togglePlayPause = () => {
    if (playerInstance) {
      if (isPlaying) {
        playerInstance.pauseVideo();
      } else {
        playerInstance.playVideo();
      }
    }
  };

  const handleSeek = (time) => {
    if (playerInstance) {
      playerInstance.seekTo(time, true);
      setVideoCurrentTime(time);
    }
  };

  const handleClosePlayer = () => {
    if (playerInstance) {
      playerInstance.stopVideo();
    }
    setPlayingVideoId(null);
    setCurrentPlayingTitle('');
    setIsPlaying(false);
    setVideoCurrentTime(0);
    setVideoDuration(0);
    setCurrentPlaylistPlayingId(null);
    setCurrentPlaylistVideos([]);
    setCurrentPlaylistIndex(0);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };

  const playPlaylist = async (playlistId) => {
    const playlistToPlay = await getPlaylist(playlistId);
    if (playlistToPlay && playlistToPlay.videos.length > 0) {
      setCurrentPlaylistPlayingId(playlistId);
      setCurrentPlaylistVideos(playlistToPlay.videos);
      setCurrentPlaylistIndex(0);
      playVideo(playlistToPlay.videos[0]);
    } else {
      console.warn("Playlist vuota o non trovata:", playlistId);
      alert("La playlist è vuota o non esiste!");
      handleClosePlayer();
    }
  };

  const playNextVideo = () => {
    if (currentPlaylistPlayingId && currentPlaylistVideos.length > 0) {
      const nextIndex = currentPlaylistIndex + 1;
      if (nextIndex < currentPlaylistVideos.length) {
        setCurrentPlaylistIndex(nextIndex);
        playVideo(currentPlaylistVideos[nextIndex]);
      } else {
        setCurrentPlaylistIndex(0);
        playVideo(currentPlaylistVideos[0]);
      }
    } else {
      handleClosePlayer();
    }
  };

  const playPreviousVideo = () => {
    if (currentPlaylistPlayingId && currentPlaylistVideos.length > 0) {
      const prevIndex = currentPlaylistIndex - 1;
      if (prevIndex >= 0) {
        setCurrentPlaylistIndex(prevIndex);
        playVideo(currentPlaylistVideos[prevIndex]);
      } else {
        setCurrentPlaylistIndex(currentPlaylistVideos.length - 1);
        playVideo(currentPlaylistVideos[currentPlaylistVideos.length - 1]);
      }
    } else {
      handleClosePlayer();
    }
  };

  const playerOpts = {
    height: '0',
    width: '0',
    playerVars: {
      autoplay: 1,
      controls: 0,
      disablekb: 1,
      fs: 0,
      iv_load_policy: 3,
      modestbranding: 1,
      rel: 0,
      showinfo: 0,
      loop: 0,
      enablejsapi: 1,
    },
  };

  const handleToggleFavorite = async (videoData) => {
    const isCurrentlyFavorite = await isFavorite(videoData.videoId);
    if (isCurrentlyFavorite) {
      await removeFavorite(videoData.videoId);
    } else {
      await addFavorite(videoData);
    }
    if (activeSection === SECTIONS.FAVORITES) {
      loadData(SECTIONS.FAVORITES);
    }
    const updatedFavorites = await getFavorites();
    setFavorites(updatedFavorites);
  };
  
  // FUNZIONI DI UTILITÀ PER LE API DI YOUTUBE
  const createYouTubePlaylist = async (playlistName) => {
    try {
      const response = await window.gapi.client.youtube.playlists.insert({
        part: 'snippet,status',
        resource: {
          snippet: {
            title: playlistName,
            description: 'Playlist sincronizzata da SpotyTube.',
          },
          status: {
            privacyStatus: 'private', // Scegli tra 'public', 'private', 'unlisted'
          },
        },
      });
      console.log(`Playlist "${playlistName}" creata su YouTube con ID: ${response.result.id}`);
      return response.result.id;
    } catch (err) {
      console.error(`Errore nella creazione della playlist "${playlistName}" su YouTube:`, err);
      throw err;
    }
  };

  const addVideoToYouTubePlaylist = async (playlistId, videoId) => {
    try {
      await window.gapi.client.youtube.playlistItems.insert({
        part: 'snippet',
        resource: {
          snippet: {
            playlistId: playlistId,
            resourceId: {
              kind: 'youtube#video',
              videoId: videoId,
            },
          },
        },
      });
      console.log(`Video ${videoId} aggiunto alla playlist ${playlistId}.`);
    } catch (err) {
      console.error(`Errore nell'aggiunta del video ${videoId} alla playlist ${playlistId}:`, err);
    }
  };

  // FUNZIONE DI SINCRONIZZAZIONE DEI PREFERITI
  const handleSyncFavoritesYouTube = async () => {
    if (!isSignedIn) {
      setError('Devi prima accedere con il tuo account Google per sincronizzare.');
      return;
    }
    if (!isApiReady) {
      setError('Le API di Google non sono ancora pronte. Riprova tra qualche istante.');
      return;
    }
    
    setIsSyncingFavorites(true);
    setError(null);
    
    try {
      const localFavorites = await getFavorites();
      
      if (localFavorites.length === 0) {
        alert("Nessun preferito da sincronizzare.");
        return;
      }
      
      // Controlla se la playlist "Preferiti da Spotytube" esiste già
      let youtubePlaylistId = null;
      const searchResponse = await window.gapi.client.youtube.playlists.list({
        part: 'snippet',
        mine: true,
        maxResults: 50,
      });
      
      const existingPlaylist = searchResponse.result.items.find(
        (pl) => pl.snippet.title === "Preferiti da Spotytube"
      );
      
      if (existingPlaylist) {
        youtubePlaylistId = existingPlaylist.id;
        console.log('Playlist "Preferiti da Spotytube" trovata.');
      } else {
        console.log('Playlist "Preferiti da Spotytube" non trovata, la sto creando...');
        // Se non esiste, la crea
        const newPlaylistId = await createYouTubePlaylist("Preferiti da Spotytube");
        youtubePlaylistId = newPlaylistId;
      }
      
      if (youtubePlaylistId) {
        for (const video of localFavorites) {
          await addVideoToYouTubePlaylist(youtubePlaylistId, video.videoId);
        }
      }
      
      alert("Sincronizzazione dei preferiti completata con successo nella playlist 'Preferiti da Spotytube'!");
    } catch (err) {
      console.error("Errore durante la sincronizzazione dei preferiti:", err);
      setError("Si è verificato un errore durante la sincronizzazione dei preferiti. Controlla la console per i dettagli.");
    } finally {
      setIsSyncingFavorites(false);
    }
  };
  
  // FUNZIONE DI SINCRONIZZAZIONE DELLE PLAYLIST ESISTENTE
  const handleSyncYouTubePlaylists = async () => {
    if (!isSignedIn) {
      setError('Devi prima accedere con il tuo account Google per sincronizzare.');
      return;
    }
    if (!isApiReady) {
      setError('Le API di Google non sono ancora pronte. Riprova tra qualche istante.');
      return;
    }
    
    setIsSyncing(true);
    setError(null);
    
    try {
      const localPlaylists = await getPlaylists();
      
      if (localPlaylists.length === 0) {
        alert("Nessuna playlist locale da sincronizzare.");
        return;
      }
      
      for (const playlist of localPlaylists) {
        console.log(`Sincronizzazione della playlist: ${playlist.name}`);
        const newYouTubePlaylistId = await createYouTubePlaylist(playlist.name);
        
        if (newYouTubePlaylistId) {
          for (const video of playlist.videos) {
            await addVideoToYouTubePlaylist(newYouTubePlaylistId, video.videoId);
          }
        }
      }
      
      alert("Sincronizzazione di tutte le playlist completata con successo!");
    } catch (err) {
      console.error("Errore durante la sincronizzazione delle playlist:", err);
      setError("Si è verificato un errore durante la sincronizzazione. Controlla la console per i dettagli.");
    } finally {
      setIsSyncing(false);
    }
  };
  // FINE NUOVE FUNZIONI

  const handleCreateNewPlaylist = async () => {
    // OLD FUNCTIONALITY: Creazione locale.
    if (newPlaylistName.trim()) {
      await createPlaylist(newPlaylistName.trim());
      closeAddToPlaylistModal();
      loadData(SECTIONS.PLAYLISTS);
    }
  };

  const handleViewPlaylist = async (playlistId) => {
    setCurrentViewedPlaylistId(playlistId);
    setActiveSection(SECTIONS.VIEW_PLAYLIST);
  };

  const handleDeletePlaylist = async (playlistId) => {
    if (window.confirm("Sei sicuro di voler eliminare questa playlist?")) {
      await deletePlaylist(playlistId);
      loadData(SECTIONS.PLAYLISTS);
      if (currentPlaylist && currentPlaylist.id === playlistId) {
        setCurrentPlaylist(null);
        setCurrentViewedPlaylistId(null);
        setActiveSection(SECTIONS.PLAYLISTS);
      }
      if (currentPlaylistPlayingId === playlistId) {
        handleClosePlayer();
      }
    }
  };

  const handleRemoveVideoFromPlaylist = async (playlistId, videoId) => {
    await removeVideoFromPlaylist(playlistId, videoId);
    loadData(SECTIONS.VIEW_PLAYLIST);
    if (currentPlaylistPlayingId === playlistId) {
      const updatedPlaylist = await getPlaylist(playlistId);
      setCurrentPlaylistVideos(updatedPlaylist.videos);
      if (playingVideoId === videoId) {
        if (updatedPlaylist.videos.length === 0) {
          handleClosePlayer();
        } else {
          playNextVideo();
        }
      } else {
        // Se il video rimosso non era quello corrente, ma l'indice corrente è ora fuori dai limiti
        // o punta ad un video sbagliato a causa della rimozione, ricalcola l'indice o resetta.
      }
    }
  };

  const openCreatePlaylistModal = async () => {
    setVideoToAdd(null);
    setShowAddToPlaylistModal(true);
    const pls = await getPlaylists();
    setPlaylists(pls);
  };

  const openAddToPlaylistModal = async (video) => {
    setVideoToAdd(video);
    setShowAddToPlaylistModal(true);
    const pls = await getPlaylists();
    setPlaylists(pls);
  };

  const closeAddToPlaylistModal = () => {
    setShowAddToPlaylistModal(false);
    setVideoToAdd(null);
    setNewPlaylistName('');
  };

  const handleAddVideoToExistingPlaylist = async (playlistId) => {
    if (!videoToAdd) return;
    await addVideoToPlaylist(playlistId, videoToAdd);
    alert(`${videoToAdd.title} aggiunto alla playlist!`);
    closeAddToPlaylistModal();
    if (currentPlaylist && currentPlaylist.id === playlistId) {
      loadData(SECTIONS.VIEW_PLAYLIST);
    }
    if (currentPlaylistPlayingId === playlistId) {
      const updatedPlaylist = await getPlaylist(playlistId);
      setCurrentPlaylistVideos(updatedPlaylist.videos);
    }
  };

  const renderContent = () => {
    if (!isSignedIn) {
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
            <button
              onClick={handleGoogleAuthClick}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg transition duration-200 ease-in-out"
            >
              Accedi con Google
            </button>
          </div>
        </div>
      );
    }

    switch (activeSection) {
      case SECTIONS.SEARCH:
        return (
          <SearchResults
            searchResults={searchResults}
            playVideo={playVideo}
            favorites={favorites}
            handleToggleFavorite={handleToggleFavorite}
            openAddToPlaylistModal={openAddToPlaylistModal}
          />
        );
      case SECTIONS.FAVORITES:
        return (
          <FavoritesList
            favorites={favorites}
            playVideo={playVideo}
            handleToggleFavorite={handleToggleFavorite}
            openAddToPlaylistModal={openAddToPlaylistModal}
            handleSyncFavoritesYouTube={handleSyncFavoritesYouTube} // Passa la nuova funzione
            isSyncingFavorites={isSyncingFavorites} // Passa il nuovo stato
          />
        );
      case SECTIONS.HISTORY:
        return (
          <HistoryList
            history={history}
            playVideo={playVideo}
            favorites={favorites}
            handleToggleFavorite={handleToggleFavorite}
            openAddToPlaylistModal={openAddToPlaylistModal}
          />
        );
      case SECTIONS.PLAYLISTS:
        return (
          <PlaylistsOverview
            playlists={playlists}
            handleViewPlaylist={handleViewPlaylist}
            handleDeletePlaylist={handleDeletePlaylist}
            openCreatePlaylistModal={openCreatePlaylistModal}
            playPlaylist={playPlaylist}
            // PASSAGGIO DELLE NUOVE PROPS
            handleSyncYouTubePlaylists={handleSyncYouTubePlaylists}
            isSyncing={isSyncing}
          />
        );
      case SECTIONS.VIEW_PLAYLIST:
        return (
          <PlaylistDetail
            playlist={currentPlaylist}
            setActiveSection={setActiveSection}
            handleToggleFavorite={handleToggleFavorite}
            handleRemoveVideoFromPlaylist={handleRemoveVideoFromPlaylist}
            playVideo={playVideo}
            favorites={favorites}
            setCurrentViewedPlaylistId={setCurrentViewedPlaylistId}
            setCurrentPlaylist={setCurrentPlaylist}
          />
        );
      default:
        return <p className="text-center text-gray-400 text-xl mt-10">Sezione non trovata.</p>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center">
      <Header
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        handleSearch={handleSearch}
        loading={loading}
        error={error}
        isSignedIn={isSignedIn}
        userProfile={userProfile}
        handleGoogleAuthClick={handleGoogleAuthClick}
        handleSignOut={handleSignOut}
        isSearchDisabled={isSearchDisabled}
      />

      <main className="w-full max-w-2xl flex-grow mb-4">
        {renderContent()}
      </main>

      {isSignedIn && (
        <Navigation
          activeSection={activeSection}
          setActiveSection={setActiveSection}
          setSearchResults={setSearchResults}
          isSignedIn={isSignedIn}
          userProfile={userProfile}
          handleGoogleAuthClick={handleGoogleAuthClick}
          handleSignOut={handleSignOut}
        />
      )}

      {playingVideoId && (
        <PlayerControls
          playingVideoId={playingVideoId}
          currentPlayingTitle={currentPlayingTitle}
          isPlaying={isPlaying}
          togglePlayPause={togglePlayPause}
          playerOpts={playerOpts}
          onPlayerReady={onPlayerReady}
          onPlayerStateChange={onPlayerStateChange}
          videoDuration={videoDuration}
          videoCurrentTime={videoCurrentTime}
          handleSeek={handleSeek}
          setIsSeeking={setIsSeeking}
          handleClosePlayer={handleClosePlayer}
          playNextVideo={playNextVideo}
          playPreviousVideo={playPreviousVideo}
          isPlaylistActive={!!currentPlaylistPlayingId}
        />
      )}

      {showAddToPlaylistModal && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-[100]">
          <div className="bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md relative">
            <button
              onClick={closeAddToPlaylistModal}
              className="absolute top-3 right-3 text-gray-400 hover:text-white"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
            <h3 className="text-xl font-bold mb-4 text-purple-300">
              {videoToAdd ? "Aggiungi a Playlist" : "Crea Nuova Playlist"}
            </h3>
            {videoToAdd && (
              <p className="text-gray-300 mb-4">Brano: <span className="font-semibold">{videoToAdd.title}</span></p>
            )}

            {videoToAdd && (
              <div className="mb-6">
                <h4 className="font-semibold text-lg mb-2">Playlist Esistenti:</h4>
                {playlists.length > 0 ? (
                  <ul className="max-h-40 overflow-y-auto space-y-2 pr-2">
                    {playlists.map(playlist => (
                      <li key={playlist.id} className="flex justify-between items-center bg-gray-700 p-2 rounded-md">
                        <span className="text-gray-200">{playlist.name}</span>
                        <button
                          onClick={() => handleAddVideoToExistingPlaylist(playlist.id)}
                          className="px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded-md text-sm font-semibold"
                        >
                          Aggiungi
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-400 text-sm">Nessuna playlist esistente. Creane una nuova!</p>
                )}
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-gray-700">
              <h4 className="font-semibold text-lg mb-2">Crea Nuova Playlist (Locale):</h4>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="flex-grow p-2 rounded-lg bg-gray-700 border border-gray-600 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-600"
                  placeholder="Nome nuova playlist"
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                />
                <button
                  onClick={handleCreateNewPlaylist}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-bold transition-colors duration-200"
                  disabled={!newPlaylistName.trim()}
                >
                  Crea
                </button>
              </div>
            </div>

            <button
              onClick={closeAddToPlaylistModal}
              className="mt-4 w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg font-bold transition-colors duration-200"
            >
              Annulla
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
