
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
    const response = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(url)}`);
    const data = await response.json();

    if (data.error) throw new Error(data.error);

    return {
      id: videoId,
      url: url,
      title: data.title || `Video ${videoId}`,
      thumbnail: data.thumbnail_url || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      duration: 0 // Will be determined if possible, or mocked
    };
  } catch (error) {
    console.error("Metadata fetch error:", error);
    return {
      id: videoId,
      url,
      title: `YouTube Video (${videoId})`,
      thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    };
  }
}
