export enum Region {
  NOT_SPECIFIED = 'NOT_SPECIFIED',
  FOO = 'FOO',
  BAR = 'BAR',
}

// ==== Users

export enum UserRole {
  MANAGER = 'MANAGER',
  STAFF = 'STAFF',
  CUSTOMER = 'CUSTOMER',
}

export interface UserProfile {
  username: string;
  email: string;
  name?: string;
}

export interface User extends UserProfile {
  id: string;
}

// ==== Restaurants

export enum RestaurantAvailability {
  PRIVATE = 'PRIVATE',
  PUBLIC = 'PUBLIC',
}

export enum RestaurantApprovalStatus {
  //PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
}

export interface Restaurant {
  id: string;
  name: string;
  description: string;
  availability: RestaurantAvailability;
  region: Region;
  profilePhotoUrlPath?: string;
  createdAt: string;

  /** ID of the user who created the restaurant */
  managerId: string;
  /** For a future version, a RossAdmin should approve new restaurants before managers can operate on them */
  approvalStatus: RestaurantApprovalStatus;
}

// ==== EventBridge event message schemas

export enum EventDetailType {
  USER_CREATED = 'USER_CREATED',
}

export interface UserCreatedEvent {
  user: User;
}

export type PublishableEventDetail = UserCreatedEvent;
