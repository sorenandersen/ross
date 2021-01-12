export enum Region {
  NOT_SPECIFIED = 'NOT_SPECIFIED',
  FOO = 'FOO',
  BAR = 'BAR',
}

export interface PagedList<T> {
  items: T[];
  lastEvaluatedKey?: string;
}

export interface PagedQueryOptions {
  limit?: number;
  lastEvaluatedKey?: string;
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
  createdAt: string;
}

export interface User extends UserProfile {
  id: string;
  restaurantId?: string;
  restaurantRole?: string;
}

// ==== Restaurants

export enum RestaurantVisibility {
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
  visibility: RestaurantVisibility;
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
