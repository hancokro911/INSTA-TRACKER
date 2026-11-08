import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { WindowTitleBar } from './RetroIcons';

interface HowToRequestGuideProps {
  isModal?: boolean;
  onClose?: () => void;
}

const STEPS = [
  {
    step: '01',
    title: 'Masuk Pusat Akun IG',
    desc: 'Buka aplikasi Instagram → masuk ke Profil → ketuk garis tiga [≡] di kanan atas → pilih Pusat Akun (Accounts Center).',
  },
  {
    step: '02',
    title: 'Menu Unduh Informasi',
    desc: 'Pilih Informasi dan izin Anda → Unduh informasi Anda → ketuk tombol Mengunduh atau mentransfer informasi.',
  },
  {
    step: '03',
    title: 'Centang Followers & Following Aja',
    desc: 'Pilih akun IG lo → klik Beberapa informasi Anda → scroll ke Koneksi lalu centang Pengikut dan mengikuti.',
    note: 'TIPS: Jangan pilih "Semua informasi" biar gak ikut download foto/video bergiga-giga!',
  },
  {
    step: '04',
    title: 'Setel Rentang Waktu & Format',
    desc: 'Pilih Unduh ke perangkat, terus wajib pastiin dua setelan ini sebelum klik Buat File:',
    stamps: ['RENTANG: SEPANJANG WAKTU (ALL TIME)', 'FORMAT: JSON (HTML JUGA BISA)'],
  },
  {
    step: '05',
    title: 'Tunggu File Matang (2–15 Menit)',
    desc: 'Tunggu email/notif dari Meta. Begitu siap, tinggal klik Unduh buat nyimpen file .ZIP ke HP atau laptop.',
  },
  {
    step: '06',
    title: 'Cemplungin .ZIP ke Drive Atas',
    desc: 'Tanpa perlu ekstrak, langsung upload file .ZIP itu ke kotak floppy disk di atas buat nguliti siapa yang gak follback!',
  },
];

export const HowToRequestGuide: React.FC<HowToRequestGuideProps> = ({ isModal, onClose }) => {
  const innerWindow = (
    <div className="retro-window">
      <WindowTitleBar
        title="MANUAL_CARA_MINTA_DATA_IG.TXT"
        variant="yellow"
        rightTag="6 STEP"
        onClose={isModal ? onClose : undefined}
      />

      <div className="p-5 sm:p-7 space-y-6">
        {/* Manual Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 retro-dashed-b pb-5">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-widest text-[#DF4B2F]">
              DOKUMEN PANDUAN // WAJIB MINTA DATA DULU
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#181615] mt-1 tracking-tight">
              Cara Request File Data Resmi dari Instagram
            </h2>
            <p className="text-sm text-[#4A463F] mt-1">
              Ikuti urutan ini biar file cepet jadi &amp; hasil deteksi unfollowers akurat 100%.
            </p>
          </div>

          <a
            href="https://accountscenter.instagram.com/info_and_permissions/dyi/"
            target="_blank"
            rel="noopener noreferrer"
            className="retro-btn retro-btn-ink text-xs px-4 py-2.5 shrink-0 self-start md:self-auto"
          >
            <span>BUKA PUSAT AKUN META</span>
            <ArrowUpRight className="w-4 h-4" />
          </a>
        </div>

        {/* Print Manual 6-Cell Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {STEPS.map((item) => (
            <div
              key={item.step}
              className="border-2 border-[#181615] bg-[#F1ECDD] p-4 flex flex-col justify-between shadow-[3px_3px_0px_#181615]"
            >
              <div>
                <div className="flex items-center justify-between border-b-2 border-[#181615] pb-2.5 mb-3">
                  <span className="font-mono text-xs font-bold bg-[#181615] text-[#FBF8EF] px-2 py-0.5">
                    STEP #{item.step}
                  </span>
                  <span className="font-mono text-[11px] text-[#5C574F]">IG_EXPORT</span>
                </div>

                <h3 className="font-bold text-base text-[#181615] mb-1.5">{item.title}</h3>
                <p className="text-sm text-[#3D3A34] leading-relaxed">{item.desc}</p>
              </div>

              {item.note && (
                <div className="mt-3 bg-[#F4B942] border-2 border-[#181615] p-2.5 font-mono text-[11px] font-semibold text-[#181615]">
                  {item.note}
                </div>
              )}

              {item.stamps && (
                <div className="mt-3 space-y-1.5">
                  {item.stamps.map((stamp) => (
                    <div
                      key={stamp}
                      className="bg-[#2D8A75] text-[#FBF8EF] border-2 border-[#181615] px-2.5 py-1 font-mono text-[11px] font-bold"
                    >
                      ✓ {stamp}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  if (!isModal) {
    return <section>{innerWindow}</section>;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[#181615]/70">
      <div className="w-full max-w-5xl max-h-[92vh] overflow-y-auto">{innerWindow}</div>
    </div>
  );
};
