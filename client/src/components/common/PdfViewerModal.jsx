import React, { useState, useRef } from 'react';
import {
  X,
  Download,
  Printer,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  FileText,
  ShieldCheck,
  Columns,
  ExternalLink,
  Sparkles,
  RotateCcw
} from 'lucide-react';
import Button from './Button.jsx';
import resumeService from '../../services/resumeService.js';

export const PdfViewerModal = ({
  isOpen,
  onClose,
  title = 'Resume Document',
  targetRole = '',
  score = null,
  htmlContent = '',
  analysisId = null,
  resumeId = null,
  hasOriginalPdf = false,
  rawResumeText = ''
}) => {
  if (!isOpen) return null;

  // View modes: 'ats' (A4 print layout) | 'native' (Puppeteer stream) | 'original' (uploaded PDF) | 'split'
  const [activeTab, setActiveTab] = useState(
    htmlContent ? 'ats' : hasOriginalPdf ? 'original' : 'ats'
  );
  const [zoom, setZoom] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const printRef = useRef(null);

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 15, 175));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 15, 60));
  const handleResetZoom = () => setZoom(100);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (resumeId) {
      try {
        const res = await resumeService.downloadPdf(resumeId);
        const blob = new Blob([res], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${title.replace(/\.[^/.]+$/, '')}_ATS.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      } catch (err) {
        window.print();
      }
    } else {
      window.print();
    }
  };

  const originalPdfUrl = analysisId ? resumeService.getOriginalPdfUrl(analysisId) : null;
  const nativePdfUrl = resumeId
    ? `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/resume/${resumeId}/pdf?inline=true`
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-xs animate-fadeIn">
      {/* Modal Container */}
      <div
        className={`bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-200 ${
          isFullscreen ? 'w-full h-full rounded-none' : 'w-full max-w-6xl h-[92vh]'
        }`}
      >
        {/* PDF Viewer Dark Toolbar */}
        <div className="bg-slate-900 text-slate-200 px-4 py-2.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Document Identity */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/30">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-xs sm:text-sm truncate max-w-[200px] sm:max-w-xs">
                  {title}
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-900/60 text-indigo-300 border border-indigo-700/50 uppercase">
                  PDF
                </span>
                {score !== null && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                    Match: {score}%
                  </span>
                )}
              </div>
              {targetRole && (
                <div className="text-[11px] text-slate-400 truncate">
                  Role: <strong className="text-slate-300">{targetRole}</strong> • A4 Standard (210 × 297 mm)
                </div>
              )}
            </div>
          </div>

          {/* Center Tabs: View Switcher */}
          <div className="flex items-center rounded-lg bg-slate-800/90 p-0.5 border border-slate-700/70 text-xs">
            {htmlContent && (
              <button
                type="button"
                onClick={() => setActiveTab('ats')}
                className={`px-3 py-1 rounded-md font-semibold transition-all flex items-center gap-1.5 ${
                  activeTab === 'ats'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>ATS Formatted (A4)</span>
              </button>
            )}

            {resumeId && (
              <button
                type="button"
                onClick={() => setActiveTab('native')}
                className={`px-3 py-1 rounded-md font-semibold transition-all flex items-center gap-1.5 ${
                  activeTab === 'native'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Native PDF Reader</span>
              </button>
            )}

            {analysisId && (
              <button
                type="button"
                onClick={() => setActiveTab('original')}
                className={`px-3 py-1 rounded-md font-semibold transition-all flex items-center gap-1.5 ${
                  activeTab === 'original'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Original Upload</span>
              </button>
            )}

            {htmlContent && analysisId && (
              <button
                type="button"
                onClick={() => setActiveTab('split')}
                className={`px-3 py-1 rounded-md font-semibold transition-all hidden sm:flex items-center gap-1.5 ${
                  activeTab === 'split'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Columns className="w-3.5 h-3.5" />
                <span>Side-by-Side</span>
              </button>
            )}
          </div>

          {/* Right Controls: Zoom, Print, Download, Close */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Zoom Controls */}
            <div className="flex items-center bg-slate-800 rounded-lg border border-slate-700 px-1 py-0.5 text-xs text-slate-300">
              <button
                type="button"
                onClick={handleZoomOut}
                title="Zoom Out"
                className="p-1 hover:text-white rounded hover:bg-slate-700"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleResetZoom}
                title="Reset to 100%"
                className="px-2 font-mono text-[11px] hover:text-white"
              >
                {zoom}%
              </button>
              <button
                type="button"
                onClick={handleZoomIn}
                title="Zoom In"
                className="p-1 hover:text-white rounded hover:bg-slate-700"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              title="Print Document (Ctrl+P)"
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700 transition-colors"
            >
              <Printer className="w-4 h-4" />
            </button>

            {/* Download Button */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              title="Download PDF File"
              className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1 shadow-sm transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download</span>
            </button>

            {/* Fullscreen Toggle */}
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-700 transition-colors"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Close Modal */}
            <button
              type="button"
              onClick={onClose}
              title="Close PDF Viewer"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 border border-slate-700 transition-colors ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* PDF Reader Canvas Area */}
        <div className="flex-1 bg-[#525659] overflow-auto p-4 sm:p-8 flex justify-center items-start scrollbar-thin">
          {activeTab === 'native' && nativePdfUrl ? (
            /* Native Browser PDF Reader Stream (Puppeteer Generated) */
            <div className="w-full h-full max-w-5xl bg-white shadow-2xl rounded-sm overflow-hidden flex flex-col">
              <iframe
                src={nativePdfUrl}
                className="w-full h-full border-none min-h-[750px]"
                title="CareerPilot Native PDF Reader"
              />
            </div>
          ) : activeTab === 'original' && originalPdfUrl ? (
            /* Original Uploaded PDF File Stream */
            <div className="w-full h-full max-w-5xl bg-white shadow-2xl rounded-sm overflow-hidden flex flex-col">
              <iframe
                src={originalPdfUrl}
                className="w-full h-full border-none min-h-[750px]"
                title="Original Uploaded PDF"
              />
            </div>
          ) : activeTab === 'split' ? (
            /* Side-by-Side Comparison Canvas */
            <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-7xl">
              <div className="flex flex-col bg-slate-900/60 p-2 rounded-xl border border-slate-700">
                <span className="text-xs font-bold text-slate-300 mb-2 px-2 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-indigo-400" />
                  Original Resume
                </span>
                <div className="h-[800px] w-full bg-white rounded shadow-xl overflow-hidden">
                  <iframe
                    src={originalPdfUrl}
                    className="w-full h-full border-none"
                    title="Original Uploaded PDF"
                  />
                </div>
              </div>

              <div className="flex flex-col bg-slate-900/60 p-2 rounded-xl border border-slate-700">
                <span className="text-xs font-bold text-emerald-400 mb-2 px-2 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  ATS-Optimized A4 Version
                </span>
                <div className="h-[800px] w-full bg-white rounded shadow-xl overflow-y-auto p-6 sm:p-10 text-slate-900">
                  <div
                    className="prose prose-slate max-w-none text-slate-900 text-xs"
                    dangerouslySetInnerHTML={{ __html: htmlContent }}
                  />
                </div>
              </div>
            </div>
          ) : (
            /* Standard A4 Paper Document Sheet (Authentic PDF Page Look) */
            <div
              style={{
                transform: `scale(${zoom / 100})`,
                transformOrigin: 'top center',
                transition: 'transform 0.15s ease-out'
              }}
              className="w-full max-w-[794px] min-h-[1123px] bg-white text-slate-900 shadow-2xl border border-slate-300 p-8 sm:p-14 my-4 mb-20 rounded-[1px] relative print:m-0 print:p-0 print:shadow-none print:border-none"
              ref={printRef}
            >
              {htmlContent ? (
                <div
                  className="resume-html-preview prose prose-slate max-w-none text-slate-900 text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: htmlContent }}
                />
              ) : (
                /* Fallback Formatted Document */
                <div className="space-y-4 font-mono text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
                  <div className="border-b-2 border-slate-900 pb-3 mb-4">
                    <h2 className="text-lg font-bold text-slate-900 font-sans">{title}</h2>
                    <p className="text-xs text-slate-500 font-sans">
                      Target Position: <strong>{targetRole}</strong> • CareerPilot Document Viewer
                    </p>
                  </div>
                  <div>{rawResumeText || 'Document content preview...'}</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Status Bar */}
        <div className="bg-slate-900 px-4 py-1.5 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span>CareerPilot In-App PDF Engine</span>
            <span>•</span>
            <span className="text-emerald-400">100% ATS Single-Column Layout</span>
            <span>•</span>
            <span>Page 1 of 1</span>
          </div>
          <div className="flex items-center gap-3">
            <span>Zoom: {zoom}%</span>
            <span>•</span>
            <button
              type="button"
              onClick={handleResetZoom}
              className="text-indigo-400 hover:text-indigo-300 underline"
            >
              Fit Width
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PdfViewerModal;

