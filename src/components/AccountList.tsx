import React, { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, Check, Copy, Download, Search } from 'lucide-react';
import { CategoryKey, InstagramAccount } from '../types/instagram';
import { WindowTitleBar } from './RetroIcons';

interface AccountListProps {
  title: string;
  subtitle: string;
  category: CategoryKey;
  accounts: InstagramAccount[];
  whitelist: Set<string>;
  checkedUnfollowed: Set<string>;
  onToggleWhitelist: (username: string) => void;
  onToggleChecked: (username: string) => void;
}

type SortOption = 'newest' | 'oldest' | 'az' | 'za';

const RETRO_SWATCHES = [
  'bg-[#DF4B2F] text-[#FBF8EF]',
  'bg-[#F4B942] text-[#181615]',
  'bg-[#2D8A75] text-[#FBF8EF]',
  'bg-[#3B5BDB] text-[#FBF8EF]',
  'bg-[#181615] text-[#F4B942]',
];

function getAvatarSwatch(username: string): string {
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = (hash * 31 + username.charCodeAt(i)) | 0;
  }
  return RETRO_SWATCHES[Math.abs(hash) % RETRO_SWATCHES.length];
}

function formatTimestamp(ts?: number): string | null {
  if (!ts) return null;
  const date = new Date(ts * 1000);
  const formatted = date
    .toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
    .toUpperCase();

  const diffDays = Math.floor((Date.now() - ts * 1000) / 86400000);
  let relative = '';
  if (diffDays <= 0) relative = 'HARI INI';
  else if (diffDays < 30) relative = `${diffDays} HARI LALU`;
  else if (diffDays < 365) relative = `${Math.floor(diffDays / 30)} BLN LALU`;
  else {
    const yrs = (diffDays / 365).toFixed(1).replace('.0', '');
    relative = `${yrs} THN LALU`;
  }

  return `${formatted} · ${relative}`;
}

