import JSZip from 'jszip';
import {
  ArchiveDiagnostics,
  InstagramAccount,
  ParsedInstagramData,
  SnapshotDiff,
  SnapshotSummary,
} from '../types/instagram';

type BucketName =
  | 'followers'
  | 'following'
  | 'pendingSent'
  | 'pendingReceived'
  | 'recentlyUnfollowed'
  | 'closeFriends'
  | 'blocked'
  | 'restricted'
  | 'hideStoryFrom';

interface RawFileEntry {
  path: string;
  content: string;
}

const RESERVED_IG_PATHS = new Set([
  '_u',
  'p',
  'reel',
  'reels',
  'stories',
  'explore',
  'accounts',
  'direct',
  'tv',
  'about',
  'legal',
  'developer',
]);

const VALID_USERNAME_RE = /^[a-zA-Z0-9._]{1,30}$/;

export function isValidInstagramUsername(value: string): boolean {
  const trimmed = value.trim();
  if (!VALID_USERNAME_RE.test(trimmed)) return false;
  if (RESERVED_IG_PATHS.has(trimmed.toLowerCase())) return false;
  // Must not be purely numeric or just dots
  if (/^\.+$/.test(trimmed)) return false;
  return true;
}

export function extractUsernameFromUrl(url: string): string | null {
  if (!url) return null;
  const match = url
    .trim()
    .match(
      /(?:https?:\/\/)?(?:www\.)?instagram\.com\/(?:_u\/)?([a-zA-Z0-9._]{1,30})\/?(?:[?#].*)?$/i
    );
  if (!match) return null;
  const candidate = match[1];
  return isValidInstagramUsername(candidate) ? candidate : null;
}

export function normalizeProfileUrl(username: string): string {
  return `https://www.instagram.com/${username.toLowerCase()}/`;
}

export function parseFlexibleDateString(raw: string): number | undefined {
  if (!raw) return undefined;
  let cleaned = raw.trim();
  if (!cleaned || cleaned.length > 80 || !/\d{4}/.test(cleaned)) return undefined;

  // Normalize Indonesian month names to English for Date.parse
  const monthMap: Array<[RegExp, string]> = [
    [/\bJanuari\b/gi, 'Jan'],
    [/\b(Februari|Pebruari|Peb)\b/gi, 'Feb'],
    [/\bMaret\b/gi, 'Mar'],
    [/\bApril\b/gi, 'Apr'],
    [/\bMei\b/gi, 'May'],
    [/\bJuni\b/gi, 'Jun'],
    [/\bJuli\b/gi, 'Jul'],
    [/\b(Agustus|Agu|Agt)\b/gi, 'Aug'],
    [/\bSeptember\b/gi, 'Sep'],
    [/\b(Oktober|Okt)\b/gi, 'Oct'],
    [/\b(Nopember|November)\b/gi, 'Nov'],
    [/\b(Desember|Des)\b/gi, 'Dec'],
  ];

  for (const [re, replacement] of monthMap) {
    cleaned = cleaned.replace(re, replacement);
  }

  // Convert Indonesian dot time e.g. "19.30" or "19.30.15" to "19:30"
  cleaned = cleaned.replace(/(\b\d{1,2})\.(\d{2})(?:\.(\d{2}))?(?=\s*(?:AM|PM|WIB|WITA|WIT|$))/i, (_, h, m, s) =>
    s ? `${h}:${m}:${s}` : `${h}:${m}`
  );
  cleaned = cleaned.replace(/\b(WIB|WITA|WIT)\b/gi, '').trim();

  const ms = Date.parse(cleaned);
  if (Number.isNaN(ms)) return undefined;
  return Math.floor(ms / 1000);
}

function classifyByFilename(filePath: string): BucketName | null {
  const normalized = filePath.replace(/\\/g, '/');
  const base = normalized.split('/').pop() || '';

  if (base.startsWith('._') || normalized.includes('__MACOSX/')) {
    return null;
  }

  if (/^(followers|pengikut)(_\d+)?(\s*\(\d+\))?\.(json|html?)$/i.test(base)) {
    return 'followers';
  }
  if (/^(following|mengikuti)(_\d+)?(\s*\(\d+\))?\.(json|html?)$/i.test(base)) {
    return 'following';
  }
  if (/^pending_follow_requests(_\d+)?(\s*\(\d+\))?\.(json|html?)$/i.test(base)) {
    return 'pendingSent';
  }
  if (
    /^(follow_requests_you've_received|follow_requests_youve_received|recent_follow_requests)(_\d+)?(\s*\(\d+\))?\.(json|html?)$/i.test(
      base
    )
  ) {
    return 'pendingReceived';
  }
  if (/^recently_unfollowed_(profiles|accounts)(_\d+)?(\s*\(\d+\))?\.(json|html?)$/i.test(base)) {
    return 'recentlyUnfollowed';
  }
  if (/^close_friends(_\d+)?(\s*\(\d+\))?\.(json|html?)$/i.test(base)) {
    return 'closeFriends';
  }
  if (/^blocked_(profiles|accounts)(_\d+)?(\s*\(\d+\))?\.(json|html?)$/i.test(base)) {
    return 'blocked';
  }
  if (/^restricted_(profiles|accounts)(_\d+)?(\s*\(\d+\))?\.(json|html?)$/i.test(base)) {
    return 'restricted';
  }
  if (/^hide_story_from(_\d+)?(\s*\(\d+\))?\.(json|html?)$/i.test(base)) {
    return 'hideStoryFrom';
  }

  return null;
}

function classifyByJsonRootKey(parsed: unknown): BucketName | null {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return null;
  }
  const obj = parsed as Record<string, unknown>;
  if ('relationships_following' in obj) return 'following';
  if ('relationships_followers' in obj) return 'followers';
  if ('relationships_follow_requests_sent' in obj) return 'pendingSent';
  if (
    'relationships_follow_requests_received' in obj ||
    'relationships_permanent_follow_requests' in obj
  ) {
    return 'pendingReceived';
  }
  if ('relationships_unfollowed_users' in obj) return 'recentlyUnfollowed';
  if ('relationships_close_friends' in obj) return 'closeFriends';
  if ('relationships_blocked_users' in obj) return 'blocked';
  if ('relationships_restricted_users' in obj) return 'restricted';
  if ('relationships_hide_stories_from' in obj) return 'hideStoryFrom';
  return null;
}

function extractAccountsFromJsonNode(node: unknown, out: InstagramAccount[]): void {
  if (!node) return;

  if (Array.isArray(node)) {
    for (const item of node) {
      extractAccountsFromJsonNode(item, out);
    }
    return;
  }

  if (typeof node !== 'object') return;
  const record = node as Record<string, unknown>;

  const rawTitle = typeof record.title === 'string' ? record.title.trim() : '';
  const validTitle = isValidInstagramUsername(rawTitle) ? rawTitle.toLowerCase() : null;
  const stringList = Array.isArray(record.string_list_data) ? record.string_list_data : null;

  if (stringList && stringList.length > 0) {
    const canAttachTitle = stringList.length === 1 && validTitle !== null;

    for (const rawEntry of stringList) {
      if (!rawEntry || typeof rawEntry !== 'object') continue;
      const entry = rawEntry as Record<string, unknown>;
      const rawValue = typeof entry.value === 'string' ? entry.value.trim() : '';
      const rawHref = typeof entry.href === 'string' ? entry.href.trim() : '';
      const rawTimestamp =
        typeof entry.timestamp === 'number' && Number.isFinite(entry.timestamp)
          ? entry.timestamp
          : undefined;

      const validValue = isValidInstagramUsername(rawValue) ? rawValue.toLowerCase() : null;
      const fromUrl = rawHref ? extractUsernameFromUrl(rawHref)?.toLowerCase() ?? null : null;

      // Prefer active title or value over potentially legacy _u/ href slug
      const primary = validValue || (canAttachTitle ? validTitle : null) || fromUrl;
      if (!primary) continue;

      const aliasSet = new Set<string>([primary]);
      if (validValue) aliasSet.add(validValue);
      if (canAttachTitle && validTitle) aliasSet.add(validTitle);
      if (fromUrl) aliasSet.add(fromUrl);

      out.push({
        username: primary,
        href: normalizeProfileUrl(primary),
        timestamp: rawTimestamp,
        aliases: Array.from(aliasSet),
      });
    }
    return;
  }

  if (validTitle && 'string_list_data' in record) {
    out.push({
      username: validTitle,
      href: normalizeProfileUrl(validTitle),
      aliases: [validTitle],
    });
    return;
  }

  for (const val of Object.values(record)) {
    if (val && typeof val === 'object') {
      extractAccountsFromJsonNode(val, out);
    }
  }
}

export function parseAccountsFromHtml(htmlContent: string): InstagramAccount[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');
  const anchors = Array.from(doc.querySelectorAll('a[href*="instagram.com"]'));
  const results: InstagramAccount[] = [];

  for (const anchor of anchors) {
    const href = anchor.getAttribute('href') || '';
    const text = (anchor.textContent || '').trim();

    const fromUrl = extractUsernameFromUrl(href)?.toLowerCase() ?? null;
    const fromText = isValidInstagramUsername(text) ? text.toLowerCase() : null;

    // Also check nearby <h2> in case Meta HTML put current handle in <h2> and old handle in _u/ href
    let fromHeading: string | null = null;
    const cardContainer = anchor.parentElement?.parentElement || anchor.parentElement;
    const h2 =
      anchor.previousElementSibling?.tagName === 'H2'
        ? anchor.previousElementSibling
        : cardContainer?.querySelector('h2');
    if (h2) {
      const h2Text = (h2.textContent || '').trim();
      if (isValidInstagramUsername(h2Text)) {
        fromHeading = h2Text.toLowerCase();
      }
    }

    const primary = fromHeading || fromText || fromUrl;
    if (!primary) continue;

    const aliasSet = new Set<string>([primary]);
    if (fromHeading) aliasSet.add(fromHeading);
    if (fromText) aliasSet.add(fromText);
    if (fromUrl) aliasSet.add(fromUrl);

    // Attempt to parse timestamp from sibling or parent container text
    let timestamp: number | undefined;
    const parent = anchor.parentElement;
    if (parent) {
      const candidates = [
        anchor.nextElementSibling,
        parent.nextElementSibling,
        parent.querySelector('sub'),
        parent.parentElement?.querySelector('div:last-child'),
      ];
      for (const node of candidates) {
        if (node && node !== anchor) {
          const ts = parseFlexibleDateString(node.textContent || '');
          if (ts) {
            timestamp = ts;
            break;
          }
        }
      }
    }

    results.push({
      username: primary,
      href: normalizeProfileUrl(primary),
      timestamp,
      aliases: Array.from(aliasSet),
    });
  }

  return results;
}

function deduplicateAccounts(accounts: InstagramAccount[]): InstagramAccount[] {
  const map = new Map<string, InstagramAccount>();
  for (const acc of accounts) {
    const key = acc.username.toLowerCase();
    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        ...acc,
        username: key,
        aliases: acc.aliases ? Array.from(new Set(acc.aliases)) : [key],
      });
    } else {
      const mergedAliases = Array.from(
        new Set([...(existing.aliases || [key]), ...(acc.aliases || [key])])
      );
      const newerTs =
        existing.timestamp && acc.timestamp
          ? Math.max(existing.timestamp, acc.timestamp)
          : existing.timestamp ?? acc.timestamp;
      map.set(key, {
        ...existing,
        timestamp: newerTs,
        aliases: mergedAliases,
      });
    }
  }
  return Array.from(map.values());
}

