'use client';

import { AlertTriangle, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface PaginationMeta {
  total: number;
  returned: number;
  limit: number;
  hasMore: boolean;
  limitReached: boolean;
  warningMessage?: string;
}

interface PaginationWarningProps {
  pagination?: PaginationMeta;
  entityName?: string;
}

/**
 * Display warning when pagination limit is reached or when there are more records
 * Shows different severity based on whether max limit (10,000) was hit
 */
export function PaginationWarning({ pagination, entityName = 'records' }: PaginationWarningProps) {
  if (!pagination) return null;

  const { limitReached, hasMore, total, returned, warningMessage } = pagination;

  // Don't show anything if all records are displayed
  if (!hasMore && !limitReached) return null;

  // Critical warning when max limit is reached
  if (limitReached) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Maximum Limit Reached</AlertTitle>
        <AlertDescription>
          <div className="space-y-2">
            <p>
              {warningMessage || `Showing ${returned.toLocaleString()} of ${total.toLocaleString()} ${entityName}.`}
            </p>
            <p className="text-sm">
              <strong>Action Required:</strong> You have exceeded the maximum display limit of 10,000 items.
              Please use search or filters to find specific {entityName}.
            </p>
            <p className="text-sm text-muted-foreground">
              💡 <strong>Tip:</strong> Consider organizing your {entityName} into categories, archiving old entries,
              or using the search function to find what you need.
            </p>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  // Info warning when there are more records (but not at max limit)
  if (hasMore) {
    return (
      <Alert className="mb-4 border-blue-500 bg-blue-50 dark:bg-blue-950">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-blue-900 dark:text-blue-100">More Records Available</AlertTitle>
        <AlertDescription className="text-blue-800 dark:text-blue-200">
          {warningMessage || `Showing ${returned.toLocaleString()} of ${total.toLocaleString()} ${entityName}.`}
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}

/**
 * Compact inline version for smaller spaces (like dropdowns or modals)
 */
export function PaginationWarningInline({ pagination, entityName = 'records' }: PaginationWarningProps) {
  if (!pagination) return null;

  const { limitReached, hasMore, total, returned } = pagination;

  if (!hasMore && !limitReached) return null;

  return (
    <div className={`text-sm px-3 py-2 rounded-md ${
      limitReached
        ? 'bg-red-50 text-red-800 border border-red-200 dark:bg-red-950 dark:text-red-200'
        : 'bg-blue-50 text-blue-800 border border-blue-200 dark:bg-blue-950 dark:text-blue-200'
    }`}>
      {limitReached && <AlertTriangle className="inline h-3 w-3 mr-1" />}
      {!limitReached && <Info className="inline h-3 w-3 mr-1" />}
      Showing {returned.toLocaleString()} of {total.toLocaleString()} {entityName}
      {limitReached && ' (Max limit reached - use search/filters)'}
    </div>
  );
}

/**
 * Stats display showing count information
 */
export function PaginationStats({ pagination, entityName = 'records' }: PaginationWarningProps) {
  if (!pagination) return null;

  const { total, returned, limitReached } = pagination;

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <span>
        Showing {returned.toLocaleString()} {returned === total ? '' : `of ${total.toLocaleString()}`} {entityName}
      </span>
      {limitReached && (
        <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400">
          <AlertTriangle className="h-3 w-3" />
          <span className="text-xs">Max limit</span>
        </span>
      )}
    </div>
  );
}
