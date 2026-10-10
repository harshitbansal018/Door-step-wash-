// Business-wide settings. Change the brand name, contact details or currency here.
export const BRAND = {
  name: "FoamValet",
  tagline: "Doorstep Car Wash",
  phone: process.env.NEXT_PUBLIC_SUPPORT_PHONE ?? "",
  email: process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "",
};

export const CURRENCY = {
  locale: "en-IN",
  code: "INR",
};
