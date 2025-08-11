import { HeartIcon as HeartOutlineIcon } from '@heroicons/react/24/outline';
import { HeartIcon, ListBulletIcon } from '@heroicons/react/24/solid';

const SearchResults = ({ searchResults, playVideo, favorites, handleToggleFavorite, openAddToPlaylistModal }) => {
  if (searchResults.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-gray-800 rounded-xl shadow-xl mt-8">
        <h2 className="text-3xl font-bold text-purple-400 mb-2">Inizia a cercare!</h2>
        <p className="text-gray-400 text-lg">Trova la tua musica o i tuoi audiolibri preferiti.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 bg-gray-900">
      <h2 className="text-2xl font-bold mb-6 text-purple-400">Risultati della Ricerca</h2>
      <ul className="space-y-4">
        {searchResults.map((item) => {
          const isFav = favorites.some((fav) => fav.videoId === item.videoId);
          return (
            <li
              key={item.videoId}
              className="flex items-center gap-4 bg-gray-800 rounded-xl p-4 shadow-lg hover:bg-gray-700 transition-all duration-200"
            >
              <img
                src={item.thumbnail}
                alt={item.title}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg object-cover flex-shrink-0 cursor-pointer"
                onClick={() => playVideo(item)}
              />
              <div className="flex-grow min-w-0 cursor-pointer" onClick={() => playVideo(item)}>
                <p className="font-semibold text-lg text-white truncate">{item.title}</p>
                <p className="text-gray-400 text-sm truncate">{item.channelTitle}</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 items-center flex-shrink-0">
                <button
                  onClick={() => handleToggleFavorite(item)}
                  className="p-2 rounded-full text-white bg-gray-700 hover:bg-purple-600 transition-colors duration-200 shadow-md"
                  title={isFav ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'}
                >
                  {isFav ? (
                    <HeartIcon className="h-6 w-6 text-red-500" />
                  ) : (
                    <HeartOutlineIcon className="h-6 w-6 text-gray-400" />
                  )}
                </button>
                <button
                  onClick={() => openAddToPlaylistModal(item)}
                  className="p-2 rounded-full text-white bg-gray-700 hover:bg-purple-600 transition-colors duration-200 shadow-md"
                  title="Aggiungi a playlist"
                >
                  <ListBulletIcon className="h-6 w-6 text-gray-400" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default SearchResults;
