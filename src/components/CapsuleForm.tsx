import React, { useState } from 'react';
import { Calendar, Mail, Type, Clock, File, X, AlertCircle } from 'lucide-react';
import { Button } from './ui/Button';
import { CapsuleUpload } from './CapsuleUpload';
import { createCapsule } from '../lib/capsules';
import { describeUnlock, localTimeZone, toInstant, todayLocal } from '../lib/time';
import { formatBytes, MAX_FILE_BYTES, MAX_FILES, MAX_TOTAL_BYTES } from '../lib/limits';

export const CapsuleForm: React.FC = () => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState('');
  const [unlockDate, setUnlockDate] = useState('');
  const [unlockTime, setUnlockTime] = useState('12:00');
  const [files, setFiles] = useState<File[]>([]);
  const [fileErrors, setFileErrors] = useState<string[]>([]);

  const timeZone = localTimeZone();
  const unlockInstant = unlockDate ? toInstant(unlockDate, unlockTime) : null;
  const unlockIsPast = unlockInstant !== null && unlockInstant.getTime() <= Date.now();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unlockInstant || unlockIsPast) return;

    await createCapsule({
      name,
      description,
      recipientEmail: email,
      unlockAt: unlockInstant.toISOString(),
      unlockTimezone: timeZone,
      unlockLocal: `${unlockDate}T${unlockTime}`,
      files,
    });
  };

  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
  const capsuleIsFull = files.length >= MAX_FILES || totalBytes >= MAX_TOTAL_BYTES;

  /**
   * Every rejection is explained by name. Dropping ten files and being told
   * only "some files were rejected" leaves the sender guessing which ones.
   */
  const handleFilesAdded = (incoming: File[]) => {
    const problems: string[] = [];
    const accepted: File[] = [];
    let running = totalBytes;

    for (const file of incoming) {
      const alreadyStaged = [...files, ...accepted].some((existing) => (
        existing.name === file.name
        && existing.size === file.size
        && existing.lastModified === file.lastModified
      ));

      if (alreadyStaged) {
        problems.push(`"${file.name}" is already in this capsule.`);
      } else if (file.size > MAX_FILE_BYTES) {
        problems.push(
          `"${file.name}" is ${formatBytes(file.size)} — the limit is ${formatBytes(MAX_FILE_BYTES)} per file.`,
        );
      } else if (files.length + accepted.length >= MAX_FILES) {
        problems.push(`A capsule holds ${MAX_FILES} files, so "${file.name}" was left out.`);
      } else if (running + file.size > MAX_TOTAL_BYTES) {
        problems.push(
          `"${file.name}" would push this capsule past ${formatBytes(MAX_TOTAL_BYTES)}.`,
        );
      } else {
        accepted.push(file);
        running += file.size;
      }
    }

    if (accepted.length > 0) setFiles((prev) => [...prev, ...accepted]);
    setFileErrors(problems);
  };

  const handleFileRemoved = (index: number) => {
    setFiles((prev) => prev.filter((_, position) => position !== index));
    setFileErrors([]);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="space-y-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
            Capsule Name
          </label>
          <div className="relative group">
            <Type className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors group-hover:text-indigo-500" size={20} />
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="pl-10 block w-full rounded-lg border-gray-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 transition-colors hover:border-indigo-300"
              required
            />
          </div>
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="block w-full rounded-lg border-gray-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 transition-colors hover:border-indigo-300"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
            Recipient Email
          </label>
          <div className="relative group">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors group-hover:text-indigo-500" size={20} />
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 block w-full rounded-lg border-gray-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 transition-colors hover:border-indigo-300"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="unlockDate" className="block text-sm font-medium text-gray-700 mb-2">
              Unlock Date
            </label>
            <div className="relative group">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors group-hover:text-indigo-500" size={20} />
              <input
                type="date"
                id="unlockDate"
                value={unlockDate}
                min={todayLocal()}
                onChange={(e) => setUnlockDate(e.target.value)}
                className="pl-10 block w-full rounded-lg border-gray-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 transition-colors hover:border-indigo-300"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="unlockTime" className="block text-sm font-medium text-gray-700 mb-2">
              Unlock Time
            </label>
            <div className="relative group">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors group-hover:text-indigo-500" size={20} />
              <input
                type="time"
                id="unlockTime"
                value={unlockTime}
                onChange={(e) => setUnlockTime(e.target.value)}
                className="pl-10 block w-full rounded-lg border-gray-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 transition-colors hover:border-indigo-300"
                required
              />
            </div>
          </div>
        </div>

        {unlockInstant && (
          <p className={`text-sm ${unlockIsPast ? 'text-red-600' : 'text-gray-500'}`}>
            {unlockIsPast
              ? 'That moment has already passed. Pick a date and time in the future.'
              : `Arrives ${describeUnlock(unlockInstant, timeZone)}.`}
          </p>
        )}
      </div>

      <div className="space-y-4">
        <label className="block text-sm font-medium text-gray-700">
          Add Content
        </label>
        <CapsuleUpload onFilesAdded={handleFilesAdded} disabled={capsuleIsFull} />
      </div>

      {fileErrors.length > 0 && (
        <ul className="space-y-2">
          {fileErrors.map((problem) => (
            <li key={problem} className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{problem}</span>
            </li>
          ))}
        </ul>
      )}

      {files.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-baseline justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-700">Selected Files</h3>
            <p className="text-xs text-gray-500">
              {files.length} of {MAX_FILES} · {formatBytes(totalBytes)} of {formatBytes(MAX_TOTAL_BYTES)}
            </p>
          </div>
          <ul className="space-y-2">
            {files.map((file, index) => (
              <li
                key={`${file.name}-${file.size}-${file.lastModified}`}
                className="flex items-center gap-2 text-gray-600 bg-white p-2 rounded-md"
              >
                <File size={16} className="text-indigo-500 shrink-0" />
                <span className="text-sm truncate">{file.name}</span>
                <span className="text-xs text-gray-400 ml-auto shrink-0">{formatBytes(file.size)}</span>
                <button
                  type="button"
                  onClick={() => handleFileRemoved(index)}
                  aria-label={`Remove ${file.name}`}
                  className="shrink-0 p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                >
                  <X size={14} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={unlockIsPast}>
        Create Time Capsule
      </Button>
    </form>
  );
};