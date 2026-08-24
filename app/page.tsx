'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Settings, HelpCircle, Sun, User, FileAudio, ArrowRight, 
  Upload, Cpu, HardDrive, Globe, CheckCircle2, Volume2, 
  AudioLines, Download, ChevronDown, Link as LinkIcon
} from 'lucide-react';

type ProcessState = 'idle' | 'customize' | 'converting' | 'done';

export default function SonicConvert() {
  const [processState, setProcessState] = useState<ProcessState>('idle');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [originalName, setOriginalName] = useState('');
  const [fileName, setFileName] = useState('');
  
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [bitrate, setBitrate] = useState(320);
  const [channelMode, setChannelMode] = useState<'stereo'|'mono'>('stereo');
  
  const [downloadUrl, setDownloadUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFile = (file: File) => {
    setPendingFile(file);
    setOriginalName(file.name);
    const baseName = file.name.replace(/\.[^/.]+$/, "");
    setFileName(`${baseName}.mp3`);
    setProcessState('customize');
  };

  const processFile = async () => {
    if (!pendingFile) return;
    setProcessState('converting');
    setProgress(0);
    setStatusText('Reading file locally...');
    
    try {
      const arrayBuffer = await pendingFile.arrayBuffer();
      setStatusText('Decoding audio data...');
      
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      setStatusText('Initializing encoder...');
      const lamejsModule = await import('lamejs');
      const lamejs = lamejsModule.default || lamejsModule;
      
      const fileChannels = audioBuffer.numberOfChannels;
      const targetChannels = channelMode === 'mono' ? 1 : fileChannels;
      const sampleRate = audioBuffer.sampleRate;
      
      const mp3encoder = new lamejs.Mp3Encoder(targetChannels, sampleRate, bitrate);
      const mp3Data: Int8Array[] = [];
      
      const left = audioBuffer.getChannelData(0);
      const right = fileChannels > 1 ? audioBuffer.getChannelData(1) : left;
      
      const sampleBlockSize = 1152;
      
      const floatTo16BitPCM = (input: Float32Array) => {
        const output = new Int16Array(input.length);
        for (let i = 0; i < input.length; i++) {
          let s = Math.max(-1, Math.min(1, input[i]));
          output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        return output;
      };
      
      setStatusText('Preparing buffers...');
      await new Promise(r => setTimeout(r, 10));
      
      const left16 = floatTo16BitPCM(left);
      const right16 = fileChannels > 1 ? floatTo16BitPCM(right) : new Int16Array(0);
      
      const totalSamples = left16.length;
      let offset = 0;
      
      const encodeChunk = () => {
        if (offset < totalSamples) {
          const length = Math.min(totalSamples - offset, sampleBlockSize);
          const leftChunk = left16.subarray(offset, offset + length);
          let mp3buf;
          
          if (targetChannels > 1 && fileChannels > 1) {
            const rightChunk = right16.subarray(offset, offset + length);
            mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk);
          } else {
            // Mix to mono or use left channel
            mp3buf = (mp3encoder as any).encodeBuffer(leftChunk);
          }
          
          if (mp3buf.length > 0) {
            mp3Data.push(mp3buf);
          }
          
          offset += length;
          const currentProgress = Math.floor((offset / totalSamples) * 100);
          setProgress(currentProgress);
          setStatusText(`Encoding bitstream frames: ${currentProgress}%`);
          
          requestAnimationFrame(encodeChunk);
        } else {
          const mp3buf = mp3encoder.flush();
          if (mp3buf.length > 0) {
            mp3Data.push(mp3buf);
          }
          
          const blob = new Blob(mp3Data as any[], { type: 'audio/mp3' });
          const url = URL.createObjectURL(blob);
          setDownloadUrl(url);
          setStatusText('Conversion complete');
          setProcessState('done');
        }
      };
      
      requestAnimationFrame(encodeChunk);
      
    } catch (err) {
      console.error(err);
      setStatusText('Error processing file. Please try another.');
      setTimeout(() => setProcessState('idle'), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-[#dfe2ef] font-sans selection:bg-[#f97316]/30">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto border-b border-white/5">
        <div className="flex items-center gap-8">
          <div 
            className="flex items-center gap-2 text-xl font-bold tracking-tight text-[#f97316] cursor-pointer"
            onClick={() => {
              setProcessState('idle');
              setPendingFile(null);
            }}
          >
            <AudioLines size={24} />
            M4A to MP3 converter.com
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-white/50">
            <button className="text-white border-b-2 border-[#f97316] pb-1">Tools</button>
            <button className="hover:text-white transition-colors">Blog</button>
          </div>
        </div>
        <div className="flex items-center gap-4 text-white/50">
          <button className="hover:text-white transition-colors p-2"><Sun size={18} /></button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-6 pt-12 pb-24">
        <AnimatePresence mode="wait">
          
          {/* ============================================================== */}
          {/* HOME PAGE (IDLE STATE) */}
          {/* ============================================================== */}
          {processState === 'idle' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-16"
            >
              {/* Hero Section */}
              <div className="text-center space-y-4 pt-6">
                <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-white">
                  M4A to MP3 Converter
                </h1>
                <p className="text-lg text-white/60">
                  Professional client-side encoding. Fast, secure, and precise.
                </p>
              </div>

              {/* Dropzone Container */}
              <div className="bg-[#111827] border border-white/10 rounded-2xl p-8 md:p-12 max-w-3xl mx-auto">
                <div className="flex flex-col md:flex-row items-center justify-between mb-8 pb-8 border-b border-white/5 gap-6">
                  <div>
                    <h2 className="text-sm tracking-widest font-mono text-white/50 font-bold uppercase">Encoding Settings</h2>
                  </div>
                  <div className="flex items-center gap-4 w-full md:w-auto">
                    <label className="text-sm text-white/50 whitespace-nowrap">Bitrate:</label>
                    <div className="relative w-full md:w-64">
                      <select 
                        value={bitrate}
                        onChange={(e) => setBitrate(Number(e.target.value))}
                        className="w-full appearance-none bg-[#090d16] border border-white/10 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-[#f97316] transition-colors cursor-pointer text-sm"
                      >
                        <option value={128}>128 kbps (Mobile Optimized)</option>
                        <option value={192}>192 kbps (Standard)</option>
                        <option value={256}>256 kbps (Premium)</option>
                        <option value={320}>320 kbps (High Quality)</option>
                      </select>
                      <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 pointer-events-none" size={14} />
                    </div>
                  </div>
                </div>

                <div 
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  className="border-2 border-dashed border-white/20 rounded-xl py-24 hover:border-[#f97316]/50 hover:bg-[#f97316]/5 transition-all cursor-pointer group flex flex-col items-center justify-center gap-6 relative overflow-hidden"
                >
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[#f97316]/0 group-hover:bg-[#f97316]/10 rounded-full blur-3xl pointer-events-none transition-all duration-500" />
                  
                  <input type="file" accept=".m4a,audio/mp4,audio/x-m4a" className="hidden" ref={fileInputRef} onChange={handleFileSelect} />
                  <div className="flex items-center justify-center gap-8 opacity-70 group-hover:opacity-100 transition-opacity z-10">
                    <FileBadge type="M4A" />
                    <ArrowRight className="text-white/30" />
                    <FileBadge type="MP3" active />
                  </div>
                  <div className="text-center z-10 mt-6 flex flex-col items-center w-full">
                    <h3 className="text-2xl font-semibold text-white mb-2">Drop M4A file here</h3>
                    <p className="text-white/50 mb-8">or click to browse from your device</p>
                    
                    <div className="flex flex-col items-center gap-4 w-full max-w-sm">
                      <div className="flex items-center gap-3 w-full opacity-60">
                         <div className="h-px bg-white/20 flex-1" />
                         <span className="text-[10px] font-mono text-white/50 uppercase tracking-widest">or import from</span>
                         <div className="h-px bg-white/20 flex-1" />
                      </div>
                      <div className="flex items-center justify-center gap-3">
                        <button 
                          className="flex items-center gap-2 bg-[#090d16] border border-white/10 hover:border-white/30 text-white/70 hover:text-white hover:bg-[#1c2438] rounded-lg px-4 py-2 transition-all text-sm font-medium shadow-sm"
                          onClick={(e) => { e.stopPropagation(); alert("Google Drive integration coming soon!"); }}
                        >
                          <GoogleDriveIcon size={16} />
                          Drive
                        </button>
                        <button 
                          className="flex items-center gap-2 bg-[#090d16] border border-white/10 hover:border-white/30 text-white/70 hover:text-white hover:bg-[#1c2438] rounded-lg px-4 py-2 transition-all text-sm font-medium shadow-sm"
                          onClick={(e) => { e.stopPropagation(); alert("Dropbox integration coming soon!"); }}
                        >
                          <DropboxIcon size={16} />
                          Dropbox
                        </button>
                        <button 
                          className="flex items-center gap-2 bg-[#090d16] border border-white/10 hover:border-white/30 text-white/70 hover:text-white hover:bg-[#1c2438] rounded-lg px-4 py-2 transition-all text-sm font-medium shadow-sm"
                          onClick={(e) => { e.stopPropagation(); alert("URL import coming soon!"); }}
                        >
                          <LinkIcon size={16} />
                          URL
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Info Cards Section */}
              <div className="text-center mb-10 pt-8">
                 <h2 className="text-3xl font-semibold text-white mb-10">How it Works</h2>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
                    <div className="bg-[#111827] border border-white/10 rounded-2xl p-8 space-y-4 hover:border-white/20 transition-colors">
                      <div className="bg-[#090d16] w-12 h-12 rounded-lg flex items-center justify-center border border-white/5 mb-6 text-[#f97316]">
                        <Upload size={20} />
                      </div>
                      <h4 className="font-semibold text-white">1. Upload</h4>
                      <p className="text-sm text-white/60 leading-relaxed">Select your M4A file. Processing happens entirely in your browser for maximum privacy.</p>
                    </div>
                    <div className="bg-[#111827] border border-white/10 rounded-2xl p-8 space-y-4 hover:border-white/20 transition-colors">
                      <div className="bg-[#090d16] w-12 h-12 rounded-lg flex items-center justify-center border border-white/5 mb-6 text-[#f97316]">
                        <Settings size={20} />
                      </div>
                      <h4 className="font-semibold text-white">2. Configure</h4>
                      <p className="text-sm text-white/60 leading-relaxed">Choose your desired bitrate. Higher bitrates ensure high-fidelity audio conversion.</p>
                    </div>
                    <div className="bg-[#111827] border border-white/10 rounded-2xl p-8 space-y-4 hover:border-white/20 transition-colors">
                      <div className="bg-[#090d16] w-12 h-12 rounded-lg flex items-center justify-center border border-white/5 mb-6 text-[#f97316]">
                        <Cpu size={20} />
                      </div>
                      <h4 className="font-semibold text-white">3. Convert</h4>
                      <p className="text-sm text-white/60 leading-relaxed">Our client-side engine uses advanced audio compression to generate your MP3 instantly.</p>
                    </div>
                 </div>
              </div>

              {/* Rationale Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-4xl mx-auto">
                 <div className="space-y-6">
                    <h3 className="text-xl font-semibold text-white">M4A vs MP3: Technical Breakdown</h3>
                    <p className="text-white/60 text-sm leading-relaxed">
                      While both are lossy formats, M4A (MPEG-4 Audio) typically uses the AAC codec, which is more efficient than the MP3 (MPEG-1 Audio Layer III) standard at lower bitrates.
                    </p>
                    <ul className="space-y-3 mt-4">
                      <li className="flex items-start gap-3">
                        <CheckCircle2 size={16} className="text-[#f97316] mt-1 shrink-0" />
                        <span className="text-sm text-white/80"><strong>M4A:</strong> Better quality-to-size ratio, primarily used in the Apple ecosystem.</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <CheckCircle2 size={16} className="text-[#f97316] mt-1 shrink-0" />
                        <span className="text-sm text-white/80"><strong>MP3:</strong> Universal compatibility across every digital device and legacy player.</span>
                      </li>
                    </ul>
                 </div>

                 <div className="space-y-6">
                    <h3 className="text-xl font-semibold text-white">Why Convert?</h3>
                    <p className="text-white/60 text-sm leading-relaxed">
                      The primary reason for conversion is <strong>universal compatibility</strong>. While M4A offers great efficiency, MP3 remains the global standard for audio distribution.
                    </p>
                    <p className="text-white/60 text-sm leading-relaxed">
                      Converting from <strong>lossless to lossy</strong> or between lossy formats requires precision. Our tool uses high-quality LAME encoding to minimize generational loss during the <strong>audio compression</strong> process.
                    </p>
                 </div>
              </div>
              
              {/* FAQ Area */}
              <div className="bg-[#111827] border border-white/10 rounded-2xl p-8 max-w-4xl mx-auto">
                <h3 className="text-xl font-semibold text-white mb-8">Frequently Asked Questions</h3>
                <div className="space-y-6">
                  <div>
                    <h4 className="text-[#f97316] font-medium mb-2">Is my data secure?</h4>
                    <p className="text-sm text-white/60">Yes. Unlike other converters, your files never leave your computer. All processing is done locally in your browser's memory using the Web Audio API.</p>
                  </div>
                  <div className="pt-6 border-t border-white/5">
                    <h4 className="text-[#f97316] font-medium mb-2">What is the best bitrate for high-fidelity?</h4>
                    <p className="text-sm text-white/60">We recommend 320 kbps for the best balance of file size and audio transparency, ensuring a professional-grade listening experience.</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ============================================================== */}
          {/* CUSTOMIZE PAGE (ACTIVE STATE) */}
          {/* ============================================================== */}
          {processState !== 'idle' && (
            <motion.div
              key="customize"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-10"
            >
              {/* Hero Section */}
              <div className="text-center space-y-4 pt-4">
                <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-white">
                  Customize Conversion
                </h1>
                <p className="text-lg text-white/60">
                  Adjust parameters to optimize your MP3 output for quality or file size.
                </p>
              </div>

              {/* Top Status Panel */}
              <div className="bg-[#111827] border border-white/10 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#f97316]/5 rounded-full blur-3xl pointer-events-none" />
                
                <div className="flex flex-col items-center gap-3 z-10 w-full md:w-auto md:min-w-[150px]">
                  <FileBadge type="M4A" size="sm" />
                  <span className="font-mono text-[10px] text-white/50 tracking-wider truncate max-w-[150px] uppercase">
                    SRC: {originalName}
                  </span>
                </div>

                <div className="flex-1 w-full flex flex-col items-center gap-3 z-10">
                  {processState === 'customize' && (
                     <>
                       <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                         <div className="w-1/3 h-full bg-[#f97316] rounded-full opacity-50" />
                       </div>
                       <span className="font-mono text-xs text-[#f97316] tracking-widest font-bold">READY TO PROCESS</span>
                     </>
                  )}
                  {processState === 'converting' && (
                     <>
                       <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden shadow-[0_0_15px_rgba(249,115,22,0.3)]">
                         <motion.div 
                           className="h-full bg-[#f97316] rounded-full" 
                           style={{ width: `${progress}%` }}
                         />
                       </div>
                       <span className="font-mono text-xs text-[#f97316] tracking-widest font-bold">ENCODING: {progress}%</span>
                       <span className="text-[10px] text-white/40 uppercase tracking-widest">{statusText}</span>
                     </>
                  )}
                  {processState === 'done' && (
                     <>
                       <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                         <div className="w-full h-full bg-[#10b981] rounded-full shadow-[0_0_15px_rgba(16,185,129,0.3)]" />
                       </div>
                       <span className="font-mono text-xs text-[#10b981] tracking-widest font-bold">CONVERSION COMPLETE</span>
                     </>
                  )}
                </div>

                <div className="flex flex-col items-center gap-3 z-10 w-full md:w-auto md:min-w-[150px]">
                  <FileBadge type="MP3" size="sm" active />
                  <span className="font-mono text-[10px] text-white/50 tracking-wider truncate max-w-[150px] uppercase">
                    TGT: {fileName}
                  </span>
                </div>
              </div>

              {/* Split View: Settings + Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Settings Panel */}
                <div className={`md:col-span-2 bg-[#111827] border border-white/10 rounded-2xl p-6 md:p-8 space-y-8 relative overflow-hidden transition-opacity ${processState !== 'customize' ? 'opacity-50 pointer-events-none' : ''}`}>
                  <div className="flex items-center gap-3 mb-6">
                    <Settings className="text-[#f97316]" size={20} />
                    <h2 className="text-xl font-semibold text-white">Audio Export Settings</h2>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <label className="font-mono text-xs text-white/50 tracking-wider font-bold">BITRATE (QUALITY)</label>
                      <div className="relative">
                        <select 
                          value={bitrate}
                          onChange={(e) => setBitrate(Number(e.target.value))}
                          className="w-full appearance-none bg-[#090d16] border border-white/10 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-[#f97316] transition-colors cursor-pointer"
                        >
                          <option value={128}>128 kbps (Standard)</option>
                          <option value={192}>192 kbps (High)</option>
                          <option value={256}>256 kbps (Premium)</option>
                          <option value={320}>320 kbps (Lossless-like)</option>
                        </select>
                        <ChevronDownIcon className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 pointer-events-none" size={16} />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="font-mono text-xs text-white/50 tracking-wider font-bold">SAMPLE RATE</label>
                      <div className="relative">
                        <select className="w-full appearance-none bg-[#090d16] border border-white/10 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-[#f97316] transition-colors cursor-pointer">
                          <option>Auto (Preserve Original)</option>
                          <option>44.1 kHz (CD Quality)</option>
                          <option>48.0 kHz (Studio)</option>
                        </select>
                        <ChevronDownIcon className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 pointer-events-none" size={16} />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 pt-6 border-t border-white/5">
                    <label className="font-mono text-xs text-white/50 tracking-wider font-bold">CHANNELS & EFFECTS</label>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                      <div className="flex bg-[#090d16] border border-white/10 rounded-lg p-1 w-full max-w-[240px]">
                        <button 
                          onClick={() => setChannelMode('stereo')}
                          className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${channelMode === 'stereo' ? 'bg-[#1c2438] text-white shadow-sm border border-white/10' : 'text-white/50 hover:text-white'}`}
                        >
                          Stereo
                        </button>
                        <button 
                          onClick={() => setChannelMode('mono')}
                          className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${channelMode === 'mono' ? 'bg-[#1c2438] text-white shadow-sm border border-white/10' : 'text-white/50 hover:text-white'}`}
                        >
                          Mono
                        </button>
                      </div>
                      
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <div className="relative">
                          <input type="checkbox" className="sr-only peer" />
                          <div className="w-10 h-5 bg-white/10 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-[#090d16] after:border-white/20 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#f97316]"></div>
                        </div>
                        <span className="text-sm text-white/70 group-hover:text-white transition-colors">Volume Normalization</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Summary Panel */}
                <div className="bg-[#111827] border border-white/10 rounded-2xl p-6 md:p-8 flex flex-col justify-between">
                   <div>
                     <h3 className="font-mono text-xs text-white/50 tracking-wider font-bold mb-6 flex items-center gap-2">
                       <HardDrive size={14} className="text-[#f97316]" />
                       SUMMARY
                     </h3>
                     
                     <div className="space-y-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-white/60">Format:</span>
                          <span className="text-white font-medium">MP3</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-white/60">Est. Size:</span>
                          <span className="text-white font-medium">
                            {pendingFile ? `~${(pendingFile.size * (bitrate / 256) / 1024 / 1024).toFixed(1)} MB` : '-'}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-white/60">Channels:</span>
                          <span className="text-white font-medium capitalize">{channelMode}</span>
                        </div>
                     </div>
                   </div>

                   <div className="pt-6 mt-6 border-t border-white/5">
                      {processState === 'customize' && (
                        <button 
                          onClick={processFile}
                          className="w-full bg-[#f97316] text-[#090d16] font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-[#ff8a3d] hover:shadow-[0_0_20px_rgba(249,115,22,0.3)] transition-all active:scale-[0.98]"
                        >
                          <Cpu size={20} />
                          START CONVERSION
                        </button>
                      )}
                      {processState === 'converting' && (
                        <button 
                          disabled
                          className="w-full bg-white/5 text-white/50 font-semibold py-4 rounded-xl flex items-center justify-center gap-3 cursor-not-allowed border border-white/5"
                        >
                          <div className="w-5 h-5 border-2 border-[#f97316]/30 border-t-[#f97316] rounded-full animate-spin" />
                          PROCESSING...
                        </button>
                      )}
                      {processState === 'done' && (
                        <a 
                          href={downloadUrl}
                          download={fileName}
                          className="w-full bg-[#10b981] text-[#090d16] font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-[#34d399] transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:scale-[1.02] active:scale-[0.98]"
                        >
                          <Download size={20} />
                          DOWNLOAD MP3
                        </a>
                      )}
                      
                      {processState === 'done' && (
                        <button 
                          onClick={() => {
                            setProcessState('idle');
                            setPendingFile(null);
                            setDownloadUrl('');
                          }}
                          className="w-full mt-4 text-xs text-center text-white/40 hover:text-white transition-colors py-2"
                        >
                          Convert another file
                        </button>
                      )}
                   </div>
                </div>
              </div>
              
              {/* Rationale & Tech Specs for Settings View */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-8">
                <div className="bg-[#111827] border border-white/10 rounded-2xl p-8 space-y-6">
                  <div className="flex items-center gap-3 text-[#f97316]">
                    <Cpu size={24} />
                    <h3 className="text-xl font-semibold text-white">How it Works</h3>
                  </div>
                  <p className="text-sm text-white/60 leading-relaxed mb-4">
                    Our browser-based encoding engine processes your files locally for maximum privacy.
                  </p>
                  <ol className="space-y-4">
                    <li className="flex gap-4 items-start">
                      <span className="font-mono text-[#f97316] text-sm font-bold mt-0.5">01</span>
                      <span className="text-white/80 text-sm">Local file reading via Web Audio API</span>
                    </li>
                    <li className="flex gap-4 items-start">
                      <span className="font-mono text-[#f97316] text-sm font-bold mt-0.5">02</span>
                      <span className="text-white/80 text-sm">PCM data extraction and sample rate normalization</span>
                    </li>
                    <li className="flex gap-4 items-start">
                      <span className="font-mono text-[#f97316] text-sm font-bold mt-0.5">03</span>
                      <span className="text-white/80 text-sm">LAME-based bitstream encoding for MP3 output</span>
                    </li>
                  </ol>
                </div>

                <div className="bg-[#111827] border border-white/10 rounded-2xl p-8 space-y-6">
                  <div className="flex items-center gap-3 text-[#f97316]">
                    <Volume2 size={24} />
                    <h3 className="text-xl font-semibold text-white">Audio Tech Specs</h3>
                  </div>
                  <div className="space-y-6">
                    <div>
                      <h4 className="font-mono text-xs text-white/50 tracking-wider font-bold mb-2">M4A (MPEG-4 Part 14)</h4>
                      <p className="text-white/70 text-sm leading-relaxed">
                        A container format using AAC or ALAC compression, common in Apple ecosystems. Known for superior quality-to-size ratio compared to older formats.
                      </p>
                    </div>
                    <div>
                      <h4 className="font-mono text-xs text-white/50 tracking-wider font-bold mb-2">MP3 (MPEG-1 Audio Layer III)</h4>
                      <p className="text-white/70 text-sm leading-relaxed">
                        The global standard for lossy audio, offering universal device compatibility across almost every digital player and hardware system.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between text-xs text-white/40 gap-4 mt-8">
        <div>
          © 2024 M4A to MP3 converter.com. Technical Precision Audio.
        </div>
        <div className="flex gap-6">
          <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
        </div>
      </footer>
    </div>
  );
}

// Helper Components

function ChevronDownIcon({ className, size = 24 }: { className?: string; size?: number }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <polyline points="6 9 12 15 18 9"></polyline>
    </svg>
  );
}

function FileBadge({ type, size = "lg", active = false }: { type: 'M4A' | 'MP3', size?: 'sm' | 'lg', active?: boolean }) {
  const isSm = size === 'sm';
  return (
    <div className={`relative flex items-center justify-center rounded-xl bg-gradient-to-b from-[#1c2438] to-[#111827] border ${active ? 'border-[#f97316]' : 'border-white/10'} shadow-lg ${isSm ? 'w-16 h-16' : 'w-24 h-24'} ${active ? 'shadow-[0_0_30px_rgba(249,115,22,0.15)]' : ''}`}>
      <FileAudio size={isSm ? 24 : 32} className={`${active ? 'text-[#f97316]' : 'text-white/50'}`} />
      <div className={`absolute -bottom-2 -right-2 font-mono font-bold bg-[#090d16] border ${active ? 'border-[#f97316] text-[#f97316]' : 'border-white/20 text-white/70'} rounded-md flex items-center justify-center shadow-md ${isSm ? 'text-[9px] px-1.5 py-0.5' : 'text-xs px-2 py-1'}`}>
        {type}
      </div>
    </div>
  );
}

function GoogleDriveIcon({ size = 24, className = "" }: { size?: number, className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" className={className}>
      <path d="M7.71 3.5L1.15 15l3.43 6 6.55-11.5M9.73 3.5h13.12l-3.43 6H6.3M15.73 21L22.29 9.5l-3.44-6-6.57 11.5" />
    </svg>
  );
}

function DropboxIcon({ size = 24, className = "" }: { size?: number, className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" className={className}>
      <path d="M12 2.396L5.123 6.843 12 11.282l6.877-4.439zm-6.877 8.886L-1.754 15.72 5.123 20.16 12 15.721zm13.754 0L12 15.721l6.877 4.439 6.877-4.439zM12 21.604l-6.877-4.44V19.96L12 24l6.877-4.04v-2.796z"/>
    </svg>
  );
}