function buildHandleLookupSet(accounts: InstagramAccount[]): Set<string> {
  const set = new Set<string>();
  for (const acc of accounts) {
    set.add(acc.username.toLowerCase());
    if (acc.aliases) {
      for (const alias of acc.aliases) {
        set.add(alias.toLowerCase());
      }
    }
  }
  return set;
}

function matchesHandleSet(acc: InstagramAccount, lookup: Set<string>): boolean {
  if (lookup.has(acc.username.toLowerCase())) return true;
  if (acc.aliases) {
    for (const alias of acc.aliases) {
      if (lookup.has(alias.toLowerCase())) return true;
    }
  }
  return false;
}

export async function extractRawFilesFromInputs(files: File[]): Promise<RawFileEntry[]> {
  const rawEntries: RawFileEntry[] = [];

  for (const file of files) {
    const lowerName = file.name.toLowerCase();
    const relPath =
      (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;

    if (lowerName.endsWith('.zip')) {
      const zip = await JSZip.loadAsync(file);
      const candidateEntries: Array<{ path: string; entry: JSZip.JSZipObject }> = [];

      zip.forEach((relativePath, zipEntry) => {
        if (zipEntry.dir) return;
        const lowerEntry = relativePath.toLowerCase();
        if (
          lowerEntry.endsWith('.json') ||
          lowerEntry.endsWith('.html') ||
          lowerEntry.endsWith('.htm')
        ) {
          candidateEntries.push({ path: relativePath, entry: zipEntry });
        }
      });

      const zipPromises: Promise<void>[] = [];
      for (const { path: relativePath, entry: zipEntry } of candidateEntries) {
        const lowerEntry = relativePath.toLowerCase();
        const bucketByName = classifyByFilename(relativePath);
        const isInConnectionsDir =
          lowerEntry.includes('followers_and_following') ||
          lowerEntry.includes('connections/') ||
          lowerEntry.includes('koneksi/') ||
          lowerEntry.includes('pengikut');

        // Read all candidate files if archive is small, or connection-related files if full IG archive
        if (
          bucketByName ||
          isInConnectionsDir ||
          !relativePath.includes('/') ||
          candidateEntries.length <= 80
        ) {
          zipPromises.push(
            zipEntry.async('string').then((content) => {
              rawEntries.push({ path: relativePath, content });
            })
          );
        }
      }

      await Promise.all(zipPromises);
    } else if (
      lowerName.endsWith('.json') ||
      lowerName.endsWith('.html') ||
      lowerName.endsWith('.htm')
    ) {
      const content = await file.text();
      rawEntries.push({ path: relPath, content });
    }
  }

  return rawEntries;
}

export function parseRawInstagramEntries(
  entries: RawFileEntry[],
  label = 'Export Data Instagram'
): ParsedInstagramData {
  const buckets: Record<BucketName, InstagramAccount[]> = {
    followers: [],
    following: [],
    pendingSent: [],
    pendingReceived: [],
    recentlyUnfollowed: [],
    closeFriends: [],
    blocked: [],
    restricted: [],
    hideStoryFrom: [],
  };

  const matchedFiles: string[] = [];
  const followerFiles: string[] = [];
  const followingFiles: string[] = [];
  let sawJson = false;
  let sawHtml = false;

  for (const entry of entries) {
    const lowerPath = entry.path.toLowerCase();
    const isJson = lowerPath.endsWith('.json');
    const isHtml = lowerPath.endsWith('.html') || lowerPath.endsWith('.htm');

    if (isJson) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(entry.content);
      } catch {
        continue;
      }

      const bucket = classifyByFilename(entry.path) ?? classifyByJsonRootKey(parsed);
      if (!bucket) continue;

      const extracted: InstagramAccount[] = [];
      extractAccountsFromJsonNode(parsed, extracted);
      if (extracted.length > 0 || classifyByFilename(entry.path)) {
        buckets[bucket].push(...extracted);
        matchedFiles.push(entry.path);
        if (bucket === 'followers') followerFiles.push(entry.path.split('/').pop() || entry.path);
        if (bucket === 'following') followingFiles.push(entry.path.split('/').pop() || entry.path);
        sawJson = true;
      }
    } else if (isHtml) {
      const bucket = classifyByFilename(entry.path);
      if (!bucket) continue;

      const extracted = parseAccountsFromHtml(entry.content);
      buckets[bucket].push(...extracted);
      matchedFiles.push(entry.path);
      if (bucket === 'followers') followerFiles.push(entry.path.split('/').pop() || entry.path);
      if (bucket === 'following') followingFiles.push(entry.path.split('/').pop() || entry.path);
      sawHtml = true;
    }
  }

  if (matchedFiles.length === 0) {
    throw new Error(
      'Tidak ditemukan file followers atau following Instagram di dalam file yang diunggah. Pastikan kamu memilih kategori "Pengikut dan mengikuti (Followers and following)" saat request data dari Instagram.'
    );
  }

  const followers = deduplicateAccounts(buckets.followers);
  const following = deduplicateAccounts(buckets.following);
  const pendingSent = deduplicateAccounts(buckets.pendingSent);
  const pendingReceived = deduplicateAccounts(buckets.pendingReceived);
  const recentlyUnfollowed = deduplicateAccounts(buckets.recentlyUnfollowed);
  const closeFriends = deduplicateAccounts(buckets.closeFriends);
  const blocked = deduplicateAccounts(buckets.blocked);
  const restricted = deduplicateAccounts(buckets.restricted);
  const hideStoryFrom = deduplicateAccounts(buckets.hideStoryFrom);

  const followerLookup = buildHandleLookupSet(followers);
  const followingLookup = buildHandleLookupSet(following);

  const notFollowingBack = following.filter((u) => !matchesHandleSet(u, followerLookup));
  const fans = followers.filter((u) => !matchesHandleSet(u, followingLookup));
  const mutuals = following.filter((u) => matchesHandleSet(u, followerLookup));

  const warnings: string[] = [];

  if (followers.length === 0 && following.length > 0) {
    warnings.push(
      'File daftar Followers (followers_1) TIDAK DITEMUKAN atau kosong! Saat ini semua akun Following akan dianggap tidak follback. Pastikan kamu langsung upload file .ZIP utuh dari Instagram.'
    );
  } else if (following.length === 0 && followers.length > 0) {
    warnings.push(
      'File daftar Following (following) TIDAK DITEMUKAN atau kosong! Pastikan kamu upload file .ZIP utuh dari Instagram.'
    );
  }

  // Compute independent timestamp bounds for Followers vs Following
  const followerTimestamps = followers
    .map((x) => x.timestamp)
    .filter((ts): ts is number => typeof ts === 'number' && ts > 0);
  const followingTimestamps = following
    .map((x) => x.timestamp)
    .filter((ts): ts is number => typeof ts === 'number' && ts > 0);

  const oldestFollowerTs =
    followerTimestamps.length > 0 ? Math.min(...followerTimestamps) : undefined;
  const newestFollowerTs =
    followerTimestamps.length > 0 ? Math.max(...followerTimestamps) : undefined;
  const oldestFollowingTs =
    followingTimestamps.length > 0 ? Math.min(...followingTimestamps) : undefined;

  let suspectedPartialDateRange = false;
  const nowSec = Math.floor(Date.now() / 1000);
  const referenceNow = Math.max(
    nowSec,
    newestFollowerTs ?? 0,
    followingTimestamps.length > 0 ? Math.max(...followingTimestamps) : 0
  );

  if (oldestFollowerTs && followers.length > 0 && following.length > 0) {
    const followerAgeDays = (referenceNow - oldestFollowerTs) / 86400;
    const followingOlderByDays = oldestFollowingTs
      ? (oldestFollowerTs - oldestFollowingTs) / 86400
      : 0;

    if (followingOlderByDays > 45 && followerAgeDays <= 385) {
      suspectedPartialDateRange = true;
      const oldestDateStr = new Date(oldestFollowerTs * 1000).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
      warnings.push(
        `TERDETEKSI RENTANG TANGGAL TERPOTONG! Data Followers paling tua di file ini mentok di ${oldestDateStr} (~${Math.round(
          followerAgeDays / 30
        )} bulan lalu), padahal data Following kamu jauh lebih tua. Ini bikin teman lama yang MASIH FOLLBACK jadi keliru masuk daftar "Tidak Follback"! Solusi: Request ulang di IG dan WAJIB ubah Rentang Tanggal dari "Tahun lalu" menjadi "Sepanjang waktu (All time)".`
      );
    } else if (followerAgeDays <= 375) {
      suspectedPartialDateRange = true;
      const oldestDateStr = new Date(oldestFollowerTs * 1000).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
      warnings.push(
        `CEK RENTANG TANGGAL EXPORT: Follower paling lama di file ini tercatat tanggal ${oldestDateStr}. Kalau umur akun IG lo lebih tua dari tanggal itu (atau banyak yang harusnya masih follback tapi muncul di sini), berarti pas request data di IG kepilih default "Tahun lalu" — bukan "Sepanjang waktu (All time)"! Bandingkan angka Followers (${followers.length}) dengan angka asli di profil IG lo.`
      );
    }
  }

  if (
    followerFiles.length === 1 &&
    !entries.some((e) => e.path.includes('/')) &&
    (followers.length === 1000 || followers.length === 500 || followers.length === 3000)
  ) {
    warnings.push(
      `Kamu cuma upload 1 file (${followerFiles[0]}) dengan jumlah pas ${followers.length} akun. Kalau followers IG kamu lebih dari itu, jangan lupa masukkan juga followers_2, followers_3, dst. (atau langsung upload file .ZIP utuhnya).`
    );
  }

  const diagnostics: ArchiveDiagnostics = {
    followerFiles,
    followingFiles,
    oldestFollowerTs,
    newestFollowerTs,
    oldestFollowingTs,
    suspectedPartialDateRange,
  };

  const sourceFormat: 'json' | 'html' | 'mixed' =
    sawJson && sawHtml ? 'mixed' : sawHtml ? 'html' : 'json';

  return {
    id: crypto.randomUUID ? crypto.randomUUID() : `snap-${Date.now()}`,
    label,
    importedAt: Date.now(),
    sourceFormat,
    matchedFiles,
    diagnostics,
    followers,
    following,
    notFollowingBack,
    fans,
    mutuals,
    pendingSent,
    pendingReceived,
    recentlyUnfollowed,
    closeFriends,
    blocked,
    restricted,
    hideStoryFrom,
    warnings,
  };
}

