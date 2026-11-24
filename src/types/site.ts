export type Language = 'en' | 'es';

export type SectionId =
  | 'services'
  | 'pricing'
  | 'gear'
  | 'training'
  | 'diagnostic'
  | 'testimonials';

export type BuiltInGearCategory =
  | 'speakers'
  | 'mics'
  | 'consoles'
  | 'dj'
  | 'iem'
  | 'combiners'
  | 'lighting'
  | 'rigging'
  | 'cables'
  | 'cases';

export type GearCategory = 'all' | BuiltInGearCategory | (string & {});

export interface CatalogCategoryConfig {
  id: string;
  labelEn: string;
  labelEs: string;
  shortLabel?: string;
  hint?: string;
  builtIn?: boolean;
}

export type PriceRangeFilter =
  | 'all'
  | 'under500'
  | '500to1000'
  | '1000to2000'
  | 'over2000'
  | 'quoteOnly';

export type GearSortOption = 'featured' | 'priceAsc' | 'priceDesc' | 'nameAsc';

export type TestimonialCategory = 'all' | 'church' | 'corporate' | 'ministry';

export type QuoteStatus = 'new' | 'contacted' | 'scheduled' | 'completed';

export interface BrandConfig {
  name: string;
  companyFull: string;
  leadEngineer: string;
  phoneDisplay: string;
  phoneHref: string;
  email: string;
  location: string;
  scriptureEn: string;
  scriptureEs: string;
  scriptureRef: string;
}

export interface HeroConfig {
  eyebrowEn?: string;
  eyebrowEs?: string;
  headlineEn: string;
  headlineEs: string;
  subheadlineEn: string;
  subheadlineEs: string;
  searchPlaceholderEn?: string;
  searchPlaceholderEs?: string;
  searchButtonEn?: string;
  searchButtonEs?: string;
  sloganTitleEn?: string;
  sloganTitleEs?: string;
  sloganBodyEn?: string;
  sloganBodyEs?: string;
  primaryCtaEn: string;
  primaryCtaEs: string;
  shopButtonEn?: string;
  shopButtonEs?: string;
  quoteButtonEn?: string;
  quoteButtonEs?: string;
  photoTitleEn?: string;
  photoTitleEs?: string;
  photoCaptionEn?: string;
  photoCaptionEs?: string;
  stripStat1TitleEn?: string;
  stripStat1TitleEs?: string;
  stripStat1BodyEn?: string;
  stripStat1BodyEs?: string;
  stripStat2LabelEn?: string;
  stripStat2LabelEs?: string;
  stripStat2BodyEn?: string;
  stripStat2BodyEs?: string;
  stripStat3BodyEn?: string;
  stripStat3BodyEs?: string;
  stripStat4BodyEn?: string;
  stripStat4BodyEs?: string;
  imageUrl: string;
}

export interface TrainingModuleItem {
  id: string;
  titleEn: string;
  titleEs: string;
  descEn: string;
  descEs: string;
}

export interface PageCopyConfig {
  // Navbar links & CTA
  navGearEn: string;
  navGearEs: string;
  navServicesEn: string;
  navServicesEs: string;
  navPricingEn: string;
  navPricingEs: string;
  navTrainingEn: string;
  navTrainingEs: string;
  navReviewsEn: string;
  navReviewsEs: string;
  navQuoteCtaEn: string;
  navQuoteCtaEs: string;
  // Gear section
  gearEyebrowEn: string;
  gearEyebrowEs: string;
  gearHeadingEn: string;
  gearHeadingEs: string;
  gearSubtitleEn: string;
  gearSubtitleEs: string;
  gearBannerTitleEn: string;
  gearBannerTitleEs: string;
  gearBannerBodyEn: string;
  gearBannerBodyEs: string;
  gearSourcingTitleEn: string;
  gearSourcingTitleEs: string;
  gearSourcingBodyEn: string;
  gearSourcingBodyEs: string;
  gearSourcingCtaEn: string;
  gearSourcingCtaEs: string;
  // Services section
  servicesEyebrowEn: string;
  servicesEyebrowEs: string;
  servicesHeadingEn: string;
  servicesHeadingEs: string;
  servicesWalkthroughCtaEn: string;
  servicesWalkthroughCtaEs: string;
  // Care Plan / Pricing section
  pricingEyebrowEn: string;
  pricingEyebrowEs: string;
  pricingHeadingEn: string;
  pricingHeadingEs: string;
  pricingCardBadgeEn: string;
  pricingCardBadgeEs: string;
  pricingCardCtaEn: string;
  pricingCardCtaEs: string;
  pricingStandaloneBadgeEn: string;
  pricingStandaloneBadgeEs: string;
  pricingStandaloneTitleEn: string;
  pricingStandaloneTitleEs: string;
  pricingStandaloneCtaEn: string;
  pricingStandaloneCtaEs: string;
  pricingPolicyTitleEn: string;
  pricingPolicyTitleEs: string;
  pricingCalcTitleEn: string;
  pricingCalcTitleEs: string;
  // Training section
  trainingEyebrowEn: string;
  trainingEyebrowEs: string;
  trainingHeadingEn: string;
  trainingHeadingEs: string;
  trainingSubtitleEn: string;
  trainingSubtitleEs: string;
  trainingImageUrl: string;
  trainingCtaEn: string;
  trainingCtaEs: string;
  trainingModules: TrainingModuleItem[];
  // Diagnostic section
  diagnosticEyebrowEn: string;
  diagnosticEyebrowEs: string;
  diagnosticHeadingEn: string;
  diagnosticHeadingEs: string;
  diagnosticResultBadgeEn: string;
  diagnosticResultBadgeEs: string;
  diagnosticCtaEn: string;
  diagnosticCtaEs: string;
  // Testimonials / Reviews section
  reviewsEyebrowEn: string;
  reviewsEyebrowEs: string;
  reviewsHeadingEn: string;
  reviewsHeadingEs: string;
  reviewsCtaTitleEn: string;
  reviewsCtaTitleEs: string;
  reviewsCtaBodyEn: string;
  reviewsCtaBodyEs: string;
  reviewsCtaBtnEn: string;
  reviewsCtaBtnEs: string;
  // Footer
  footerContactTitleEn: string;
  footerContactTitleEs: string;
  footerLinksTitleEn: string;
  footerLinksTitleEs: string;
  footerQuoteLinkEn: string;
  footerQuoteLinkEs: string;
  footerCopyrightEn: string;
  footerCopyrightEs: string;
}

