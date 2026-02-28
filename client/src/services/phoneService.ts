import api from './api';

const phoneService = {
    save: async (phoneNumber: string): Promise<{ phoneNumber: string }> => {
        const response = await api.post<{ phoneNumber: string }>('/api/settings/phone', { phoneNumber });
        return response.data;
    },

    remove: async (): Promise<void> => {
        await api.delete('/api/settings/phone');
    },
};

export default phoneService;
