// Retired API. Historical records remain in the local database.
const retired=()=>Response.json({error:'This workspace API has been retired. Use /api/manager.'},{status:410});
export const GET=retired;
export const POST=retired;
