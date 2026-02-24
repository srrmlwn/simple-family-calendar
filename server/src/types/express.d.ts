declare global {
    namespace Express {
        interface User {
            id: string;
            email?: string;
            profileImage?: string;
            managingFamilyId?: string;      // owner's user ID, set when this user is a co-manager
            managingFamilyName?: string;    // owner's display name, for UI banner
        }
    }
}

export {};
