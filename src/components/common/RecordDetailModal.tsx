import React, { useState } from 'react';
import { ServiceRecord, Vehicle } from '../../types';
import { ConfidenceBadge, StatusBadge } from './Badges';
import { Button } from './Button';
import { Card } from './Card';
import { ConfirmDialog } from './ConfirmDialog';
import {
  ModalShell,
  PASSIVE_MODAL_BEHAVIOR,
} from './ModalShell';
import { getProviderDisplayName, getVehicleDisplayName, formatMileage } from '../../utils/formatters';
import {
  FileText,
  Calendar,
  Gauge,
  MapPin,
  Wrench,
  DollarSign,
  AlertTriangle,
  Tag,
  Edit,
  Trash2,
  FileCheck,
  Building2,
  ShieldAlert,
  Package,
  Droplet,
  Layers,
} from 'lucide-react';

interface RecordDetailModalProps {
  record: ServiceRecord | null;
  vehicle?: Vehicle;
  currencySymbol: string;
  onClose: () => void;
  onEdit: (record: ServiceRecord) => void;
  onDelete: (recordId: string) => Promise<void>;
}

interface RecordDetailActionsProps {
  onRequestDelete: () => void;
  onClose: () => void;
  onEdit: () => void;
}

export const RecordDetailActions: React.FC<RecordDetailActionsProps> = ({
  onRequestDelete,
  onClose,
  onEdit,
}) => (
  <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
    <button
      onClick={onRequestDelete}
      className="px-4 py-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 text-xs font-bold flex items-center gap-1.5 transition-colors"
    >
      <Trash2 className="w-4 h-4" />
      <span>Delete Record</span>
    </button>

    <div className="flex items-center gap-2">
      <Button variant="secondary" onClick={onClose} className="text-xs">
        Close
      </Button>

      <Button onClick={onEdit} className="text-xs">
        <Edit className="w-4 h-4" />
        <span>Edit Record</span>
      </Button>
    </div>
  </div>
);

export const handoffRecordEdit = (
  record: ServiceRecord,
  onClose: () => void,
  onEdit: (record: ServiceRecord) => void
) => {
  onClose();
  onEdit(record);
};

