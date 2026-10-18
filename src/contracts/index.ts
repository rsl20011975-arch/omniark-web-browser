import { z } from 'zod';
export const actionSchema = z.strictObject({
  kind:z.enum(['navigate','observe','click','fill','save','finish']),
  target:z.string(), value:z.string(), expectedHash:z.string(),
  observationId:z.string(), explanation:z.string(),
});
export const chatSchema = z.strictObject({
  conversationId:z.string().uuid(), message:z.string().trim().min(1).max(16000),
});
export type Action = z.infer<typeof actionSchema>;
export type Message = {role:'user'|'assistant';content:string};
export type Artifact = {name:string;hash:string;bytes:number;content:string};
export type Observation = {id:string;url:string;title:string;text:string;
  controls:{ref:string;tag:string;label:string}[];truncated:boolean};
export type Event = {id:number;runId:string;type:string;payload:unknown;time:string};
