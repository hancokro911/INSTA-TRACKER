import React, { useMemo, useRef, useState } from 'react';
import { ArrowRight, ArrowUpRight, Plus, Trash2 } from 'lucide-react';
import { SnapshotSummary } from '../types/instagram';
import { compareSnapshots } from '../lib/instagramParser';
import { WindowTitleBar } from './RetroIcons';

interface SnapshotCompareProps {
  snapshots: SnapshotSummary[];
  onUploadAdditionalSnapshot: (files: File[]) => Promise<void>;
  onDeleteSnapshot: (id: string) => Promise<void>;
  onClearSnapshots: () => Promise<void>;
}

type DiffTab = 'lostFollowers' | 'newFollowers' | 'newlyUnfollowed' | 'newlyFollowed';

export const SnapshotCompare: React.FC<SnapshotCompareProps> = ({
  snapshots,
  onUploadAdditionalSnapshot,
  onDeleteSnapshot,
  onClearSnapshots,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [olderId, setOlderId] = useState<string>(() => snapshots[1]?.id || snapshots[0]?.id || '');
  const [newerId, setNewerId] = useState<string>(() => snapshots[0]?.id || '');
  const [activeDiffTab, setActiveDiffTab] = useState<DiffTab>('lostFollowers');
  const [uploading, setUploading] = useState(false);

  const resolvedOlder =
    snapshots.find((s) => s.id === olderId) || snapshots[1] || snapshots[0] || null;
  const resolvedNewer = snapshots.find((s) => s.id === newerId) || snapshots[0] || null;

  const diff = useMemo(() => {
    if (!resolvedOlder || !resolvedNewer || resolvedOlder.id === resolvedNewer.id) {
      return null;
    }
    return compareSnapshots(resolvedOlder, resolvedNewer);
  }, [resolvedOlder, resolvedNewer]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = '';
    if (files.length === 0) return;
    setUploading(true);
    try {
      await onUploadAdditionalSnapshot(files);
    } finally {
      setUploading(false);
    }
  };

  const formatDate = (ms: number) =>
    new Date(ms)
      .toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
      .toUpperCase();

  return (
    <div className="space-y-6">
      {/* Main Diff Console */}
      <div className="retro-window">
        <WindowTitleBar
          title="DIFF_TRACKER.BAK // ADU_SNAPSHOT_LAMA_VS_BARU"
          variant="yellow"
          rightTag={`${snapshots.length} SAVED`}
        />

        <div className="p-5 sm:p-7 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 retro-dashed-b pb-5">
            <div>
              <span className="font-mono text-xs font-bold uppercase bg-[#181615] text-[#F4B942] px-2 py-0.5">
                PELACAK RIWAYAT WAKTU
              </span>
              <h3 className="text-2xl font-bold text-[#181615] mt-1.5">
                Lacak Siapa yang Baru Unfollow Lo
              </h3>
              <p className="text-sm text-[#4A463F] mt-1 max-w-2xl">
                Bandingin file export IG minggu/bulan lalu sama file export terbaru buat nangkep basah akun yang hilang dari daftar followers lo.
              </p>
            </div>

            <div className="shrink-0">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".zip,.json,.html,.htm"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
                className="retro-btn retro-btn-red text-xs sm:text-sm px-4 py-2.5"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>{uploading ? 'MEMBACA...' : 'TAMBAH FILE .ZIP PEMBANDING'}</span>
              </button>
            </div>
          </div>

          {snapshots.length < 2 ? (
            <div className="border-2 border-dashed border-[#181615] bg-[#F1ECDD] p-8 text-center font-mono space-y-2">
              <p className="font-bold text-sm text-[#181615]">
                [ BARU ADA {snapshots.length} SNAPSHOT TERSIMPAN DI BROWSER ]
              </p>
              <p className="text-xs text-[#4A463F] max-w-lg mx-auto leading-relaxed">
                Klik tombol <strong>TAMBAH FILE .ZIP PEMBANDING</strong> di atas buat masukin data export kedua (data lama atau data baru) supaya selisihnya langsung kelihatan.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-4 bg-[#F1ECDD] border-2 border-[#181615] p-4">
                <div>
                  <label className="block font-mono text-xs font-bold uppercase text-[#181615] mb-1.5">
                    [SLOT A] DATA LAMA (SEBELUM):
                  </label>
                  <select
                    value={resolvedOlder?.id || ''}
                    onChange={(e) => setOlderId(e.target.value)}
                    className="retro-input w-full px-3 py-2 text-xs font-bold"
                  >
                    {snapshots.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label} — {formatDate(s.importedAt)} ({s.followersCount} FLW)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="hidden md:flex items-center justify-center pt-5">
                  <div className="w-9 h-9 bg-[#181615] text-[#F4B942] flex items-center justify-center">
                    <ArrowRight className="w-5 h-5" />
                  </div>
                </div>

                <div>
                  <label className="block font-mono text-xs font-bold uppercase text-[#181615] mb-1.5">
                    [SLOT B] DATA BARU (SESUDAH):
                  </label>
                  <select
                    value={resolvedNewer?.id || ''}
                    onChange={(e) => setNewerId(e.target.value)}
                    className="retro-input w-full px-3 py-2 text-xs font-bold"
                  >
                    {snapshots.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label} — {formatDate(s.importedAt)} ({s.followersCount} FLW)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {resolvedOlder?.id === resolvedNewer?.id && (
                <div className="bg-[#F4B942] border-2 border-[#181615] px-4 py-2.5 font-mono text-xs font-bold">
                  [!] PILIH DUA SNAPSHOT YANG BERBEDA DI SLOT A DAN SLOT B.
                </div>
              )}

              {diff && (
                <>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    <button
                      type="button"
                      onClick={() => setActiveDiffTab('lostFollowers')}
                      className={`text-left p-4 border-2 border-[#181615] transition cursor-pointer ${
                        activeDiffTab === 'lostFollowers'
                          ? 'bg-[#DF4B2F] text-[#FBF8EF] shadow-[4px_4px_0px_#181615] -translate-y-0.5'
                          : 'bg-[#FBF8EF] text-[#181615] shadow-[2px_2px_0px_#181615] hover:bg-[#F1ECDD]'
                      }`}
                    >
                      <p className="font-mono text-[11px] font-bold uppercase">BARU UNFOLLOW LO</p>
                      <p className="font-mono text-3xl font-bold mt-1">{diff.lostFollowers.length}</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveDiffTab('newFollowers')}
                      className={`text-left p-4 border-2 border-[#181615] transition cursor-pointer ${
                        activeDiffTab === 'newFollowers'
                          ? 'bg-[#2D8A75] text-[#FBF8EF] shadow-[4px_4px_0px_#181615] -translate-y-0.5'
                          : 'bg-[#FBF8EF] text-[#181615] shadow-[2px_2px_0px_#181615] hover:bg-[#F1ECDD]'
                      }`}
                    >
                      <p className="font-mono text-[11px] font-bold uppercase">FOLLOWERS BARU</p>
                      <p className="font-mono text-3xl font-bold mt-1">{diff.newFollowers.length}</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveDiffTab('newlyUnfollowed')}
                      className={`text-left p-4 border-2 border-[#181615] transition cursor-pointer ${
                        activeDiffTab === 'newlyUnfollowed'
                          ? 'bg-[#F4B942] text-[#181615] shadow-[4px_4px_0px_#181615] -translate-y-0.5'
                          : 'bg-[#FBF8EF] text-[#181615] shadow-[2px_2px_0px_#181615] hover:bg-[#F1ECDD]'
                      }`}
                    >
                      <p className="font-mono text-[11px] font-bold uppercase">BARU LO UNFOLLOW</p>
                      <p className="font-mono text-3xl font-bold mt-1">
                        {diff.newlyUnfollowed.length}
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveDiffTab('newlyFollowed')}
                      className={`text-left p-4 border-2 border-[#181615] transition cursor-pointer ${
                        activeDiffTab === 'newlyFollowed'
                          ? 'bg-[#3B5BDB] text-[#FBF8EF] shadow-[4px_4px_0px_#181615] -translate-y-0.5'
                          : 'bg-[#FBF8EF] text-[#181615] shadow-[2px_2px_0px_#181615] hover:bg-[#F1ECDD]'
                      }`}
                    >
                      <p className="font-mono text-[11px] font-bold uppercase">BARU LO FOLLOW</p>
                      <p className="font-mono text-3xl font-bold mt-1">{diff.newlyFollowed.length}</p>
                    </button>
                  </div>

                  <div className="border-2 border-[#181615] bg-[#FBF8EF]">
                    <div className="px-4 py-2.5 bg-[#181615] text-[#FBF8EF] font-mono text-xs font-bold uppercase">
                      {activeDiffTab === 'lostFollowers' && '>>> DAFTAR AKUN YANG HILANG DARI FOLLOWERS'}
                      {activeDiffTab === 'newFollowers' && '>>> DAFTAR FOLLOWERS BARU'}
                      {activeDiffTab === 'newlyUnfollowed' && '>>> DAFTAR AKUN YANG BARU LO UNFOLLOW'}
                      {activeDiffTab === 'newlyFollowed' && '>>> DAFTAR AKUN YANG BARU LO FOLLOW'}
                    </div>

                    {diff[activeDiffTab].length === 0 ? (
                      <div className="p-8 text-center font-mono text-xs text-[#5C574F]">
                        [ TIDAK ADA PERUBAHAN DI KATEGORI INI ]
                      </div>
                    ) : (
                      <div className="divide-y-2 divide-[#181615]/15">
                        {diff[activeDiffTab].map((acc, i) => (
                          <div
                            key={acc.username}
                            className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-[#F4B942]/20"
                          >
                            <div className="flex items-center gap-3 font-mono text-sm font-bold">
                              <span className="text-xs text-[#6E685C]">
                                #{String(i + 1).padStart(3, '0')}
                              </span>
                              <span>@{acc.username}</span>
                            </div>
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
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Saved Snapshots Disk Bank */}
      {snapshots.length > 0 && (
        <div className="retro-window">
          <WindowTitleBar title="MEMORY_BANK // SNAPSHOT_TERSIMPAN.DAT" />
          <div className="p-4 sm:p-6 space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-mono text-xs font-bold uppercase text-[#4A463F]">
                ARSIP LOKAL DI BROWSER ({snapshots.length} ITEM)
              </p>
              <button
                type="button"
                onClick={onClearSnapshots}
                className="retro-btn retro-btn-red text-[11px] px-2.5 py-1"
              >
                HAPUS SEMUA
              </button>
            </div>

            <div className="space-y-2">
              {snapshots.map((s) => (
                <div
                  key={s.id}
                  className="border-2 border-[#181615] bg-[#F1ECDD] px-4 py-2.5 flex items-center justify-between gap-3"
                >
                  <div>
                    <p className="font-bold text-sm text-[#181615]">{s.label}</p>
                    <p className="font-mono text-[11px] text-[#5C574F]">
                      {formatDate(s.importedAt)} // {s.followersCount} FOLLOWERS · {s.followingCount}{' '}
                      FOLLOWING · {s.notFollowingBackCount} GAK FOLLBACK
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDeleteSnapshot(s.id)}
                    className="retro-btn retro-btn-cream p-1.5"
                    title="Hapus snapshot"
                  >
                    <Trash2 className="w-4 h-4 text-[#DF4B2F]" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
