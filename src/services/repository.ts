import * as SecureStore from 'expo-secure-store';
import * as SQLite from 'expo-sqlite';
import { CaseRecord } from '@/types/domain';

const dbPromise=SQLite.openDatabaseAsync('nextstep.db');
const secretKey=(id:string)=>`case_identifier_${id}`;
export async function initRepository(){const db=await dbPromise;await db.execAsync(`PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS cases (id TEXT PRIMARY KEY NOT NULL, payload TEXT NOT NULL, updated_at TEXT NOT NULL);`);}
export async function listCases(){await initRepository();const db=await dbPromise;const rows=await db.getAllAsync<{payload:string}>('SELECT payload FROM cases ORDER BY updated_at DESC');return rows.map(r=>JSON.parse(r.payload) as CaseRecord);}
export async function saveCase(record:CaseRecord,identifier?:string){await initRepository();const db=await dbPromise;await db.runAsync('INSERT OR REPLACE INTO cases (id,payload,updated_at) VALUES (?,?,?)',record.id,JSON.stringify(record),record.lastUpdatedAt);if(identifier)await SecureStore.setItemAsync(secretKey(record.id),identifier,{keychainAccessible:SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY});}
export async function getIdentifier(id:string){return SecureStore.getItemAsync(secretKey(id));}
export async function deleteCase(id:string){const db=await dbPromise;await db.runAsync('DELETE FROM cases WHERE id=?',id);await SecureStore.deleteItemAsync(secretKey(id));}
export async function eraseAll(){const db=await dbPromise;const cases=await listCases();await db.runAsync('DELETE FROM cases');await Promise.all(cases.map(c=>SecureStore.deleteItemAsync(secretKey(c.id))));}
