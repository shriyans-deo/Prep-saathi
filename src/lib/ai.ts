import { supabase } from './supabase';
import { AI_TASKS } from './constants';

export type AITaskType = (typeof AI_TASKS)[keyof typeof AI_TASKS];

/**
 * Invoke the AI edge function with a specific task and payload.
 * All AI calls route through the backend — the frontend never contacts the provider directly.
 */
export async function invokeAI(task: AITaskType, payload: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('ai', {
    body: { task, payload },
  });

  if (error) {
    console.error(`AI task '${task}' failed:`, error);
    throw new Error(`AI task failed: ${error.message}`);
  }

  return data;
}
