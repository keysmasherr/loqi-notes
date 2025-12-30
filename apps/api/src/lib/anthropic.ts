import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config';

export const anthropic = new Anthropic({
  apiKey: config.ai.anthropic.apiKey,
});

export const DEFAULT_MODEL = config.ai.anthropic.defaultModel;
export const ADVANCED_MODEL = config.ai.anthropic.advancedModel;
