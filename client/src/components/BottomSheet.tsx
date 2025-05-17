import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface BottomSheetProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    title?: string;
}

const BottomSheet: React.FC<BottomSheetProps> = ({
    isOpen,
    onClose,
    children,
    title
}) => {
    const overlayRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        const handleClickOutside = (e: MouseEvent) => {
            if (overlayRef.current === e.target) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.addEventListener('mousedown', handleClickOutside);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.removeEventListener('mousedown', handleClickOutside);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return createPortal(
        <>
            <style>
                {`
                    @keyframes slideUp {
                        from {
                            transform: translateY(100%);
                            opacity: 0;
                        }
                        to {
                            transform: translateY(0);
                            opacity: 1;
                        }
                    }
                `}
            </style>
            <div
                ref={overlayRef}
                className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end sm:items-center justify-center transition-opacity duration-300 ease-in-out"
                onClick={onClose}
            >
                <div
                    ref={contentRef}
                    className="bg-white w-full max-w-2xl rounded-t-2xl sm:rounded-2xl shadow-xl transform transition-all duration-300 ease-in-out flex flex-col h-[90vh] sm:h-auto sm:max-h-[90vh] translate-y-0 opacity-100"
                    style={{
                        animation: 'slideUp 0.3s ease-out'
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex-shrink-0 flex items-center justify-between p-4 border-b">
                        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                        >
                            <svg
                                className="w-6 h-6 text-gray-500"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            </svg>
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-h-0 overflow-y-auto">
                        {children}
                    </div>
                </div>
            </div>
        </>,
        document.body
    );
};

export default BottomSheet; 