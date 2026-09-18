// Fixed mapping reviewed with the seed. UUID syntax alone never establishes trust.
const legacyToUuid = new Map<string, string>([
  ["jersey-001", "423bb850-23f3-493f-a3c1-5b03c2096f93"],
  ["jersey-002", "698ac8ab-fc88-4dd8-a403-23c0fb13af7d"],
  ["jersey-003", "2b7406a9-e38c-443b-92c5-3b980ffdc42a"],
  ["jersey-004", "65d16266-be4a-4ac7-a19c-1b18495ee69c"],
  ["jersey-005", "fa09893e-6a0c-45d2-a353-24026ab3d4b8"],
  ["jersey-006", "3967aaf4-83c6-4f9e-ac7e-7196740ebcac"],
  ["jersey-007", "28994dcb-c17b-4618-975b-d26efa8cbbf3"],
  ["jersey-008", "6cb862e8-9f7c-438f-b2fa-7fcbf155c8f4"],
  ["jersey-009", "c843f7c8-8506-4993-98a2-2def6d9d4e57"],
  ["jersey-010", "4f01d219-1bf8-4bc7-aa19-b4f4cc377ea5"],
  ["jersey-011", "e006008a-f14a-4cc3-ac28-8fd0c7afe687"],
  ["jersey-012", "c3a2afe2-cc30-4839-b081-70bdac68bfdf"],
]);

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/** Identity candidates only; current catalogue membership is checked separately. */
export function normalizeProductId(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const id = legacyToUuid.get(value) ?? value;
  return uuid.test(id) ? id : undefined;
}
