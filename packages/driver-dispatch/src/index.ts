/**
 * @veeo/driver-dispatch
 * Système de notification et dispatch des chauffeurs
 */

// Types
export * from './types';

// Core
export { DispatchEngine } from './engine';
export { DriverManager } from './driver-manager';

// Notifications
export { NotificationService } from './notifications';
export { PushNotification, EmailNotification, SMSNotification } from './channels';

// Assignment
export { AutoAssignment, ProximityAssignment, QueueAssignment } from './assignment';

// Utilities
export { calculateDistance, findNearestDrivers } from './geo';
