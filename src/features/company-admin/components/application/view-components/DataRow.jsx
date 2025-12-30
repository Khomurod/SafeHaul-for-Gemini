import React from 'react';
import { Copy, Check, XCircle } from 'lucide-react';
import { useUtils } from '@shared/hooks/useUtils';

const DataRow = ({ 
    label, 
    value, 
    type = 'text', // 'text', 'email', 'phone', 'date', 'boolean', 'status'
    enableCopy = false,
    className = ""
}) => {
    const { copyToClipboard } = useUtils();
    const [copied, setCopied] = React.useState(false);

    const handleCopy = (e) => {
        e.stopPropagation();
        if (value) {
            copyToClipboard(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    // --- Renderers for Value ---
    const renderValue = () => {
        if (value === null || value === undefined || value === '') {
            return (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-400 border border-gray-200 uppercase tracking-wide">
                    Not Provided
                </span>
            );
        }

        if (type === 'boolean') {
            const isYes = String(value).toLowerCase() === 'yes' || value === true;
            return isYes ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-100">
                    <XCircle size={12} className="fill-red-100" /> YES / DECLARED
                </span>
            ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-100">
                    <Check size={12} /> No / Clean
                </span>
            );
        }

        if (type === 'date') {
            try {
                // Handle Firestore Timestamp or String
                const dateObj = value?.toDate ? value.toDate() : new Date(value);
                return (
                    <span className="font-mono text-gray-700 font-medium">
                        {dateObj.toLocaleDateString()}
                    </span>
                );
            } catch (e) {
                return value;
            }
        }

        if (type === 'email') {
            return <a href={`mailto:${value}`} className="text-blue-600 hover:underline">{value}</a>;
        }

        if (type === 'phone') {
            return <a href={`tel:${value}`} className="text-blue-600 hover:underline">{value}</a>;
        }

        // Default Text
        return <span className="text-gray-900 font-medium break-words leading-relaxed">{value}</span>;
    };

    return (
        <div className={`grid grid-cols-12 gap-4 py-3 border-b border-gray-100 hover:bg-gray-50/50 transition-colors group ${className}`}>
            
            {/* Column 1: Label (30%) */}
            <div className="col-span-12 sm:col-span-4 lg:col-span-3 pt-0.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                    {label}
                </label>
            </div>

            {/* Column 2: Value (70%) */}
            <div className="col-span-12 sm:col-span-8 lg:col-span-9 flex items-start justify-between gap-4">
                <div className="flex-1">
                    {renderValue()}
                </div>

                {/* Copy Action */}
                {enableCopy && value && (
                    <button 
                        onClick={handleCopy}
                        className={`
                            p-1.5 rounded-md transition-all opacity-0 group-hover:opacity-100 focus:opacity-100
                            ${copied ? 'bg-green-50 text-green-600' : 'bg-white text-gray-400 hover:text-blue-600 hover:bg-blue-50'}
                        `}
                        title="Copy to clipboard"
                    >
                        {copied ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                )}
            </div>
        </div>
    );
};

export default DataRow;
