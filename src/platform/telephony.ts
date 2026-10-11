export function telUri(phone: string): string { return `tel:${phone.replace(/[^\d+]/g, "")}`; }
export function callIntent(phone: string): { uri: string; phone: string } { return { uri: telUri(phone), phone }; }