export interface MemberPricingConfig {
  enabled: boolean;
  defaultDiscountPercent: number;
  churchPartnerDiscountPercent: number;
  dealerProDiscountPercent: number;
  badgeLabelEn: string;
  badgeLabelEs: string;
  loginPromptEn: string;
  loginPromptEs: string;
  bannerUnlockedEn: string;
  bannerUnlockedEs: string;
}

export interface VideoMeetingRoomRecord {
  id: string;
  spaceName?: string;
  meetingUri: string;
  meetingCode: string;
  title: string;
  createdAt: string;
  createdBy?: string;
  accessType?: 'OPEN' | 'TRUSTED';
}

export interface VideoMeetingConfig {
  enabled: boolean;
  isLiveNow: boolean;
  activeRoomTitleEn: string;
  activeRoomTitleEs: string;
  activeMeetingUri: string;
  activeMeetingCode: string;
  activeSpaceName?: string;
  availabilityHoursEn: string;
  availabilityHoursEs: string;
  welcomeNoteEn: string;
  welcomeNoteEs: string;
  recentRooms?: VideoMeetingRoomRecord[];
}

export type CustomerPricingTier = 'vip' | 'church_partner' | 'dealer_pro';

export interface CustomerAccount {
  id: string;
  uid?: string;
  authProvider: 'google' | 'email';
  fullName: string;
  organization: string;
  phone: string;
  email: string;
  status: 'active' | 'pending' | 'paused';
  pricingTier: CustomerPricingTier;
  customDiscountPercent?: number;
  notes: string;
  createdAt: string;
  lastLoginAt: string;
  loginCount: number;
}

export interface ServiceItem {
  id: string;
  titleEn: string;
  titleEs: string;
  descriptionEn: string;
  descriptionEs: string;
  deliverableEn: string;
  deliverableEs: string;
  imageUrl: string;
  featured?: boolean;
}

export interface ValuePropItem {
  id: string;
  titleEn: string;
  titleEs: string;
  bodyEn: string;
  bodyEs: string;
}

export interface PricingConfig {
  planNameEn: string;
  planNameEs: string;
  weeklyRate: number;
  monthlyEquivalent: number;
  standaloneHourlyRate: number;
  standaloneMinHours: number;
  reEqIntervalMonths: number;
  freeFollowUpEqPerYear: number;
  inclusionsEn: string[];
  inclusionsEs: string[];
  standaloneNotesEn: string[];
  standaloneNotesEs: string[];
  valueProps: ValuePropItem[];
}

export interface GearProduct {
  id: string;
  itemNumber?: string;
  name: string;
  brand: string;
  category: Exclude<GearCategory, 'all'>;
  mapPrice?: number;
  priceLabel: string;
  priceNote: string;
  descriptionEn: string;
  descriptionEs: string;
  specs: string[];
  imageUrl: string;
  inStock: boolean;
  availability?: string;
}

export interface CartItem {
  productId: string;
  itemNumber: string;
  brand: string;
  description: string;
  mapPrice?: number;
  imageUrl: string;
  quantity: number;
}

export interface TestimonialItem {
  id: string;
  name: string;
  roleEn: string;
  roleEs: string;
  organization: string;
  category: Exclude<TestimonialCategory, 'all'>;
  outcomeMetric: string;
  gearContext: string;
  quoteEn: string;
  quoteEs: string;
}

