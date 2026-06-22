export async function api<T>(url:string,init?:RequestInit):Promise<T>{
 const response=await fetch(url,{...init,headers:{'Content-Type':'application/json',...(init?.headers||{})}});
 const body=await response.json().catch(()=>({error:'Unexpected server response'}));
 if(!response.ok) throw new Error(body.error||'Something went wrong');
 return body as T;
}
