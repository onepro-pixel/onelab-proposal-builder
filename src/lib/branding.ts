/** Brand identity belongs to the seller organization, never the customer. */
export type BrandProfile = {
  organization_id: string;
  company_name: string;
  primary_color: string;
  accent_color: string;
  background_color: string;
  text_color: string;
  logo_path: string | null;
  cover_image_path: string | null;
  heading_font_path: string | null;
  body_font_path: string | null;
};

export type BrandAsset = {
  id: string;
  organization_id: string;
  storage_path: string;
  asset_type: "logo" | "image" | "font";
  label: string;
};

/** Resolve a storage path only after checking organization membership on the server. */
export function brandAssetPath(organizationId: string, fileName: string): string {
  if (!/^[0-9a-f-]{36}$/i.test(organizationId)) throw new Error("Invalid organization ID");
  if (!/^[a-zA-Z0-9_.-]+$/.test(fileName) || fileName.startsWith(".")) throw new Error("Invalid file name");
  return `${organizationId}/${fileName}`;
}

export function brandCssVariables(brand: BrandProfile): Record<string, string> {
  const color = (value: string, fallback: string) => /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;
  return {
    "--brand-primary": color(brand.primary_color, "#172554"),
    "--brand-accent": color(brand.accent_color, "#0ea5e9"),
    "--brand-background": color(brand.background_color, "#ffffff"),
    "--brand-text": color(brand.text_color, "#111827"),
  };
}
