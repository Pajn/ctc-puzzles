export type Thumbnail = { url: string; width: number; height: number };

export type Video = {
  id: string;
  title: string;
  /** ISO 8601 timestamp */
  publishedAt: string;
  /** ISO 8601 duration as returned by the YouTube API, e.g. PT1H2M3S */
  duration: string;
  thumbnails: Partial<Record<'default' | 'medium' | 'high' | 'standard' | 'maxres', Thumbnail>>;
  /** Full video description */
  description: string;
};

export type Channel = {
  channelId: string;
  uploadsPlaylistId: string;
};
