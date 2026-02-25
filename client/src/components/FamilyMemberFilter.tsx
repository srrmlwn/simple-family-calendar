import React from 'react';
import { Users, X } from 'lucide-react';
import { FamilyMember } from '../services/familyMemberService';

interface FamilyMemberFilterProps {
    members: FamilyMember[];
    selectedIds: string[];
    onToggle: (id: string) => void;
    onSelectAll: () => void;
    isExpanded: boolean;
    onToggleExpand: () => void;
}

const FamilyMemberFilter: React.FC<FamilyMemberFilterProps> = ({
    members,
    selectedIds,
    onToggle,
    onSelectAll,
    isExpanded,
    onToggleExpand,
}) => {
    if (members.length === 0) return null;

    const allSelected = selectedIds.length === 0;
    const activeCount = selectedIds.length;

    if (!isExpanded) {
        return (
            <button
                onClick={onToggleExpand}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    activeCount > 0
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:border-indigo-300'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                }`}
            >
                <Users className="w-3 h-3" />
                Filter members
                {activeCount > 0 && (
                    <span className="ml-0.5 inline-flex items-center justify-center w-4 h-4 bg-indigo-500 text-white rounded-full text-[10px] font-bold">
                        {activeCount}
                    </span>
                )}
            </button>
        );
    }

    return (
        <div className="flex items-center gap-2 flex-wrap">
            <button
                onClick={onToggleExpand}
                aria-label="Collapse filter"
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            >
                <X className="w-3.5 h-3.5" />
            </button>
            <button
                onClick={onSelectAll}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    allSelected
                        ? 'bg-gray-800 text-white border-gray-800'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                }`}
            >
                All
            </button>
            {members.map(member => {
                const isSelected = selectedIds.includes(member.id);
                return (
                    <button
                        key={member.id}
                        onClick={() => onToggle(member.id)}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                            isSelected
                                ? 'text-white border-transparent'
                                : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                        }`}
                        style={isSelected ? { backgroundColor: member.color, borderColor: member.color } : {}}
                    >
                        <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: isSelected ? 'rgba(255,255,255,0.7)' : member.color }}
                        />
                        {member.name}
                    </button>
                );
            })}
        </div>
    );
};

export default FamilyMemberFilter;
