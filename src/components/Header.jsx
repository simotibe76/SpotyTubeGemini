import { useState } from 'react';
import { MagnifyingGlassIcon, ArrowLeftEndOnRectangleIcon, XMarkIcon } from '@heroicons/react/24/solid';

const Header = ({
  searchTerm,
  setSearchTerm,
  handleSearch,
  loading,
  error,
  isSignedIn,
  userProfile,
  handleGoogleAuthClick,
  handleSignOut,
}) => {
  const [isSignOutVisible, setIsSignOutVisible] = useState(false);
  const isSearchDisabled = !isSignedIn || loading;

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!isSearchDisabled && searchTerm.trim()) {
      handleSearch(e);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-gray-900 border-b border-gray-800 p-4 shadow-xl">
      <div className="flex flex-col sm:flex-row items-center justify-between w-full max-w-2xl mx-auto">
        <div className="flex items-center justify-center sm:justify-start w-full sm:w-auto mb-4 sm:mb-0">
          <h1 className="text-4xl font-extrabold text-purple-400">SpotyTube</h1>
        </div>

        {isSignedIn ? (
          <>
            <form onSubmit={handleSearchSubmit} className="w-full sm:w-1/2 flex items-center bg-gray-800 rounded-full focus-within:ring-2 focus-within:ring-purple-600 transition-all duration-300">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-grow p-3 bg-transparent text-white placeholder-gray-500 focus:outline-none"
                placeholder="Cerca video..."
                disabled={isSearchDisabled}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="p-2 text-gray-400 hover:text-white transition-colors duration-200"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              )}
              <button
                type="submit"
                className="p-3 bg-purple-600 rounded-full text-white hover:bg-purple-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSearchDisabled || !searchTerm.trim()}
              >
                <MagnifyingGlassIcon className="h-5 w-5" />
              </button>
            </form>
            <div className="relative flex items-center mt-4 sm:mt-0">
              <div
                className="flex items-center space-x-2 cursor-pointer p-1 rounded-full hover:bg-gray-800 transition-colors duration-200"
                onClick={() => setIsSignOutVisible(!isSignOutVisible)}
              >
                <img
                  src={userProfile?.imageUrl}
                  alt={userProfile?.name}
                  className="h-9 w-9 rounded-full border-2 border-purple-500"
                />
                <span className="text-sm font-medium text-gray-300 hidden md:block">{userProfile?.name}</span>
              </div>
              {isSignOutVisible && (
                <div
                  className="absolute top-12 right-0 bg-gray-800 rounded-lg shadow-xl p-2 z-50 cursor-pointer"
                  onClick={handleSignOut}
                >
                  <div className="flex items-center space-x-2 text-white hover:text-purple-400 transition-colors duration-200 px-4 py-2">
                    <ArrowLeftEndOnRectangleIcon className="h-5 w-5" />
                    <span>Disconnetti</span>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="w-full sm:w-auto mt-4 sm:mt-0">
            <button
              onClick={handleGoogleAuthClick}
              className="w-full sm:w-auto px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-bold transition-colors duration-200 shadow-md"
            >
              Accedi con Google
            </button>
          </div>
        )}
      </div>
      {error && (
        <div className="w-full max-w-2xl mx-auto mt-4 text-center text-red-400 font-medium">
          {error}
        </div>
      )}
      {loading && (
        <div className="w-full max-w-2xl mx-auto mt-4 text-center text-purple-400 font-medium animate-pulse">
          Caricamento...
        </div>
      )}
    </header>
  );
};

export default Header;
