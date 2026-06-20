import fs from "fs";
import path from "path";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { TENANTS_FILE, CONVERSATIONS_FILE, NODE_ENV } from "../config";
import { encryptTenant, decryptTenant } from "./encryption";

// Load Firebase Project ID safely from the client applet configuration file
let firebaseProjectId = "red-bruin-23n78";
let firebaseDatabaseId: string | undefined = undefined;
try {
  const configContent = fs.readFileSync(path.join(process.cwd(), "firebase-applet-config.json"), "utf-8");
  const config = JSON.parse(configContent);
  if (config.projectId) {
    firebaseProjectId = config.projectId;
  }
  if (config.firestoreDatabaseId) {
    firebaseDatabaseId = config.firestoreDatabaseId;
  }
} catch (configErr) {
  console.warn("Could not load firebase-applet-config.json, using default fallback projectId.", configErr);
}

// Safely initialize the Firebase Admin SDK on the server
if (admin.apps.length === 0) {
  admin.initializeApp({
    projectId: firebaseProjectId
  });
}

export const firestoreDb = getFirestore(admin.app(), firebaseDatabaseId);

export let useLocalFallbackOnly = NODE_ENV === "test";

export async function checkFirestoreConnection() {
  try {
    await firestoreDb.collection("tenants").limit(1).get();
    console.log("[FIRESTORE] Live Firebase Cloud connection verified successfully.");
  } catch (err: any) {
    useLocalFallbackOnly = true;
    console.log("[FIRESTORE] GCP cross-project service account access is restricted. Sandboxed JSON local filesystem stores activated.");
  }
}

// Trigger connection check asynchronously at startup
checkFirestoreConnection();

export async function readTenantsStore(): Promise<Record<string, any>> {
  if (useLocalFallbackOnly) {
    try {
      if (fs.existsSync(TENANTS_FILE)) {
        const raw = JSON.parse(fs.readFileSync(TENANTS_FILE, "utf-8"));
        const decryptedStore: Record<string, any> = {};
        for (const k of Object.keys(raw)) {
          decryptedStore[k] = decryptTenant(raw[k]);
        }
        return decryptedStore;
      }
    } catch (fsErr) {
      console.error("Local file fallback read error:", fsErr);
    }
    return {};
  }

  try {
    const snapshot = await firestoreDb.collection("tenants").get();
    const store: Record<string, any> = {};
    snapshot.forEach(doc => {
      store[doc.id] = decryptTenant(doc.data());
    });
    
    // Bootstrap empty Firestore collection from presets
    if (Object.keys(store).length === 0 && fs.existsSync(TENANTS_FILE)) {
      console.log("[FIRESTORE] 'tenants' collection is empty. Bootstrapping with local backup preset data...");
      try {
        const raw = JSON.parse(fs.readFileSync(TENANTS_FILE, "utf-8"));
        const decryptedStore: Record<string, any> = {};
        for (const k of Object.keys(raw)) {
          decryptedStore[k] = decryptTenant(raw[k]);
        }
        await writeTenantsStore(decryptedStore);
        return decryptedStore;
      } catch (e) {
        console.error("Failed to parse local tenants store bootstrap:", e);
      }
    }
    return store;
  } catch (err) {
    console.warn("[FIRESTORE] Cloud Firestore read failed. Transitioning to local file fallback...");
    useLocalFallbackOnly = true;
    try {
      if (fs.existsSync(TENANTS_FILE)) {
        const raw = JSON.parse(fs.readFileSync(TENANTS_FILE, "utf-8"));
        const decryptedStore: Record<string, any> = {};
        for (const k of Object.keys(raw)) {
          decryptedStore[k] = decryptTenant(raw[k]);
        }
        return decryptedStore;
      }
    } catch (fsErr) {
      console.error("Local file fallback error:", fsErr);
    }
  }
  return {};
}

export async function writeTenantsStore(store: Record<string, any>) {
  const encryptedStore: Record<string, any> = {};
  for (const k of Object.keys(store)) {
    encryptedStore[k] = encryptTenant(store[k]);
  }

  try {
    fs.writeFileSync(TENANTS_FILE, JSON.stringify(encryptedStore, null, 2), "utf-8");
  } catch (fsErr) {
    console.error("Local file write error:", fsErr);
  }

  if (useLocalFallbackOnly) {
    return;
  }

  try {
    const batch = firestoreDb.batch();
    for (const id of Object.keys(encryptedStore)) {
      const docRef = firestoreDb.collection("tenants").doc(id);
      batch.set(docRef, encryptedStore[id]);
    }
    await batch.commit();
    console.log(`[FIRESTORE] Successfully synchronized ${Object.keys(encryptedStore).length} tenants inside Firestore.`);
  } catch (err) {
    console.warn("[FIRESTORE] Cloud Firestore write failed. Running in offline file fallback mode.");
    useLocalFallbackOnly = true;
  }
}

export async function readConversationsStore(): Promise<Record<string, any>> {
  if (useLocalFallbackOnly) {
    try {
      if (fs.existsSync(CONVERSATIONS_FILE)) {
        return JSON.parse(fs.readFileSync(CONVERSATIONS_FILE, "utf-8"));
      }
    } catch (fsErr) {
      console.error("Conversations local file fallback read error:", fsErr);
    }
    return {};
  }

  try {
    const snapshot = await firestoreDb.collection("conversations").get();
    const store: Record<string, any> = {};
    snapshot.forEach(doc => {
      store[doc.id] = doc.data();
    });

    if (Object.keys(store).length === 0 && fs.existsSync(CONVERSATIONS_FILE)) {
      console.log("[FIRESTORE] 'conversations' collection is empty. Bootstrapping from local sandbox data...");
      try {
        const localStore = JSON.parse(fs.readFileSync(CONVERSATIONS_FILE, "utf-8"));
        await writeConversationsStore(localStore);
        return localStore;
      } catch (e) {
        console.error("Failed to parse local conversations store bootstrap:", e);
      }
    }
    return store;
  } catch (err) {
    console.warn("[FIRESTORE] Cloud Firestore conversations read failed. Transitioning to local file fallback...");
    useLocalFallbackOnly = true;
    try {
      if (fs.existsSync(CONVERSATIONS_FILE)) {
        return JSON.parse(fs.readFileSync(CONVERSATIONS_FILE, "utf-8"));
      }
    } catch (fsErr) {
      console.error("Conversations local file fallback error:", fsErr);
    }
  }
  return {};
}

export async function writeConversationsStore(store: Record<string, any>) {
  try {
    fs.writeFileSync(CONVERSATIONS_FILE, JSON.stringify(store, null, 2), "utf-8");
  } catch (fsErr) {
    console.error("Conversations local file write error:", fsErr);
  }

  if (useLocalFallbackOnly) {
    return;
  }

  try {
    const batch = firestoreDb.batch();
    for (const id of Object.keys(store)) {
      const docRef = firestoreDb.collection("conversations").doc(id);
      batch.set(docRef, store[id]);
    }
    await batch.commit();
  } catch (err) {
    console.warn("[FIRESTORE] Cloud Firestore conversations write failed. Running in offline fallback mode.");
    useLocalFallbackOnly = true;
  }
}
