import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Calendar, Clock, File, Loader2 } from 'lucide-react';
import { Button } from './ui/Button';
import {
  cancelCapsule,
  loadManagedCapsule,
  rescheduleCapsule,
  type ManagedCapsuleView,
} from '../lib/capsules';
import { describeUnlock, localTimeZone, toInstant, todayLocal } from '../lib/time';
import { formatBytes } from '../lib/limits';

interface ManageCapsuleProps {
  manageToken: string;
}

const STATUS_COPY: Record<string, string> = {
  pending_confirmation: 'Waiting for the recipient to accept',
  scheduled: 'Accepted and scheduled',
  delivering: 'Being delivered right now',
  delivered: 'Delivered',
  failed: 'Delivery failed',
  cancelled: 'Cancelled',
};

/** Statuses where the capsule has not gone out yet and can still be changed. */
const MUTABLE = ['pending_confirmation', 'scheduled'];

export const ManageCapsule: React.FC<ManageCapsuleProps> = ({ manageToken }) => {
  const [view, setView] = useState<ManagedCapsuleView | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('12:00');

  const timeZone = localTimeZone();

  useEffect(() => {
    loadManagedCapsule(manageToken)
      .then(setView)
      .catch((cause: Error) => setLoadError(cause.message));
  }, [manageToken]);

  const run = useCallback(async (work: () => Promise<void>) => {
    setBusy(true);
    setActionError(null);
    try {
      await work();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }, []);

  if (loadError) {
    return (
      <div className="text-center space-y-3 py-6">
        <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
        <h2 className="text-xl font-semibold text-gray-900">Can't open that capsule</h2>
        <p className="text-gray-600">{loadError}</p>
      </div>
    );
  }

  if (!view) {
    return (
      <div className="flex items-center justify-center gap-2 text-gray-500 py-12">
        <Loader2 size={20} className="animate-spin" />
        Loading your capsule…
      </div>
    );
  }

  const { capsule, files } = view;
  const canChange = MUTABLE.includes(capsule.status);
  const rescheduleInstant = newDate ? toInstant(newDate, newTime) : null;
  const rescheduleIsPast = rescheduleInstant !== null && rescheduleInstant.getTime() <= Date.now();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">{capsule.name}</h2>
        <p className="text-sm text-gray-500 mt-1">{STATUS_COPY[capsule.status] ?? capsule.status}</p>
      </div>

      {capsule.description && (
        <p className="text-gray-600 whitespace-pre-wrap">{capsule.description}</p>
      )}

      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-gray-500">Goes to</dt>
          <dd className="text-gray-900 font-medium break-all">{capsule.recipient_email}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Opens</dt>
          <dd className="text-gray-900 font-medium">
            {capsule.unlock_local && capsule.unlock_timezone
              ? `${capsule.unlock_local.replace('T', ' at ')} (${capsule.unlock_timezone})`
              : new Date(capsule.unlock_at).toLocaleString()}
          </dd>
        </div>
      </dl>

      {files.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Contents</h3>
          <ul className="space-y-2">
            {files.map((file) => (
              <li key={file.filename} className="flex items-center gap-2 bg-white p-2 rounded-md">
                <File size={16} className="text-indigo-500 shrink-0" />
                <span className="text-sm text-gray-600 truncate">{file.filename}</span>
                <span className="text-xs text-gray-400 ml-auto">{formatBytes(file.size_bytes)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {actionError && (
        <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{actionError}</span>
        </div>
      )}

      {canChange ? (
        <div className="space-y-4 border-t border-gray-200 pt-6">
          <h3 className="text-sm font-medium text-gray-700">Move it to a different date</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="relative group">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="date"
                aria-label="New unlock date"
                value={newDate}
                min={todayLocal()}
                onChange={(e) => setNewDate(e.target.value)}
                className="pl-10 block w-full rounded-lg border-gray-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div className="relative group">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="time"
                aria-label="New unlock time"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                className="pl-10 block w-full rounded-lg border-gray-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
          </div>

          {rescheduleInstant && (
            <p className={`text-sm ${rescheduleIsPast ? 'text-red-600' : 'text-gray-500'}`}>
              {rescheduleIsPast
                ? 'That moment has already passed.'
                : `Would arrive ${describeUnlock(rescheduleInstant, timeZone)}.`}
            </p>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              type="button"
              disabled={busy || !rescheduleInstant || rescheduleIsPast}
              onClick={() => run(async () => {
                const updated = await rescheduleCapsule(manageToken, {
                  unlockAt: rescheduleInstant!.toISOString(),
                  unlockTimezone: timeZone,
                  unlockLocal: `${newDate}T${newTime}`,
                });
                setView({ ...view, capsule: updated });
                setNewDate('');
              })}
            >
              {busy ? <Loader2 size={18} className="animate-spin" /> : 'Reschedule'}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              className="hover:border-red-400 hover:text-red-600"
              onClick={() => run(async () => {
                const updated = await cancelCapsule(manageToken);
                setView({ ...view, capsule: updated });
              })}
            >
              Cancel this capsule
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-500 border-t border-gray-200 pt-6">
          This capsule is {STATUS_COPY[capsule.status]?.toLowerCase() ?? capsule.status} and can no
          longer be changed.
        </p>
      )}
    </div>
  );
};