export const RecordDetailModal: React.FC<RecordDetailModalProps> = ({
  record,
  vehicle,
  currencySymbol,
  onClose,
  onEdit,
  onDelete,
}) => {
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!record) return null;

  const laborCost = Number(record.laborCost) || 0;
  const partsCost = Number(record.partsCost) || 0;
  const fees = Number(record.fees) || 0;
  const tax = Number(record.tax) || 0;
  const processingFee = Number(record.processingFee) || 0;
  const discount = Number(record.discount) || 0;
  const dealerCredit = Number(record.dealerCredit) || 0;
  const finalTotal = Number(record.finalInvoiceTotal || record.totalCost) || 0;
  const actualPayment = Number(record.actualDocumentedPayment ?? finalTotal) || 0;

  const providerName = getProviderDisplayName(record.provider);
  const displayDate = record.serviceDate || record.date || 'Unknown Date';
  const mileageIn = record.mileageIn ?? record.mileage;

  return (
    <>
      <ModalShell
        isOpen
        title={
          <span className="record-detail-heading">
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
                  {record.category}
                </span>
                <ConfidenceBadge grade={record.confidenceGrade} />
                <StatusBadge status={record.status} />
                {record.verificationNeeded && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3" />
                    <span>Verification Needed</span>
                  </span>
                )}
              </span>

              <span className="record-detail-heading__title">
                <span>{record.title || record.workPerformed}</span>
              </span>

              <span className="record-detail-heading__meta">
                <span>
                  {vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : 'Vehicle'}
                </span>
                {record.invoiceNumber && (
                  <>
                    <span>•</span>
                    <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                      RO / Invoice #{record.invoiceNumber}
                    </span>
                  </>
                )}
              </span>
          </span>
        }
        onClose={onClose}
        {...PASSIVE_MODAL_BEHAVIOR}
        className="record-detail-modal max-w-2xl"
      >

          {/* Quick Metrics Bar */}
          <Card variant="raised" className="record-detail-card grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Service Date</span>
              <div className="font-mono font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1 mt-0.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                <span>{displayDate}</span>
              </div>
              <span className="text-[9px] text-slate-400 font-mono">({record.datePrecision || 'Exact'})</span>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Odometer In / Out</span>
              <div className="font-mono font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1 mt-0.5">
                <Gauge className="w-3.5 h-3.5 text-indigo-500" />
                <span>{formatMileage(mileageIn, 'Not documented')}</span>
              </div>
              <span className="text-[9px] text-slate-400 font-mono">
                {record.mileageOut !== undefined && record.mileageOut !== null ? `Out: ${formatMileage(record.mileageOut, 'Not documented')}` : `(${record.mileagePrecision || 'Exact'})`}
              </span>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Provider / Shop</span>
              <div className="font-bold text-slate-900 dark:text-slate-100 truncate mt-0.5 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                <span className="truncate">{providerName}</span>
              </div>
              <span className="text-[9px] text-slate-400 truncate block">{record.location || 'N/A'}</span>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Documented Payment</span>
              <div className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm mt-0.5">
                {currencySymbol}{actualPayment.toFixed(2)}
              </div>
              <span className="text-[9px] text-slate-400 block font-mono">
                Invoice Total: {currencySymbol}{finalTotal.toFixed(2)}
              </span>
            </div>
          </Card>

          {/* Work Performed & Complaint Reason */}
          <div className="space-y-3 text-xs">
            {record.complaintReason && (
              <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-1">
                <span className="font-bold text-amber-700 dark:text-amber-400 block uppercase text-[10px] tracking-wider">
                  Complaint / Reason for Service
                </span>
                <p className="text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                  {record.complaintReason}
                </p>
              </div>
            )}

            <Card variant="raised" className="record-detail-card space-y-1">
              <span className="font-bold text-slate-700 dark:text-slate-300 block uppercase text-[10px] tracking-wider">
                Work Performed & Diagnostic Findings
              </span>
              <p className="text-slate-800 dark:text-slate-200 font-medium whitespace-pre-wrap leading-relaxed">
                {record.workPerformed || 'No work performed detail provided.'}
              </p>
            </Card>
          </div>

          {/* Parts Replaced Section */}
          {record.partsReplaced && record.partsReplaced.length > 0 && (
            <div className="space-y-2 text-xs">
              <span className="font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Package className="w-4 h-4 text-indigo-500" />
                <span>Parts Replaced ({record.partsReplaced.length})</span>
              </span>

              <Card variant="raised" className="divide-y divide-slate-200 dark:divide-slate-800">
                {record.partsReplaced.map((p, idx) => (
                  <div key={idx} className="p-3 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-900 dark:text-slate-100 block">{p.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {p.partNumber ? `PN: ${p.partNumber}` : ''} {p.manufacturer ? `• ${p.manufacturer}` : ''} Qty: {p.quantity}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      {currencySymbol}{(p.totalCost || p.unitCost * p.quantity || 0).toFixed(2)}
                    </span>
                  </div>
                ))}
              </Card>
            </div>
          )}

          {/* Fluids and Materials Section */}
          {record.fluidsAndMaterials && record.fluidsAndMaterials.length > 0 && (
            <div className="space-y-2 text-xs">
              <span className="font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Droplet className="w-4 h-4 text-blue-500" />
                <span>Fluids & Materials ({record.fluidsAndMaterials.length})</span>
              </span>

              <Card variant="raised" className="divide-y divide-slate-200 dark:divide-slate-800">
                {record.fluidsAndMaterials.map((f, idx) => (
                  <div key={idx} className="p-3 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-900 dark:text-slate-100 block">{f.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {f.specification ? `Spec: ${f.specification}` : ''} Qty: {f.quantity} {f.unitOfMeasure}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      {currencySymbol}{(f.totalCost || f.unitCost * f.quantity || 0).toFixed(2)}
                    </span>
                  </div>
                ))}
              </Card>
            </div>
          )}

          {/* Financial Itemized Accounting */}
          <Card variant="raised" className="record-detail-card record-detail-card--spacious space-y-3 text-xs">
            <span className="font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-emerald-500" />
              <span>Financial Accounting Breakdown</span>
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-slate-600 dark:text-slate-300 font-mono text-[11px]">
              <div>
                <span className="text-[10px] text-slate-400 block font-sans font-semibold">Labor</span>
                <span>{currencySymbol}{laborCost.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-sans font-semibold">Parts</span>
                <span>{currencySymbol}{partsCost.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-sans font-semibold">Fees</span>
                <span>{currencySymbol}{fees.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-sans font-semibold">Tax</span>
                <span>{currencySymbol}{tax.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-sans font-semibold">Processing Fee</span>
                <span>{currencySymbol}{processingFee.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-sans font-semibold">Discount</span>
                <span className="text-emerald-600 dark:text-emerald-400">-{currencySymbol}{discount.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-sans font-semibold">Dealer Credit</span>
                <span className="text-emerald-600 dark:text-emerald-400">-{currencySymbol}{dealerCredit.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-sans font-semibold">Actual Payment</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">{currencySymbol}{actualPayment.toFixed(2)}</span>
              </div>
            </div>
          </Card>

          {/* Notes & Evidence Source */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {record.notes && (
              <Card variant="raised" className="record-detail-card space-y-1">
                <span className="font-bold text-slate-700 dark:text-slate-300 block uppercase text-[10px]">Notes</span>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{record.notes}</p>
              </Card>
            )}

            <Card variant="raised" className="record-detail-card space-y-1">
              <span className="font-bold text-slate-700 dark:text-slate-300 block uppercase text-[10px]">Source & Evidence</span>
              <p className="text-slate-600 dark:text-slate-300">
                Source Type: <span className="font-bold">{record.sourceType || 'UserEntry'}</span>
              </p>
              {record.evidenceFilename && (
                <p className="text-indigo-600 dark:text-indigo-400 font-mono text-[11px] font-semibold flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5" />
                  <span>{record.evidenceFilename} {record.evidencePage ? `(Page ${record.evidencePage})` : ''}</span>
                </p>
              )}
              {record.duplicateGroupId && (
                <p className="text-[10px] text-slate-400 font-mono">Duplicate Group ID: {record.duplicateGroupId}</p>
              )}
            </Card>
          </div>

          {/* Bottom Action Footer */}
          <RecordDetailActions
            onRequestDelete={() => setShowConfirmDelete(true)}
            onClose={onClose}
            onEdit={() => handoffRecordEdit(record, onClose, onEdit)}
          />
      </ModalShell>

      <ConfirmDialog
        isOpen={showConfirmDelete}
        title="Delete Service Record"
        message={`Are you sure you want to permanently delete the service record "${record.title || record.workPerformed}"?`}
        confirmText="Yes, Delete Record"
        isConfirming={isDeleting}
        onConfirm={async () => {
          if (isDeleting) return;
          setIsDeleting(true);
          try {
            await onDelete(record.id);
            setShowConfirmDelete(false);
            onClose();
          } catch {
            // AppContext surfaces the persistence failure.
          } finally {
            setIsDeleting(false);
          }
        }}
        onCancel={() => setShowConfirmDelete(false)}
      />
    </>
  );
};
