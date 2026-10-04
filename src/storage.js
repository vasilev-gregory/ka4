// Same shape as the Claude artifact storage API, backed by localStorage.
export const storage = {
  async get(key) {
    const value = localStorage.getItem(key);
    if (value === null) throw new Error("key not found");
    return { key, value };
  },
  async set(key, value) {
    localStorage.setItem(key, value);
    return { key, value };
  },
  async delete(key) {
    localStorage.removeItem(key);
    return { key, deleted: true };
  },
};
