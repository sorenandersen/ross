export interface UserProfile {
  username: string;
  email: string;
  name?: string;
}

export interface User extends UserProfile {
  id: string;
}

// ==== EventBridge event message schemas

export enum EventDetailType {
  USER_CREATED = 'USER_CREATED',
}

export interface UserCreatedEvent {
  user: User;
}

export type PublishableEventDetail = UserCreatedEvent;
