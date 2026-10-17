/** Public company details come ONLY from configuration. Nothing is shown when unset. */
export function companyInfo() {
  return {
    brand: "Valden",
    tagline: "Global electronics distribution for business buyers",
    legalName: process.env.COMPANY_LEGAL_NAME || null,
    email: process.env.COMPANY_SUPPORT_EMAIL || null,
    phone: process.env.COMPANY_SUPPORT_PHONE || null,
    address: process.env.COMPANY_ADDRESS || null,
  };
}
