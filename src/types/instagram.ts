export interface InstagramAccount {
  username: string;
  href: string;
  timestamp?: number; // Unix timestamp in seconds
  aliases?: string[]; // Additional handle variants found across title/value/href
}

export type CategoryKey =
  | 'notFollowingBack'
  | 'fans'
  | 'mutuals'
  | 'followers'
  | 'following'
  | 'pendingSent'
  | 'pendingReceived'
  | 'recentlyUnfollowed'
  | 'closeFriends'
  | 'blocked'
  | 'restricted'
  | 'hideStoryFrom'
  | 'whitelisted';

export interface ArchiveDiagnostics {
  followerFiles: string[];
  followingFiles: string[];
  oldestFollowerTs?: number;
  newestFollowerTs?: number;
  oldestFollowingTs?: number;
  suspectedPartialDateRange: boolean;
}

export interface ParsedInstagramData {
  id: string;
  label: string;
  importedAt: number; // ms epoch
  sourceFormat: 'json' | 'html' | 'mixed';
  matchedFiles: string[];
  diagnostics?: ArchiveDiagnostics;
  followers: InstagramAccount[];
  following: InstagramAccount[];
  notFollowingBack: InstagramAccount[];
  fans: InstagramAccount[];
  mutuals: InstagramAccount[];
  pendingSent: InstagramAccount[];
  pendingReceived: InstagramAccount[];
  recentlyUnfollowed: InstagramAccount[];
  closeFriends: InstagramAccount[];
  blocked: InstagramAccount[];
  restricted: InstagramAccount[];
  hideStoryFrom: InstagramAccount[];
  warnings: string[];
}

export interface SnapshotSummary {
  id: string;
  label: string;
  importedAt: number;
  followersCount: number;
  followingCount: number;
  notFollowingBackCount: number;
  followers: InstagramAccount[];
  following: InstagramAccount[];
}

export interface SnapshotDiff {
  older: SnapshotSummary;
  newer: SnapshotSummary;
  lostFollowers: InstagramAccount[];
  newFollowers: InstagramAccount[];
  newlyFollowed: InstagramAccount[];
  newlyUnfollowed: InstagramAccount[];
}
