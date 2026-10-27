// True for a plain web address (nothing but the URL), so a cell can show it as a link rather than as text.
export const isWebAddress = (value: string) => /^https?:\/\/\S+$/i.test(value.trim());
