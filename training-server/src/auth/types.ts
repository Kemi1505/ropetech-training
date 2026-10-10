import { Role } from "../generated/enums";


/** What JwtStrategy attaches to request.user */
export interface AuthUser {
  id: string;
  email: string;
  role: Role;
}

/** What GoogleStrategy attaches to request.user on the callback */
export interface GoogleProfile {
  googleId: string;
  email: string;

}
