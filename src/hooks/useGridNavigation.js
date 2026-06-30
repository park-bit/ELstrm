import { useState, useCallback, useEffect } from 'react';

/**
 * Generic 2D grid navigation for D-pad / keyboard control.
 *
 * Fixes the dead-ends present in a naive implementation:
 *  - ArrowUp on the top row wraps to the bottom row (instead of doing nothing)
 *  - ArrowDown on the bottom row wraps to the top row
 *  - ArrowLeft on the leftmost column of a non-first row moves up to the
 *    end of the previous row, rather than jumping out of the grid
 *  - Works correctly when the last row is a partial row (item count not
 *    divisible by columns)
 *
 * @param {number} itemCount total number of focusable items
 * @param {number} columns number of columns in the grid (1 = vertical list)
 * @returns {[number, (action: string) => void, (i: number) => void]}
 */
export function useGridNavigation(itemCount, columns = 1) {
  const [focusIndex, setFocusIndex] = useState(0);

  // Keep focus in bounds if the item count shrinks (e.g. after a filter).
  useEffect(() => {
    if (itemCount === 0) {
      setFocusIndex(0);
    } else if (focusIndex >= itemCount) {
      setFocusIndex(itemCount - 1);
    }
  }, [itemCount, focusIndex]);

  const move = useCallback(
    (direction) => {
      if (itemCount === 0) return;
      setFocusIndex((prev) => {
        const row = Math.floor(prev / columns);
        const col = prev % columns;
        const rowCount = Math.ceil(itemCount / columns);
        const lastRowLen = itemCount - (rowCount - 1) * columns;

        switch (direction) {
          case 'right': {
            const rowStart = row * columns;
            const rowEnd = Math.min(rowStart + columns, itemCount) - 1;
            if (prev >= rowEnd) return rowStart; // wrap to this row's start
            return prev + 1;
          }
          case 'left': {
            if (col === 0) {
              // wrap to the end of this row (or itemCount-1 if at index 0)
              const rowEnd = Math.min(row * columns + columns, itemCount) - 1;
              return rowEnd;
            }
            return prev - 1;
          }
          case 'down': {
            const next = prev + columns;
            if (next < itemCount) return next;
            // wrap to the same column in the first row, clamped
            return col;
          }
          case 'up': {
            const next = prev - columns;
            if (next >= 0) return next;
            // wrap to the last row, same column if it exists there, else last item
            const targetInLastRow = (rowCount - 1) * columns + col;
            return targetInLastRow < itemCount ? targetInLastRow : itemCount - 1;
          }
          default:
            return prev;
        }
      });
    },
    [itemCount, columns]
  );

  return [focusIndex, move, setFocusIndex];
}
