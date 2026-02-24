declare namespace Express {
    interface User {
        id: string;
        email?: string;
        profileImage?: string;
        managingFamilyId?: string;
        managingFamilyName?: string;
    }
}
