const fs = require("node:fs");
const path = require("node:path");
const { z } = require("zod");
const { check } = require("./errors");
const schema = z.object({
  name: z.string().trim().min(1).max(80),
  primaryColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default("#443388"),
  logoPath: z.string().min(1).optional(),
  accreditationText: z.string().trim().min(1).max(350),
  signatureName: z.string().trim().min(1).max(100),
  signatureTitle: z.string().trim().min(1).max(100),
  signatureImagePath: z.string().optional(),
  approved: z.boolean().default(false),
});
function loadBranding(env = process.env) {
  let brand = {
    name: "THINKZ AI",
    primaryColor: "#443388",
    accreditationText: "Client accreditation text pending approval.",
    signatureName: "Signatory pending approval",
    signatureTitle: "Client signature details required",
    approved: false,
  };
  if (env.LMS_BRANDING_FILE) {
    const file = path.resolve(env.LMS_BRANDING_FILE);
    brand = schema.parse(JSON.parse(fs.readFileSync(file, "utf8")));
    for (const key of ["logoPath", "signatureImagePath"]) {
      if (!brand[key]) continue;
      brand[key] = path.resolve(path.dirname(file), brand[key]);
      check(
        /\.(png|jpe?g)$/i.test(brand[key]) && fs.existsSync(brand[key]),
        503,
        "BRANDING_ASSET_MISSING",
        `Configure an existing PNG/JPEG ${key}.`,
      );
    }
  }
  if (
    env.NODE_ENV === "production" ||
    env.LMS_REQUIRE_APPROVED_BRANDING === "true"
  )
    check(
      brand.approved && brand.logoPath,
      503,
      "BRANDING_NOT_APPROVED",
      "Configure the approved client logo, accreditation and signature details.",
    );
  return brand;
}
module.exports = { loadBranding };
