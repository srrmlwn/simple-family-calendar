import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import familyMemberService, { FamilyMember, FAMILY_MEMBER_COLORS } from '../services/familyMemberService';

const FamilyMemberManager: React.FC = () => {
    const [members, setMembers] = useState<FamilyMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [newName, setNewName] = useState('');
    const [newColor, setNewColor] = useState<string>(FAMILY_MEMBER_COLORS[0]);
    const [newEmail, setNewEmail] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [editColor, setEditColor] = useState('');
    const [editEmail, setEditEmail] = useState('');

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
            const created = await familyMemberService.create({ name: newName.trim(), color: newColor, email: newEmail.trim() || undefined });
            setMembers(prev => [...prev, created]);
            setNewName('');
            setNewColor(FAMILY_MEMBER_COLORS[0]);
            setNewEmail('');
        } catch {
            setError('Failed to add family member');
        }
    };

    const handleEditStart = (member: FamilyMember) => {
        setEditingId(member.id);
        setEditName(member.name);
        setEditColor(member.color);
        setEditEmail(member.email ?? '');
    };

    const handleEditSave = async () => {
        if (!editingId || !editName.trim()) return;
        try {
            setError(null);
            const updated = await familyMemberService.update(editingId, { name: editName.trim(), color: editColor, email: editEmail.trim() || undefined });
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
        <div className="shadow rounded-lg overflow-hidden" style={{ backgroundColor: 'var(--bg-surface)' }}>
            <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
                <h2 className="text-lg font-medium" style={{ color: 'var(--text-base)' }}>Family Members</h2>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    Tag events by person and optionally add an email to send invites.
                </p>
            </div>

            {error && (
                <div className="bg-red-50 border-b border-red-200 text-red-700 px-6 py-3 text-sm">
                    {error}
                </div>
            )}

            {/* Add new member */}
            <div className="px-6 py-4" style={{ backgroundColor: 'var(--bg-app)', borderBottom: '1px solid var(--border)' }}>
                <div className="flex items-center gap-3 mb-2">
                    <input
                        type="text"
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAdd()}
                        placeholder="Name (e.g. Maya, Dad)"
                        className="flex-1 px-3 py-2 rounded text-sm focus:outline-none"
                        style={{ border: '1px solid var(--border)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-base)' }}
                    />
                    <ColorPicker value={newColor} onChange={setNewColor} />
                    <button
                        onClick={handleAdd}
                        disabled={!newName.trim()}
                        className="flex items-center gap-1 px-3 py-2 text-white text-sm rounded disabled:cursor-not-allowed transition-colors"
                        style={{ backgroundColor: 'var(--accent)' }}
                        onMouseEnter={e => { if (newName.trim()) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--accent-mid)'; }}
                        onMouseLeave={e => { if (newName.trim()) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--accent)'; }}
                    >
                        <Plus size={16} />
                        Add
                    </button>
                </div>
                <input
                    type="email"
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                    placeholder="Email (optional — for event invites)"
                    className="w-full px-3 py-2 rounded text-sm focus:outline-none"
                    style={{ border: '1px solid var(--border)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-base)' }}
                />
            </div>

            {/* Member list */}
            <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                {loading ? (
                    <div className="px-6 py-4 text-sm" style={{ color: 'var(--text-muted)' }}>Loading…</div>
                ) : members.length === 0 ? (
                    <div className="px-6 py-6 text-sm text-center" style={{ color: 'var(--text-muted)' }}>
                        No family members yet. Add your first one above.
                    </div>
                ) : (
                    members.map(member => (
                        <div key={member.id} className="px-6 py-3">
                            {editingId === member.id ? (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-3">
                                        <ColorPicker value={editColor} onChange={setEditColor} />
                                        <input
                                            type="text"
                                            value={editName}
                                            onChange={e => setEditName(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && handleEditSave()}
                                            className="flex-1 px-2 py-1 rounded text-sm focus:outline-none"
                                            style={{ border: '1px solid var(--border)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-base)' }}
                                            autoFocus
                                        />
                                        <button onClick={handleEditSave} className="text-green-600 hover:text-green-800" aria-label="Save">
                                            <Check size={18} />
                                        </button>
                                        <button onClick={() => setEditingId(null)} className="text-red-500 hover:text-red-700" aria-label="Cancel">
                                            <X size={18} />
                                        </button>
                                    </div>
                                    <input
                                        type="email"
                                        value={editEmail}
                                        onChange={e => setEditEmail(e.target.value)}
                                        placeholder="Email (optional)"
                                        className="w-full px-2 py-1 rounded text-sm focus:outline-none"
                                        style={{ border: '1px solid var(--border)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-base)' }}
                                    />
                                </div>
                            ) : (
                                <div className="flex items-center gap-3">
                                    <span
                                        className="w-4 h-4 rounded-full flex-shrink-0"
                                        style={{ backgroundColor: member.color }}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <span className="text-sm font-medium" style={{ color: 'var(--text-base)' }}>{member.name}</span>
                                        {member.email && (
                                            <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{member.email}</p>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => handleEditStart(member)}
                                        className="transition-colors"
                                        style={{ color: 'var(--text-muted)' }}
                                        aria-label={`Edit ${member.name}`}
                                    >
                                        <Pencil size={15} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(member.id)}
                                        className="hover:text-red-600 transition-colors"
                                        style={{ color: 'var(--text-muted)' }}
                                        aria-label={`Delete ${member.name}`}
                                    >
                                        <Trash2 size={15} />
                                    </button>
                                </div>
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
