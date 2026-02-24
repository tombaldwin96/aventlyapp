/**
 * Shortlist (saved performers) in AsyncStorage. Same shape as website (avently_shortlist).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'avently_shortlist';

export type ShortlistEntry = {
  userId: string;
  profileSlug: string;
  stageName: string;
  profileImageUrl?: string | null;
};

export async function getShortlist(): Promise<ShortlistEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((e) => e && typeof (e as ShortlistEntry).userId === 'string') : [];
  } catch {
    return [];
  }
}

export async function removeFromShortlist(userId: string): Promise<void> {
  const list = await getShortlist();
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list.filter((e) => e.userId !== userId)));
}

export async function addToShortlist(entry: ShortlistEntry): Promise<void> {
  const list = await getShortlist();
  if (list.some((e) => e.userId === entry.userId)) return;
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([...list, entry]));
}

export async function toggleShortlist(entry: ShortlistEntry): Promise<boolean> {
  const list = await getShortlist();
  const exists = list.some((e) => e.userId === entry.userId);
  if (exists) {
    await removeFromShortlist(entry.userId);
    return false;
  }
  await addToShortlist(entry);
  return true;
}