export async function parseInstagramFiles(
  files: File[],
  customLabel?: string
): Promise<ParsedInstagramData> {
  const defaultLabel =
    customLabel ||
    (files.length === 1
      ? files[0].name.replace(/\.(zip|json|html?)$/i, '')
      : `Upload ${files.length} file`);
  const entries = await extractRawFilesFromInputs(files);
  return parseRawInstagramEntries(entries, defaultLabel);
}

export function toSnapshotSummary(data: ParsedInstagramData): SnapshotSummary {
  return {
    id: data.id,
    label: data.label,
    importedAt: data.importedAt,
    followersCount: data.followers.length,
    followingCount: data.following.length,
    notFollowingBackCount: data.notFollowingBack.length,
    followers: data.followers,
    following: data.following,
  };
}

export function compareSnapshots(
  older: SnapshotSummary,
  newer: SnapshotSummary
): SnapshotDiff {
  const oldFollowerLookup = buildHandleLookupSet(older.followers);
  const newFollowerLookup = buildHandleLookupSet(newer.followers);

  const oldFollowingLookup = buildHandleLookupSet(older.following);
  const newFollowingLookup = buildHandleLookupSet(newer.following);

  const lostFollowers = older.followers.filter((u) => !matchesHandleSet(u, newFollowerLookup));
  const newFollowers = newer.followers.filter((u) => !matchesHandleSet(u, oldFollowerLookup));
  const newlyFollowed = newer.following.filter((u) => !matchesHandleSet(u, oldFollowingLookup));
  const newlyUnfollowed = older.following.filter((u) => !matchesHandleSet(u, newFollowingLookup));

  return {
    older,
    newer,
    lostFollowers,
    newFollowers,
    newlyFollowed,
    newlyUnfollowed,
  };
}
