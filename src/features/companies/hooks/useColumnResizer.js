import { useState, useCallback, useEffect } from 'react';

export function useColumnResizer(initialColumns) {
    // Initialize widths from config
    const [columnWidths, setColumnWidths] = useState(() => {
        const widths = {};
        initialColumns.forEach(col => {
            widths[col.key] = col.width;
        });
        return widths;
    });

    const [isResizing, setIsResizing] = useState(false);
    const [resizeState, setResizeState] = useState({
        columnKey: null,
        startX: 0,
        startWidth: 0
    });

    const stopResize = useCallback(() => {
        setIsResizing(false);
        setResizeState({ columnKey: null, startX: 0, startWidth: 0 });
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    }, []);

    const onResize = useCallback((e) => {
        if (!isResizing) return;

        const { columnKey, startX, startWidth } = resizeState;
        const diff = e.clientX - startX;
        const newWidth = Math.max(50, startWidth + diff); // Minimum 50px

        setColumnWidths(prev => ({
            ...prev,
            [columnKey]: newWidth
        }));
    }, [isResizing, resizeState]);

    useEffect(() => {
        if (isResizing) {
            window.addEventListener('mousemove', onResize);
            window.addEventListener('mouseup', stopResize);
        }

        return () => {
            window.removeEventListener('mousemove', onResize);
            window.removeEventListener('mouseup', stopResize);
        };
    }, [isResizing, onResize, stopResize]);

    const startResize = (e, columnKey) => {
        e.preventDefault();
        e.stopPropagation();

        const currentWidth = columnWidths[columnKey] || 100;

        setIsResizing(true);
        setResizeState({
            columnKey,
            startX: e.clientX,
            startWidth: currentWidth
        });

        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    };

    return {
        columnWidths,
        startResize,
        isResizing
    };
}
