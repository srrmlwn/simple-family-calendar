import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import familyMemberService, { FamilyMember, FAMILY_MEMBER_COLORS } from '../services/familyMemberService';

const FamilyMemberManager: React.FC = () => {
    const [members, setMembers] = useState<FamilyMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [newName, setNewName] = useState('');
    const [newColor, setNewColor] = useState<string>(FAMILY_MEMBER_COLORS[0]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [editColor, setEditColor] = useState('');

    useEffect(() => {
        fetchMembers();
    }, []);

    const fetchMembers = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await familyMemberService.getAll();
            setMembers(data);
        } catch {
            setError('Failed to load family members');
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async () => {
        if (!newName.trim()) return;
        try {
            setError(null);
            const created = await familyMemberService.create({ name: newName.trim(), color: newColor });
            setMembers(prev => [...prev, created]);
            setNewName('');
            setNewColor(FAMILY_MEMBER_COLORS[0]);
        } catch {
            setError('Failed to add family member');
        }
    };

    const handleEditStart = (member: FamilyMember) => {
        setEditingId(member.id);
        setEditName(member.name);
        setEditColor(member.color);
    };

    const handleEditSave = async () => {
        if (!editingId || !editName.trim()) return;
        try {
            setError(null);
            const updated = await familyMemberService.update(editingId, { name: editName.trim(), color: editColor });
            setMembers(prev => prev.map(m => m.id === editingId ? updated : m));
            setEditingId(null);
        } catch {
            setError('Failed to update family member');
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Remove this family member? Their events will lose this tag.')) return;
        try {
            setError(null);
            await familyMemberService.delete(id);
            setMembers(prev => prev.filter(m => m.id !== id));
        } catch {
            setError('Failed to delete family member');
        }
    };

    return (
        <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium">Family Members</h2>
                <p className="text-sm text-gray-600">
                    Tag events to family members to filter the calendar by person.
                </p>
            </div>

            {error && (
                <div className="bg-red-50 border-b border-red-200 text-red-700 px-6 py-3 text-sm">
                    {error}
                </div>
            )}

            {/* Add new member */}
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center gap-3">
                    <input
                        type="text"
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAdd()}
                        placeholder="Name (e.g. Maya, Dad)"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                    <ColorPicker value={newColor} onChange={setNewColor} />
                    <button
                        onClick={handleAdd}
                        disabled={!newName.trim()}
                        className="flex items-center gap-1 px-3 py-2 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                        <Plus size={16} />
                        Add
                    </button>
                </div>
            </div>

            {/* Member list */}
            <div className="divide-y divide-gray-100">
                {loading ? (
                    <div className="px-6 py-4 text-sm text-gray-600">Loading…</div>
                ) : members.length === 0 ? (
                    <div className="px-6 py-6 text-sm text-gray-600 text-center">
                        No family members yet. Add your first one above.
                    </div>
                ) : (
                    members.map(member => (
                        <div key={member.id} className="px-6 py-3 flex items-center gap-3">
                            {editingId === member.id ? (
                                <>
                                    <ColorPicker value={editColor} onChange={setEditColor} />
                                    <input
                                        type="text"
                                        value={editName}
                                        onChange={e => setEditName(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleEditSave()}
                                        className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                        autoFocus
                                    />
                                    <button onClick={handleEditSave} className="text-green-600 hover:text-green-800" aria-label="Save">
                                        <Check size={18} />
                                    </button>
                                    <button onClick={() => setEditingId(null)} className="text-red-500 hover:text-red-700" aria-label="Cancel">
                                        <X size={18} />
                                    </button>
                                </>
                            ) : (
                                <>
                                    <span
                                        className="w-4 h-4 rounded-full flex-shrink-0"
                                        style={{ backgroundColor: member.color }}
                                    />
                                    <span className="flex-1 text-sm font-medium text-gray-800">{member.name}</span>
                                    <button
                                        onClick={() => handleEditStart(member)}
                                        className="text-gray-400 hover:text-gray-700 transition-colors"
                                        aria-label={`Edit ${member.name}`}
                                    >
                                        <Pencil size={15} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(member.id)}
                                        className="text-gray-400 hover:text-red-600 transition-colors"
                                        aria-label={`Delete ${member.name}`}
                                    >
                                        <Trash2 size={15} />
                                    </button>
                                </>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

const ColorPicker: React.FC<{ value: string; onChange: (color: string) => void }> = ({ value, onChange }) => (
    <div className="flex gap-1">
        {FAMILY_MEMBER_COLORS.map(color => (
            <button
                key={color}
                type="button"
                onClick={() => onChange(color)}
                className={`w-5 h-5 rounded-full transition-transform ${value === color ? 'ring-2 ring-offset-1 ring-gray-400 scale-110' : 'hover:scale-110'}`}
                style={{ backgroundColor: color }}
                aria-label={`Select color ${color}`}
                title={color}
            />
        ))}
    </div>
);

export default FamilyMemberManager;
