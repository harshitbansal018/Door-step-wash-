import { z } from "zod";

const shortText = z.string().trim().min(1).max(160);
const longText = z.string().trim().min(1).max(1200);
const link = z.object({ label: shortText, href: z.string().trim().regex(/^\/(?!\/)|^#[a-z0-9-]+$/i).max(160) });
const hero = z.object({
  eyebrow: shortText,
  title: shortText,
  accent: shortText,
  description: longText,
  primaryLabel: shortText,
  primaryHref: z.string().trim().regex(/^\/(?!\/)|^#[a-z0-9-]+$/i).max(160),
});
const item = z.object({ title: shortText, body: longText });
const faqItem = z.object({ category: shortText, question: shortText, answer: longText });
const policy = z.object({
  title: shortText,
  updated: shortText,
  sections: z.array(item).min(1).max(30),
});

export const siteContentSchema = z.object({
  general: z.object({
    brandName: shortText,
    tagline: shortText,
    supportPhone: z.string().trim().max(40),
    supportEmail: z.union([z.literal(""), z.email()]),
    footerDescription: longText,
    navigation: z.array(link).min(1).max(10),
    footerLinks: z.array(z.object({ title: shortText, links: z.array(link).min(1).max(10) })).min(1).max(6),
  }),
  home: z.object({
    seoTitle: shortText,
    seoDescription: longText,
    heroBadge: shortText,
    heroTitle: shortText,
    heroAccent: shortText,
    heroDescription: longText,
    stats: z.array(z.object({ value: shortText, label: shortText })).min(1).max(6),
    stepsEyebrow: shortText,
    stepsTitle: shortText,
    steps: z.array(item).min(1).max(8),
    pricingEyebrow: shortText,
    pricingTitle: shortText,
    pricingDescription: longText,
    featuresEyebrow: shortText,
    featuresTitle: shortText,
    features: z.array(item).min(1).max(12),
    citiesEyebrow: shortText,
    citiesTitle: shortText,
    citiesDescription: longText,
    faqTitle: shortText,
    faqs: z.array(z.object({ question: shortText, answer: longText })).min(1).max(20),
    ctaTitle: shortText,
    ctaDescription: longText,
    ctaButton: shortText,
  }),
  howItWorks: z.object({
    seoTitle: shortText,
    seoDescription: longText,
    hero,
    journeyLabel: shortText,
    journey: z.array(z.object({ short: shortText, title: shortText, body: longText, note: longText })).min(1).max(8),
    essentialsEyebrow: shortText,
    essentialsTitle: shortText,
    essentials: z.array(item).min(1).max(8),
  }),
  pricing: z.object({
    seoTitle: shortText,
    seoDescription: longText,
    hero,
    sectionEyebrow: shortText,
    sectionTitle: shortText,
    promises: z.array(item).min(1).max(8),
  }),
  cities: z.object({
    seoTitle: shortText,
    seoDescription: longText,
    hero,
    checkerEyebrow: shortText,
    checkerTitle: shortText,
    checkerDescription: longText,
    benefits: z.array(item).min(1).max(8),
    mapEyebrow: shortText,
    mapTitle: shortText,
  }),
  faq: z.object({
    seoTitle: shortText,
    seoDescription: longText,
    hero,
    items: z.array(faqItem).min(1).max(60),
    ctaTitle: shortText,
    ctaDescription: longText,
    ctaButton: shortText,
  }),
  policies: z.object({ terms: policy, privacy: policy, refund: policy }),
});

export type SiteContent = z.infer<typeof siteContentSchema>;

export const DEFAULT_SITE_CONTENT: SiteContent = {
  general: {
    brandName: "FoamValet",
    tagline: "Doorstep Car Wash",
    supportPhone: "",
    supportEmail: "",
    footerDescription: "Professional car wash and detailing at your doorstep. Trained, verified washers. Pay securely online.",
    navigation: [
      { label: "Home", href: "/" }, { label: "How it works", href: "/how-it-works" },
      { label: "Pricing", href: "/pricing" }, { label: "Cities", href: "/cities" }, { label: "FAQ", href: "/faq" },
    ],
    footerLinks: [
      { title: "Services", links: [{ label: "Express Wash", href: "/pricing" }, { label: "Premium Wash", href: "/pricing" }, { label: "Deluxe Detailing", href: "/pricing" }, { label: "Book now", href: "/book" }] },
      { title: "Company", links: [{ label: "How it works", href: "/how-it-works" }, { label: "Cities", href: "/cities" }, { label: "FAQ", href: "/faq" }, { label: "Become a partner", href: "/worker" }, { label: "Admin", href: "/admin" }] },
      { title: "Legal", links: [{ label: "Terms of service", href: "/terms" }, { label: "Privacy policy", href: "/privacy" }, { label: "Refund policy", href: "/refund-policy" }] },
    ],
  },
  home: {
    seoTitle: "Doorstep car wash", seoDescription: "Book a professional doorstep car wash with live local pricing and convenient time slots.",
    heroBadge: "Doorstep car care, reimagined", heroTitle: "Your car, cared for", heroAccent: "right where it’s parked.",
    heroDescription: "Pick a time and provide access to water. We bring the pressure washer, microfiber cloths and cleaning equipment—then keep you updated from booking to before-and-after proof.",
    stats: [{ value: "14 days", label: "Booking window" }, { value: "Online", label: "Secure payment" }, { value: "Photo proof", label: "Before & after" }],
    stepsEyebrow: "How it works", stepsTitle: "Three steps to a cleaner car",
    steps: [
      { title: "Book in 60 seconds", body: "Pick your car, package and a time slot that suits you. Pay securely online." },
      { title: "We come to you", body: "A verified washer arrives with a pressure washer, microfiber cloths and the equipment needed for the job. You provide access to water." },
      { title: "Your car, spotless", body: "Your car never leaves your parking. See before and after photos, rate the wash, and rebook in one tap." },
    ],
    pricingEyebrow: "Pricing", pricingTitle: "Simple, transparent packages", pricingDescription: "Cleaning equipment and materials are included; you only provide access to water. No hidden charges.",
    featuresEyebrow: "Why FoamValet", featuresTitle: "Built for people who value their time",
    features: [
      { title: "Verified professionals", body: "Partners are activated only after their identity document has been reviewed by an administrator." },
      { title: "Doorstep convenience", body: "The service is completed where your vehicle is parked, based on the access details you provide." },
      { title: "Scheduled slots", body: "Choose from current availability in your service area and reschedule eligible bookings online." },
      { title: "Secure payments", body: "Payments and eligible refunds are processed through Razorpay." },
      { title: "Live job status", body: "Follow assignment and job progress from confirmed through completed in your account." },
      { title: "Photo proof", body: "Workers upload required before and after photos as part of the job workflow." },
    ],
    citiesEyebrow: "Cities", citiesTitle: "Expanding across India", citiesDescription: "We launch area by area so every booking gets an on-time washer. Don’t see your city? Enter your pincode above and we’ll tell you when we arrive.",
    faqTitle: "Frequently asked questions",
    faqs: [
      { question: "Do you take my car away?", answer: "No. This is a doorstep service: the washer comes to where your car is parked and washes it right there." },
      { question: "Do I need to provide water?", answer: "Yes. Please provide access to a nearby water source. Your service partner brings the cleaning equipment." },
      { question: "How do I pay?", answer: "You pay online at booking through Razorpay using the methods enabled for the merchant account." },
    ],
    ctaTitle: "Your car deserves better than a dusty Sunday.", ctaDescription: "Check your pincode for current packages, prices and available time slots.", ctaButton: "Book your wash",
  },
  howItWorks: {
    seoTitle: "How it works", seoDescription: "See how doorstep car washing works from booking through completion.",
    hero: { eyebrow: "From booking to spotless", title: "A better wash in", accent: "four simple steps.", description: "Book online, prepare your parking spot, and let a verified service partner handle the rest—while your car stays right where it is.", primaryLabel: "Book a wash", primaryHref: "/book" },
    journeyLabel: "Your journey",
    journey: [
      { short: "Book", title: "Choose your wash", body: "Enter your pincode, choose your vehicle and package, then select an available time slot.", note: "Your price and availability are confirmed before payment." },
      { short: "Prepare", title: "Prepare your parking spot", body: "Make sure the vehicle is accessible and a nearby water source is available at the scheduled time.", note: "The car stays exactly where it is parked." },
      { short: "Arrival", title: "Your partner arrives", body: "A verified service partner brings the pressure washer, microfiber cloths and required cleaning equipment.", note: "Follow assignment and job progress from your account." },
      { short: "Complete", title: "Review the result", body: "Before-and-after photos are added to the job record when the service is completed.", note: "Review your wash and rebook whenever you are ready." },
    ],
    essentialsEyebrow: "Good to know", essentialsTitle: "Everything ready before the first drop",
    essentials: [
      { title: "You provide water", body: "Please make sure a nearby water source is accessible at your chosen time." },
      { title: "We bring the equipment", body: "Your partner arrives with a pressure washer, microfiber cloths and required cleaning tools." },
      { title: "Verified service partner", body: "Partners are activated only after their identity document is reviewed by an administrator." },
      { title: "Progress you can see", body: "Track job status and receive before-and-after photo proof through your account." },
    ],
  },
  pricing: {
    seoTitle: "Pricing", seoDescription: "Check live doorstep car wash pricing for your area and vehicle.",
    hero: { eyebrow: "Clear, local pricing", title: "Find the right wash at", accent: "the right price.", description: "Start with our lowest active rates, then enter your pincode to see the exact packages and pricing available in your area.", primaryLabel: "Check your pincode", primaryHref: "#live-pricing" },
    sectionEyebrow: "Live packages", sectionTitle: "Your area. Your vehicle. Your price.",
    promises: [
      { title: "Price shown upfront", body: "See your package price and applicable area charge before booking." },
      { title: "Secure online payment", body: "Complete payment through Razorpay using the enabled methods." },
      { title: "Materials included", body: "Microfiber cloths and standard cleaning materials are included in the displayed price." },
      { title: "Water access required", body: "You provide a nearby water source; the partner brings the pressure washer and equipment." },
    ],
  },
  cities: {
    seoTitle: "Cities", seoDescription: "Check doorstep car wash coverage in your city and neighbourhood.",
    hero: { eyebrow: "Growing area by area", title: "Doorstep car care", accent: "closer to home.", description: "Coverage can vary by neighbourhood. Check your six-digit pincode for the most accurate availability, packages and local pricing.", primaryLabel: "Check coverage", primaryHref: "#coverage" },
    checkerEyebrow: "Pincode checker", checkerTitle: "Know before you book", checkerDescription: "Enter your pincode and we’ll take you directly to booking when your area is served. If we are not there yet, you can join the local waitlist.",
    benefits: [
      { title: "Area-level coverage", body: "Availability is checked against your exact pincode, not only your city." },
      { title: "Local time slots", body: "Booking options reflect capacity in the service area assigned to you." },
      { title: "Water access", body: "Provide a nearby water source at the parking spot for your scheduled wash." },
      { title: "Launch updates", body: "Join the waitlist to be notified when service opens in an unsupported area." },
    ],
    mapEyebrow: "Service map", mapTitle: "Where we are washing now",
  },
  faq: {
    seoTitle: "Frequently asked questions", seoDescription: "Answers about doorstep car washing, bookings, payments, preparation and coverage.",
    hero: { eyebrow: "Answers, without the runaround", title: "Everything you need to", accent: "book confidently.", description: "Search common questions about water access, equipment, booking, payments, coverage and what happens on wash day.", primaryLabel: "Browse questions", primaryHref: "#questions" },
    items: [
      { category: "Service", question: "Do you take my car away?", answer: "No. The service is completed where your car is parked." },
      { category: "Service", question: "Do I need to be present?", answer: "Not for an exterior wash if the partner can access your vehicle. Interior cleaning requires arranged key access." },
      { category: "Preparation", question: "Do I need to provide water?", answer: "Yes. Please provide access to a nearby water source." },
      { category: "Booking", question: "Can I reschedule my booking?", answer: "Eligible bookings can be rescheduled online, subject to available slots and the displayed window." },
      { category: "Payment", question: "How do I pay?", answer: "Payment is completed online during booking through Razorpay." },
      { category: "Coverage", question: "Which cities do you serve?", answer: "Use the pincode checker for the latest area-level availability." },
    ],
    ctaTitle: "Ready to give your car a better wash?", ctaDescription: "Check your local availability, choose a package and reserve a time that works for you.", ctaButton: "Start booking",
  },
  policies: {
    terms: { title: "Terms of service", updated: "30 September 2026", sections: [
      { title: "Using the service", body: "You must provide accurate vehicle, access, contact and address information and ensure the service partner can lawfully access the parking location during the selected slot." },
      { title: "Bookings and payment", body: "A booking is confirmed only after payment is captured. Pending payments temporarily hold capacity and may expire." },
      { title: "Service completion", body: "Service partners update job stages and upload before and after photos. Do not request work outside the booked package." },
      { title: "Cancellations", body: "Cancellation and refund eligibility depend on the cancellation window configured for the booking city." },
      { title: "Account security", body: "Keep your password and verification codes private. We may block accounts used for fraud, abuse or unauthorized access." },
    ] },
    privacy: { title: "Privacy policy", updated: "30 September 2026", sections: [
      { title: "Information we collect", body: "We store account details, booking contact and address information, vehicle details, payment references, job status, reviews and service photos needed to operate the platform." },
      { title: "How information is used", body: "Information is used to authenticate users, calculate and fulfil bookings, assign workers, process payments and refunds, prevent abuse and provide support." },
      { title: "Sharing", body: "Workers receive job details needed to complete accepted work. Razorpay, Supabase and the configured email provider process data for their respective services." },
      { title: "Security and retention", body: "Role-based access controls and row-level security restrict access. Records are retained for operational, fraud-prevention and legal obligations." },
    ] },
    refund: { title: "Refund policy", updated: "30 September 2026", sections: [
      { title: "Customer cancellations", body: "A full refund is started automatically when an eligible paid booking is cancelled before the city’s configured cancellation window." },
      { title: "Operational cancellations", body: "An administrator may cancel a booking and choose whether to issue a full refund." },
      { title: "Processing", body: "Refunds are sent through Razorpay to the original payment method. Bank and payment-network processing times apply." },
      { title: "Partial refunds", body: "Administrators can issue a partial refund up to the remaining captured amount when a service issue is approved." },
    ] },
  },
};
