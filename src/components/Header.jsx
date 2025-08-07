// src/components/Header.jsx
import React, { useState } from 'react';
import { MagnifyingGlassIcon, ArrowLeftEndOnRectangleIcon } from '@heroicons/react/24/solid';

// Aggiunte le props relative all'autenticazione
function Header({ searchTerm, setSearchTerm, handleSearch, loading, error, isSignedIn, userProfile, handleGoogleAuthClick, handleSignOut }) {
  const [isSignOutVisible, setIsSignOutVisible] = useState(false);

  return (
    <header className="w-full max-w-2xl text-center mb-8 px-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-5xl font-extrabold text-purple-400">SpotyTube</h1>
        
        {/* Nuovo blocco per il pulsante di login/logout */}
        <div className="relative flex items-center">
          {isSignedIn && userProfile ? (
            <>
              <div
                className="cursor-pointer"
                onClick={() => setIsSignOutVisible(!isSignOutVisible)}
              >
                <img
                  src={userProfile.imageUrl}
                  alt={userProfile.name}
                  className="w-12 h-12 rounded-full border-2 border-purple-500"
                />
              </div>
              {isSignOutVisible && (
                <div
                  className="absolute top-14 right-0 bg-gray-800 rounded-lg shadow-lg p-2 z-50 cursor-pointer"
                  onClick={handleSignOut}
                >
                  <div className="flex items-center space-x-2 text-white hover:text-purple-400 transition-colors duration-200">
                    <ArrowLeftEndOnRectangleIcon className="h-5 w-5" />
                    <span>Disconnetti</span>
                  </div>
                </div>
              )}
            </>
          ) : (
            <button
              onClick={handleGoogleAuthClick}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-bold transition-colors duration-200"
            >
              Accedi con Google
            </button>
          )}
        </div>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          className="flex-grow p-3 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-600"
          placeholder="Cerca musica o audiolibri..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          // Disabilita la ricerca se l'utente non è loggato
          disabled={!isSignedIn || loading}
        />
        <button
          type="submit"
          className={`px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-bold transition-colors duration-200 ${(!isSignedIn || loading) ? 'cursor-not-allowed opacity-50' : ''}`}
          // Disabilita il pulsante se l'utente non è loggato o se è in fase di caricamento
          disabled={!isSignedIn || loading}
        >
          <MagnifyingGlassIcon className="h-6 w-6 text-white" />
        </button>
      </form>
      {error && <p className="text-red-500 mt-2 text-center">{error}</p>}
      {loading && <p className="text-purple-400 mt-2 text-center animate-pulse">Caricamento...</p>}
    </header>
  );
}

export default Header;
