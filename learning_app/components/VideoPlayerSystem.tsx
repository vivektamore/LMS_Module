"use client";

import { useState } from 'react';
import { PlayCircle } from 'lucide-react';

export type LessonType = 'single' | 'playlist';

export interface PlaylistItem {
  id: string;
  title: string;
  url: string;
}

export interface LessonData {
  id: string;
  title: string;
  type: LessonType;
  video_url?: string;
  playlist_urls?: PlaylistItem[];
}

export default function VideoPlayerSystem({ lesson }: { lesson: LessonData }) {
  const isPlaylist = lesson.type === 'playlist' && Array.isArray(lesson.playlist_urls) && lesson.playlist_urls.length > 0;
  
  // Track which sub-video is playing in the playlist
  const [activeIndex, setActiveIndex] = useState(0);
  
  const currentVideo = isPlaylist 
    ? lesson.playlist_urls![activeIndex] 
    : { title: lesson.title, url: lesson.video_url || '' };
  
  // UX logic: Auto Play next video
  const handleVideoEnded = () => {
    if (isPlaylist && activeIndex < (lesson.playlist_urls!.length - 1)) {
      setActiveIndex(prev => prev + 1);
    }
  };

  return (
    <div className={`flex flex-col ${isPlaylist ? 'lg:flex-row' : ''} gap-6 w-full max-w-6xl mx-auto`}>
       
       {/* Conditional UX: Playlist Sidebar Layout */}
       {isPlaylist && (
         <div className="w-full lg:w-[320px] border border-gray-200 rounded-xl bg-white overflow-hidden shadow-sm shrink-0 flex flex-col max-h-[500px]">
            <div className="p-4 bg-gray-50 border-b border-gray-200">
               <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wider mb-1">Playlist Series</h3>
               <p className="text-gray-600 text-sm line-clamp-1">{lesson.title}</p>
            </div>
            
            <div className="flex-1 overflow-y-auto">
               {lesson.playlist_urls!.map((item, idx) => {
                  const isActive = idx === activeIndex;
                  return (
                    <button
                      key={item.id || idx}
                      onClick={() => setActiveIndex(idx)}
                      className={`w-full flex items-center p-4 text-left transition-colors border-b border-gray-100 last:border-0
                        ${isActive ? 'bg-indigo-50/80 border-l-4 border-l-indigo-600' : 'hover:bg-gray-50 border-l-4 border-l-transparent text-gray-600'}`}
                    >
                       <PlayCircle className={`w-5 h-5 mr-3 shrink-0 ${isActive ? 'text-indigo-600' : 'text-gray-300'}`} />
                       <div className="flex flex-col">
                         <span className={`text-sm font-medium ${isActive ? 'text-indigo-900' : 'text-gray-700'}`}>
                           {idx + 1}. {item.title}
                         </span>
                         {isActive && <span className="text-[10px] uppercase font-bold text-indigo-500 mt-1">Playing</span>}
                       </div>
                    </button>
                  );
               })}
            </div>
         </div>
       )}

       {/* Video Player Main View */}
       <div className="flex-1 rounded-xl overflow-hidden bg-gray-900 aspect-video relative flex flex-col items-center justify-center border border-gray-300 shadow-xl">
          
          {/* Actual Video Feed */}
          {currentVideo.url ? (
            <video 
              key={currentVideo.url} // Changing key natively forces the video DOM node to remount and play the new source
              controls 
              autoPlay={isPlaylist && activeIndex > 0} // Trigger auto-play specifically for chained playlist videos natively
              onEnded={handleVideoEnded}
              className="w-full h-full object-cover"
              src={currentVideo.url}
            />
          ) : (
             // Mock Layout / Placeholder when no raw URL is passed
            <div className="absolute inset-0 flex flex-col justify-end p-8 bg-gradient-to-t from-gray-900 via-gray-900/40 to-transparent">
               <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                 <PlayCircle className="w-20 h-20 text-indigo-500/80 mb-4 hover:scale-110 hover:text-indigo-400 transition-all cursor-pointer shadow-lg rounded-full" />
               </div>
               
               <div className="relative z-20">
                 {isPlaylist && <span className="text-xs uppercase tracking-wider text-indigo-400 font-bold mb-1 block">Part {activeIndex + 1} of {lesson.playlist_urls!.length}</span>}
                 <h3 className="font-bold text-2xl text-white mb-2">{currentVideo.title}</h3>
                 {!isPlaylist && <h3 className="font-medium text-gray-400">{lesson.title}</h3>}
               </div>
            </div>
          )}
       </div>
       
    </div>
  );
}
