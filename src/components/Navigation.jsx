import { HomeIcon, HeartIcon, ClockIcon, ListBulletIcon, ChevronUpIcon } from '@heroicons/react/24/solid';

const Navigation = ({
  activeSection,
  setActiveSection,
  setSearchResults,
  isSignedIn,
  userProfile,
  handleGoogleAuthClick,
  handleSignOut,
}) => {

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  const handleSectionClick = (section) => {
    setActiveSection(section);
    if (section === 'search') {
      setSearchResults([]);
    }
    scrollToTop();
  };
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-gray-900 border-t border-gray-800 shadow-xl p-2 md:p-4">
      <div className="flex justify-around items-center w-full max-w-lg mx-auto">
        <button
          onClick={() => handleSectionClick('search')}
          className={`flex flex-col items-center p-2 rounded-lg transition-colors duration-200 ${
            activeSection === 'search' ? 'text-purple-400' : 'text-gray-400 hover:text-white'
          }`}
        >
          <HomeIcon className="h-6 w-6" />
          <span className="text-xs mt-1 font-medium hidden sm:block">Cerca</span>
        </button>

        <button
          onClick={() => handleSectionClick('favorites')}
          className={`flex flex-col items-center p-2 rounded-lg transition-colors duration-200 ${
            activeSection === 'favorites' ? 'text-purple-400' : 'text-gray-400 hover:text-white'
          }`}
        >
          <HeartIcon className="h-6 w-6" />
          <span className="text-xs mt-1 font-medium hidden sm:block">Preferiti</span>
        </button>

        <button
          onClick={() => handleSectionClick('history')}
          className={`flex flex-col items-center p-2 rounded-lg transition-colors duration-200 ${
            activeSection === 'history' ? 'text-purple-400' : 'text-gray-400 hover:text-white'
          }`}
        >
          <ClockIcon className="h-6 w-6" />
          <span className="text-xs mt-1 font-medium hidden sm:block">Cronologia</span>
        </button>

        <button
          onClick={() => handleSectionClick('playlists')}
          className={`flex flex-col items-center p-2 rounded-lg transition-colors duration-200 ${
            activeSection === 'playlists' ? 'text-purple-400' : 'text-gray-400 hover:text-white'
          }`}
        >
          <ListBulletIcon className="h-6 w-6" />
          <span className="text-xs mt-1 font-medium hidden sm:block">Playlist</span>
        </button>

        <button
          onClick={scrollToTop}
          className="flex flex-col items-center p-2 rounded-full bg-purple-600 text-white shadow-lg hover:bg-purple-700 transition-colors duration-200"
        >
          <ChevronUpIcon className="h-6 w-6" />
          <span className="sr-only">Torna su</span>
        </button>
      </div>
    </nav>
  );
};

export default Navigation;
