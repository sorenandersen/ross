export interface UserProfile {
  username: string;
  email: string;
  name?: string;
}

export interface User extends UserProfile {
  id: string;
}