export const AccountList: React.FC<AccountListProps> = ({
  title,
  subtitle,
  category,
  accounts,
  whitelist,
  checkedUnfollowed,
  onToggleWhitelist,
  onToggleChecked,
}) => {
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('oldest');
  const [hideWhitelisted, setHideWhitelisted] = useState(true);
  const [hideChecked, setHideChecked] = useState(false);
  const [visibleCount, setVisibleCount] = useState(60);
  const [copiedUser, setCopiedUser] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  useEffect(() => {
    setVisibleCount(60);
  }, [category, query, sortBy, hideWhitelisted, hideChecked]);

  const filteredAndSorted = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^@/, '');
    const list = accounts.filter((acc) => {
      if (q && !acc.username.includes(q)) return false;
      if (category === 'notFollowingBack' && hideWhitelisted && whitelist.has(acc.username)) {
        return false;
      }
      if (category === 'notFollowingBack' && hideChecked && checkedUnfollowed.has(acc.username)) {
        return false;
      }
      return true;
    });

    list.sort((a, b) => {
      if (sortBy === 'az') return a.username.localeCompare(b.username);
      if (sortBy === 'za') return b.username.localeCompare(a.username);
      if (sortBy === 'newest') {
        return (b.timestamp ?? 0) - (a.timestamp ?? 0);
      }
      const tsA = a.timestamp ?? Number.MAX_SAFE_INTEGER;
      const tsB = b.timestamp ?? Number.MAX_SAFE_INTEGER;
      return tsA - tsB;
    });

    return list;
  }, [accounts, query, sortBy, category, hideWhitelisted, hideChecked, whitelist, checkedUnfollowed]);

  const displayed = filteredAndSorted.slice(0, visibleCount);

  const handleCopyUsername = async (username: string) => {
    try {
      await navigator.clipboard.writeText(`@${username}`);
      setCopiedUser(username);
      setTimeout(() => setCopiedUser(null), 1500);
    } catch {
      // Ignore
    }
  };

  const handleCopyAll = async () => {
    try {
      const text = filteredAndSorted.map((u) => `@${u.username}`).join('\n');
      await navigator.clipboard.writeText(text);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    } catch {
      // Ignore
    }
  };

  const handleExportCsv = () => {
    const header = 'username,profile_url,timestamp_iso,whitelisted,marked_unfollowed\n';
    const rows = filteredAndSorted
      .map((u) => {
        const iso = u.timestamp ? new Date(u.timestamp * 1000).toISOString() : '';
        return `${u.username},${u.href},${iso},${whitelist.has(u.username)},${checkedUnfollowed.has(u.username)}`;
      })
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ig-tracker-${category}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const hiddenByWhitelistCount =
    category === 'notFollowingBack'
      ? accounts.filter((a) => whitelist.has(a.username)).length
      : 0;

  return (
    <div className="retro-window">
      <WindowTitleBar
        title={`LEDGER_DB // ${category.toUpperCase()}.DBF`}
        rightTag={`${filteredAndSorted.length} REC`}
      />

      {/* Top Control Deck */}
      <div className="p-4 sm:p-6 bg-[#F1ECDD] border-b-2 border-[#181615] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="text-xl sm:text-2xl font-bold text-[#181615] tracking-tight">
                {title}
              </h3>
              <span className="font-mono text-xs font-bold bg-[#181615] text-[#F4B942] px-2.5 py-0.5 border border-[#181615]">
                {filteredAndSorted.length.toLocaleString('id-ID')} AKUN
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#4A463F] mt-0.5">{subtitle}</p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={handleCopyAll}
              disabled={filteredAndSorted.length === 0}
              className="retro-btn retro-btn-cream text-xs px-3 py-2"
            >
              {copiedAll ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedAll ? 'TERSALIN!' : 'COPY LIST'}</span>
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              disabled={filteredAndSorted.length === 0}
              className="retro-btn retro-btn-yellow text-xs px-3 py-2"
            >
              <Download className="w-3.5 h-3.5" />
              <span>EXPORT .CSV</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#181615] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="CARI @USERNAME..."
              className="retro-input w-full pl-9 pr-4 py-2 text-xs sm:text-sm placeholder:text-[#7A7468]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="retro-input text-xs font-bold px-3 py-2 cursor-pointer uppercase"
            >
              <option value="oldest">URUT: PALING LAMA</option>
              <option value="newest">URUT: PALING BARU</option>
              <option value="az">URUT: A → Z</option>
              <option value="za">URUT: Z → A</option>
            </select>

            {category === 'notFollowingBack' && (
              <>
                <button
                  type="button"
                  onClick={() => setHideWhitelisted((v) => !v)}
                  className={`retro-btn text-xs px-3 py-2 ${
                    hideWhitelisted ? 'retro-btn-yellow' : 'retro-btn-cream'
                  }`}
                >
                  {hideWhitelisted
                    ? `HIDE WHITELIST (${hiddenByWhitelistCount})`
                    : `SHOW WHITELIST (${hiddenByWhitelistCount})`}
                </button>

                <button
                  type="button"
                  onClick={() => setHideChecked((v) => !v)}
                  className={`retro-btn text-xs px-3 py-2 ${
                    hideChecked ? 'retro-btn-teal' : 'retro-btn-cream'
                  }`}
                >
                  {hideChecked ? 'HIDE YG UDAH UNFOLLOW' : 'TAMPILKAN SEMUA'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Column Header Strip */}
      <div className="hidden sm:grid sm:grid-cols-[64px_1fr_auto] items-center px-5 py-2 bg-[#E6DFD0] border-b-2 border-[#181615] font-mono text-[11px] font-bold uppercase text-[#4A463F]">
        <span>NO.</span>
        <span>HANDLE AKUN &amp; TANGGAL TERCATAT</span>
        <span>AKSI CEPAT</span>
      </div>

      {/* Ledger Rows */}
      {filteredAndSorted.length === 0 ? (
        <div className="p-12 text-center font-mono space-y-1 bg-[#FBF8EF]">
          <p className="font-bold text-sm text-[#181615]">[ NIHIL // DATA KOSONG ]</p>
          <p className="text-xs text-[#5C574F]">
            {query
              ? 'Gak ketemu akun dengan kata kunci itu bre.'
              : 'Tidak ada akun pada kategori ini.'}
          </p>
        </div>
      ) : (
        <div className="divide-y-2 divide-[#181615]/15">
          {displayed.map((acc, idx) => {
            const isWhitelisted = whitelist.has(acc.username);
            const isChecked = checkedUnfollowed.has(acc.username);
            const timeLabel = formatTimestamp(acc.timestamp);
            const rowBg = idx % 2 === 0 ? 'bg-[#FBF8EF]' : 'bg-[#F5F0E3]';

            return (
              <div
                key={acc.username}
                className={`${rowBg} px-4 sm:px-5 py-3 flex flex-col sm:grid sm:grid-cols-[64px_1fr_auto] sm:items-center gap-2.5 sm:gap-3 hover:bg-[#F4B942]/20 transition-colors ${
                  isChecked ? 'opacity-60' : ''
                }`}
              >
                <span className="hidden sm:inline-block font-mono text-xs font-bold text-[#6E685C]">
                  #{String(idx + 1).padStart(4, '0')}
                </span>

                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 border-2 border-[#181615] shadow-[2px_2px_0px_#181615] ${getAvatarSwatch(
                      acc.username
                    )} flex items-center justify-center font-mono font-bold text-xs uppercase shrink-0`}
                  >
                    {acc.username.slice(0, 2)}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <a
                        href={acc.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`font-mono text-sm font-bold hover:underline truncate ${
                          isChecked
                            ? 'line-through text-[#6E685C]'
                            : 'text-[#181615] hover:text-[#DF4B2F]'
                        }`}
                      >
                        @{acc.username}
                      </a>

                      {isWhitelisted && (
                        <span className="retro-stamp text-[10px] px-1.5 py-0.5 bg-[#F4B942] text-[#181615]">
                          ★ WHITELIST
                        </span>
                      )}

                      {isChecked && (
                        <span className="retro-stamp text-[10px] px-1.5 py-0.5 bg-[#2D8A75] text-[#FBF8EF]">
                          ✓ UNFOLLOWED
                        </span>
                      )}
                    </div>

                    {timeLabel && (
                      <p className="font-mono text-[11px] text-[#5C574F] mt-0.5">{timeLabel}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2 self-end sm:self-auto shrink-0">
                  {(category === 'notFollowingBack' || category === 'pendingSent') && (
                    <button
                      type="button"
                      onClick={() => onToggleChecked(acc.username)}
                      title={isChecked ? 'Batalkan tanda unfollow' : 'Tandai sudah di-unfollow'}
                      className={`retro-btn text-[11px] px-2.5 py-1 ${
                        isChecked ? 'retro-btn-teal' : 'retro-btn-cream'
                      }`}
                    >
                      <span>{isChecked ? '✓ BERES' : 'TANDAI'}</span>
                    </button>
                  )}

                  {(category === 'notFollowingBack' || category === 'whitelisted') && (
                    <button
                      type="button"
                      onClick={() => onToggleWhitelist(acc.username)}
                      title={isWhitelisted ? 'Keluarkan dari Whitelist' : 'Tandai Seleb / Aman'}
                      className={`retro-btn text-[11px] px-2.5 py-1 ${
                        isWhitelisted ? 'retro-btn-yellow' : 'retro-btn-cream'
                      }`}
                    >
                      <span>{isWhitelisted ? '★ AMAN' : 'WHITELIST'}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleCopyUsername(acc.username)}
                    title="Copy @username"
                    className="retro-btn retro-btn-cream p-1.5"
                  >
                    {copiedUser === acc.username ? (
                      <Check className="w-3.5 h-3.5 text-[#2D8A75]" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>

                  <a
                    href={acc.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="retro-btn retro-btn-ink text-[11px] px-2.5 py-1"
                  >
                    <span>BUKA IG</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Load More Footer */}
      {visibleCount < filteredAndSorted.length && (
        <div className="p-4 border-t-2 border-[#181615] bg-[#E6DFD0] text-center">
          <button
            type="button"
            onClick={() => setVisibleCount((prev) => prev + 100)}
            className="retro-btn retro-btn-yellow text-xs px-5 py-2"
          >
            MUAT 100 LAGI ({filteredAndSorted.length - visibleCount} TERSISA)
          </button>
        </div>
      )}
    </div>
  );
};
