import React, { useState } from 'react';
import { RecurringScope } from '../services/eventService';

interface RecurrenceScopeDialogProps {
    action: 'edit' | 'delete';
    onConfirm: (scope: RecurringScope) => void;
    onCancel: () => void;
}

const RecurrenceScopeDialog: React.FC<RecurrenceScopeDialogProps> = ({ action, onConfirm, onCancel }) => {
    const [scope, setScope] = useState<RecurringScope>('this');

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
                <h3 className="text-base font-semibold text-gray-900 mb-4">
                    {action === 'edit' ? 'Edit recurring event' : 'Delete recurring event'}
                </h3>

                <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer group">
                        <input
                            type="radio"
                            name="recurringScope"
                            value="this"
                            checked={scope === 'this'}
                            onChange={() => setScope('this')}
                            className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        <div>
                            <div className="text-sm font-medium text-gray-800">This event only</div>
                            <div className="text-xs text-gray-500">Only changes this occurrence</div>
                        </div>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer group">
                        <input
                            type="radio"
                            name="recurringScope"
                            value="future"
                            checked={scope === 'future'}
                            onChange={() => setScope('future')}
                            className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        <div>
                            <div className="text-sm font-medium text-gray-800">This and following events</div>
                            <div className="text-xs text-gray-500">Changes this and all future occurrences</div>
                        </div>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer group">
                        <input
                            type="radio"
                            name="recurringScope"
                            value="all"
                            checked={scope === 'all'}
                            onChange={() => setScope('all')}
                            className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        <div>
                            <div className="text-sm font-medium text-gray-800">All events</div>
                            <div className="text-xs text-gray-500">Changes every occurrence in the series</div>
                        </div>
                    </label>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={() => onConfirm(scope)}
                        className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
                            action === 'delete'
                                ? 'bg-red-600 hover:bg-red-700'
                                : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                    >
                        {action === 'edit' ? 'Continue' : 'Delete'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RecurrenceScopeDialog;
