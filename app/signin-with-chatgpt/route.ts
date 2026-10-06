import {NextResponse} from 'next/server';
export function GET(request:Request){
 const url=new URL(request.url);
 url.pathname='/login';
 return NextResponse.redirect(url,307);
}
export function POST(request:Request){
 const url=new URL(request.url);
 url.pathname='/login';
 return NextResponse.redirect(url,307);
}
