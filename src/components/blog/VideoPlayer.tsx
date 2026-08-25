import React from "react";

interface VideoPlayerProps {
  url: string;
  title?: string;
}

function getYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return match ? match[1] : null;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ url, title }) => {
  const youtubeId = getYouTubeId(url);

  if (youtubeId) {
    return (
      <div className="relative w-full aspect-video rounded-xl overflow-hidden mb-8 border border-border shadow-lg">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${youtubeId}`}
          title={title || "Video"}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 w-full h-full"
          loading="lazy"
        />
      </div>
    );
  }

  // MP4 / direct video URL
  return (
    <div className="relative w-full aspect-video rounded-xl overflow-hidden mb-8 border border-border shadow-lg">
      <video
        src={url}
        controls
        preload="metadata"
        className="w-full h-full object-contain bg-black"
        title={title || "Video"}
      >
        Your browser does not support the video tag.
      </video>
    </div>
  );
};

export default VideoPlayer;
