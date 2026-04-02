import api from './api';

export interface FamilyMember {
    id: string;
    name: string;
    color: string;
    email?: string;
    userId: string;
    createdAt: string;
    updatedAt: string;
}

export interface FamilyMemberInput {
    name: string;
    color: string;
    email?: string;
}

export const FAMILY_MEMBER_COLORS = [
    '#3B82F6', // blue
    '#10B981', // emerald
    '#F59E0B', // amber
    '#EF4444', // red
    '#8B5CF6', // violet
    '#EC4899', // pink
    '#14B8A6', // teal
    '#F97316', // orange
    '#6366F1', // indigo
    '#84CC16', // lime
] as const;

const familyMemberService = {
    getAll: async (): Promise<FamilyMember[]> => {
        const response = await api.get<FamilyMember[]>('/api/family-members');
        return Array.isArray(response.data) ? response.data : [];
    },

    create: async (data: FamilyMemberInput): Promise<FamilyMember> => {
        const response = await api.post<FamilyMember>('/api/family-members', data);
        return response.data;
    },

    update: async (id: string, data: Partial<FamilyMemberInput>): Promise<FamilyMember> => {
        const response = await api.put<FamilyMember>(`/api/family-members/${id}`, data);
        return response.data;
    },

    delete: async (id: string): Promise<void> => {
        await api.delete(`/api/family-members/${id}`);
    },
};

export default familyMemberService;
