import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, CheckCircle2, AlertCircle, X } from 'lucide-react';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.doc'];

export const ResumeDropzone = ({ file, onFileSelect, onFileRemove, error }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [validationError, setValidationError] = useState('');
  const fileInputRef = useRef(null);

  const validateAndSetFile = (selectedFile) => {
    setValidationError('');

    if (!selectedFile) return;

    // Check file size
    if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
      setValidationError('File size exceeds 5MB limit. Please upload a smaller file.');
      return;
    }

    // Check file extension
    const fileName = selectedFile.name.toLowerCase();
    const hasValidExt = ALLOWED_EXTENSIONS.some((ext) => fileName.endsWith(ext));
    if (!hasValidExt) {
      setValidationError('Only PDF and DOCX files are supported.');
      return;
    }

    onFileSelect(selectedFile);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const activeError = validationError || error;

  return (
    <div className="w-full space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,.doc,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {!file ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-indigo-500 bg-indigo-50/50 scale-[0.99]'
              : 'border-slate-300 hover:border-indigo-400 bg-white hover:bg-slate-50/50'
          }`}
        >
          <div className="mx-auto w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 mb-3 shadow-inner">
            <UploadCloud className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-slate-800">
            Click to upload or drag & drop your resume
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Accepts PDF or DOCX formats (up to 5MB)
          </p>
        </div>
      ) : (
        <div className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">
                {file.name}
              </p>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>{formatFileSize(file.size)}</span>
                <span>•</span>
                <span className="text-emerald-600 flex items-center gap-0.5 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Ready for parsing
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onFileRemove();
              if (fileInputRef.current) fileInputRef.current.value = '';
            }}
            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-3 shrink-0"
            title="Remove file"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {activeError && (
        <p className="text-xs font-medium text-red-600 flex items-center gap-1.5 mt-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          {activeError}
        </p>
      )}
    </div>
  );
};

export default ResumeDropzone;

