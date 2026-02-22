import React from 'react';
import { FamilyMember } from '../services/familyMemberService';

interface FamilyMemberFilterProps {
    members: FamilyMember[];
    selectedIds: string[];
    onToggle: (id: string) => void;
    onSelectAll: () => void;
}

const FamilyMemberFilter: React.FC<FamilyMemberFilterProps> = ({
    members,
    selectedIds,
    onToggle,
    onSelectAll,
}) => {
    if (members.length === 0) return null;

    const allSelected = selectedIds.length === 0;

    return (
        <div className="flex items-center gap-2 flex-wrap">
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
