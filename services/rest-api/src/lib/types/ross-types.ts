export enum Region {
  MANHATTAN = 'MANHATTAN',
  BRONX = 'BRONX',
  FOO = 'FOO',
  BAR = 'BAR',
  TODO = 'TODO',
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
  //PENDING_APPROVAL = 'PENDING_APPROVAL', // For a future version, a RossAdmin should approve new restaurants before managers can operate on them.
  APPROVED = 'APPROVED',
}

export interface Restaurant {
  id: string;
  name: string;
  description: string;
  availability: RestaurantAvailability;
  region: Region;
  profilePhotoUrl: string;
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
