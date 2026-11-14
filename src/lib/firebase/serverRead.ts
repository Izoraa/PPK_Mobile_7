import { FirebaseError } from 'firebase/app';
import { getDocFromServer, type DocumentData, type DocumentReference, type DocumentSnapshot } from 'firebase/firestore';

export async function getConfirmedDocument<T, DbData extends DocumentData>(
  reference: DocumentReference<T, DbData>,
): Promise<DocumentSnapshot<T, DbData>> {
  const snapshot = await getDocFromServer(reference);
  // A server snapshot can still include local writes from latency compensation.
  if (snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) {
    throw new FirebaseError('unavailable', 'The document has no confirmed server snapshot.');
  }
  return snapshot;
}
