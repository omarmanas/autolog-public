import React, { useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Vehicle } from '../../types';
import { createEntityId } from '../../utils/ids';
import { Button } from '../common/Button';
import { Card } from '../common/Card';
import {
  Car,
  Plus,
  Gauge,
  CheckCircle2,
  Calendar,
  Sparkles,
  Info,
  X,
  Edit,
  Wrench,
} from 'lucide-react';

export const VehiclesScreen: React.FC = () => {
  const {
    vehicles,
    activeVehicleId,
    setActiveVehicleId,
    addVehicle,
    updateVehicle,
    updateVehicleMileage,
    currencySymbol,
    records,
  } = useApp();

  const [showModal, setShowModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [editingMileageVehId, setEditingMileageVehId] = useState<string | null>(null);
  const [newMileageInput, setNewMileageInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitLockRef = useRef(false);

  // Form states
  const [formMake, setFormMake] = useState('');
  const [formModel, setFormModel] = useState('');
  const [formYear, setFormYear] = useState(2022);
  const [formTrim, setFormTrim] = useState('');
  const [formVin, setFormVin] = useState('');
  const [formPlate, setFormPlate] = useState('');
  const [formMileage, setFormMileage] = useState(15000);
  const [formEngine, setFormEngine] = useState('2.0L I4 Turbo');
  const [formTransmission, setFormTransmission] = useState('Automatic');
  const [formFuelType, setFormFuelType] = useState('Unleaded');
  const [formColor, setFormColor] = useState('Silver Metallic');
  const [formOil, setFormOil] = useState('SAE 0W-20');
  const [formTires, setFormTires] = useState('225/55R17');
  const [formNotes, setFormNotes] = useState('');

  const openAddModal = () => {
    setEditingVehicle(null);
    setFormMake('');
    setFormModel('');
    setFormYear(new Date().getFullYear());
    setFormTrim('Base');
    setFormVin('');
    setFormPlate('');
    setFormMileage(15000);
    setFormEngine('2.0L I4 Turbo');
    setFormTransmission('Automatic');
    setFormFuelType('Unleaded');
    setFormColor('Silver Metallic');
    setFormOil('SAE 0W-20');
    setFormTires('225/55R17');
    setFormNotes('');
    setShowModal(true);
  };

  const openEditModal = (v: Vehicle) => {
    setEditingVehicle(v);
    setFormMake(v.make);
    setFormModel(v.model);
    setFormYear(v.year);
    setFormTrim(v.trim);
    setFormVin(v.vin);
    setFormPlate(v.licensePlate);
    setFormMileage(v.currentMileage);
    setFormEngine(v.engine);
    setFormTransmission(v.transmission || 'Automatic');
    setFormFuelType(v.fuelType || 'Unleaded');
    setFormColor(v.color || 'Silver Metallic');
    setFormOil(v.oilSpecification);
    setFormTires(v.tireSize);
    setFormNotes(v.notes || '');
    setShowModal(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formMake || !formModel || submitLockRef.current) return;
    submitLockRef.current = true;
    setIsSubmitting(true);

    try {
      if (editingVehicle) {
        await updateVehicle({
          ...editingVehicle,
          make: formMake,
          model: formModel,
          year: formYear,
          trim: formTrim || 'Base',
          vin: formVin || editingVehicle.vin,
          licensePlate: formPlate || editingVehicle.licensePlate,
          currentMileage: Number(formMileage) >= 0 ? Number(formMileage) : editingVehicle.currentMileage,
          engine: formEngine,
          transmission: formTransmission,
          fuelType: formFuelType,
          color: formColor,
          oilSpecification: formOil,
          tireSize: formTires,
          notes: formNotes,
        });
      } else {
        await addVehicle({
          make: formMake,
          model: formModel,
          year: formYear,
          trim: formTrim || 'Base',
          vin: formVin || createEntityId('VIN-'),
          licensePlate: formPlate || 'NEW-FLT',
          currentMileage: Math.max(0, Number(formMileage)),
          engine: formEngine,
          transmission: formTransmission,
          fuelType: formFuelType,
          color: formColor,
          oilSpecification: formOil,
          tireSize: formTires,
          purchaseDate: new Date().toISOString().split('T')[0],
          purchaseMileage: Math.max(0, Number(formMileage)),
          notes: formNotes || 'Added to AutoLog fleet.',
        });
      }
      setShowModal(false);
    } catch {
      // AppContext surfaces the persistence failure and the form stays open.
    } finally {
      submitLockRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleUpdateMileageSubmit = async (vehicleId: string) => {
    if (submitLockRef.current) return;
    const val = Number(newMileageInput);
    if (!isNaN(val) && val >= 0) {
      submitLockRef.current = true;
      setIsSubmitting(true);
      try {
        await updateVehicleMileage(vehicleId, val);
        setEditingMileageVehId(null);
        setNewMileageInput('');
      } catch {
        // AppContext surfaces the persistence failure.
      } finally {
        submitLockRef.current = false;
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* Header & Action */}
      <Card className="screen-header-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Car className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <span>Garage & Fleet Vehicles ({vehicles.length})</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage your personal garage fleet, edit vehicle specifications, and monitor odometer readings.
          </p>
        </div>

        <Button
          onClick={openAddModal}
          className="text-xs shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Add Fleet Vehicle</span>
        </Button>
      </Card>

      {/* Vehicle Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {vehicles.map((v) => {
          const isActive = v.id === activeVehicleId;
          const vRecords = records.filter((r) => r.vehicleId === v.id);
          const totalSpent = vRecords.reduce((acc, curr) => acc + (curr.totalCost || curr.finalInvoiceTotal || 0), 0);

          return (
            <div
              key={v.id}
              className={`bg-white dark:bg-slate-900 rounded-xl border p-5 shadow-sm space-y-4 transition-all relative overflow-hidden ${
                isActive
                  ? 'border-indigo-500 ring-2 ring-indigo-500/20 shadow-indigo-500/10'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              {isActive && (
                <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg shadow-sm flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>ACTIVE FLEET VEHICLE</span>
                </div>
              )}

              {/* Title & Actions */}
              <div className="flex items-start justify-between gap-3 pr-20">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                    {v.year} Model • {v.fuelType}
                  </span>
                  <h3 className="text-xl font-black text-slate-900 dark:text-slate-100">
                    {v.year} {v.make} {v.model}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">{v.trim}</p>
                </div>

                <button
                  onClick={() => openEditModal(v)}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors flex items-center gap-1 text-xs font-bold shrink-0"
                  title="Edit Vehicle Specs"
                >
                  <Edit className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Edit</span>
                </button>
              </div>

              {/* Vehicle Specs Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 dark:bg-slate-800/40 p-3 rounded-lg border border-slate-200/80 dark:border-slate-800">
                <div>
                  <span className="text-slate-400 text-[10px] block">VIN</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200 font-semibold">{v.vin}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">License Plate</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200 font-semibold">{v.licensePlate}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Engine</span>
                  <span className="text-slate-800 dark:text-slate-200 font-medium">{v.engine}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Transmission</span>
                  <span className="text-slate-800 dark:text-slate-200 font-medium">{v.transmission}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Oil Spec</span>
                  <span className="text-slate-800 dark:text-slate-200 font-medium">{v.oilSpecification}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Tire Size</span>
                  <span className="text-slate-800 dark:text-slate-200 font-medium">{v.tireSize}</span>
                </div>
              </div>

              {/* Odometer & Cost stats */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] block">Odometer</span>
                  {editingMileageVehId === v.id ? (
                    <div className="flex items-center gap-1 mt-1">
                      <input
                        type="number"
                        min="0"
                        value={newMileageInput}
                        onChange={(e) => setNewMileageInput(e.target.value)}
                        placeholder={v.currentMileage.toString()}
                        className="w-24 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-xs font-mono font-bold"
                      />
                      <button
                        onClick={() => handleUpdateMileageSubmit(v.id)}
                        disabled={isSubmitting}
                        className="px-2 py-1 bg-emerald-600 text-white rounded text-[10px] font-bold disabled:opacity-50"
                      >
                        Save
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-extrabold text-slate-900 dark:text-slate-100 text-sm">
                        {(v.currentMileage ?? 0).toLocaleString()} mi
                      </span>
                      <button
                        onClick={() => {
                          setEditingMileageVehId(v.id);
                          setNewMileageInput(v.currentMileage.toString());
                        }}
                        className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        Update
                      </button>
                    </div>
                  )}
                </div>

                <div className="text-right">
                  <span className="text-slate-400 text-[10px] block">Total Logged Spend</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-sm">
                    {currencySymbol}{totalSpent.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Action Bar */}
              <div className="pt-2 flex items-center justify-between gap-2">
                {!isActive ? (
                  <button
                    onClick={() => setActiveVehicleId(v.id)}
                    className="w-full bg-slate-100 dark:bg-slate-800 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 text-slate-800 dark:text-slate-200 font-bold py-2 rounded-lg text-xs transition-colors"
                  >
                    Select as Active Vehicle
                  </button>
                ) : (
                  <div className="w-full text-center text-xs text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-500/10 py-1.5 rounded-lg border border-indigo-500/20">
                    Currently Selected
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Vehicle Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Car className="w-5 h-5 text-indigo-600" />
                <span>{editingVehicle ? 'Edit Vehicle Profile' : 'Add Fleet Vehicle'}</span>
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Make *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Aurora"
                    value={formMake}
                    onChange={(e) => setFormMake(e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Model *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Cityline"
                    value={formModel}
                    onChange={(e) => setFormModel(e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Year</label>
                  <input
                    type="number"
                    min="1900"
                    max="2030"
                    value={formYear}
                    onChange={(e) => setFormYear(Number(e.target.value))}
                    className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Trim Level</label>
                  <input
                    type="text"
                    placeholder="e.g. Touring L 3.6L"
                    value={formTrim}
                    onChange={(e) => setFormTrim(e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">VIN</label>
                  <input
                    type="text"
                    placeholder="17 character VIN"
                    value={formVin}
                    onChange={(e) => setFormVin(e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">License Plate</label>
                  <input
                    type="text"
                    placeholder="e.g. DEMO-123"
                    value={formPlate}
                    onChange={(e) => setFormPlate(e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Current Mileage (mi)</label>
                  <input
                    type="number"
                    min="0"
                    value={formMileage}
                    onChange={(e) => setFormMileage(Number(e.target.value))}
                    className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Engine Spec</label>
                  <input
                    type="text"
                    value={formEngine}
                    onChange={(e) => setFormEngine(e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Oil Specification</label>
                  <input
                    type="text"
                    placeholder="e.g. SAE 0W-20 MS-6395"
                    value={formOil}
                    onChange={(e) => setFormOil(e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Tire Size</label>
                  <input
                    type="text"
                    placeholder="e.g. 235/65R17"
                    value={formTires}
                    onChange={(e) => setFormTires(e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Notes / Documentation</label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Additional notes about this vehicle..."
                  className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 font-semibold text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-700 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting
                    ? 'Saving…'
                    : editingVehicle
                      ? 'Update Vehicle'
                      : 'Save Vehicle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
