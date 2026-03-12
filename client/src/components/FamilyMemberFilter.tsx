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
                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors"
                style={activeCount > 0
                    ? { backgroundColor: 'var(--accent-bg)', color: 'var(--accent)', border: '1px solid var(--accent-border)' }
                    : { backgroundColor: 'var(--bg-surface)', color: 'var(--text-muted)', border: '1px solid var(--border)' }
                }
            >
                <Users className="w-3 h-3" />
                Filter members
                {activeCount > 0 && (
                    <span
                        className="ml-0.5 inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold"
                        style={{ backgroundColor: 'var(--accent)', color: '#fefcf8' }}
                    >
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
                className="p-1 rounded transition-colors"
                style={{ color: 'var(--text-muted)' }}
            >
                <X className="w-3.5 h-3.5" />
            </button>
            <button
                onClick={onSelectAll}
                className="px-3 py-1 rounded-full text-xs font-medium transition-colors"
                style={allSelected
                    ? { backgroundColor: 'var(--text-base)', color: 'var(--bg-surface)', border: '1px solid var(--text-base)' }
                    : { backgroundColor: 'var(--bg-surface)', color: 'var(--text-muted)', border: '1px solid var(--border)' }
                }
            >
                All
            </button>
            {members.map(member => {
                const isSelected = selectedIds.includes(member.id);
                return (
                    <button
                        key={member.id}
                        onClick={() => onToggle(member.id)}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all"
                        style={isSelected
                            ? { backgroundColor: member.color, color: '#fff', border: `1px solid ${member.color}` }
                            : { backgroundColor: 'var(--bg-surface)', color: 'var(--text-muted)', border: '1px solid var(--border)' }
                        }
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
