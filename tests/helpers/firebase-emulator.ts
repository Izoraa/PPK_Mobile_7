import http from 'node:http';
import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';

/** A Firebase demo project ID. It cannot address the production Firebase project. */
export const FIREBASE_TEST_PROJECT_ID = 'demo-labcheckin-test';

function firestoreEmulatorEndpoint() {
  const [host = '127.0.0.1', portValue = '8080'] = (
    process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080'
  ).split(':');

  return `http://${host}:${Number(portValue)}`;
}

export async function createFirebaseTestEnvironment(): Promise<RulesTestEnvironment> {
  const endpoint = new URL(firestoreEmulatorEndpoint());

  return initializeTestEnvironment({
    projectId: FIREBASE_TEST_PROJECT_ID,
    firestore: {
      host: endpoint.hostname,
      port: Number(endpoint.port),
    },
  });
}

export async function clearFirestoreEmulatorData(): Promise<void> {
  const url = new URL(
    `${firestoreEmulatorEndpoint()}/emulator/v1/projects/${FIREBASE_TEST_PROJECT_ID}/databases/(default)/documents`,
  );

  await new Promise<void>((resolve, reject) => {
    const request = http.request(url, { method: 'DELETE' }, (response) => {
      response.resume();
      response.on('end', () => {
        if (response.statusCode && response.statusCode >= 200 && response.statusCode < 300) {
          resolve();
        } else {
          reject(new Error(`Could not clear Firestore Emulator data (${response.statusCode}).`));
        }
      });
    });

    request.on('error', reject);
    request.end();
  });
}
