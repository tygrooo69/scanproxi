
import React from 'react';

interface FileUploaderProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onFileSelect, disabled }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  return (
    <div className={`relative group ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
      <input
        type="file"
        accept="application/pdf"
        onChange={handleChange}
        disabled={disabled}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
      />
      <div className="border-2 border-dashed border-slate-300 group-hover:border-blue-500 group-hover:bg-blue-50 transition-all rounded-xl p-10 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 mb-4 bg-slate-100 group-hover:bg-blue-100 text-slate-400 group-hover:text-blue-600 rounded-full flex items-center justify-center transition-colors">
          <i className="fas fa-file-pdf text-3xl"></i>
        </div>
        <p className="text-slate-700 font-bold mb-1">Cliquer pour télécharger le PDF</p>
        <p className="text-slate-400 text-xs uppercase tracking-widest font-semibold">Format PDF uniquement</p>
      </div>
    </div>
  );
};

export default FileUploader;
