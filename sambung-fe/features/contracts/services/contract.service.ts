import {apiClient} from "@/lib/api/client";
import {contractSchema} from "../schemas";
export type Quote={regionId:string,grainType:"GKP"|"GKG",quality?:number|null,price:number,action:"order"|"accept"|"counter"};
export type Intent={path:string,body:Record<string,unknown>,quote?:Quote};
export class ContractService {
  static async getMyContracts(status?:string){
    const query=status && status!=="all"?"?status="+encodeURIComponent(status):"";
    const {data}=await apiClient.get<{data:unknown}>("/contracts"+query);
    return contractSchema.array().parse(data);
  }
  static async getContractById(id:string){
    const {data}=await apiClient.get<{data:unknown}>("/contracts/"+encodeURIComponent(id));
    return contractSchema.parse(data);
  }
  static async prepare({quote,body}:Intent){
    if(!quote || process.env.NEXT_PUBLIC_USE_MOCK==="true") return body;
    const check=await apiClient.post<{reference:{referenceVersion:string,bounds:{lowerOperational:number,upperOperational:number},sourceMode:string,sourceDate:string|null},requiresConfirmation:boolean}>("/price-checks/preview",quote);
    const ref=check.reference;
    if(check.requiresConfirmation && !window.confirm(`Harga Rp${quote.price.toLocaleString("id-ID")}/kg berada di bawah toleransi acuan Rp${ref.bounds.lowerOperational}–${ref.bounds.upperOperational}/kg (${ref.sourceDate ?? "layanan harga"}). Lanjutkan dengan harga ini?`))
      throw new Error("Pengajuan harga dibatalkan.");
    return {...body,referenceVersion:ref.referenceVersion,redConfirmed:check.requiresConfirmation};
  }
  static async send(path:string,body:Record<string,unknown>,key:string){
    const {data}=await apiClient.post<{data:unknown}>(path,body,{headers:{"Idempotency-Key":key}});
    return contractSchema.parse(data);
  }
}
