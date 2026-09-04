export default async function attempt<T>(callback: () => Promise<T>): Promise<[null, T] | [Error, null]> {
  try {
    return [null, await callback()];
  } catch (error) {
    console.error(error);
    return [error instanceof Error ? error : new Error(String(error)), null];
  }
}
