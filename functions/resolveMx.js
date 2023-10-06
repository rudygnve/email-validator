import { resolveMx } from "dns/promises";

export const resolveMxRecords = async (domain) => {
  try {
    return await resolveMx(domain);
  } catch (error) {
    console.error(error);
    return [];
  }
};
