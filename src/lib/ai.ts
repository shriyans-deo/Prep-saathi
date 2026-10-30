import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from './supabase';

export type AITask =
  | 'daily_plan'
  | 'topic_quiz'
  | 'document_quiz'
  | 'quiz_submit'
  | 'doc_process'
  | 'weekly_summary'
  | 'proof_check';

export class AIError extends Error {
  code: string;
  constructor(code: string) {
    super(code);
    this.code = code;
  }
}

// Every AI call goes through the edge function; the provider key never reaches the browser.
export async function invokeAI<T>(task: AITask, payload: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke('ai', { body: { task, payload } });
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const body = await error.context.json().catch(() => null);
      throw new AIError(body?.error ?? 'server_error');
    }
    throw new AIError('network_error');
  }
  return data as T;
}
