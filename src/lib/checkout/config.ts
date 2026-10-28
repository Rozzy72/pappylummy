import "server-only";
export function guestOrdersEnabled(){return process.env.GUEST_ORDERS_ENABLED==="true"&&Boolean(process.env.SUPABASE_SECRET_KEY);}
