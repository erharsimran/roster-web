import type { UserProfile } from '@/types';

export function hasPermission(
    user: UserProfile | null | undefined,
    requiredPermission?: string,
    targetLocationId?: string
): boolean {
    if (!user) return false;

    const role = user.role?.toLowerCase();
    if (role === 'owner' || role === 'admin') return true;
    if (!requiredPermission) return true;

    const permissions: string[] = Array.isArray(user.permissions) ? user.permissions : [];
    if (!permissions.includes(requiredPermission)) return false;

    if (targetLocationId && user.scopeType === 'location') {
        return user.scopeId === targetLocationId;
    }

    return true;
}

export function canAccessModule(
    user: UserProfile | null | undefined,
    allowedRoles?: string[],
    requiredPermissions?: string[]
): boolean {
    if (!user) return false;

    const role = user.role?.toLowerCase();
    if (role === 'owner' || role === 'admin') return true;

    if (allowedRoles && allowedRoles.length > 0) {
        if (user.role && allowedRoles.map((r) => r.toLowerCase()).includes(user.role.toLowerCase())) {
            return true;
        }
    }

    if (requiredPermissions && requiredPermissions.length > 0) {
        const permissions: string[] = Array.isArray(user.permissions) ? user.permissions : [];
        return requiredPermissions.some((p) => permissions.includes(p));
    }

    return !allowedRoles?.length && !requiredPermissions?.length;
}