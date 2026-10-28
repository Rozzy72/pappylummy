import { NIGERIAN_STATES } from "@/lib/delivery";
export type AuthState = { status: "idle" | "error" | "success"; message: string; fieldErrors?: Record<string, string> };

export function readEmail(form: FormData) {
  const value = form.get("email");
  if (form.getAll("email").length !== 1 || typeof value !== "string" || value.length > 254) return null;
  const email = value.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

export function readPassword(form: FormData, minimum = 12) {
  const password = form.get("password");
  if (form.getAll("password").length !== 1 || typeof password !== "string" || password.length < minimum || password.length > 128) return null;
  return password; // Never trim or echo passwords.
}

export function readCredentials(form: FormData, signup: boolean) {
  const email = readEmail(form);
  const password = readPassword(form, signup ? 12 : 1);
  return email && password ? { email, password } : null;
}

export function readRecoveryCode(params: URLSearchParams) {
  const code = params.get("code");
  if (params.getAll("code").length !== 1 || [...params.keys()].some(key => key !== "code") ||
      !code || code.length > 2048 || !/^[\x21-\x7e]+$/.test(code)) return null;
  return code; // Opaque SDK code, passed unchanged; not a token hash.
}

export function readConfirmation(params: URLSearchParams) {
  const token = params.get("token_hash");
  if (params.getAll("token_hash").length !== 1 || params.getAll("type").length !== 1 ||
      params.get("type") !== "email" || !token || !/^(?:pkce_)?[a-f0-9]{56}$/.test(token)) return null;
  return { token_hash: token, type: "email" as const };
}

/** Contact details only: never use user-editable metadata for permissions. */
export function readRegistrationDetails(form: FormData) {
  const values: Record<string, string> = {};
  for (const key of ["full_name", "phone", "address", "city", "state"]) {
    const value = form.get(key);
    if (form.getAll(key).length !== 1 || typeof value !== "string") return null;
    values[key] = value.trim().normalize("NFC");
  }
  const { full_name, phone, address, city, state } = values;
  if (!full_name || full_name.length > 100 || /[\u0000-\u001f\u007f]/.test(full_name) ||
      !/^\+?[0-9 ()-]+$/.test(phone) || phone.length > 30 ||
      phone.replace(/\D/g, "").length < 7 || phone.replace(/\D/g, "").length > 15 ||
      !city || city.length > 100 || /[\u0000-\u001f\u007f]/.test(city) || !NIGERIAN_STATES.some(option => option === state) ||
      !address || address.length > 300 || /[\u0000-\u001f\u007f]/.test(address)) return null;
  return { full_name, phone, address, city, state };
}

export function registrationContact(metadata: unknown) {
  if (!metadata || typeof metadata !== "object") return null;
  const form = new FormData();
  for (const key of ["full_name", "phone", "address"] as const) {
    const value = (metadata as Record<string, unknown>)[key];
    if (typeof value !== "string") return null;
    form.set(key, value);
  }
  const contact = metadata as Record<string, unknown>;
  // Preserve addresses captured before city/state were introduced.
  const legacy = contact.city === undefined && contact.state === undefined;
  if (!legacy && (typeof contact.city !== "string" || typeof contact.state !== "string")) return null;
  form.set("city", legacy ? "Legacy" : contact.city as string);
  form.set("state", legacy ? "Osun" : contact.state as string);
  const result = readRegistrationDetails(form);
  return result && legacy ? {...result, city: "", state: ""} : result;
}

export function readProfileAddress(form: FormData) {
  const values: Record<string,string> = {};
  for (const key of ["address", "city", "state"]) {
    const value = form.get(key);
    if (form.getAll(key).length !== 1 || typeof value !== "string") return null;
    values[key] = value.trim().normalize("NFC");
  }
  const {address,city,state} = values;
  if (!address && !city && !state) return {address,city,state};
  if (!address || address.length > 300 || /[\u0000-\u001f\u007f]/.test(address) || !city || city.length > 100 || /[\u0000-\u001f\u007f]/.test(city) || !NIGERIAN_STATES.some(value => value === state)) return null;
  return {address,city,state};
}
export function profileAddress(metadata: unknown) {
  if (!metadata || typeof metadata !== "object") return null;
  const contact = metadata as Record<string,unknown>;
  if(typeof contact.address !== "string") return null;
  if(contact.city === undefined && contact.state === undefined) return contact.address.length <= 300 && !/[\u0000-\u001f\u007f]/.test(contact.address) ? {address:contact.address,city:"",state:""} : null;
  const form = new FormData();
  for(const key of ["address","city","state"]){if(typeof contact[key] !== "string")return null;form.set(key,contact[key] as string);}
  return readProfileAddress(form);
}

/** Shared browser/server validation; messages never echo submitted values. */
export function registrationErrors(form: FormData): Record<string,string> {
 const errors:Record<string,string>={};
 const single=(key:string)=>{const v=form.get(key);return form.getAll(key).length===1 && typeof v==='string'?v:null;};
 const text=(key:string,label:string,max:number)=>{const v=single(key)?.trim().normalize('NFC');if(!v)errors[key]='Enter your '+label+'.';else if(v.length>max || /[\u0000-\u001f\u007f]/.test(v))errors[key]='Enter a valid '+label+' (up to '+max+' characters).';};
 text('full_name','full name',100);text('address','street address',300);text('city','city',100);
 if(!single('email')?.trim())errors.email='Enter your email address.';else if(!readEmail(form))errors.email='Enter a valid email address (up to 254 characters).';
 const phone=single('phone')?.trim();
 if(!phone)errors.phone='Enter your phone number.';else if(phone.length>30 || !/^\+?[0-9 ()-]+$/.test(phone) || phone.replace(/\D/g,'').length<7 || phone.replace(/\D/g,'').length>15)errors.phone='Enter a valid phone number with 7–15 digits.';
 if(!NIGERIAN_STATES.some(state=>state===single('state')?.trim()))errors.state='Choose your state or FCT.';
 if(!single('password'))errors.password='Enter a password.';else if(!readPassword(form))errors.password='Use a password of 12–128 characters.';
 const confirmation=single('confirm_password');
 if(!confirmation)errors.confirm_password='Confirm your password.';else if(confirmation!==single('password'))errors.confirm_password='Your passwords do not match.';
 return errors;
}
