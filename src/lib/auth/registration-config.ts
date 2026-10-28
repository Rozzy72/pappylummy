import 'server-only';
import {recoveryRedirectUrl} from './recovery-config';
/** Uses the same validated operator-owned origin as password recovery. */
export function confirmationRedirectUrl(){return new URL('/auth/confirm',recoveryRedirectUrl()).href;}
