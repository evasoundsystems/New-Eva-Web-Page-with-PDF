import type { GearProduct, VendorMasterEntry } from '../types/site';
import {
  buildGearProductFromFullCompass,
  buildVendorEntryFromFullCompass,
  type ParsedFullCompassItem,
  slugifyCatalogId,
} from '../utils/fullCompassParser';
import { FULL_COMPASS_FDW_SEEDS } from './fullCompassFdwBatch';
import { FULL_COMPASS_DJ_SEEDS } from './fullCompassDjBatch';

export interface FullCompassSeedEntry extends ParsedFullCompassItem {
  imageUrl: string;
}

/**
 * Verified Full Compass items with exact Luis dealer cost (stored ONLY in Admin Supplier #2),
 * List Price, Manufacturer MAP (shown publicly), In Stock / wait-time status, and verified real studio photos.
 */
const FULL_COMPASS_SEEDS: readonly FullCompassSeedEntry[] = [
  {
    itemNumber: 'Sennheiser EW-D-ASA (Q-R-S)',
    brand: 'Sennheiser',
    modelName: 'Sennheiser EW-D-ASA (Q-R-S)',
    description: 'Active Antenna Splitter for EW-D Receivers (Q-R-S Band, 470–694 MHz)',
    category: 'combiners',
    dealerCost: 548.03,
    listPrice: 829.0,
    mapPrice: 699.0,
    inStock: true,
    availability: 'In Stock',
    leadTimeShort: 'In Stock',
    imageUrl:
      'https://cdn.shopify.com/s/files/1/0871/7382/4696/files/100881_Sennheiser-EW-D-ASA--Q-R-S--Active-Antenna-Splitter.jpg?v=1768856918',
  },
  {
    itemNumber: 'Shure UA844+SWB',
    brand: 'Shure',
    modelName: 'Shure UA844+SWB',
    description: 'Active Antenna Splitter and Power Distributor for UHF Wireless Systems',
    category: 'combiners',
    dealerCost: 513.68,
    listPrice: 970.0,
    mapPrice: 690.0,
    inStock: true,
    availability: 'In Stock',
    leadTimeShort: 'In Stock',
    imageUrl:
      'https://cdn.shopify.com/s/files/1/0871/7382/4696/files/77561_Shure-UA844_SWB-Antenna-Distribution-System-_-Model_-UA844_SWB_ALT0sqr.jpg?v=1771605488',
  },
  {
    itemNumber: 'Shure UA844+SWB/LC',
    brand: 'Shure',
    modelName: 'Shure UA844+SWB/LC',
    description: '5-Way Active Antenna Distribution System (Less Cables)',
    category: 'combiners',
    dealerCost: 446.82,
    listPrice: 850.0,
    mapPrice: 600.0,
    inStock: true,
    availability: 'In Stock',
    leadTimeShort: 'In Stock',
    imageUrl:
      'https://cdn.shopify.com/s/files/1/0871/7382/4696/files/89630_Shure-UA844-SWB-Antenna-Distribution-System.jpg?v=1768254704',
  },
  {
    itemNumber: 'Shure AD8CUS',
    brand: 'Shure',
    modelName: 'Shure AD8CUS',
    description: 'Axient Digital PSM Passive Antenna Combiner, 8-Port (470–960 MHz)',
    category: 'combiners',
    dealerCost: 3269.99,
    listPrice: 5140.0,
    mapPrice: 4110.0,
    inStock: true,
    availability: 'In Stock',
    leadTimeShort: 'In Stock',
    imageUrl:
      'https://cdn.shopify.com/s/files/1/0277/2631/5568/files/AD8CUS-1.jpg?v=1789510455',
  },
  {
    itemNumber: 'RF Venue COMB8CPB',
    brand: 'RF Venue',
    modelName: 'RF Venue COMB8CPB',
    description: '8-Channel Antenna Combiner Package for In-Ear Monitors with CP Beam Antenna',
    category: 'combiners',
    dealerCost: 2403.26,
    listPrice: 2889.0,
    mapPrice: 2889.0,
    inStock: true,
    availability: 'In Stock',
    leadTimeShort: 'In Stock',
    imageUrl:
      'https://cdn.shopify.com/s/files/1/0871/7382/4696/files/115182_RF-Venue-COMB8CPB-8-Channel-In-Ear-Monitor-Upgrade-Pack.jpg?v=1768865878',
  },
  {
    itemNumber: 'Shure PA411',
    brand: 'Shure',
    modelName: 'Shure PA411',
    description: '4-Port Antenna Combiner and Power Distributor for PSM300 Transmitters',
    category: 'combiners',
    dealerCost: 679.56,
    listPrice: 1100.0,
    mapPrice: 880.0,
    inStock: true,
    availability: 'In Stock',
    leadTimeShort: 'In Stock',
    imageUrl:
      'https://cdn.shopify.com/s/files/1/0871/7382/4696/files/11159_Shure-PA411-Antenna-Combiner.jpg?v=1767394906',
  },
  {
    itemNumber: 'RF Venue COMBINE8',
    brand: 'RF Venue',
    modelName: 'RF Venue COMBINE8',
    description: '8-Channel Active Antenna Combiner for In-Ear Monitor Transmitters',
    category: 'combiners',
    dealerCost: 1686.89,
    listPrice: 1999.0,
    mapPrice: 1999.0,
    inStock: true,
    availability: 'In Stock',
    leadTimeShort: 'In Stock',
    imageUrl:
      'https://cdn.shopify.com/s/files/1/0871/7382/4696/files/116565_RF-Venue-COMBINE8-Transmitter-Combiner.jpg?v=1768866197',
  },
  {
    itemNumber: 'RF Venue D-ARCD9',
    brand: 'RF Venue',
    modelName: 'RF Venue D-ARCD9',
    description: 'Diversity Architectural Antenna DISTRO9 HDR 9-Channel Pack',
    category: 'combiners',
    dealerCost: 2574.85,
    listPrice: 3099.0,
    mapPrice: 3099.0,
    inStock: true,
    availability: 'In Stock',
    leadTimeShort: 'In Stock',
    imageUrl:
      'https://cdn.shopify.com/s/files/1/0871/7382/4696/files/134218_RFVENUE-D-ARCD9_ALT01sqr.jpg?v=1780435283',
  },
  {
    itemNumber: 'Shure UA844',
    brand: 'Shure',
    modelName: 'Shure UA844',
    description: 'UHF Antenna Distribution System for Multi-Receiver Wireless Racks',
    category: 'combiners',
    dealerCost: 1208.63,
    listPrice: 2250.0,
    mapPrice: 1590.0,
    inStock: true,
    availability: 'In Stock',
    leadTimeShort: 'In Stock',
    imageUrl:
      'https://cdn.shopify.com/s/files/1/0277/2631/5568/products/UA844-PLUS-SWB.jpg?v=1582355455',
  },
  {
    itemNumber: 'RF Venue DFINDISTRO4',
    brand: 'RF Venue',
    modelName: 'RF Venue DFINDISTRO4',
    description: '4-Channel Wireless Antenna Upgrade Pack with Diversity Fin Antenna & DISTRO4',
    category: 'combiners',
    dealerCost: 1247.97,
    listPrice: 1529.0,
    mapPrice: 1529.0,
    inStock: true,
    availability: 'In Stock',
    leadTimeShort: 'In Stock',
    imageUrl:
      'https://cdn.shopify.com/s/files/1/0871/7382/4696/files/52480_RF-Venue-DFINBDISTRO4-Distribution-System-with-Antenna-Black.jpg?v=1768239798',
  },
  {
    itemNumber: 'RF Venue D-ARCDISTRO4',
    brand: 'RF Venue',
    modelName: 'RF Venue D-ARCDISTRO4',
    description: 'Diversity Architectural Antenna DISTRO4 4-Channel Wireless Mic Pack',
    category: 'combiners',
    dealerCost: 1258.56,
    listPrice: 1529.0,
    mapPrice: 1529.0,
    inStock: true,
    availability: 'In Stock',
    leadTimeShort: 'In Stock',
    imageUrl:
      'https://cdn.shopify.com/s/files/1/0871/7382/4696/files/134219_RF-Venue-D-ARCDISTRO4-4-Channel-Wireless-Microphone-Upgrade-Pack-With-Diversity-Antenna-_-White_ALT1sqr.jpg?v=1776974133',
  },
  {
    itemNumber: 'RF Venue DISTRO9 HDR',
    brand: 'RF Venue',
    modelName: 'RF Venue DISTRO9 HDR',
    description: '9-Channel High Dynamic Range Multi-Zone Antenna Distribution System',
    category: 'combiners',
    dealerCost: 1666.83,
    listPrice: 2039.0,
    mapPrice: 2039.0,
    inStock: true,
    availability: 'In Stock',
    leadTimeShort: 'In Stock',
    imageUrl:
      'https://cdn.shopify.com/s/files/1/0871/7382/4696/files/44471_RF-Venue-DISTRO9-HDR-Multi-Zone-Antenna-Distribution-System.jpg?v=1768002292',
  },
  {
    itemNumber: 'RF Venue COMB8CP-STAGE',
    brand: 'RF Venue',
    modelName: 'RF Venue COMB8CP-STAGE',
    description: '8-Channel IEM Combiner Pack with Weather-Resistant CP Stage Antenna',
    category: 'combiners',
    dealerCost: 2067.02,
    listPrice: 2473.0,
    mapPrice: 2473.0,
    inStock: true,
    availability: 'In Stock',
    leadTimeShort: 'In Stock',
    imageUrl:
      'https://cdn.shopify.com/s/files/1/0871/7382/4696/files/146561_RFVenue_COMB8CP-STAGE.jpg?v=1770238063',
  },
  {
    itemNumber: 'RF Venue CP-STAGE',
    brand: 'RF Venue',
    modelName: 'RF Venue CP-STAGE',
    description: 'Weather-Resistant IP-Rated Circularly Polarized Antenna for IEMs & Wireless Mics',
    category: 'combiners',
    dealerCost: 341.52,
    listPrice: 399.0,
    mapPrice: 399.0,
    inStock: true,
    availability: 'In Stock',
    leadTimeShort: 'In Stock',
    imageUrl:
      'https://cdn.shopify.com/s/files/1/0871/7382/4696/files/146558_RF-Venue-CP-Stage-Weather-Resistant-Stage-Antenna.jpg?v=1768880989',
  },
  {
    itemNumber: 'RF Venue DISTRO4',
    brand: 'RF Venue',
    modelName: 'RF Venue DISTRO4',
    description: '4-Channel UHF Antenna Distribution System with DC Power Distribution',
    category: 'combiners',
    dealerCost: 557.72,
    listPrice: 649.0,
    mapPrice: 649.0,
    inStock: true,
    availability: 'In Stock',
    leadTimeShort: 'In Stock',
    imageUrl:
      'https://cdn.shopify.com/s/files/1/0871/7382/4696/files/52519_RF-Venue-DISTRO4-Distribution-System.jpg?v=1768239808',
  },
];

