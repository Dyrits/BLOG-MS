export default async function attempt(callback: () => Promise<any>) {
  try {
    return [null, await callback()];
  } catch (error) {
    console.error(error);
    return [error, null];
  }
}