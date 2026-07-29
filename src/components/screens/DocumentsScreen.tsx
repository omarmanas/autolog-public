import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { DocumentItem } from '../../types';
import { Button } from '../common/Button';
import { Card } from '../common/Card';
import { EmptyState } from '../common/EmptyState';
import { FormControl } from '../common/FormControl';
import {
  ModalShell,
  PASSIVE_MODAL_BEHAVIOR,
} from '../common/ModalShell';
import {
  FileText,
  UploadCloud,
  Plus,
  FileCheck,
  Download,
  Eye,
  Trash2,
  File,
} from 'lucide-react';

interface DocumentsFilterCardProps {
  selectedCategory: string;
  onCategoryChange: React.ChangeEventHandler<HTMLSelectElement>;
  resultCount: number;
}

export const DocumentsFilterCard: React.FC<DocumentsFilterCardProps> = ({
  selectedCategory,
  onCategoryChange,
  resultCount,
}) => (
  <Card className="screen-filter-card screen-filter-card--inline">
    <FormControl className="screen-inline-filter" label="Filter Category:">
      <select value={selectedCategory} onChange={onCategoryChange}>
        <option value="ALL">All Categories</option>
        <option value="Invoice">Invoices</option>
        <option value="Manual">Manuals</option>
        <option value="Registration">Registration</option>
        <option value="Warranty">Warranty</option>
        <option value="Inspection">Inspection</option>
      </select>
    </FormControl>

    <div className="screen-filter-count">Showing {resultCount} files</div>
  </Card>
);

interface DocumentViewButtonProps {
  onClick: React.MouseEventHandler<HTMLButtonElement>;
}

export const DocumentViewButton: React.FC<DocumentViewButtonProps> = ({
  onClick,
}) => (
  <Button
    onClick={onClick}
    variant="secondary"
    iconOnly
    aria-label="View / Download File"
    title="View / Download File"
    className="shrink-0"
  >
    <Download className="w-4 h-4" />
  </Button>
);

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
      <Card className="screen-header-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FileText className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <span>Vehicle Documents & Attachments</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Store PDF invoices, inspection certificates, owner manuals & registration cards for <span className="font-semibold text-slate-700 dark:text-slate-200">{activeVehicle.year} {activeVehicle.make} {activeVehicle.model}</span>.
          </p>
        </div>

        <Button
          onClick={() => setShowUploadModal(true)}
          className="text-xs shrink-0"
        >
          <UploadCloud className="w-4 h-4 stroke-[2.5]" />
          <span>Upload Document</span>
        </Button>
      </Card>

      {/* Filter Bar */}
      <DocumentsFilterCard
        selectedCategory={selectedCategory}
        onCategoryChange={(e) => setSelectedCategory(e.target.value)}
        resultCount={filteredDocs.length}
      />

      {/* Documents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredDocs.length === 0 ? (
          <EmptyState
            className="col-span-full"
            icon={<File className="w-10 h-10" />}
            title="No documents found"
            description="Upload an invoice or document PDF to attach it to this vehicle."
          />
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

              <DocumentViewButton
                onClick={() => alert(`Simulated document view/download for sample file: ${doc.fileName}`)}
              />
            </div>
          ))
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <ModalShell
          isOpen
          title={
            <span className="flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-indigo-600" />
                <span>Upload Document PDF</span>
            </span>
          }
          onClose={() => setShowUploadModal(false)}
          {...PASSIVE_MODAL_BEHAVIOR}
          className="max-w-md"
        >

            <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs">
              <FormControl
                className="modal-form-control"
                label="Document Title *"
              >
                <input
                  type="text"
                  required
                  placeholder="e.g. Annual Smog Inspection Report"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                />
              </FormControl>

              <FormControl
                className="modal-form-control"
                label="Document Category"
              >
                <select
                  value={docCategory}
                  onChange={(e) => setDocCategory(e.target.value as DocumentItem['category'])}
                  className="font-semibold"
                >
                  <option value="Invoice">Invoice / Receipt</option>
                  <option value="Manual">Manual</option>
                  <option value="Registration">Registration / DMV</option>
                  <option value="Warranty">Warranty</option>
                  <option value="Inspection">Inspection Report</option>
                </select>
              </FormControl>

              <FormControl className="modal-form-control" label="File Name">
                <input
                  type="text"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  className="font-mono"
                />
              </FormControl>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <Button
                  variant="secondary"
                  onClick={() => setShowUploadModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                >
                  Upload
                </Button>
              </div>
            </form>
        </ModalShell>
      )}
    </div>
  );
};