export interface SiteContent {
  brand: BrandConfig;
  hero: HeroConfig;
  pageCopy?: PageCopyConfig;
  memberPricing?: MemberPricingConfig;
  videoMeeting?: VideoMeetingConfig;
  customCategories?: CatalogCategoryConfig[];
  sectionOrder: SectionId[];
  hiddenSections: SectionId[];
  services: ServiceItem[];
  pricing: PricingConfig;
  products: GearProduct[];
  testimonials: TestimonialItem[];
}

export type PaymentProcessingMethod =
  | 'none'
  | 'bluevine'
  | 'stripe'
  | 'card'
  | 'custom';

export interface EstimateLineItem {
  id: string;
  productId?: string;
  itemNumber: string;
  brand: string;
  description: string;
  qty: number;
  unitPrice: number;
  mapPrice?: number;
  dealerCost?: number;
  vendorName?: string;
  shippingCost?: number;
  applyProcessingFee?: boolean;
}

export interface QuoteRecord {
  id: string;
  refCode: string;
  createdAt: string;
  status: QuoteStatus;
  organization: string;
  contactName: string;
  phone: string;
  email: string;
  serviceRequested: string;
  soundboardModel: string;
  roomCapacity: string;
  timeline: string;
  notes: string;
  engineerNotes: string;
  estimateItems?: EstimateLineItem[];
  discount?: number;
  shippingFee?: number;
  taxRate?: number;
  processingFeeRate?: number;
  paymentMethod?: PaymentProcessingMethod;
  coverLetter?: string;
  estimateUpdatedAt?: string;
}

export type QuoteUpdateInput = Partial<
  Pick<
    QuoteRecord,
    | 'status'
    | 'organization'
    | 'contactName'
    | 'phone'
    | 'email'
    | 'serviceRequested'
    | 'soundboardModel'
    | 'roomCapacity'
    | 'timeline'
    | 'notes'
    | 'engineerNotes'
    | 'estimateItems'
    | 'discount'
    | 'shippingFee'
    | 'taxRate'
    | 'processingFeeRate'
    | 'paymentMethod'
    | 'coverLetter'
    | 'estimateUpdatedAt'
  >
>;

export interface QuoteSubmissionInput {
  organization: string;
  contactName: string;
  phone: string;
  email: string;
  serviceRequested: string;
  soundboardModel: string;
  roomCapacity: string;
  timeline: string;
  notes: string;
}

export interface VendorQuoteOption {
  id: string;
  vendorName: string;
  repName: string;
  email: string;
  phone: string;
  unitCost: number;
  shippingCost: number;
  leadTime: string;
  skuOrPartNo: string;
  notes: string;
  lastQuotedAt: string;
}

export interface VendorMasterEntry {
  id: string;
  productId?: string;
  productName: string;
  itemNumber: string;
  brand: string;
  mapPrice?: number;
  preferredVendor: string;
  notes: string;
  quotes: VendorQuoteOption[];
  updatedAt: string;
}

export type CustomerOrderStatus =
  | 'sourcing'
  | 'awaiting_quotes'
  | 'ordered'
  | 'in_transit'
  | 'delivered'
  | 'cancelled';

export type OrderLineSourcingStatus =
  | 'need_to_call'
  | 'quoted'
  | 'po_placed'
  | 'shipped'
  | 'received';

export interface OrderLineSourcing {
  id: string;
  productId?: string;
  productName: string;
  itemNumber: string;
  qty: number;
  mapPrice?: number;
  customerUnitPrice?: number;
  chosenVendor: string;
  contactedRepName: string;
  vendorPhone: string;
  vendorEmail: string;
  contactMethod: 'phone' | 'email' | 'portal' | 'text';
  contactedDate: string;
  vendorQuoteRef: string;
  quotedUnitCost: number;
  shippingCost: number;
  applyProcessingFee?: boolean;
  lineStatus: OrderLineSourcingStatus;
  lineNotes: string;
}

export interface VendorCallLogEntry {
  id: string;
  vendorName: string;
  repName: string;
  phone: string;
  email: string;
  method: 'phone' | 'email' | 'portal' | 'text';
  contactedAt: string;
  quoteNumber: string;
  quotedTotal: number;
  notes: string;
}

export interface CustomerOrderRecord {
  id: string;
  orderCode: string;
  linkedQuoteRef?: string;
  customerName: string;
  organization: string;
  customerPhone: string;
  customerEmail: string;
  status: CustomerOrderStatus;
  customerQuotedTotal?: number;
  shippingFee?: number;
  taxRate?: number;
  processingFeeRate?: number;
  paymentMethod?: PaymentProcessingMethod;
  targetDate: string;
  generalNotes: string;
  engineerSuggestions?: string;
  items: OrderLineSourcing[];
  callLogs: VendorCallLogEntry[];
  createdAt: string;
  updatedAt: string;
}

