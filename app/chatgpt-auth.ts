import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {isLocalNetworkHost} from '@/lib/local-network';

export type ChatGPTUser = {
  userId: string;
  displayName: string;
  email: string;
  fullName: string | null;
};

const USER_ID_HEADER = "oai-authenticated-user-id";
const USER_EMAIL_HEADER = "oai-authenticated-user-email";
const USER_FULL_NAME_HEADER = "oai-authenticated-user-full-name";
const USER_FULL_NAME_ENCODING_HEADER =
  "oai-authenticated-user-full-name-encoding";
const PERCENT_ENCODED_UTF8 = "percent-encoded-utf-8";
const SIGN_IN_PATH = "/login";
const SIGN_OUT_PATH = "/signout-with-chatgpt";
const CALLBACK_PATH = "/callback";

function localSessionUser(value: string | undefined): ChatGPTUser | null {
  if (value === "local-admin-session-v1") {
    return {userId:"local_test_designer",displayName:"Test Designer",email:"test.designer@example.com",fullName:"Test Designer"};
  }
  if (!value?.startsWith("local-user-v1:")) return null;
  try {
    const encoded=value.slice("local-user-v1:".length).replaceAll("-","+").replaceAll("_","/");
    const binary=atob(encoded.padEnd(Math.ceil(encoded.length/4)*4,"="));
    const bytes=Uint8Array.from(binary,char=>char.charCodeAt(0));
    const person=JSON.parse(new TextDecoder().decode(bytes)) as {id?:unknown;email?:unknown;name?:unknown};
    if(typeof person.id!=="string"||typeof person.email!=="string"||typeof person.name!=="string")return null;
    return {userId:person.id,displayName:person.name,email:person.email,fullName:person.name};
  } catch {
    return null;
  }
}

export async function getChatGPTUser(): Promise<ChatGPTUser | null> {
  const requestHeaders = await headers();
  const userId = requestHeaders.get(USER_ID_HEADER);
  const email = requestHeaders.get(USER_EMAIL_HEADER);
  if (!userId || !email) {
    const host=(requestHeaders.get('host')||'').split(':')[0];
    const localUser=(await cookies()).get('__studio_local_user')?.value;
    if(isLocalNetworkHost(host))return localSessionUser(localUser);
    return null;
  }

  const encodedFullName = requestHeaders.get(USER_FULL_NAME_HEADER);
  const fullName =
    encodedFullName &&
    requestHeaders.get(USER_FULL_NAME_ENCODING_HEADER) === PERCENT_ENCODED_UTF8
      ? safeDecodeURIComponent(encodedFullName)
      : null;

  return {
    userId,
    displayName: fullName ?? email,
    email,
    fullName,
  };
}

export async function requireChatGPTUser(
  returnTo: string,
): Promise<ChatGPTUser> {
  const user = await getChatGPTUser();
  if (user) return user;

  redirect(chatGPTSignInPath(returnTo));
}

export function chatGPTSignInPath(returnTo: string): string {
  const safeReturnTo = safeRelativeReturnPath(returnTo);
  return `${SIGN_IN_PATH}?return_to=${encodeURIComponent(safeReturnTo)}`;
}

export function chatGPTSignOutPath(returnTo = "/"): string {
  const safeReturnTo = safeRelativeReturnPath(returnTo);
  return `${SIGN_OUT_PATH}?return_to=${encodeURIComponent(safeReturnTo)}`;
}

function safeRelativeReturnPath(value: string): string {
  if (!value.startsWith("/") || value.startsWith("//")) return "/";

  let url: URL;
  try {
    url = new URL(value, "https://app.local");
  } catch {
    return "/";
  }
  if (url.origin !== "https://app.local") return "/";
  if (isReservedAuthPath(url.pathname)) return "/";

  return `${url.pathname}${url.search}${url.hash}`;
}

function isReservedAuthPath(pathname: string): boolean {
  return (
    pathname === SIGN_IN_PATH ||
    pathname === SIGN_OUT_PATH ||
    pathname === CALLBACK_PATH
  );
}

function safeDecodeURIComponent(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}
