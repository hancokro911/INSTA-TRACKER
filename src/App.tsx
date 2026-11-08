import { useEffect, useMemo, useState } from 'react';
import { FolderSync, History, RotateCcw, Upload } from 'lucide-react';
import {
  CategoryKey,
  InstagramAccount,
  ParsedInstagramData,
  SnapshotSummary,
} from './types/instagram';
import { parseInstagramFiles, toSnapshotSummary } from './lib/instagramParser';
import {
  clearAllSnapshots,
  deleteSnapshot,
  loadSnapshots,
  loadStringSet,
  saveSnapshot,
  saveStringSet,
} from './lib/snapshotStorage';
import { generateDemoInstagramData } from './lib/sampleData';
import { UploadDropzone } from './components/UploadDropzone';
import { HowToRequestGuide } from './components/HowToRequestGuide';
import { AccountList } from './components/AccountList';
import { SnapshotCompare } from './components/SnapshotCompare';
import { RetroCameraLogo, WindowTitleBar } from './components/RetroIcons';

type ActiveMode = 'analyzer' | 'compare';

interface CategoryMeta {
  key: CategoryKey;
  label: string;
  subtitle: string;
  accounts: InstagramAccount[];
  alwaysShow?: boolean;
}

export function App() {
  const [data, setData] = useState<ParsedInstagramData | null>(null);
  const [activeCategory, setActiveCategory] = useState<CategoryKey>('notFollowingBack');
  const [mode, setMode] = useState<ActiveMode>('analyzer');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [clockText, setClockText] = useState('');

  const [snapshots, setSnapshots] = useState<SnapshotSummary[]>([]);
  const [whitelist, setWhitelist] = useState<Set<string>>(() => loadStringSet('whitelist'));
  const [checkedUnfollowed, setCheckedUnfollowed] = useState<Set<string>>(() =>
    loadStringSet('checked')
  );

  useEffect(() => {
    loadSnapshots().then(setSnapshots);
  }, []);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setClockText(
        now.toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
        })
      );
    };
    updateClock();
    const id = setInterval(updateClock, 15000);
    return () => clearInterval(id);
  }, []);

  const handleFilesSelected = async (files: File[]) => {
    setIsLoading(true);
    setError(null);
    try {
      const parsed = await parseInstagramFiles(files);
      setData(parsed);
      setActiveCategory('notFollowingBack');
      setMode('analyzer');
      setShowUploadModal(false);
      setShowDiagnostics(Boolean(parsed.diagnostics?.suspectedPartialDateRange));

      const summary = toSnapshotSummary(parsed);
      await saveSnapshot(summary);
      const updated = await loadSnapshots();
      setSnapshots(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membaca file yang diunggah.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadAdditionalSnapshot = async (files: File[]) => {
    setError(null);
    try {
      const parsed = await parseInstagramFiles(files);
      const summary = toSnapshotSummary(parsed);
      await saveSnapshot(summary);
      const updated = await loadSnapshots();
      setSnapshots(updated);
      if (!data) {
        setData(parsed);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal membaca file pembanding.');
    }
  };

  const handleLoadDemo = () => {
    setError(null);
    const demo = generateDemoInstagramData();
    setData(demo);
    setActiveCategory('notFollowingBack');
    setMode('analyzer');
  };

  const handleRestoreSnapshot = (snap: SnapshotSummary) => {
    const followerSet = new Set(snap.followers.map((u) => u.username));
    const followingSet = new Set(snap.following.map((u) => u.username));

    setData({
      id: snap.id,
      label: snap.label,
      importedAt: snap.importedAt,
      sourceFormat: 'json',
      matchedFiles: ['MEMORY_BANK'],
      followers: snap.followers,
      following: snap.following,
      notFollowingBack: snap.following.filter((u) => !followerSet.has(u.username)),
      fans: snap.followers.filter((u) => !followingSet.has(u.username)),
      mutuals: snap.following.filter((u) => followerSet.has(u.username)),
      pendingSent: [],
      pendingReceived: [],
      recentlyUnfollowed: [],
      closeFriends: [],
      blocked: [],
      restricted: [],
      hideStoryFrom: [],
      warnings: [],
    });
    setActiveCategory('notFollowingBack');
    setMode('analyzer');
  };

  const handleToggleWhitelist = (username: string) => {
    setWhitelist((prev) => {
      const next = new Set(prev);
      const key = username.toLowerCase();
      if (next.has(key)) next.delete(key);
      else next.add(key);
      saveStringSet('whitelist', next);
      return next;
    });
  };

  const handleToggleChecked = (username: string) => {
    setCheckedUnfollowed((prev) => {
      const next = new Set(prev);
      const key = username.toLowerCase();
      if (next.has(key)) next.delete(key);
      else next.add(key);
      saveStringSet('checked', next);
      return next;
    });
  };

  const handleDeleteSnapshot = async (id: string) => {
    await deleteSnapshot(id);
    setSnapshots(await loadSnapshots());
  };

  const handleClearSnapshots = async () => {
    await clearAllSnapshots();
    setSnapshots([]);
  };

  const whitelistedAccounts = useMemo<InstagramAccount[]>(() => {
    if (!data) return [];
    const map = new Map<string, InstagramAccount>();
    for (const acc of [...data.following, ...data.followers]) {
      if (whitelist.has(acc.username)) {
        map.set(acc.username, acc);
      }
    }
    for (const uname of whitelist) {
      if (!map.has(uname)) {
        map.set(uname, {
          username: uname,
          href: `https://www.instagram.com/${uname}/`,
        });
      }
    }
    return Array.from(map.values());
  }, [data, whitelist]);

  const categories = useMemo<CategoryMeta[]>(() => {
    if (!data) return [];
    return [
      {
        key: 'notFollowingBack',
        label: 'TIDAK FOLLBACK',
        subtitle: 'Akun yang lo follow, tapi mereka kagak follow balik akun lo.',
        accounts: data.notFollowingBack,
        alwaysShow: true,
      },
      {
        key: 'fans',
        label: 'BELUM LO FOLLBACK',
        subtitle: 'Akun yang udah follow lo, tapi belum lo follow balik.',
        accounts: data.fans,
        alwaysShow: true,
      },
      {
        key: 'mutuals',
        label: 'MUTUALAN',
        subtitle: 'Temen sejati — saling follow satu sama lain.',
        accounts: data.mutuals,
        alwaysShow: true,
      },
      {
        key: 'pendingSent',
        label: 'DIGANTUNG (PENDING)',
        subtitle: 'Akun gembok/privat yang udah lo request follow tapi belum di-acc.',
        accounts: data.pendingSent,
      },
      {
        key: 'pendingReceived',
        label: 'REQUEST MASUK',
        subtitle: 'Permintaan follow ke akun lo yang belum lo terima.',
        accounts: data.pendingReceived,
      },
      {
        key: 'closeFriends',
        label: 'CLOSE FRIENDS',
        subtitle: 'Daftar lingkaran hijau Close Friends lo saat ini.',
        accounts: data.closeFriends,
      },
      {
        key: 'recentlyUnfollowed',
        label: 'BARU DI-UNFOLLOW',
        subtitle: 'Akun yang belakangan ini tercatat baru lo unfollow.',
        accounts: data.recentlyUnfollowed,
      },
      {
        key: 'blocked',
        label: 'DIBLOKIR',
        subtitle: 'Daftar akun yang lo blokir.',
        accounts: data.blocked,
      },
      {
        key: 'restricted',
        label: 'DIBATASI',
        subtitle: 'Daftar akun yang masuk daftar Restricted.',
        accounts: data.restricted,
      },
      {
        key: 'hideStoryFrom',
        label: 'HIDE STORY',
        subtitle: 'Akun yang lo sembunyikan dari Instagram Story.',
        accounts: data.hideStoryFrom,
      },
      {
        key: 'followers',
        label: 'SEMUA FOLLOWERS',
        subtitle: 'Seluruh daftar followers pada file arsip ini.',
        accounts: data.followers,
        alwaysShow: true,
      },
      {
        key: 'following',
        label: 'SEMUA FOLLOWING',
        subtitle: 'Seluruh daftar akun yang lo ikuti pada file arsip ini.',
        accounts: data.following,
        alwaysShow: true,
      },
      {
        key: 'whitelisted',
        label: 'WHITELIST',
        subtitle: 'Akun seleb/brand/sohib yang lo tandai aman biar gak dihitung unfollower.',
        accounts: whitelistedAccounts,
        alwaysShow: whitelist.size > 0,
      },
    ];
  }, [data, whitelistedAccounts, whitelist.size]);

  const visibleTabs = useMemo(
    () => categories.filter((c) => c.alwaysShow || c.accounts.length > 0),
    [categories]
  );

  const currentCategoryMeta =
    categories.find((c) => c.key === activeCategory) || categories[0] || null;

  const effectiveNotFollowingBackCount = data
    ? data.notFollowingBack.filter((u) => !whitelist.has(u.username)).length
    : 0;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Classic 90s Desktop System Menu Bar */}
      <header className="sticky top-0 z-40 bg-[#FBF8EF] border-b-2 border-[#181615]">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 h-12 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              type="button"
              onClick={() => {
                setMode('analyzer');
              }}
              className="flex items-center gap-2 pr-3 border-r-2 border-[#181615] cursor-pointer"
            >
              <RetroCameraLogo />
              <span className="font-bold tracking-tight text-sm sm:text-base text-[#181615]">
                INSTA-TRACKER <span className="font-mono text-xs bg-[#181615] text-[#F4B942] px-1.5 py-0.5">'98</span>
              </span>
            </button>

            <nav className="flex items-center gap-1 sm:gap-2 font-mono text-xs font-bold">
              <button
                type="button"
                onClick={() => setShowGuideModal(true)}
                className="px-2.5 py-1 hover:bg-[#F4B942] border border-transparent hover:border-[#181615] transition cursor-pointer"
              >
                PANDUAN_IG.TXT
              </button>

              {(data || snapshots.length > 0) && (
                <button
                  type="button"
                  onClick={() => setMode((m) => (m === 'compare' ? 'analyzer' : 'compare'))}
                  className={`px-2.5 py-1 border transition cursor-pointer flex items-center gap-1.5 ${
                    mode === 'compare'
                      ? 'bg-[#DF4B2F] text-[#FBF8EF] border-[#181615]'
                      : 'hover:bg-[#F4B942] border-transparent hover:border-[#181615]'
                  }`}
                >
                  <History className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">ADU_RIWAYAT.BAK</span>
                  <span className="sm:hidden">DIFF</span>
                  {snapshots.length > 0 && <span>[{snapshots.length}]</span>}
                </button>
              )}

              {data && (
                <button
                  type="button"
                  onClick={() => setShowUploadModal(true)}
                  className="px-2.5 py-1 bg-[#F4B942] border border-[#181615] hover:bg-[#f8c458] transition cursor-pointer flex items-center gap-1"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">GANTI_FILE.ZIP</span>
                </button>
              )}
            </nav>
          </div>

          {/* Right System Tray */}
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="hidden lg:inline-block bg-[#2D8A75] text-[#FBF8EF] font-bold px-2 py-0.5 border border-[#181615]">
              NO_LOGIN
            </span>
            <span className="bg-[#181615] text-[#FBF8EF] font-bold px-2.5 py-0.5">
              {clockText || '98:00'}
            </span>
          </div>
        </div>
      </header>

      {/* Desktop Workspace */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-6 py-6 sm:py-8 space-y-7">
        {!data && mode === 'analyzer' ? (
          <>
            {/* Editorial Zine Masthead Card (Zero SaaS AI Slop!) */}
            <section className="retro-window overflow-hidden">
              <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr]">
                {/* Left Stamp Block */}
                <div className="bg-[#F4B942] border-b-2 lg:border-b-0 lg:border-r-2 border-[#181615] p-5 flex flex-col justify-between">
                  <div className="space-y-2">
                    <span className="inline-block font-mono text-[11px] font-bold bg-[#181615] text-[#FBF8EF] px-2 py-0.5">
                      UTILITY // VER 1.98
                    </span>
                    <p className="font-mono text-xs font-bold text-[#181615] leading-snug pt-1">
                      METODE PALING AMAN: MINTA ARSIP DULU KE META, BARU CEK DI SINI.
                    </p>
                  </div>

                  <div className="pt-4 mt-4 border-t-2 border-[#181615] font-mono text-[11px] font-bold text-[#181615]">
                    STATUS AKUN: 100% AMAN DARI BANNED / CHECKPOINT
                  </div>
                </div>

                {/* Right Editorial Headline */}
                <div className="p-5 sm:p-7 bg-[#FBF8EF] flex flex-col justify-between gap-5">
                  <div>
                    <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-[#181615] leading-[1.1]">
                      Bongkar Siapa yang Gak Follback Lo Pakai Data Resmi Instagram.
                    </h1>
                    <p className="text-sm sm:text-base text-[#4A463F] mt-2.5 max-w-2xl">
                      Gak perlu masukin username &amp; password IG ke web aneh-aneh. Cukup request file{' '}
                      <strong className="text-[#181615]">Download Your Information (.ZIP)</strong> dari Pusat Akun IG, terus cemplungin ke floppy drive di bawah.
                    </p>
                  </div>

                  {/* 3-Step Strip */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 font-mono text-xs">
                    <div className="border-2 border-[#181615] bg-[#F1ECDD] px-3 py-2">
                      <span className="font-bold text-[#DF4B2F]">01.</span> Request ZIP di Pusat Akun
                    </div>
                    <div className="border-2 border-[#181615] bg-[#F1ECDD] px-3 py-2">
                      <span className="font-bold text-[#2D8A75]">02.</span> Drop File .ZIP ke Sini
                    </div>
                    <div className="border-2 border-[#181615] bg-[#F1ECDD] px-3 py-2">
                      <span className="font-bold text-[#3B5BDB]">03.</span> Sikat Unfollowers Lo
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Quick Restore Previous Session */}
            {snapshots.length > 0 && (
              <div className="retro-window-sm bg-[#F4B942] px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="font-mono text-xs sm:text-sm text-[#181615]">
                  <strong>[DISK_CACHE]</strong> Ada data terakhir tersimpan:{' '}
                  <span className="underline font-bold">{snapshots[0].label}</span> (
                  {snapshots[0].followersCount} FLW / {snapshots[0].notFollowingBackCount} GAK FOLLBACK)
                </div>
                <button
                  type="button"
                  onClick={() => handleRestoreSnapshot(snapshots[0])}
                  className="retro-btn retro-btn-ink text-xs px-3.5 py-1.5 self-start sm:self-auto"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>MUAT ULANG DATA INI</span>
                </button>
              </div>
            )}

            {/* Floppy Upload Window */}
            <UploadDropzone
              onFilesSelected={handleFilesSelected}
              onLoadDemo={handleLoadDemo}
              isLoading={isLoading}
              error={error}
            />

            {/* Printed Manual Guide */}
            <HowToRequestGuide />
          </>
        ) : mode === 'compare' ? (
          <div className="space-y-5">
            {data && (
              <div>
                <button
                  type="button"
                  onClick={() => setMode('analyzer')}
                  className="retro-btn retro-btn-cream text-xs px-3.5 py-2"
                >
                  ← BALIK KE ANALISIS "{data.label}"
                </button>
              </div>
            )}
            <SnapshotCompare
              snapshots={snapshots}
              onUploadAdditionalSnapshot={handleUploadAdditionalSnapshot}
              onDeleteSnapshot={handleDeleteSnapshot}
              onClearSnapshots={handleClearSnapshots}
            />
          </div>
        ) : (
          data && (
            <div className="space-y-6">
              {/* Active Disk Status Header */}
              <div className="retro-window-sm bg-[#FBF8EF] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-mono text-xs font-bold bg-[#181615] text-[#F4B942] px-2.5 py-1">
                    DISK AKTIF:
                  </span>
                  <h2 className="text-lg sm:text-xl font-bold text-[#181615]">{data.label}</h2>
                  <span className="font-mono text-xs border border-[#181615] bg-[#F1ECDD] px-2 py-0.5">
                    FORMAT: {data.sourceFormat.toUpperCase()} ({data.matchedFiles.length} FILE)
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setShowDiagnostics((v) => !v)}
                    className={`retro-btn text-xs px-3 py-1.5 ${
                      showDiagnostics ? 'retro-btn-ink' : 'retro-btn-cream'
                    }`}
                  >
                    <span>{showDiagnostics ? 'TUTUP CEK AKURASI' : 'KENAPA GAK SESUAI?'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('compare')}
                    className="retro-btn retro-btn-yellow text-xs px-3 py-1.5"
                  >
                    <FolderSync className="w-3.5 h-3.5" />
                    <span>BANDINGKAN DATA</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setData(null);
                      setError(null);
                    }}
                    className="retro-btn retro-btn-cream text-xs px-3 py-1.5"
                  >
                    EJECT / AWAL
                  </button>
                </div>
              </div>

              {/* Archive Accuracy Inspector */}
              {showDiagnostics && (
                <div className="retro-window bg-[#FBF8EF]">
                  <WindowTitleBar
                    title="DIAGNOSTIC_INSPECTOR.SYS // CEK_AKURASI_ARSIP"
                    variant="dark"
                    onClose={() => setShowDiagnostics(false)}
                  />
                  <div className="p-4 sm:p-5 space-y-4 font-mono text-xs text-[#181615]">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="border-2 border-[#181615] bg-[#F1ECDD] p-3">
                        <p className="font-bold text-[#5C574F]">FILE FOLLOWERS TERBACA:</p>
                        <p className="font-bold text-sm mt-1">
                          {data.diagnostics?.followerFiles.length
                            ? data.diagnostics.followerFiles.join(', ')
                            : '1 file'}{' '}
                          ({data.followers.length.toLocaleString('id-ID')} akun)
                        </p>
                      </div>
                      <div className="border-2 border-[#181615] bg-[#F1ECDD] p-3">
                        <p className="font-bold text-[#5C574F]">FOLLOWER PALING TUA DI FILE:</p>
                        <p className="font-bold text-sm mt-1">
                          {data.diagnostics?.oldestFollowerTs
                            ? new Date(data.diagnostics.oldestFollowerTs * 1000)
                                .toLocaleDateString('id-ID', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                })
                                .toUpperCase()
                            : 'TIDAK ADA TIMESTAMP'}
                        </p>
                      </div>
                      <div className="border-2 border-[#181615] bg-[#F1ECDD] p-3">
                        <p className="font-bold text-[#5C574F]">FOLLOWING PALING TUA DI FILE:</p>
                        <p className="font-bold text-sm mt-1">
                          {data.diagnostics?.oldestFollowingTs
                            ? new Date(data.diagnostics.oldestFollowingTs * 1000)
                                .toLocaleDateString('id-ID', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                })
                                .toUpperCase()
                            : 'TIDAK ADA TIMESTAMP'}
                        </p>
                      </div>
                    </div>

                    <div className="border-2 border-[#181615] bg-[#F4B942]/35 p-3.5 space-y-1.5 leading-relaxed">
                      <p className="font-bold uppercase text-[#DF4B2F]">
                        [!] KENAPA ADA YANG MASIH FOLLBACK DI IG TAPI MUNCUL DI SINI?
                      </p>
                      <p>
                        <strong>1. Jebakan Default "Tahun Lalu" (90% Kasus):</strong> Pas request data di IG, setelan bawaan Meta itu{' '}
                        <span className="underline font-bold">Rentang Tanggal: Tahun lalu</span> (bukan{' '}
                        <span className="underline font-bold">Sepanjang waktu / All time</span>). Akibatnya semua temen lama yang nge-follow lo lebih dari 1 tahun lalu{' '}
                        <strong>tidak dimasukkan Meta ke file followers_1</strong>! Cek kotak biru{' '}
                        <strong>[04] FLW / FOLLOWING ({data.followers.length})</strong> — kalau angkanya jauh lebih kecil dari jumlah Followers asli di profil IG lo, wajib request ulang dengan setelan{' '}
                        <strong>Sepanjang waktu (All time)</strong>.
                      </p>
                      <p>
                        <strong>2. File Pecahan Ketinggalan:</strong> Kalau followers lo ribuan dan lo upload manual file satuan (bukan .ZIP), pastikan{' '}
                        <code>followers_2</code>, <code>followers_3</code>, dst. ikut dipilih semua.
                      </p>
                      <p>
                        <strong>3. Baru Follback Setelah Request:</strong> File ZIP adalah potret pada detik file dibuat Meta, jadi yang baru follback setelah jam itu belum masuk.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Diagnostic Warnings */}
              {data.warnings.length > 0 && (
                <div className="space-y-3">
                  {data.warnings.map((w, idx) => (
                    <div
                      key={idx}
                      className="retro-window-sm bg-[#F4B942] p-4 font-mono text-xs text-[#181615]"
                    >
                      <span className="font-bold bg-[#181615] text-[#F4B942] px-1.5 py-0.5 mr-2">
                        PERHATIAN #{idx + 1}
                      </span>
                      <span className="font-semibold leading-relaxed">{w}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* 4 Mechanical Punch-Card KPIs */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <button
                  type="button"
                  onClick={() => setActiveCategory('notFollowingBack')}
                  className={`text-left border-2 border-[#181615] bg-[#FBF8EF] transition cursor-pointer ${
                    activeCategory === 'notFollowingBack'
                      ? 'shadow-[6px_6px_0px_#181615] -translate-x-0.5 -translate-y-0.5'
                      : 'shadow-[3px_3px_0px_#181615] hover:bg-[#F1ECDD]'
                  }`}
                >
                  <div className="bg-[#DF4B2F] text-[#FBF8EF] border-b-2 border-[#181615] px-3.5 py-1.5 font-mono text-xs font-bold uppercase flex items-center justify-between">
                    <span>TIDAK FOLLBACK</span>
                    <span>[01]</span>
                  </div>
                  <div className="p-4">
                    <p className="font-mono text-3xl sm:text-4xl font-bold text-[#181615]">
                      {effectiveNotFollowingBackCount.toLocaleString('id-ID')}
                    </p>
                    <p className="font-mono text-[11px] text-[#5C574F] mt-1">
                      {whitelist.size > 0 &&
                      effectiveNotFollowingBackCount !== data.notFollowingBack.length
                        ? `TOTAL ${data.notFollowingBack.length} (${
                            data.notFollowingBack.length - effectiveNotFollowingBackCount
                          } AMAN)`
                        : 'LO FOLLOW, DIA KAGAK'}
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveCategory('fans')}
                  className={`text-left border-2 border-[#181615] bg-[#FBF8EF] transition cursor-pointer ${
                    activeCategory === 'fans'
                      ? 'shadow-[6px_6px_0px_#181615] -translate-x-0.5 -translate-y-0.5'
                      : 'shadow-[3px_3px_0px_#181615] hover:bg-[#F1ECDD]'
                  }`}
                >
                  <div className="bg-[#F4B942] text-[#181615] border-b-2 border-[#181615] px-3.5 py-1.5 font-mono text-xs font-bold uppercase flex items-center justify-between">
                    <span>BELUM FOLLBACK</span>
                    <span>[02]</span>
                  </div>
                  <div className="p-4">
                    <p className="font-mono text-3xl sm:text-4xl font-bold text-[#181615]">
                      {data.fans.length.toLocaleString('id-ID')}
                    </p>
                    <p className="font-mono text-[11px] text-[#5C574F] mt-1">
                      FOLLOW LO, BELUM DIBALES
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveCategory('mutuals')}
                  className={`text-left border-2 border-[#181615] bg-[#FBF8EF] transition cursor-pointer ${
                    activeCategory === 'mutuals'
                      ? 'shadow-[6px_6px_0px_#181615] -translate-x-0.5 -translate-y-0.5'
                      : 'shadow-[3px_3px_0px_#181615] hover:bg-[#F1ECDD]'
                  }`}
                >
                  <div className="bg-[#2D8A75] text-[#FBF8EF] border-b-2 border-[#181615] px-3.5 py-1.5 font-mono text-xs font-bold uppercase flex items-center justify-between">
                    <span>MUTUALAN</span>
                    <span>[03]</span>
                  </div>
                  <div className="p-4">
                    <p className="font-mono text-3xl sm:text-4xl font-bold text-[#181615]">
                      {data.mutuals.length.toLocaleString('id-ID')}
                    </p>
                    <p className="font-mono text-[11px] text-[#5C574F] mt-1">
                      SALING FOLLOW AKUR
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveCategory('followers')}
                  className={`text-left border-2 border-[#181615] bg-[#FBF8EF] transition cursor-pointer ${
                    activeCategory === 'followers' || activeCategory === 'following'
                      ? 'shadow-[6px_6px_0px_#181615] -translate-x-0.5 -translate-y-0.5'
                      : 'shadow-[3px_3px_0px_#181615] hover:bg-[#F1ECDD]'
                  }`}
                >
                  <div className="bg-[#3B5BDB] text-[#FBF8EF] border-b-2 border-[#181615] px-3.5 py-1.5 font-mono text-xs font-bold uppercase flex items-center justify-between">
                    <span>FLW / FOLLOWING</span>
                    <span>[04]</span>
                  </div>
                  <div className="p-4">
                    <p className="font-mono text-2xl sm:text-3xl font-bold text-[#181615]">
                      {data.followers.length.toLocaleString('id-ID')}
                      <span className="text-[#8C8576]">/</span>
                      {data.following.length.toLocaleString('id-ID')}
                    </p>
                    <p className="font-mono text-[11px] text-[#5C574F] mt-1">
                      RASIO:{' '}
                      {data.following.length > 0
                        ? (data.followers.length / data.following.length).toFixed(2)
                        : '0.00'}
                      x
                    </p>
                  </div>
                </button>
              </div>

              {/* Filing-Cabinet Category Selector */}
              <div className="flex flex-wrap items-center gap-2">
                {visibleTabs.map((tab) => {
                  const isActive = activeCategory === tab.key;
                  const badgeCount =
                    tab.key === 'notFollowingBack'
                      ? effectiveNotFollowingBackCount
                      : tab.accounts.length;

                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveCategory(tab.key)}
                      className={`retro-btn text-xs px-3 py-1.5 ${
                        isActive ? 'retro-btn-ink' : 'retro-btn-cream'
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span
                        className={`px-1.5 py-0.2 text-[10px] border ${
                          isActive
                            ? 'bg-[#F4B942] text-[#181615] border-[#181615]'
                            : 'bg-[#E6DFD0] text-[#181615] border-[#181615]'
                        }`}
                      >
                        {badgeCount}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Ledger Account Table */}
              {currentCategoryMeta && (
                <AccountList
                  title={currentCategoryMeta.label}
                  subtitle={currentCategoryMeta.subtitle}
                  category={currentCategoryMeta.key}
                  accounts={currentCategoryMeta.accounts}
                  whitelist={whitelist}
                  checkedUnfollowed={checkedUnfollowed}
                  onToggleWhitelist={handleToggleWhitelist}
                  onToggleChecked={handleToggleChecked}
                />
              )}
            </div>
          )
        )}
      </main>

      {/* Retro Print Colophon Footer */}
      <footer className="border-t-2 border-[#181615] bg-[#E6DFD0] py-4 mt-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 font-mono text-[11px] text-[#181615]">
          <span>INSTA-TRACKER '98 // CLIENT-SIDE ARCHIVE READER</span>
          <span>SUPPORT: .ZIP / .JSON / .HTML (META EXPORT 2022–2026)</span>
        </div>
      </footer>

      {/* How-to Modal */}
      {showGuideModal && (
        <HowToRequestGuide isModal onClose={() => setShowGuideModal(false)} />
      )}

      {/* Upload Replacement Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#181615]/70">
          <div className="w-full max-w-2xl">
            <div className="retro-window">
              <WindowTitleBar
                title="GANTI_DISK_DATA_BARU.ZIP"
                variant="yellow"
                onClose={() => setShowUploadModal(false)}
              />
              <div className="p-4 sm:p-5 bg-[#DCD5C1]">
                <UploadDropzone
                  compact
                  onFilesSelected={handleFilesSelected}
                  onLoadDemo={handleLoadDemo}
                  isLoading={isLoading}
                  error={error}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
