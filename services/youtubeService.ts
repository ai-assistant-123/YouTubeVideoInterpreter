
import { VideoInfo } from '../types';

export function extractVideoId(url: string): string | null {
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[7].length === 11) ? match[7] : null;
}

export async function fetchVideoMetadata(url: string): Promise<Partial<VideoInfo>> {
  const videoId = extractVideoId(url);
  if (!videoId) throw new Error('Invalid YouTube URL');

  try {
    // Attempt to fetch metadata from noembed
    // Added mode: 'cors' and credentials: 'omit' to reduce CORS friction
    const response = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(url)}`, {
      method: 'GET',
      mode: 'cors',
      credentials: 'omit',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.error) throw new Error(data.error);

    return {
      id: videoId,
      url: url,
      title: data.title || `Video ${videoId}`,
      thumbnail: data.thumbnail_url || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      duration: 0 
    };
  } catch (error) {
    // Downgrade to warning as this is not fatal
    console.warn("Metadata fetch warning (using fallback):", error);
    return {
      id: videoId,
      url,
      title: `YouTube Video (${videoId})`,
      thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    };
  }
}
