import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { TEST_RECORDS, TEST_VEHICLES } from '../../test/fixtures';
import { ServiceRecord } from '../../types';
import { Button } from './Button';
import { PASSIVE_MODAL_BEHAVIOR } from './ModalShell';
import {
  handoffRecordEdit,
  RecordDetailActions,
  RecordDetailModal,
} from './RecordDetailModal';

const richRecord: ServiceRecord = {
  ...TEST_RECORDS[0],
  title: 'Complete brake service',
  complaintReason: 'Brake vibration under load',
  verificationNeeded: true,
  partsReplaced: [
    {
      id: 'part-1',
      name: 'Front brake pads',
      partNumber: 'PAD-100',
      manufacturer: 'Fictional Parts',
      quantity: 1,
      unitCost: 35,
      totalCost: 35,
    },
  ],
  fluidsAndMaterials: [
    {
      id: 'fluid-1',
      name: 'Brake fluid',
      specification: 'DOT 4',
      quantity: 1,
      unitOfMeasure: 'Quarts',
      unitCost: 12,
      totalCost: 12,
    },
  ],
  notes: 'Recheck after 500 miles.',
  evidenceFilename: 'brake-service.pdf',
  evidencePage: 2,
  duplicateGroupId: 'duplicate-group-1',
};

const renderRecord = (record: ServiceRecord) =>
  renderToStaticMarkup(
    <RecordDetailModal
      record={record}
      vehicle={TEST_VEHICLES[0]}
      currencySymbol="$"
      onClose={vi.fn()}
      onEdit={vi.fn()}
      onDelete={vi.fn().mockResolvedValue(undefined)}
    />
  );

describe('RecordDetailModal', () => {
  it('provides an accessible modal name and preserves key rendered fields', () => {
    const markup = renderRecord(richRecord);
    const labelledBy = markup.match(/aria-labelledby="([^"]+)"/)?.[1];

    expect(labelledBy).toBeTruthy();
    expect(markup).toContain(`id="${labelledBy}"`);
    expect(markup).toContain('Complete brake service');
    expect(markup).toContain('2022 Aurora Cityline');
    expect(markup).toContain('Fictional Auto Lab');
    expect(markup).toContain('Routine inspection');
    expect(markup).toContain('Documented Payment');
    expect(markup).toContain('$50.00');
  });

  it('preserves conditional detail and evidence sections', () => {
    const richMarkup = renderRecord(richRecord);
    const minimalMarkup = renderRecord(TEST_RECORDS[0]);

    expect(richMarkup).toContain('Complaint / Reason for Service');
    expect(richMarkup).toContain('Parts Replaced (1)');
    expect(richMarkup).toContain('Fluids &amp; Materials (1)');
    expect(richMarkup).toContain('Recheck after 500 miles.');
    expect(richMarkup).toContain('brake-service.pdf');
    expect(richMarkup).toContain('(Page 2)');
    expect(richMarkup).toContain('Duplicate Group ID: duplicate-group-1');

    expect(minimalMarkup).not.toContain('Complaint / Reason for Service');
    expect(minimalMarkup).not.toContain('Parts Replaced (');
    expect(minimalMarkup).not.toContain('Fluids &amp; Materials (');
    expect(minimalMarkup).not.toContain('brake-service.pdf');
  });

  it('forwards close, edit, and delete-request actions unchanged', () => {
    const onRequestDelete = vi.fn();
    const onClose = vi.fn();
    const onEdit = vi.fn();
    const view = RecordDetailActions({
      onRequestDelete,
      onClose,
      onEdit,
    }) as React.ReactElement<{ children?: React.ReactNode }>;
    const actions = React.Children.toArray(view.props.children);
    const deleteButton = actions[0] as React.ReactElement<
      React.ButtonHTMLAttributes<HTMLButtonElement>
    >;
    const nonDestructiveActions = actions[1] as React.ReactElement<{
      children?: React.ReactNode;
    }>;
    const [closeButton, editButton] = React.Children.toArray(
      nonDestructiveActions.props.children
    ) as React.ReactElement<React.ComponentProps<typeof Button>>[];
    const event = {} as React.MouseEvent<HTMLButtonElement>;

    deleteButton.props.onClick?.(event);
    closeButton.props.onClick?.(event);
    editButton.props.onClick?.(event);

    expect(onRequestDelete).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
    expect(onEdit).toHaveBeenCalledOnce();
  });

  it('preserves close-before-edit handoff ordering and record identity', () => {
    const calls: string[] = [];
    const onClose = vi.fn(() => calls.push('close'));
    const onEdit = vi.fn((record: ServiceRecord) => {
      calls.push(`edit:${record.id}`);
    });

    handoffRecordEdit(richRecord, onClose, onEdit);

    expect(calls).toEqual(['close', `edit:${richRecord.id}`]);
    expect(onEdit).toHaveBeenCalledExactlyOnceWith(richRecord);
  });

  it('retains the existing passive Escape, overlay, and focus behavior', () => {
    expect(PASSIVE_MODAL_BEHAVIOR).toEqual({
      closeOnEscape: false,
      closeOnOverlayClick: false,
      autoFocus: false,
      trapFocus: false,
      restoreFocus: false,
    });
  });
});