const ALL_FULL_COMPASS_SEEDS: readonly FullCompassSeedEntry[] = (() => {
  const seen = new Set<string>();
  const combined: FullCompassSeedEntry[] = [];
  for (const seed of [...FULL_COMPASS_SEEDS, ...FULL_COMPASS_DJ_SEEDS, ...FULL_COMPASS_FDW_SEEDS]) {
    const key = slugifyCatalogId(seed.itemNumber);
    if (seen.has(key)) continue;
    seen.add(key);
    combined.push(seed);
  }
  return combined;
})();

/**
 * Public storefront product additions — strictly MAP-only pricing (NEVER contains dealer cost or supplier details).
 */
export const FULL_COMPASS_PRODUCT_ADDITIONS: GearProduct[] = ALL_FULL_COMPASS_SEEDS.map((seed) =>
  buildGearProductFromFullCompass(seed, seed.imageUrl, slugifyCatalogId(seed.itemNumber))
);

/**
 * Private admin-only Vendor Master Sheet entries — pre-populated in Supplier #2 ("Full Compass")
 * with Luis's exact dealer cost, List Price, MAP, and stock lead time.
 */
export const DEFAULT_FULL_COMPASS_VENDOR_ENTRIES: VendorMasterEntry[] = ALL_FULL_COMPASS_SEEDS.map(
  (seed) => buildVendorEntryFromFullCompass(seed, slugifyCatalogId(seed.itemNumber))
);
