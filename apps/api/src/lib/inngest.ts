/**
 * Inngest Client Setup
 *
 * Provides event-driven background job processing for:
 * - Embedding generation
 * - Note processing
 * - Scheduled tasks
 */

import { Inngest, EventSchemas } from 'inngest';
import { config } from '../config';

/**
 * Event schema definitions for type safety
 */
type Events = {
  'notes/created': {
    data: {
      noteId: string;
      userId: string;
      title: string;
      content: string;
      courseTag?: string;
    };
  };
  'notes/updated': {
    data: {
      noteId: string;
      userId: string;
      title: string;
      content: string;
      courseTag?: string;
    };
  };
};

/**
 * Inngest client instance
 * Used to send events and define functions
 */
export const inngest = new Inngest({
  id: 'loqi-notes',
  name: 'LoqiNotes',
  schemas: new EventSchemas().fromRecord<Events>(),
  eventKey: config.inngest.eventKey,
});
