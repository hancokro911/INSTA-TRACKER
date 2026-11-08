import { parseRawInstagramEntries } from './instagramParser';
import { ParsedInstagramData } from '../types/instagram';

export function generateDemoInstagramData(): ParsedInstagramData {
  const nowSec = Math.floor(Date.now() / 1000);
  const day = 86400;

  const followersJson = [
    {
      title: '',
      media_list_data: [],
      string_list_data: [
        { href: 'https://www.instagram.com/rizky.pratama', value: 'rizky.pratama', timestamp: nowSec - 620 * day },
      ],
    },
    {
      title: '',
      media_list_data: [],
      string_list_data: [
        { href: 'https://www.instagram.com/nadia.putri_', value: 'nadia.putri_', timestamp: nowSec - 540 * day },
      ],
    },
    {
      title: '',
      media_list_data: [],
      string_list_data: [
        { href: 'https://www.instagram.com/dimas.kurnia', value: 'dimas.kurnia', timestamp: nowSec - 410 * day },
      ],
    },
    {
      title: '',
      media_list_data: [],
      string_list_data: [
        { href: 'https://www.instagram.com/alya.safira', value: 'alya.safira', timestamp: nowSec - 280 * day },
      ],
    },
    {
      title: '',
      media_list_data: [],
      string_list_data: [
        { href: 'https://www.instagram.com/bгаs_studio'.replace('г', 'g'), value: 'bagas_studio', timestamp: nowSec - 120 * day },
      ],
    },
    {
      title: '',
      media_list_data: [],
      string_list_data: [
        { href: 'https://www.instagram.com/citra.rahma', value: 'citra.rahma', timestamp: nowSec - 45 * day },
      ],
    },
    {
      title: '',
      media_list_data: [],
      string_list_data: [
        { href: 'https://www.instagram.com/fajar.dev', value: 'fajar.dev', timestamp: nowSec - 18 * day },
      ],
    },
    {
      title: '',
      media_list_data: [],
      string_list_data: [
        { href: 'https://www.instagram.com/kopisore.jkt', value: 'kopisore.jkt', timestamp: nowSec - 5 * day },
      ],
    },
  ];

  // Simulates Meta's newer 2025/2026 following.json schema (title + _u/ href, no value)
  const followingJson = {
    relationships_following: [
      // Mutuals
      {
        title: 'rizky.pratama',
        string_list_data: [{ href: 'https://www.instagram.com/_u/rizky.pratama', timestamp: nowSec - 621 * day }],
      },
      {
        title: 'nadia.putri_',
        string_list_data: [{ href: 'https://www.instagram.com/_u/nadia.putri_', timestamp: nowSec - 539 * day }],
      },
      {
        title: 'dimas.kurnia',
        string_list_data: [{ href: 'https://www.instagram.com/_u/dimas.kurnia', timestamp: nowSec - 409 * day }],
      },
      {
        title: 'alya.safira',
        string_list_data: [{ href: 'https://www.instagram.com/_u/alya.safira', timestamp: nowSec - 279 * day }],
      },
      {
        title: 'fajar.dev',
        string_list_data: [{ href: 'https://www.instagram.com/_u/fajar.dev', timestamp: nowSec - 17 * day }],
      },
      // Not following back!
      {
        title: 'kevin.wijaya99',
        string_list_data: [{ href: 'https://www.instagram.com/_u/kevin.wijaya99', timestamp: nowSec - 590 * day }],
      },
      {
        title: 'salsa.bella_',
        string_list_data: [{ href: 'https://www.instagram.com/_u/salsa.bella_', timestamp: nowSec - 350 * day }],
      },
      {
        title: 'reza.octavian',
        string_list_data: [{ href: 'https://www.instagram.com/_u/reza.octavian', timestamp: nowSec - 210 * day }],
      },
      {
        title: 'thrifting.bdg.id',
        string_list_data: [{ href: 'https://www.instagram.com/_u/thrifting.bdg.id', timestamp: nowSec - 95 * day }],
      },
      {
        title: 'fabrizioromano',
        string_list_data: [{ href: 'https://www.instagram.com/_u/fabrizioromano', timestamp: nowSec - 480 * day }],
      },
      {
        title: 'intan.permata',
        string_list_data: [{ href: 'https://www.instagram.com/_u/intan.permata', timestamp: nowSec - 12 * day }],
      },
    ],
  };

  const pendingJson = {
    relationships_follow_requests_sent: [
      {
        title: '',
        string_list_data: [
          { href: 'https://www.instagram.com/akun.privat.lama', value: 'akun.privat.lama', timestamp: nowSec - 430 * day },
        ],
      },
      {
        title: '',
        string_list_data: [
          { href: 'https://www.instagram.com/dinda.secondacc', value: 'dinda.secondacc', timestamp: nowSec - 64 * day },
        ],
      },
    ],
  };

  const closeFriendsJson = {
    relationships_close_friends: [
      {
        title: '',
        string_list_data: [
          { href: 'https://www.instagram.com/rizky.pratama', value: 'rizky.pratama', timestamp: nowSec - 500 * day },
          { href: 'https://www.instagram.com/nadia.putri_', value: 'nadia.putri_', timestamp: nowSec - 480 * day },
        ],
      },
    ],
  };

  const recentlyUnfollowedJson = {
    relationships_unfollowed_users: [
      {
        title: '',
        string_list_data: [
          { href: 'https://www.instagram.com/olshop.random.id', value: 'olshop.random.id', timestamp: nowSec - 9 * day },
        ],
      },
    ],
  };

  return parseRawInstagramEntries(
    [
      { path: 'connections/followers_and_following/followers_1.json', content: JSON.stringify(followersJson) },
      { path: 'connections/followers_and_following/following.json', content: JSON.stringify(followingJson) },
      { path: 'connections/followers_and_following/pending_follow_requests.json', content: JSON.stringify(pendingJson) },
      { path: 'connections/followers_and_following/close_friends.json', content: JSON.stringify(closeFriendsJson) },
      {
        path: 'connections/followers_and_following/recently_unfollowed_profiles.json',
        content: JSON.stringify(recentlyUnfollowedJson),
      },
    ],
    'Data Demo (@akun_contoh)'
  );
}
