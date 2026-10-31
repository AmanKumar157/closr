import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Download,
  Eye,
  Trash2,
  Upload,
  FileUp,
  CheckCircle2,
  Folder
} from 'lucide-react';
import toast from 'react-hot-toast';
import analysisService from '../../../services/analysisService.js';
import Card from '../../../components/common/Card.jsx';
import Button from '../../../components/common/Button.jsx';
import Loader from '../../../components/common/Loader.jsx';
import PdfViewerModal from '../../../components/common/PdfViewerModal.jsx';

export const UploadedResumesSection = ({ defaultTargetRole = '' }) => {
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUploadBox, setShowUploadBox] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadTargetRole, setUploadTargetRole] = useState(defaultTargetRole || '');
  const [isUploading, setIsUploading] = useState(false);
  const [pdfModalData, setPdfModalData] = useState(null);
  const fileInputRef = useRef(null);

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 KB';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const loadResumes = async () => {
    try {
      setLoading(true);
      const res = await analysisService.getAnalyses();
      if (res.success && res.data?.analyses) {
        setAnalyses(res.data.analyses);
      }
    } catch (err) {
      toast.error('Failed to load uploaded resumes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResumes();
  }, []);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be under 5MB.');
        return;
      }
      setUploadFile(file);
    }
  };

  const handleUploadResumeSubmit = async (e, forceOverwrite = false) => {
    if (e) e.preventDefault();
    if (!uploadFile) {
      toast.error('Please select a resume file (PDF or DOCX).');
      return;
    }
    const role = uploadTargetRole.trim() || defaultTargetRole || 'Software Engineer';

    const formData = new FormData();
    formData.append('resume', uploadFile);
    formData.append('targetRole', role);
    if (forceOverwrite) {
      formData.append('overwrite', 'true');
    }

    try {
      setIsUploading(true);
      const res = await analysisService.createAnalysis(formData);
      if (res.success) {
        toast.success(`Resume "${uploadFile.name}" uploaded successfully!`);
        setUploadFile(null);
        setUploadTargetRole('');
        setShowUploadBox(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
        await loadResumes();
      }
    } catch (err) {
      if (err.response?.status === 409 || err.message?.includes('already exists')) {
        if (window.confirm('A resume with this file name and content already exists for this role. Do you want to overwrite it with this upload?')) {
          await handleUploadResumeSubmit(null, true);
          return;
        }
      } else {
        toast.error(err.response?.data?.message || err.message || 'Failed to upload resume.');
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadOriginalFile = async (analysisId, fileName) => {
    try {
      toast.loading(`Downloading ${fileName}...`, { id: `download-${analysisId}` });
      await analysisService.downloadOriginalResumeFile(analysisId, fileName);
      toast.success('Download complete!', { id: `download-${analysisId}` });
    } catch (err) {
      toast.error('Failed to download resume file.', { id: `download-${analysisId}` });
    }
  };

  const handleViewOriginalResume = (analysis) => {
    setPdfModalData({
      title: analysis.fileName || 'Uploaded Resume',
      targetRole: analysis.targetRole,
      score: null,
      analysisId: analysis._id,
      hasOriginalPdf: analysis.hasOriginalPdf !== false,
      rawResumeText: analysis.resumeText || ''
    });
  };

  const handleDeleteUploadedResume = async (analysisId, fileName) => {
    if (!window.confirm(`Permanently remove "${fileName}" from your account? This will delete this uploaded resume document.`)) {
      return;
    }
    try {
      const res = await analysisService.deleteAnalysis(analysisId);
      if (res.success) {
        toast.success(`"${fileName}" deleted from database.`);
        setAnalyses((prev) => prev.filter((a) => a._id !== analysisId));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete resume.');
    }
  };

  return (
    <Card className="shadow-sm space-y-6">
      {/* Header with Title and + Upload Resume Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center shrink-0">
            <Folder className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Your Uploaded Resume Documents ({analyses.length})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Original resumes uploaded to your account. View in PDF reader, download, or delete anytime.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowUploadBox((prev) => !prev)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer shrink-0"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>{showUploadBox ? 'Close Upload Box' : '+ Upload Resume'}</span>
        </button>
      </div>

      {/* Inline Upload Dropzone Card */}
      {(showUploadBox || (analyses.length === 0 && !loading)) && (
        <div className="bg-slate-50/70 rounded-2xl border-2 border-dashed border-indigo-200 p-6 sm:p-7 space-y-5 shadow-2xs animate-fadeIn">
          <div className="text-center max-w-md mx-auto space-y-1">
            <div className="w-11 h-11 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center mx-auto mb-2">
              <FileUp className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Upload Original Resume</h3>
            <p className="text-xs text-slate-500">
              Upload your PDF or DOCX file (up to 5MB) to keep it in your documents.
            </p>
          </div>

          <form onSubmit={handleUploadResumeSubmit} className="max-w-lg mx-auto space-y-4">
            {/* File Dropzone Area */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors bg-white ${
                uploadFile
                  ? 'border-emerald-400 bg-emerald-50/20'
                  : 'border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/20'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleFileSelect}
                className="hidden"
              />
              {uploadFile ? (
                <div className="flex items-center justify-center gap-2 text-emerald-700 font-semibold text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="truncate max-w-xs">{uploadFile.name}</span>
                  <span className="text-slate-400 font-normal">({formatFileSize(uploadFile.size)})</span>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-slate-700">Click to browse or drag & drop resume file</p>
                  <p className="text-[11px] text-slate-400">Supported: PDF, DOCX (Max 5MB)</p>
                </div>
              )}
            </div>

            {/* Target Role Field */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Target Role / Position <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={uploadTargetRole}
                onChange={(e) => setUploadTargetRole(e.target.value)}
                placeholder="e.g. Software Engineer, QA Tester, Full Stack Developer"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-1">
              {analyses.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadBox(false);
                    setUploadFile(null);
                  }}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              )}
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isUploading}
                disabled={!uploadFile || isUploading}
              >
                <Upload className="w-3.5 h-3.5 mr-1.5" />
                Upload Document
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Resumes List */}
      {loading ? (
        <div className="py-8 flex justify-center">
          <Loader text="Loading your uploaded resumes..." />
        </div>
      ) : analyses.length === 0 ? (
        <div className="bg-slate-50/50 rounded-2xl border border-slate-200 p-8 text-center space-y-2">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <FileText className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">No Resumes Uploaded Yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Upload your resume above to keep it safely in your profile, view in the PDF reader, or use it to generate tailored ATS resumes.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {analyses.map((a) => (
            <div
              key={a._id}
              className="bg-white rounded-2xl border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all p-4.5 flex flex-col justify-between gap-3.5"
            >
              <div className="flex items-start gap-3">
                {/* Document Icon Badge */}
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 border border-rose-200/80 flex items-center justify-center shrink-0 shadow-2xs">
                  <FileText className="w-5 h-5" />
                </div>

                {/* File Details */}
                <div className="min-w-0 flex-1">
                  <h4
                    className="text-sm font-bold text-slate-900 truncate"
                    title={a.fileName || 'Uploaded Resume'}
                  >
                    {a.fileName || 'Uploaded_Resume.pdf'}
                  </h4>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 text-xs text-slate-500">
                    <span className="font-semibold text-slate-700">{a.targetRole || 'General'}</span>
                    <span>•</span>
                    <span>{formatFileSize(a.fileSize)}</span>
                    <span>•</span>
                    <span>
                      {new Date(a.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions: View, Download, Delete (Zero extra scores/skills) */}
              <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {/* View in PDF Viewer */}
                  <button
                    type="button"
                    onClick={() => handleViewOriginalResume(a)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200 hover:border-indigo-200 rounded-lg transition-colors cursor-pointer"
                    title="Open in PDF viewer"
                  >
                    <Eye className="w-3.5 h-3.5 text-indigo-500" />
                    <span>View</span>
                  </button>

                  {/* Download Original File */}
                  <button
                    type="button"
                    onClick={() => handleDownloadOriginalFile(a._id, a.fileName)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200 hover:border-emerald-200 rounded-lg transition-colors cursor-pointer"
                    title="Download original file"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Download</span>
                  </button>
                </div>

                {/* Delete From Database */}
                <button
                  type="button"
                  onClick={() => handleDeleteUploadedResume(a._id, a.fileName)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-lg transition-colors cursor-pointer"
                  title="Permanently delete from database"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* PDF Viewer Popup Modal */}
      {pdfModalData && (
        <PdfViewerModal
          isOpen={Boolean(pdfModalData)}
          onClose={() => setPdfModalData(null)}
          title={pdfModalData.title}
          targetRole={pdfModalData.targetRole}
          score={pdfModalData.score}
          analysisId={pdfModalData.analysisId}
          resumeId={pdfModalData.resumeId}
          htmlContent={pdfModalData.htmlContent}
          hasOriginalPdf={pdfModalData.hasOriginalPdf}
          rawResumeText={pdfModalData.rawResumeText}
        />
      )}
    </Card>
  );
};

export default UploadedResumesSection;
