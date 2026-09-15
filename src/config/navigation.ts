import {
    LayoutDashboard,
    CalendarDays,
    Clock,
    Briefcase,
    Users,
    Repeat,
    CalendarOff,
    BarChart3,
    ShieldAlert,
    Settings,
    Building2,
    MapPin,
    LucideIcon,
} from 'lucide-react';

export interface NavItem {
    title: string;
    href: string;
    icon: LucideIcon;
    badge?: string;
    requiredPermissions?: string[];
    allowedRoles?: string[];
}

export const MAIN_NAVIGATION: NavItem[] = [
    {
        title: 'Overview',
        href: '/dashboard',
        icon: LayoutDashboard,
    },
    {
        title: 'Schedule Matrix',
        href: '/dashboard/schedule',
        icon: CalendarDays,
        requiredPermissions: ['shifts:read', 'shifts:publish'],
        allowedRoles: ['Owner', 'Admin', 'Manager', 'Employee'],
    },
    {
        title: 'Time & Attendance',
        href: '/dashboard/timesheets',
        icon: Clock,
        requiredPermissions: ['time_entries:read', 'time_entries:manage'],
        allowedRoles: ['Owner', 'Admin', 'Manager'],
    },
    {
        title: 'Shift Marketplace',
        href: '/dashboard/trades',
        icon: Repeat,
        requiredPermissions: ['trades:manage', 'trades:read'],
        allowedRoles: ['Owner', 'Admin', 'Manager', 'Employee'],
    },
    {
        title: 'Time Off & Leave',
        href: '/dashboard/time-off',
        icon: CalendarOff,
        requiredPermissions: ['time_off:read', 'time_off:manage'],
        allowedRoles: ['Owner', 'Admin', 'Manager', 'Employee'],
    },
    {
        title: 'Positions & Pay Rates',
        href: '/dashboard/positions',
        icon: Briefcase,
        requiredPermissions: ['positions:manage'],
        allowedRoles: ['Owner', 'Admin'],
    },
    {
        title: 'Team Directory',
        href: '/dashboard/employees',
        icon: Users,
        requiredPermissions: ['employees:read', 'employees:manage'],
        allowedRoles: ['Owner', 'Admin', 'Manager'],
    },
    {
        title: 'Labor Analytics',
        href: '/dashboard/analytics',
        icon: BarChart3,
        requiredPermissions: ['analytics:read'],
        allowedRoles: ['Owner', 'Admin', 'Manager'],
    },
];

export const SETTINGS_NAVIGATION: NavItem[] = [
    {
        title: 'Store Locations',
        href: '/dashboard/locations',
        icon: Building2,
        requiredPermissions: ['locations:manage'],
        allowedRoles: ['Owner', 'Admin'],
    },
    {
        title: 'Organization Roles',
        href: '/dashboard/organization/roles',
        icon: ShieldAlert,
        requiredPermissions: ['roles:manage'],
        allowedRoles: ['Owner', 'Admin'],
    },
    {
        title: 'Store Settings',
        href: '/dashboard/settings',
        icon: Settings,
        allowedRoles: ['Owner', 'Admin'],
    },
];