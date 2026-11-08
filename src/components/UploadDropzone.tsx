import React, { useRef, useState } from 'react';
import { FolderOpen, Play, Upload } from 'lucide-react';
import { FloppyDiskIllustration, WindowTitleBar } from './RetroIcons';

interface UploadDropzoneProps {
  onFilesSelected: (files: File[]) => Promise<void>;
  onLoadDemo: () => void;
  isLoading: boolean;
  error: string | null;
  compact?: boolean;
  onCloseModal?: () => void;
}

async function readEntryRecursively(entry: FileSystemEntry): Promise<File[]> {
  if (entry.isFile) {
    const fileEntry = entry as FileSystemFileEntry;
    return new Promise((resolve) => {
      fileEntry.file(
        (file) => {
          Object.defineProperty(file, 'webkitRelativePath', {
            value: entry.fullPath.replace(/^\//, ''),
            configurable: true,
          });
          resolve([file]);
        },
        () => resolve([])
      );
    });
  }

  if (entry.isDirectory) {
    const dirEntry = entry as FileSystemDirectoryEntry;
    const reader = dirEntry.createReader();
    const allEntries: FileSystemEntry[] = [];

    const readBatch = (): Promise<FileSystemEntry[]> =>
      new Promise((resolve) => {
        reader.readEntries(
          (entries) => resolve(entries),
          () => resolve([])
        );
      });

    let batch = await readBatch();
    while (batch.length > 0) {
      allEntries.push(...batch);
      batch = await readBatch();
    }

    const nested = await Promise.all(allEntries.map(readEntryRecursively));
    return nested.flat();
  }

  return [];
}

export const UploadDropzone: React.FC<UploadDropzoneProps> = ({
  onFilesSelected,
  onLoadDemo,
  isLoading,
  error,
  compact = false,
  onCloseModal,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (isLoading) return;

    const items = e.dataTransfer.items;
    if (items && items.length > 0) {
      const entries: FileSystemEntry[] = [];
      for (let i = 0; i < items.length; i++) {
        const entry = items[i].webkitGetAsEntry?.();
        if (entry) entries.push(entry);
      }

      if (entries.length > 0) {
        const collected = (await Promise.all(entries.map(readEntryRecursively))).flat();
        if (collected.length > 0) {
          await onFilesSelected(collected);
          return;
        }
      }
    }

    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      await onFilesSelected(droppedFiles);
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = '';
    if (selected.length > 0) {
      await onFilesSelected(selected);
    }
  };

  return (
    <div className="space-y-4">
      <div className="retro-window">
        <WindowTitleBar
          title="DRIVE_A:\MASUKKAN_DATA_IG.ZIP"
          rightTag={isLoading ? 'READING...' : 'READY'}
          onClose={onCloseModal}
        />

        <div className={compact ? 'p-4 sm:p-5' : 'p-5 sm:p-7'}>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed border-[#181615] transition-colors ${
              isDragging ? 'bg-[#F4B942]/40' : 'bg-[#F1ECDD]'
            } ${compact ? 'p-5' : 'p-6 sm:p-10'}`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".zip,.json,.html,.htm"
              onChange={handleFileInput}
              className="hidden"
            />
            <input
              ref={folderInputRef}
              type="file"
              // @ts-expect-error webkitdirectory is standard across modern browsers
              webkitdirectory="true"
              multiple
              onChange={handleFileInput}
              className="hidden"
            />

            <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8 max-w-3xl mx-auto">
              <div className="shrink-0">
                <FloppyDiskIllustration isSpinning={isLoading} />
              </div>

              <div className="flex-1 text-center md:text-left space-y-3">
                <div className="inline-block font-mono text-[11px] font-bold uppercase tracking-wider bg-[#181615] text-[#F4B942] px-2.5 py-0.5">
                  {isLoading ? '>>> MEMBACA ISI ARSIP...' : 'SLOT ARSIP RESMI META'}
                </div>

                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#181615] leading-snug">
                  {isLoading
                    ? 'Tunggu bentar bre, lagi bongkar daftar followers...'
                    : 'Tarik & Lepas File .ZIP Hasil Request IG ke Sini'}
                </h2>

                <p className="text-sm text-[#4A463F] leading-relaxed">
                  Gak usah diekstrak dulu! Langsung lempar file{' '}
                  <code className="bg-[#FBF8EF] border border-[#181615] px-1.5 py-0.5 text-xs font-bold">
                    .zip
                  </code>{' '}
                  dari email/notif Instagram, atau pilih manual{' '}
                  <code className="bg-[#FBF8EF] border border-[#181615] px-1.5 py-0.5 text-xs font-bold">
                    followers_1.json
                  </code>{' '}
                  &amp;{' '}
                  <code className="bg-[#FBF8EF] border border-[#181615] px-1.5 py-0.5 text-xs font-bold">
                    following.json
                  </code>
                  . Format HTML juga otomatis ketangkep!
                </p>

                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-2">
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => fileInputRef.current?.click()}
                    className="retro-btn retro-btn-red text-xs sm:text-sm px-4 py-2.5"
                  >
                    <Upload className="w-4 h-4 stroke-[2.5]" />
                    <span>PILIH FILE .ZIP / .JSON</span>
                  </button>

                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => folderInputRef.current?.click()}
                    className="retro-btn retro-btn-cream text-xs sm:text-sm px-3.5 py-2.5"
                  >
                    <FolderOpen className="w-4 h-4 stroke-[2.2]" />
                    <span>BUKA FOLDER</span>
                  </button>

                  {!compact && (
                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={onLoadDemo}
                      className="retro-btn retro-btn-yellow text-xs sm:text-sm px-3.5 py-2.5"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>TES DATA DEMO</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Classic Bottom Status Bar */}
        <div className="border-t-2 border-[#181615] bg-[#E6DFD0] px-4 py-2 flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] text-[#181615]">
          <span>MODE: 100% LOKAL DI BROWSER (OFFLINE-SAFE)</span>
          <span className="font-bold text-[#2D8A75]">● TANPA LOGIN IG / ANTI-CHECKPOINT</span>
        </div>
      </div>

      {error && (
        <div className="retro-window bg-[#FDE8E4]">
          <WindowTitleBar title="ERROR_BACA_ARSIP.LOG" variant="red" rightTag="ERR!" />
          <div className="p-4 font-mono text-xs sm:text-sm text-[#181615] space-y-1">
            <p className="font-bold text-[#DF4B2F] uppercase">[!] FILE TIDAK VALID ATAU KOSONG:</p>
            <p>{error}</p>
          </div>
        </div>
      )}
    </div>
  );
};
