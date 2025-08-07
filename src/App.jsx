import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

import {
  HeartIcon,
  PlusIcon,
  TrashIcon,
  ListBulletIcon,
  XMarkIcon, 
} from '@heroicons/react/24/solid';
import { HeartIcon as HeartOutlineIcon } from '@heroicons/react/24/outline';

import Header from './components/Header';
import Navigation from './components/Navigation';
import PlayerControls from './components/PlayerControls';
import SearchResults from './components/SearchResults';
import FavoritesList from './components/FavoritesList';
import HistoryList from './components/HistoryList';
import PlaylistsOverview from './components/PlaylistsOverview';
import PlaylistDetail from './components/PlaylistDetail'; 


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
const BASE_URL = 'https://www.googleapis.com/youtube/v3';

const SECTIONS = {
  SEARCH: 'search',
  FAVORITES: 'favorites',
  HISTORY: 'history',
  PLAYLISTS: 'playlists',
  VIEW_PLAYLIST: 'viewPlaylist',
};

function App() {
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

  // NUOVI STATI PER LA RIPRODUZIONE DELLE PLAYLIST
  const [currentPlaylistPlayingId, setCurrentPlaylistPlayingId] = useState(null); // ID della playlist attualmente in riproduzione
  const [currentPlaylistVideos, setCurrentPlaylistVideos] = useState([]); // Array dei video della playlist corrente
  const [currentPlaylistIndex, setCurrentPlaylistIndex] = useState(0); // Indice del brano corrente nella playlist

  // Stati per la modale "Aggiungi a playlist" (usata anche per la creazione di nuove playlist)
  const [showAddToPlaylistModal, setShowAddToPlaylistModal] = useState(false);
  const [videoToAdd, setVideoToAdd] = useState(null); 
  const [newPlaylistName, setNewPlaylistName] = useState('');

  // STATI PER LA BARRA DI AVANZAMENTO
  const [videoDuration, setVideoDuration] = useState(0); 
  const [videoCurrentTime, setVideoCurrentTime] = useState(0); 
  const [isSeeking, setIsSeeking] = useState(false); 
  
  const intervalRef = useRef(null); 


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
        console.log(`loadData: Caricamento playlist ID: ${currentViewedPlaylistId}`);
        const pl = await getPlaylist(currentViewedPlaylistId);
        setCurrentPlaylist(pl);
      } else if (section === SECTIONS.VIEW_PLAYLIST && currentViewedPlaylistId === null) {
         console.warn("loadData: Tentativo di visualizzare playlist senza ID valido. Resetto la sezione.");
         setActiveSection(SECTIONS.PLAYLISTS); 
      }
    } catch (err) {
      console.error("Error loading data for section:", section, err);
      setError(`Impossibile caricare i dati per ${section}.`);
    }
  };

  useEffect(() => {
    loadData(activeSection);
  }, [activeSection, currentViewedPlaylistId]); 

  useEffect(() => {
    const fetchFavoritesOnLoad = async () => {
      const favs = await getFavorites();
      setFavorites(favs);
    };
    fetchFavoritesOnLoad();
  }, []);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []); 

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    setLoading(true);
    setError(null);
    setSearchResults([]);
    setActiveSection(SECTIONS.SEARCH);
    setCurrentViewedPlaylistId(null); 

    try {
      const response = await axios.get(`${BASE_URL}/search`, {
        params: {
          part: 'snippet',
          q: searchTerm,
          key: YOUTUBE_API_KEY,
          type: 'video',
          maxResults: 10,
        },
      });

      const videos = response.data.items.filter(item => item.id.kind === 'youtube#video');
      const formattedVideos = videos.map(video => ({
        videoId: video.id.videoId,
        title: video.snippet.title,
        channelTitle: video.snippet.channelTitle,
        thumbnail: video.snippet.thumbnails.default.url,
      }));
      setSearchResults(formattedVideos);
    } catch (err) {
      console.error("Error during search:", err);
      setError("Si è verificato un errore durante la ricerca. Riprova più tardi.");
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
      // Se stiamo riproducendo una playlist, passa al brano successivo
      if (currentPlaylistPlayingId && currentPlaylistVideos.length > 0) {
        playNextVideo();
      } else {
        // Se non è una playlist, chiudi il player
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
    setCurrentPlaylistPlayingId(null); // Resetta lo stato della playlist
    setCurrentPlaylistVideos([]); // Resetta i video della playlist
    setCurrentPlaylistIndex(0); // Resetta l'indice
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };

  // NUOVA FUNZIONE: Avvia la riproduzione di una playlist
  const playPlaylist = async (playlistId) => {
    const playlistToPlay = await getPlaylist(playlistId);
    if (playlistToPlay && playlistToPlay.videos.length > 0) {
      setCurrentPlaylistPlayingId(playlistId);
      setCurrentPlaylistVideos(playlistToPlay.videos); // Memorizza i video della playlist
      setCurrentPlaylistIndex(0);
      playVideo(playlistToPlay.videos[0]);
    } else {
      console.warn("Playlist vuota o non trovata:", playlistId);
      alert("La playlist è vuota o non esiste!");
      handleClosePlayer(); // Chiudi il player se la playlist è vuota
    }
  };

  // NUOVA FUNZIONE: Riproduci il brano successivo nella playlist corrente
  const playNextVideo = () => {
    if (currentPlaylistPlayingId && currentPlaylistVideos.length > 0) {
      const nextIndex = currentPlaylistIndex + 1;
      if (nextIndex < currentPlaylistVideos.length) {
        setCurrentPlaylistIndex(nextIndex);
        playVideo(currentPlaylistVideos[nextIndex]);
      } else {
        // Fine della playlist, riparti dall'inizio o ferma
        setCurrentPlaylistIndex(0); // Torna all'inizio
        playVideo(currentPlaylistVideos[0]); // Riproduci il primo brano di nuovo
        // Oppure, per fermare: handleClosePlayer();
      }
    } else {
      // Non c'è una playlist attiva, quindi non fare nulla o ferma il singolo video
      handleClosePlayer();
    }
  };

  // NUOVA FUNZIONE: Riproduci il brano precedente nella playlist corrente
  const playPreviousVideo = () => {
    if (currentPlaylistPlayingId && currentPlaylistVideos.length > 0) {
      const prevIndex = currentPlaylistIndex - 1;
      if (prevIndex >= 0) {
        setCurrentPlaylistIndex(prevIndex);
        playVideo(currentPlaylistVideos[prevIndex]);
      } else {
        // Inizio della playlist, vai alla fine o ferma
        setCurrentPlaylistIndex(currentPlaylistVideos.length - 1); // Vai all'ultimo brano
        playVideo(currentPlaylistVideos[currentPlaylistVideos.length - 1]); // Riproduci l'ultimo brano
        // Oppure, per fermare: handleClosePlayer();
      }
    } else {
      // Non c'è una playlist attiva, quindi non fare nulla o ferma il singolo video
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

  const handleCreateNewPlaylist = async () => {
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
      // Se la playlist eliminata era quella in riproduzione, chiudi il player
      if (currentPlaylistPlayingId === playlistId) {
        handleClosePlayer();
      }
    }
  };

  const handleRemoveVideoFromPlaylist = async (playlistId, videoId) => {
    await removeVideoFromPlaylist(playlistId, videoId);
    loadData(SECTIONS.VIEW_PLAYLIST);
    // Se il video rimosso fa parte della playlist in riproduzione, aggiorna l'array dei video
    if (currentPlaylistPlayingId === playlistId) {
      const updatedPlaylist = await getPlaylist(playlistId);
      setCurrentPlaylistVideos(updatedPlaylist.videos);
      // Se il video rimosso era quello corrente, passa al successivo o ferma
      if (playingVideoId === videoId) {
        // Se non ci sono altri video, chiudi il player
        if (updatedPlaylist.videos.length === 0) {
          handleClosePlayer();
        } else {
          // Altrimenti, prova a riprodurre il prossimo video
          playNextVideo(); 
        }
      } else {
        // Se il video rimosso non era quello corrente, ma l'indice corrente è ora fuori dai limiti
        // o punta ad un video sbagliato a causa della rimozione, ricalcola l'indice o resetta.
        // Per semplicità, non facciamo un ricalcolo complesso qui, ma è un punto da considerare.
      }
    }
  };

  const openCreatePlaylistModal = async () => {
    console.log("openCreatePlaylistModal chiamata!");
    setVideoToAdd(null); 
    setShowAddToPlaylistModal(true);
    const pls = await getPlaylists(); 
    setPlaylists(pls);
    console.log("showAddToPlaylistModal impostato a true:", true);
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
    // Se il video è aggiunto alla playlist attualmente in riproduzione
    if (currentPlaylistPlayingId === playlistId) {
      const updatedPlaylist = await getPlaylist(playlistId);
      setCurrentPlaylistVideos(updatedPlaylist.videos);
    }
  };


  const renderContent = () => {
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
            playPlaylist={playPlaylist} // PASSA LA FUNZIONE playPlaylist
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
      />

      <main className="w-full max-w-2xl flex-grow mb-4">
        {renderContent()}
      </main>

      <Navigation
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        setSearchResults={setSearchResults}
      />

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
          // NUOVE PROP PER LA NAVIGAZIONE PLAYLIST
          playNextVideo={playNextVideo}
          playPreviousVideo={playPreviousVideo}
          isPlaylistActive={!!currentPlaylistPlayingId} // Indica se una playlist è attiva
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
              <h4 className="font-semibold text-lg mb-2">Crea Nuova Playlist:</h4>
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
          </div>
        </div>
      )}
    </div>
  );
}

export default App;