import { Request } from 'express';

/**
 * Returns the user ID to use for data scoping.
 * For co-managers, returns the owner's ID (managingFamilyId).
 * For regular users, returns their own ID.
 */
export function effectiveUserId(req: Request): string {
    return req.user?.managingFamilyId ?? req.user?.id ?? '';
}
