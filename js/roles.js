export const ROLES = {
    ADMIN: 'admin',
    MANAGER: 'manager',
    STAFF: 'staff',
    READ_ONLY: 'read_only'
};

export const PERMISSIONS = {
    // Products
    VIEW_PRODUCTS: ['admin', 'manager', 'staff', 'read_only'],
    ADD_PRODUCT: ['admin', 'manager'],
    EDIT_PRODUCT: ['admin', 'manager'],
    DELETE_PRODUCT: ['admin'],

    // Orders
    VIEW_ORDERS: ['admin', 'manager', 'staff'],
    UPDATE_ORDER_STATUS: ['admin', 'manager', 'staff'],
    DELETE_ORDER: ['admin'],

    // Categories
    MANAGE_CATEGORIES: ['admin', 'manager'],

    // Settings
    MANAGE_SETTINGS: ['admin'],
    VIEW_ACTIVITY_LOGS: ['admin', 'manager'],

    // Users & Roles
    MANAGE_USERS: ['admin'],

    // Billing & Subscriptions
    MANAGE_BILLING: ['admin']
};

export function hasPermission(userRole, permission) {
    if (!userRole) return false;
    if (userRole === ROLES.ADMIN) return true; // Admin has all permissions

    const allowedRoles = PERMISSIONS[permission];
    if (!allowedRoles) return false;

    return allowedRoles.includes(userRole);
}
