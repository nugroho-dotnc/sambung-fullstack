"use client";
import {useRef} from "react";
import {useQuery,useMutation,useQueryClient} from "@tanstack/react-query";
import {offerRequestId} from "@/features/offers/services/request-id";
import {ContractService,type Intent} from "../services/contract.service";
import {ApiError} from "@/lib/api/errors";

export const CONTRACT_QUERY_KEYS={all:["contracts"] as const, list:(status?:string)=>["contracts","list",status] as const,
  detail:(id:string)=>["contracts","detail",id] as const};
export function useContracts(status?:string){
  return useQuery({queryKey:CONTRACT_QUERY_KEYS.list(status),queryFn:()=>ContractService.getMyContracts(status),refetchInterval:5000});
}
export function useContract(id:string){
  return useQuery({queryKey:CONTRACT_QUERY_KEYS.detail(id),queryFn:()=>ContractService.getContractById(id),enabled:!!id,refetchInterval:5000});
}
export function useContractCommand(){
  const client=useQueryClient();
  const pending=useRef<{fingerprint:string,key:string,prepared:Promise<Record<string,unknown>>}|null>(null);
  return useMutation({mutationFn:async(intent:Intent)=>{
    const fingerprint=JSON.stringify(intent);
    if(pending.current?.fingerprint!==fingerprint)
      pending.current={fingerprint,key:offerRequestId(),prepared:ContractService.prepare(intent)};
    const attempt=pending.current;
    try{
      const body=await attempt.prepared.catch(error=>{
        pending.current=null;
        throw error;
      });
      const contract=await ContractService.send(intent.path,body,attempt.key);
      pending.current=null;
      client.setQueryData(CONTRACT_QUERY_KEYS.detail(contract.id),contract);
      return contract;
    }catch(error){
      if(!(error instanceof ApiError) || (error.status>0 && error.status<500)) pending.current=null;
      throw error;
    }
  },onSettled:async()=>{
    await Promise.all(["contracts","offers","catalog"].map(key=>client.invalidateQueries({queryKey:[key]})));
  }});
}
