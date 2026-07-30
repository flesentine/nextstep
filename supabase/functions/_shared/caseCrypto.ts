const encoder=new TextEncoder();
const decoder=new TextDecoder();
const bytesFromBase64=(value:string)=>Uint8Array.from(atob(value),c=>c.charCodeAt(0));
const base64FromBytes=(value:Uint8Array)=>btoa(String.fromCharCode(...value));

async function encryptionKey(){
  const encoded=Deno.env.get('CASE_ENCRYPTION_KEY');
  if(!encoded)throw new Error('Case encryption is not configured');
  const raw=bytesFromBase64(encoded);
  if(raw.length!==32)throw new Error('CASE_ENCRYPTION_KEY must be a base64-encoded 32-byte key');
  return crypto.subtle.importKey('raw',raw,{name:'AES-GCM'},false,['encrypt','decrypt']);
}

async function fingerprintKey(){
  const encoded=Deno.env.get('CASE_FINGERPRINT_KEY')??Deno.env.get('CASE_ENCRYPTION_KEY');
  if(!encoded)throw new Error('Case fingerprinting is not configured');
  return crypto.subtle.importKey('raw',bytesFromBase64(encoded),{name:'HMAC',hash:'SHA-256'},false,['sign']);
}

export async function encryptIdentifier(identifier:string){
  const nonce=crypto.getRandomValues(new Uint8Array(12));
  const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv:nonce},await encryptionKey(),encoder.encode(identifier));
  return `${base64FromBytes(nonce)}.${base64FromBytes(new Uint8Array(encrypted))}`;
}

export async function decryptIdentifier(payload:string){
  const [nonce,ciphertext]=payload.split('.');
  if(!nonce||!ciphertext)throw new Error('Encrypted identifier is invalid');
  const decrypted=await crypto.subtle.decrypt({name:'AES-GCM',iv:bytesFromBase64(nonce)},await encryptionKey(),bytesFromBase64(ciphertext));
  return decoder.decode(decrypted);
}

export async function fingerprintIdentifier(source:string,identifier:string){
  const signature=await crypto.subtle.sign('HMAC',await fingerprintKey(),encoder.encode(`${source}:${identifier}`));
  return base64FromBytes(new Uint8Array(signature));
}
