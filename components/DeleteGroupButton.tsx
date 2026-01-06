'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ConfirmationModal from './ui/ConfirmationModal';

interface DeleteGroupButtonProps {
  groupId: string;
  groupName: string;
}

export default function DeleteGroupButton({
  groupId,
  groupName,
}: DeleteGroupButtonProps) {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletePeople, setDeletePeople] = useState(false);
  const [confirmDeletion, setConfirmDeletion] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      const url = new URL(`/api/groups/${groupId}`, window.location.origin);
      if (deletePeople) {
        url.searchParams.append('deletePeople', 'true');
      }

      const response = await fetch(url.toString(), {
        method: 'DELETE',
      });

      if (response.ok) {
        router.push('/groups');
        router.refresh();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to delete group. Please try again.');
        setIsDeleting(false);
      }
    } catch {
      setError('Unable to connect to server. Please check your connection and try again.');
      setIsDeleting(false);
    }
  };

  const handleModalClose = () => {
    setShowConfirm(false);
    setDeletePeople(false);
    setConfirmDeletion(false);
    setError(null);
  };

  // Determine if the delete button should be disabled
  const isDeleteDisabled = deletePeople && !confirmDeletion;

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
      >
        Delete
      </button>

      <ConfirmationModal
        isOpen={showConfirm}
        onClose={handleModalClose}
        onConfirm={handleDelete}
        title="Delete Group"
        confirmText="Delete"
        isLoading={isDeleting}
        loadingText="Deleting..."
        error={error}
        variant="danger"
        confirmDisabled={isDeleteDisabled}
      >
        <p className="text-gray-600 dark:text-gray-400 mb-1">
          Are you sure you want to delete{' '}
          <strong className="text-gray-900 dark:text-white">{groupName}</strong>?
        </p>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          This action will only remove the group, but will not delete the people themselves.
        </p>

        <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={deletePeople}
              onChange={(e) => {
                setDeletePeople(e.target.checked);
                if (!e.target.checked) {
                  setConfirmDeletion(false);
                }
              }}
              className="mt-1 w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500 dark:border-gray-600 dark:focus:ring-red-600 dark:ring-offset-gray-800"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Delete all people in this group too
            </span>
          </label>

          {deletePeople && (
            <label className="flex items-start gap-3 cursor-pointer ml-7">
              <input
                type="checkbox"
                checked={confirmDeletion}
                onChange={(e) => setConfirmDeletion(e.target.checked)}
                className="mt-1 w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500 dark:border-gray-600 dark:focus:ring-red-600 dark:ring-offset-gray-800"
              />
              <span className="text-sm font-medium text-red-600 dark:text-red-500">
                Yes, I&apos;m sure!
              </span>
            </label>
          )}
        </div>
      </ConfirmationModal>
    </>
  );
}
