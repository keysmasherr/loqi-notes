import { eq } from 'drizzle-orm';
import type { UpdateProfileInput } from '@loqi-notes/shared-types';
import { users } from '../../db/schema';
import { NotFoundError } from '../../utils/errors';

export async function getProfile(userId: string, db: any) {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) {
    throw new NotFoundError('User', userId);
  }

  return user;
}

export async function updateProfile(
  userId: string,
  input: UpdateProfileInput,
  db: any
) {
  const updated = await db
    .update(users)
    .set({
      ...input,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning();

  if (!updated.length) {
    throw new NotFoundError('User', userId);
  }

  return updated[0];
}
