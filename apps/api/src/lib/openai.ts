import OpenAI from 'openai';
import { config } from '../config';

export const openai = new OpenAI({
  apiKey: config.ai.openai.apiKey,
});

export const EMBEDDING_MODEL = config.ai.openai.embeddingModel;
export const EMBEDDING_DIMENSIONS = config.ai.openai.embeddingDimensions;
