import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import {
  compareSnapshots,
  extractUsernameFromUrl,
  parseFlexibleDateString,
  parseInstagramFiles,
  parseRawInstagramEntries,
  toSnapshotSummary,
} from '../instagramParser';

describe('instagramParser', () => {
  it('extracts usernames cleanly from standard and _u/ Instagram URLs', () => {
    expect(extractUsernameFromUrl('https://www.instagram.com/budi.santoso')).toBe('budi.santoso');
    expect(extractUsernameFromUrl('https://www.instagram.com/_u/siti_aminah/')).toBe('siti_aminah');
    expect(extractUsernameFromUrl('https://www.instagram.com/explore/')).toBeNull();
  });

  it('parses Indonesian and English date strings in HTML exports', () => {
    expect(parseFlexibleDateString('12 Agu 2026 19.30 WIB')).toBeDefined();
    expect(parseFlexibleDateString('27 Okt 2025, 08:15')).toBeDefined();
    expect(parseFlexibleDateString('Nov 01, 2025 10:00 am')).toBeDefined();
  });

  it('matches mutuals even when title and _u/ href differ after a username change', () => {
    const followers = JSON.stringify([
      {
        title: '',
        string_list_data: [
          { href: 'https://www.instagram.com/rina_lama', value: 'rina_lama', timestamp: 1650000000 },
        ],
      },
    ]);
    const following = JSON.stringify({
      relationships_following: [
        {
          title: 'rinaputri_baru',
          string_list_data: [
            { href: 'https://www.instagram.com/_u/rina_lama', timestamp: 1650000100 },
          ],
        },
      ],
    });

    const result = parseRawInstagramEntries([
      { path: 'connections/followers_and_following/followers_1.json', content: followers },
      { path: 'connections/followers_and_following/following.json', content: following },
    ]);

    expect(result.notFollowingBack).toHaveLength(0);
    expect(result.mutuals.map((u) => u.username)).toEqual(['rinaputri_baru']);
  });

  it('detects suspectedPartialDateRange when Meta exported only Last Year of followers', () => {
    const nowSec = Math.floor(Date.now() / 1000);
    const day = 86400;

    const followers = JSON.stringify([
      {
        title: '',
        string_list_data: [
          { href: 'https://www.instagram.com/new_friend', value: 'new_friend', timestamp: nowSec - 200 * day },
        ],
      },
    ]);
    const following = JSON.stringify({
      relationships_following: [
        {
          title: 'old_friend_from_2023',
          string_list_data: [
            { href: 'https://www.instagram.com/_u/old_friend_from_2023', timestamp: nowSec - 900 * day },
          ],
        },
      ],
    });

    const result = parseRawInstagramEntries([
      { path: 'connections/followers_and_following/followers_1.json', content: followers },
      { path: 'connections/followers_and_following/following.json', content: following },
    ]);

    expect(result.diagnostics?.suspectedPartialDateRange).toBe(true);
    expect(result.warnings.some((w) => w.includes('Sepanjang waktu'))).toBe(true);
  });

  it('parses split followers_1.json + followers_2.json and 2025/2026 following.json without value field', () => {
    const followersPart1 = JSON.stringify([
      {
        title: '',
        string_list_data: [
          { href: 'https://www.instagram.com/mutual_one', value: 'Mutual_One', timestamp: 1700000100 },
        ],
      },
    ]);
    const followersPart2 = JSON.stringify([
      {
        title: '',
        string_list_data: [
          { href: 'https://www.instagram.com/fan_only', value: 'fan_only', timestamp: 1700000200 },
        ],
      },
    ]);

    const following = JSON.stringify({
      relationships_following: [
        {
          title: 'mutual_one',
          string_list_data: [
            { href: 'https://www.instagram.com/_u/mutual_one', timestamp: 1700000050 },
          ],
        },
        {
          title: 'ghost_unfollower',
          string_list_data: [
            { href: 'https://www.instagram.com/_u/ghost_unfollower', timestamp: 1700000300 },
          ],
        },
      ],
    });

    const result = parseRawInstagramEntries([
      { path: 'connections/followers_and_following/followers_1.json', content: followersPart1 },
      { path: 'connections/followers_and_following/followers_2.json', content: followersPart2 },
      { path: 'connections/followers_and_following/following.json', content: following },
    ]);

    expect(result.followers.map((u) => u.username)).toEqual(['mutual_one', 'fan_only']);
    expect(result.following.map((u) => u.username)).toEqual(['mutual_one', 'ghost_unfollower']);
    expect(result.notFollowingBack.map((u) => u.username)).toEqual(['ghost_unfollower']);
    expect(result.notFollowingBack[0].href).toBe('https://www.instagram.com/ghost_unfollower/');
    expect(result.fans.map((u) => u.username)).toEqual(['fan_only']);
    expect(result.mutuals.map((u) => u.username)).toEqual(['mutual_one']);
  });

  it('parses HTML export format when user downloaded HTML instead of JSON', () => {
    const followersHtml = `
      <html><body>
        <div><a target="_blank" href="https://www.instagram.com/andi_id">andi_id</a><div>12 Agu 2025 10.00 WIB</div></div>
      </body></html>
    `;
    const followingHtml = `
      <html><body>
        <div><h2>andi_id</h2><a target="_blank" href="https://www.instagram.com/_u/andi_id">https://www.instagram.com/_u/andi_id</a></div>
        <div><h2>seleb_indo</h2><a target="_blank" href="https://www.instagram.com/_u/seleb_indo">https://www.instagram.com/_u/seleb_indo</a></div>
      </body></html>
    `;

    const result = parseRawInstagramEntries([
      { path: 'connections/followers_and_following/followers_1.html', content: followersHtml },
      { path: 'connections/followers_and_following/following.html', content: followingHtml },
    ]);

    expect(result.sourceFormat).toBe('html');
    expect(result.notFollowingBack.map((u) => u.username)).toEqual(['seleb_indo']);
    expect(result.mutuals.map((u) => u.username)).toEqual(['andi_id']);
  });

  it('parses a real .zip archive via JSZip and computes snapshot diffs', async () => {
    const zip1 = new JSZip();
    zip1.file(
      'connections/followers_and_following/followers_1.json',
      JSON.stringify([
        { string_list_data: [{ value: 'alpha', href: 'https://www.instagram.com/alpha', timestamp: 1700000000 }] },
        { string_list_data: [{ value: 'bravo', href: 'https://www.instagram.com/bravo', timestamp: 1700000100 }] },
      ])
    );
    zip1.file(
      'connections/followers_and_following/following.json',
      JSON.stringify({
        relationships_following: [
          { title: 'alpha', string_list_data: [{ href: 'https://www.instagram.com/_u/alpha', timestamp: 1700000000 }] },
        ],
      })
    );

    const uint8Old = await zip1.generateAsync({ type: 'uint8array' });
    const fileOld = new File([uint8Old], 'instagram-lama.zip', { type: 'application/zip' });
    const parsedOld = await parseInstagramFiles([fileOld]);

    const zip2 = new JSZip();
    zip2.file(
      'connections/followers_and_following/followers_1.json',
      JSON.stringify([
        { string_list_data: [{ value: 'alpha', href: 'https://www.instagram.com/alpha', timestamp: 1700000000 }] },
        { string_list_data: [{ value: 'charlie', href: 'https://www.instagram.com/charlie', timestamp: 1710000000 }] },
      ])
    );
    zip2.file(
      'connections/followers_and_following/following.json',
      JSON.stringify({
        relationships_following: [
          { title: 'alpha', string_list_data: [{ href: 'https://www.instagram.com/_u/alpha', timestamp: 1700000000 }] },
        ],
      })
    );

    const uint8New = await zip2.generateAsync({ type: 'uint8array' });
    const fileNew = new File([uint8New], 'instagram-baru.zip', { type: 'application/zip' });
    const parsedNew = await parseInstagramFiles([fileNew]);

    const diff = compareSnapshots(toSnapshotSummary(parsedOld), toSnapshotSummary(parsedNew));
    expect(diff.lostFollowers.map((u) => u.username)).toEqual(['bravo']);
    expect(diff.newFollowers.map((u) => u.username)).toEqual(['charlie']);
  });
});
