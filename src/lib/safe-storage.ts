function isStorageAvailable(storage: Storage): boolean {
  try {
    const test = '__storage_test__';
    storage.setItem(test, test);
    storage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

const memoryLocal: Record<string, string> = {};
const memorySession: Record<string, string> = {};

function createSafeStorage(getStorage: () => Storage, memory: Record<string, string>) {
  return {
    getItem(key: string): string | null {
      try {
        const storage = getStorage();
        if (isStorageAvailable(storage)) return storage.getItem(key);
      } catch (_) { /* storage unavailable */ }
      return memory[key] ?? null;
    },
    setItem(key: string, value: string): void {
      try {
        const storage = getStorage();
        if (isStorageAvailable(storage)) {
          storage.setItem(key, value);
          return;
        }
      } catch (_) { /* storage unavailable */ }
      memory[key] = value;
    },
    removeItem(key: string): void {
      try {
        const storage = getStorage();
        if (isStorageAvailable(storage)) {
          storage.removeItem(key);
          return;
        }
      } catch (_) { /* storage unavailable */ }
      delete memory[key];
    },
  };
}

const safeStorage = createSafeStorage(() => localStorage, memoryLocal);
export const safeSessionStorage = createSafeStorage(() => sessionStorage, memorySession);

export default safeStorage;