export type Language = 'en' | 'es';

export type SectionId =
  | 'services'
  | 'pricing'
  | 'gear'
  | 'training'
  | 'diagnostic'
  | 'testimonials';

export type GearCategory =
  | 'all'
  | 'speakers'
  | 'mics'
  | 'consoles'
  | 'iem'
  | 'combiners'
  | 'lighting'
  | 'rigging'
  | 'cables';

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
  headlineEn: string;
  headlineEs: string;
  subheadlineEn: string;
  subheadlineEs: string;
  primaryCtaEn: string;
  primaryCtaEs: string;
  imageUrl: string;
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
  sectionOrder: SectionId[];
  hiddenSections: SectionId[];
  services: ServiceItem[];
  pricing: PricingConfig;
  products: GearProduct[];
  testimonials: TestimonialItem[];
}

export interface EstimateLineItem {
  id: string;
  productId?: string;
  itemNumber: string;
  brand: string;
  description: string;
  qty: number;
  unitPrice: number;
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
  chosenVendor: string;
  contactedRepName: string;
  vendorPhone: string;
  vendorEmail: string;
  contactMethod: 'phone' | 'email' | 'portal' | 'text';
  contactedDate: string;
  vendorQuoteRef: string;
  quotedUnitCost: number;
  shippingCost: number;
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
  targetDate: string;
  generalNotes: string;
  items: OrderLineSourcing[];
  callLogs: VendorCallLogEntry[];
  createdAt: string;
  updatedAt: string;
}

