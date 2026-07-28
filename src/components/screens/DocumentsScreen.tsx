import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { DocumentItem } from '../../types';
import {
  FileText,
  UploadCloud,
  Plus,
  FileCheck,
  Download,
  Eye,
  Trash2,
  X,
  File,
} from 'lucide-react';

export const DocumentsScreen: React.FC = () => {
  const { documents, activeVehicle, addDocument } = useApp();
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Upload Form state
  const [docTitle, setDocTitle] = useState('');
  const [docCategory, setDocCategory] = useState<DocumentItem['category']>('Invoice');
  const [fileName, setFileName] = useState('New_Document.pdf');

  const vehicleDocs = documents.filter((d) => d.vehicleId === activeVehicle.id);

  const filteredDocs = vehicleDocs.filter((d) => {
    if (selectedCategory === 'ALL') return true;
    return d.category === selectedCategory;
  });

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTitle || isSubmitting) return;
    setIsSubmitting(true);

    try {
      await addDocument({
        vehicleId: activeVehicle.id,
        title: docTitle,
        category: docCategory,
        uploadDate: new Date().toISOString().split('T')[0],
        fileSize: '1.1 MB',
        fileName: fileName || 'Uploaded_Document.pdf',
        fileType: 'application/pdf',
        status: 'Verified',
        isSampleData: false,
      });
      setShowUploadModal(false);
      setDocTitle('');
    } catch {
      // AppContext surfaces the persistence failure.
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl shadow-sm">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FileText className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <span>Vehicle Documents & Attachments</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Store PDF invoices, inspection certificates, owner manuals & registration cards for <span className="font-semibold text-slate-700 dark:text-slate-200">{activeVehicle.year} {activeVehicle.make} {activeVehicle.model}</span>.
          </p>
        </div>

        <button
          onClick={() => setShowUploadModal(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-lg shadow-md transition-colors flex items-center gap-2 shrink-0"
        >
          <UploadCloud className="w-4 h-4 stroke-[2.5]" />
          <span>Upload Document</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
          <span>Filter Category:</span>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 font-bold"
          >
            <option value="ALL">All Categories</option>
            <option value="Invoice">Invoices</option>
            <option value="Manual">Manuals</option>
            <option value="Registration">Registration</option>
            <option value="Warranty">Warranty</option>
            <option value="Inspection">Inspection</option>
          </select>
        </div>

        <div className="text-xs font-mono font-semibold text-slate-500">
          Showing {filteredDocs.length} files
        </div>
      </div>

      {/* Documents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredDocs.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
            <File className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">No documents found</h3>
            <p className="text-xs text-slate-500 mt-1">Upload an invoice or document PDF to attach it to this vehicle.</p>
          </div>
        ) : (
          filteredDocs.map((doc) => (
            <div
              key={doc.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all flex items-start justify-between gap-3"
            >
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0">
                  <FileText className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">
                    {doc.category}
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug">
                    {doc.title}
                  </h3>
                  <div className="text-[11px] text-slate-500 font-mono flex items-center gap-2">
                    <span>{doc.fileName}</span>
                    <span>•</span>
                    <span>{doc.fileSize}</span>
                    <span>•</span>
                    <span>{doc.uploadDate}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => alert(`Simulated document view/download for sample file: ${doc.fileName}`)}
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0"
                title="View / Download File"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-indigo-600" />
                <span>Upload Document PDF</span>
              </h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-1 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Document Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Annual Smog Inspection Report"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Document Category</label>
                <select
                  value={docCategory}
                  onChange={(e) => setDocCategory(e.target.value as DocumentItem['category'])}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                >
                  <option value="Invoice">Invoice / Receipt</option>
                  <option value="Manual">Manual</option>
                  <option value="Registration">Registration / DMV</option>
                  <option value="Warranty">Warranty</option>
                  <option value="Inspection">Inspection Report</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">File Name</label>
                <input
                  type="text"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-700 shadow-md"
                >
                  Upload
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
