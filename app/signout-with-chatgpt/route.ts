import {NextResponse} from 'next/server';

export async function GET(request:Request){const url=new URL(request.url);const response=NextResponse.redirect(new URL('/',url.origin));response.cookies.set('__studio_local_user','',{httpOnly:true,sameSite:'lax',secure:false,path:'/',maxAge:0});return response}
