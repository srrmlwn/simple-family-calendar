declare global {
    namespace Express {
        interface User {
            id: string;
            email?: string;
            profileImage?: string;
        }
    }
}

export {};
