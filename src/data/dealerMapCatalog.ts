import type { GearProduct } from '../types/site';

interface RawCatalogSeed {
  readonly itemNumber: string;
  readonly brand: string;
  readonly description: string;
  readonly mapPrice?: number;
  readonly imageUrl?: string;
  readonly priceNote?: string;
  readonly category?:
    | 'speakers'
    | 'mics'
    | 'consoles'
    | 'lighting'
    | 'rigging'
    | 'cables'
    | 'iem'
    | 'combiners';
}

const FDW = 'https://www.fdwcorp.com/common/products/lg';

const RAW_MAP_ROWS: RawCatalogSeed[] = [
  // Featured Pro Mixers & Digital Stageboxes (Budget Behringer to Flagship WING, RCF, Midas, Allen & Heath & Yamaha)
  {
    itemNumber: 'Behringer WING',
    brand: 'Behringer',
    category: 'consoles',
    description:
      'Flagship 48-channel stereo digital console with 24 motorized faders, 10.1" capacitive touchscreen, 8 Midas PRO preamps, and 3 AES50 ports.',
    mapPrice: 3499.0,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/ce45071f-1cf3-40a3-852f-c4e5955487e6.png?v=1741113566',
    priceNote: 'Authorized Dealer MAP · Custom Church Scenes Ready',
  },
  {
    itemNumber: 'Behringer WING Compact',
    brand: 'Behringer',
    category: 'consoles',
    description:
      'Compact 48-channel stereo digital mixing console featuring 24 Midas PRO preamps, 13 motorized faders, and 10" capacitive touchscreen.',
    mapPrice: 2599.0,
    imageUrl: 'https://cdn-media.empowertribe.com/74cdbb1658166e891c386b418c231116/Image_BE_0603-AEV_WING-COMPACT_Media-Top.webp',
    priceNote: 'Authorized Dealer MAP · Sanctuary Setup Available',
  },
  {
    itemNumber: 'Behringer WING Rack',
    brand: 'Behringer',
    category: 'consoles',
    description:
      '48-channel stereo 4U rackmount digital mixer with 24 Midas PRO mic preamps, front 10" touchscreen, and triple AES50 stagebox ports.',
    mapPrice: 1799.0,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0871/7382/4696/files/151861_BEHRINGER-0604-AAE86-US1-WING-RACK_US1_ALT4sqr.jpg?v=1772723416',
  },
  {
    itemNumber: 'RCF M 20X',
    brand: 'RCF',
    category: 'consoles',
    description:
      '20-channel touchscreen desktop digital console with 16 recallable mic preamps, 11 motorized faders, and 20-track SD/USB recording.',
    mapPrice: 1199.0,
    imageUrl: 'https://www.rcf.it/documents/20128/825511/000_M-20-X_top-display-acceso.png/cd4a8afe-24c3-0600-e77a-f0cae4a5ed4d?version=1.1&t=1636011482228&imagePreview=1',
  },
  {
    itemNumber: 'Shure SLXD24/SM58',
    brand: 'Shure',
    category: 'mics',
    description:
      '24-bit digital wireless handheld system delivering rock-solid RF stability, 32 compatible channels per band, and legendary SM58 capsule.',
    mapPrice: 749.0,
    imageUrl: 'https://www.canalsoundlight.com/wp-content/uploads/2021/04/Shure-SLXD24-SM58.jpeg',
  },
  {
    itemNumber: 'Sennheiser EW-D 835-S SET',
    brand: 'Sennheiser',
    category: 'mics',
    description:
      'Evolution Wireless Digital handheld system with equidistant UHF tuning, mobile app setup, mute switch, and e835 cardioid vocal capsule.',
    mapPrice: 699.0,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0614/8122/2322/products/1622505308_1639275.jpg?v=1665771462',
  },
  {
    itemNumber: 'Behringer X32 Compact',
    brand: 'Behringer',
    category: 'consoles',
    description:
      '40-input, 25-bus digital mixing console with 16 Midas-designed preamps, 17 motorized faders, LCD scribble strips, and AES50 networking.',
    mapPrice: 1999.0,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/734d6043-74cd-4c03-bc51-f7984603525c.png?v=1772726142',
  },
  {
    itemNumber: 'Behringer Xenyx 1202SFX',
    brand: 'Behringer',
    category: 'consoles',
    description:
      '12-input compact analog streaming mixer with 4 Xenyx mic preamps, Klark Teknik 24-bit FX processor, and stereo USB audio interface.',
    mapPrice: 119.0,
    imageUrl: 'https://thumbs.static-thomann.de/thumb/orig/pics/prod/565808.jpg',
  },
  {
    itemNumber: 'Behringer Xenyx 802S',
    brand: 'Behringer',
    category: 'consoles',
    description:
      'Ultra-compact 8-input analog mixer with Xenyx mic preamps, 3-band British EQ, and built-in USB streaming for chapels and small rooms.',
    mapPrice: 79.0,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0630/3085/3829/files/Behringer-XENYX802S-AnalogMixer.jpg?v=1782749269',
  },
  {
    itemNumber: 'Behringer Flow 8',
    brand: 'Behringer',
    category: 'consoles',
    description:
      '8-input Bluetooth and app-controlled digital mixer with 60mm faders, dual FX engines, and USB multitrack interface.',
    mapPrice: 219.0,
    imageUrl: 'https://cdn-media.empowertribe.com/615c97e4370f227bfc886fbde6d2a8eb/Image_BE_0603-AEW_FLOW-8_Media-Top.webp',
  },
  {
    itemNumber: 'Behringer XR12 X AIR',
    brand: 'Behringer',
    category: 'consoles',
    description:
      '12-input iPad/tablet digital rack mixer with 4 Midas preamps, built-in tri-mode Wi-Fi router, and stereo USB recorder.',
    mapPrice: 399.0,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/ced90482-5f27-43bf-a7a4-bc3525e45682.png?v=1747421175',
  },
  {
    itemNumber: 'Behringer XR18 X AIR',
    brand: 'Behringer',
    category: 'consoles',
    description:
      '18-channel digital stagebox mixer with 16 Midas preamps, built-in Wi-Fi, 18x18 USB audio interface, and Ultranet P16 monitoring.',
    mapPrice: 599.0,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/8af7cde7-6f97-413a-9e69-27bba55e5b5a.png?v=1738961034',
  },
  {
    itemNumber: 'Behringer X32 Rack',
    brand: 'Behringer',
    category: 'consoles',
    description:
      '40-input, 25-bus 3U digital rack mixer with 16 Midas preamps, dual AES50 ports, and 32x32 USB audio interface.',
    mapPrice: 1299.0,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/152348c1-8860-495a-9029-61b221f3bb84.png?v=1747443934',
  },
  {
    itemNumber: 'Behringer X32 Producer',
    brand: 'Behringer',
    category: 'consoles',
    description:
      'Rack-mountable 40-input digital console featuring 16 Midas preamps, 17 motorized faders, and full wireless iPad scene control.',
    mapPrice: 1599.0,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/7468bd60-64d3-4bd8-a422-7d9708928406.png?v=1742242314',
  },
  {
    itemNumber: 'Behringer X32',
    brand: 'Behringer',
    category: 'consoles',
    description:
      'Full-size 40-input, 25-bus sanctuary console with 32 Midas preamps, 25 motorized faders, and recall-safe worship templates.',
    mapPrice: 2399.0,
    imageUrl: 'https://cdn-media.empowertribe.com/e5ba63fb0e6f4e69a1626c5811115e16/Image_BE_0603-ACE_X32_Top_XL.png',
  },
  {
    itemNumber: 'Behringer S32',
    brand: 'Behringer',
    category: 'cables',
    description:
      '32-in / 16-out digital AES50 stagebox with 32 Midas-designed remote-controllable preamps, Ultranet P16 hub, and dual AES50 ports.',
    mapPrice: 999.0,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/e64d64d5-05cf-4d07-85f8-99742b9b5469.png?v=1760650285',
    priceNote: 'Essential X32 & WING Stagebox · Cat5e Shielded Ready',
  },
  {
    itemNumber: 'Midas DL32',
    brand: 'Midas',
    category: 'cables',
    description:
      '32-input, 16-output stagebox featuring 32 Midas PRO microphone preamps, Ultranet personal monitoring hub, and dual AES50 networking.',
    mapPrice: 1299.0,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/b2c96f4d-9968-4f2b-91a2-1150b89a5e04.png?v=1779911835',
    priceNote: 'Authorized Dealer MAP · Pair with M32, X32 or WING',
  },
  {
    itemNumber: 'RCF F 10XR',
    brand: 'RCF',
    category: 'consoles',
    description:
      '10-channel live analog mixing console with 4 low-noise mic preamps, single-knob compressors, 16 PRO DSP effects, and USB I/O.',
    mapPrice: 349.0,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0871/7382/4696/files/47057_RCF-F-10XR-Mixing-Console-Black.jpg?v=1768003491',
  },
  {
    itemNumber: 'RCF F 16XR',
    brand: 'RCF',
    category: 'consoles',
    description:
      '16-channel metal-chassis live mixing console with 10 mic preamps, 6 compressors, 4-band mid-sweep EQ, and RCF PRO DSP FX.',
    mapPrice: 599.0,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0871/7382/4696/files/47070_RCF-F16-XR-16-Channel-Analog-Mixer-With-Effects-and-USB-Recording_ALT01sqr.jpg?v=1786580225',
  },
  {
    itemNumber: 'RCF M 18',
    brand: 'RCF',
    category: 'consoles',
    description:
      '18-channel tablet-controlled digital mixer with dual-band Wi-Fi access point, 3 internal FX engines, and multitrack USB player.',
    mapPrice: 599.0,
    imageUrl: 'https://www.rcf.it/documents/20128/824871/000_RCF-M18-left_gallery.png/5e503bb2-d3b5-2158-6607-43195a7fbc78?version=1.0&t=1636634201101&imagePreview=1',
  },
  {
    itemNumber: 'Midas M32R LIVE',
    brand: 'Midas',
    category: 'consoles',
    description:
      'Compact 40-input digital mixing console with 16 Midas PRO preamps, 17 motorized faders, and dual-SD DN32-LIVE multitrack recording.',
    mapPrice: 2499.0,
    imageUrl: 'https://cdn-media.empowertribe.com/d7fe5963abb3407aaaa199ee92e728cc/Image_MI_0603-AEF_M32R_Top-Front_XL.png',
  },
  {
    itemNumber: 'Midas M32 LIVE',
    brand: 'Midas',
    category: 'consoles',
    description:
      'Touring-grade 40-input live digital console with 32 Midas PRO mic preamps, 25 motorized faders, and carbon-fiber aluminum frame.',
    mapPrice: 3999.0,
    imageUrl: 'https://cdn-media.empowertribe.com/88b7019edb6a4da19acbf5407a5d6caa/Image_MI_0603-AEO_M32-LIVE_Front_XL.png',
  },
  {
    itemNumber: 'Allen & Heath SQ-5',
    brand: 'Allen & Heath',
    category: 'consoles',
    description:
      '48-channel 96kHz XCVI FPGA digital mixer with 16+1 motorized faders, 7" capacitive touchscreen, and ultra-low 0.7ms latency.',
    mapPrice: 3599.0,
    imageUrl: 'https://www.canalsoundlight.com/wp-content/uploads/2019/01/sq5.jpg',
  },
  {
    itemNumber: 'Allen & Heath SQ-6',
    brand: 'Allen & Heath',
    category: 'consoles',
    description:
      '48-channel 96kHz FPGA digital mixing console with 24+1 motorized faders, 24 onboard preamps, and dedicated channel LCD displays.',
    mapPrice: 4599.0,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/7cb3a68d-d2a1-4ac6-a63f-ac3dcf21afee.png?v=1739341841',
  },
  {
    itemNumber: 'Yamaha DM3 Standard',
    brand: 'Yamaha',
    category: 'consoles',
    description:
      'Ultra-compact 22-channel 96kHz digital mixing console with 9" multi-touch screen, motorized faders, and 18x18 USB audio interface.',
    mapPrice: 1999.99,
    imageUrl: 'https://usa.yamaha.com/files/dm3-ogp_tcm152-1697829.png',
  },
  {
    itemNumber: 'Yamaha MG10XU',
    brand: 'Yamaha',
    category: 'consoles',
    description:
      '10-channel analog mixer featuring D-PRE Class-A mic preamps, 1-knob compressors, 24 SPX digital effects, and 2x2 USB audio interface.',
    mapPrice: 259.99,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/99b585c2-23ae-42ae-bd00-872bb26a878d.jpg?v=1763491968',
  },
  {
    itemNumber: 'Yamaha MG12XU',
    brand: 'Yamaha',
    category: 'consoles',
    description:
      '12-channel compact mixing console with 6 D-PRE mic preamps, 1-knob compressors, SPX multi-FX, and USB streaming connectivity.',
    mapPrice: 375.99,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/f589439a-c4ce-4aba-9ebb-9965e604880b.png?v=1738104702',
  },
  {
    itemNumber: 'Yamaha MG16XU',
    brand: 'Yamaha',
    category: 'consoles',
    description:
      '16-channel rack-mountable analog mixer with 10 D-PRE preamps, 3-band EQ with sweepable mids, 24 SPX effects, and USB I/O.',
    mapPrice: 554.99,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/cf28c7a9-137d-4a59-8474-befa4201bf21.png?v=1739549900',
  },
  {
    itemNumber: 'Mackie ProFX10v3+',
    brand: 'Mackie',
    category: 'consoles',
    description:
      '10-channel analog mixer with Onyx mic preamps, upgraded GigFX+ effects engine, color LCD screen, and bidirectional Bluetooth.',
    mapPrice: 279.99,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/8bedeb25-f926-4bb3-9f5b-e7d0c4b3c070.png?v=1736887324',
  },
  {
    itemNumber: 'Mackie ProFX12v3+',
    brand: 'Mackie',
    category: 'consoles',
    description:
      '12-channel professional analog mixer with 7 Onyx preamps, GigFX+ processor, USB-C recording modes, and Bluetooth channel playback.',
    mapPrice: 389.99,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/11b5c973-f04f-4530-b978-87c2a8291cff.png?v=1738104375',
  },
  {
    itemNumber: 'Allen & Heath CQ-18T',
    brand: 'Allen & Heath',
    category: 'consoles',
    description:
      '16-channel 96kHz touchscreen digital mixer with built-in dual-band Wi-Fi, Quick Channels, Feedback Assistant, and 24-track SD recording.',
    mapPrice: 1199.99,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/c201a531-5649-42e1-b5d0-ccfd51ce395c_93039f16-a30f-4438-bfd7-49718c374d8a.png?v=1743713110',
    priceNote: 'Ultra-Compact 96kHz Touchscreen Console · Wi-Fi Built-In',
  },
  {
    itemNumber: 'Allen & Heath CQ-20B',
    brand: 'Allen & Heath',
    category: 'consoles',
    description:
      '20-channel 96kHz stagebox digital mixer controlled via CQ-MixPad with 16 mic preamps, Gain Assistant, and built-in Wi-Fi router.',
    mapPrice: 999.99,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/211e4598-e21f-4576-b84b-ff6ab6e6781d_4c94f403-f339-4fe6-917b-589f335818a2.png?v=1743713108',
  },
  {
    itemNumber: 'Allen & Heath SQ-7',
    brand: 'Allen & Heath',
    category: 'consoles',
    description:
      'Flagship 48-channel 96kHz FPGA digital mixing console featuring 33 motorized faders, 32 onboard preamps, and expandable SLink networking.',
    mapPrice: 6999.0,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/24cb0fbe-053c-4e9d-8d41-62d8bc97400a.jpg?v=1739342188',
  },
  {
    itemNumber: 'Soundcraft Ui24R',
    brand: 'Soundcraft',
    category: 'consoles',
    description:
      '24-channel rackmount wireless digital mixer with 20 Studer-designed preamps, dual-band Wi-Fi, dbx AFS2 feedback suppression, and USB multitrack.',
    mapPrice: 1499.0,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/f583dd4a-d157-4cb7-b848-a84e3fe07068_66e8ef04-a91c-4299-917a-a6fb22b1287f.png?v=1739531561',
  },
  {
    itemNumber: 'PreSonus StudioLive 32SC',
    brand: 'PreSonus',
    category: 'consoles',
    description:
      '32-channel compact Series III digital console with 17 touch-sensitive motorized faders, 16 FlexMixes, and 64x64 USB recording.',
    mapPrice: 1689.99,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0614/8122/2322/files/1553557858_1464988.jpg?v=1751035949',
  },
  // Pro Wireless, Pulpit & Headworn Microphones (Shure, Sennheiser, Audio-Technica, Electro-Voice)
  {
    itemNumber: 'Shure BLX24/PG58',
    brand: 'Shure',
    category: 'mics',
    description:
      'Single-channel UHF analog wireless vocal system with BLX4 tabletop receiver and PG58 handheld microphone transmitter.',
    mapPrice: 349.0,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/b33d0be3-8226-4bcf-9811-bbad317275f2.png?v=1782941738',
  },
  {
    itemNumber: 'Shure BLX24R/SM58',
    brand: 'Shure',
    category: 'mics',
    description:
      'Rackmount wireless vocal system featuring BLX4R half-rack metal receiver with removable antennas and SM58 handheld mic.',
    mapPrice: 449.0,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/7484a833-948a-44ff-9772-0c8b4799119a.png?v=1739531912',
  },
  {
    itemNumber: 'Shure BLX14/SM31',
    brand: 'Shure',
    category: 'mics',
    description:
      'Hands-free cardioid headworn wireless microphone system with moisture-repellent SM31FH condenser capsule for active pastors and instructors.',
    mapPrice: 349.0,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0614/8122/2322/files/BLX14_SM31FH_747c53b8-795b-48d4-b4a9-ee4b2db9e16c.jpg?v=1754419088',
  },
  {
    itemNumber: 'Shure SLXD24/B58',
    brand: 'Shure',
    category: 'mics',
    description:
      '24-bit digital wireless handheld vocal system pairing SLXD4 receiver with high-presence Beta 58A supercardioid dynamic capsule.',
    mapPrice: 799.0,
    imageUrl: 'https://www.canalsoundlight.com/wp-content/uploads/2021/04/Shure-SLXD24-B58.png',
  },
  {
    itemNumber: 'Shure SLXD24D/B58 Dual',
    brand: 'Shure',
    category: 'mics',
    description:
      'Dual-channel 24-bit digital wireless system with SLXD4D rack receiver and two Beta 58A handheld transmitters for worship teams.',
    mapPrice: 1349.0,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/79c89d52-a399-47c6-8696-b1cae55f8d5d.png?v=1776475786',
  },
  {
    itemNumber: 'Shure SLXD14/85 Lavalier',
    brand: 'Shure',
    category: 'mics',
    description:
      'Digital wireless bodypack system with WL185 cardioid lapel microphone engineered for pastors, speakers, and corporate presenters.',
    mapPrice: 749.0,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/c4043e8b-3b7d-463f-b021-dfe346892bc9.png?v=1780526817',
  },
  {
    itemNumber: 'Shure QLXD24/B58',
    brand: 'Shure',
    category: 'mics',
    description:
      'Networkable 24-bit digital wireless system with AES-256 encryption, Wireless Workbench Ethernet scan, and Beta 58A handheld.',
    mapPrice: 1189.0,
    imageUrl: 'https://www.performanceaudio.com/cdn/shop/products/49435_sq.jpg?v=1665727737',
  },
  {
    itemNumber: 'Shure ULXD24/KSM9',
    brand: 'Shure',
    category: 'mics',
    description:
      'Touring and broadcast 24-bit digital wireless handheld system featuring AES-256 security, high-density RF, and KSM9 condenser capsule.',
    mapPrice: 1849.0,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0630/3085/3829/files/1-shu-bundle-ulxd2ksm9h50-ulxd4h50_845dd29b-7202-4945-b233-dac5e68d992a.jpg?v=1737161261',
  },
  {
    itemNumber: 'Shure MX418D/C',
    brand: 'Shure',
    category: 'mics',
    description:
      '18" Microflex cardioid gooseneck pulpit & lectern condenser microphone with weighted desktop base, programmable mute switch, and LED indicator.',
    mapPrice: 379.0,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/85ce8489-3c79-4b00-b745-c3d4868a4372.png?v=1739531827',
    priceNote: 'Sanctuary Pulpit Standard · High Feedback Rejection',
  },
  {
    itemNumber: 'Sennheiser XSW 1-825-A',
    brand: 'Sennheiser',
    category: 'mics',
    description:
      'Streamlined UHF wireless handheld system with automatic frequency management and e825 cardioid dynamic vocal capsule.',
    mapPrice: 349.95,
    imageUrl: 'https://cdn.shopify.com/s/files/1/1768/9095/files/507108-U.jpg?v=1784982329',
  },
  {
    itemNumber: 'Sennheiser EW-D ME2 SET',
    brand: 'Sennheiser',
    category: 'mics',
    description:
      'Evolution Wireless Digital bodypack transmitter with ME 2 omnidirectional lavalier microphone and half-rack metal receiver.',
    mapPrice: 699.0,
    imageUrl: 'https://cdn.shopify.com/s/files/1/1768/9095/files/508701-U.jpg?v=1784983114',
  },
  {
    itemNumber: 'Sennheiser EW-D ME3 SET',
    brand: 'Sennheiser',
    category: 'mics',
    description:
      'Evolution Wireless Digital headworn set featuring ME 3 cardioid headset mic, lightweight SK bodypack, and mobile Smart Assist tuning.',
    mapPrice: 699.0,
    imageUrl: 'https://cdn.shopify.com/s/files/1/1768/9095/files/508710-U.jpg?v=1784983122',
  },
  {
    itemNumber: 'Sennheiser EW-DX EM 2 Dual',
    brand: 'Sennheiser',
    category: 'mics',
    description:
      'Dual-channel networked digital UHF receiver featuring auto-scan, Link Density mode, and ultra-low 1.9 ms audio latency.',
    mapPrice: 1799.0,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/089f52c9-ca06-4095-92d4-0cc232d9fdad_ce8455b2-cf63-4d95-99bb-613d0d54435d.png?v=1763251287',
  },
  {
    itemNumber: 'Audio-Technica ATW-3212/C510',
    brand: 'Audio-Technica',
    category: 'mics',
    description:
      '3000 Series 4th Gen UHF true-diversity wireless handheld system with 60 MHz wide tuning range and dual-mode mute switch.',
    mapPrice: 699.0,
    imageUrl: 'https://cdn11.bigcommerce.com/s-31108/products/4109/images/28803/Audio_Technica_ATW-3212-C510EE1_A__79689.1705164236.600.600.jpg?c=2',
  },
  {
    itemNumber: 'Electro-Voice RE3-ND86',
    brand: 'Electro-Voice',
    category: 'mics',
    description:
      'UHF diversity wireless handheld system featuring fast IR frequency sync and ND86 supercardioid vocal capsule.',
    mapPrice: 649.0,
    imageUrl: 'https://keenfinity.cdn-norce.tech/47583f36-0a5d-4a23-88bb-0b3eb4b10210',
  },
  {
    itemNumber: 'Shure SM58-LC',
    brand: 'Shure',
    category: 'mics',
    description:
      'Industry-standard cardioid dynamic vocal microphone tuned for warm, intelligible church singing and speech with built-in spherical pop filter.',
    mapPrice: 99.0,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/2955877f-4223-4729-ab6f-04516b8a00f4.png?v=1746198049',
  },
  {
    itemNumber: 'Shure Beta 58A',
    brand: 'Shure',
    category: 'mics',
    description:
      'High-output supercardioid dynamic vocal microphone delivering crisp vocal presence and maximum gain before feedback on loud worship stages.',
    mapPrice: 159.0,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/f48636cd-7620-4e8c-a593-f3ef60c64963.png?v=1739531988',
  },
  {
    itemNumber: 'Shure SM57-LC',
    brand: 'Shure',
    category: 'mics',
    description:
      'Versatile cardioid dynamic instrument and lectern microphone engineered for snare, guitar cabs, brass, and close-miked sanctuary vocals.',
    mapPrice: 89.0,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/33784dcb-3aa9-4afd-b302-576e1fcbc001.png?v=1748096694',
  },
  {
    itemNumber: 'Shure BLX288/PG58 Dual',
    brand: 'Shure',
    category: 'mics',
    description:
      'Dual-channel UHF wireless vocal system pairing BLX88 receiver with two PG58 handheld wireless microphones for worship duets and pastoral teams.',
    mapPrice: 559.0,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/16e4aa7a-a0ee-4300-ab98-45af8c509514.png?v=1777992557',
  },
  {
    itemNumber: 'Shure SLXD24D+/SM58 Dual',
    brand: 'Shure',
    category: 'mics',
    description:
      'Dual-channel 24-bit digital wireless handheld system with SLXD4D receiver and two SM58 vocal transmitters for multi-mic sanctuaries.',
    mapPrice: 1485.0,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/7038f6e7-d1e0-4fd1-a8b3-4380a05c7ba6.png?v=1773270443',
  },
  {
    itemNumber: 'Sennheiser e935',
    brand: 'Sennheiser',
    category: 'mics',
    description:
      'German-engineered cardioid dynamic vocal microphone delivering assertive vocal clarity and smooth off-axis feedback rejection.',
    mapPrice: 199.95,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/8044df37-5497-405a-b233-11ac9b870f7a.png?v=1794411605',
  },
  // Stage Lighting, DMX Controllers, Truss & Haze (Chauvet DJ, ADJ, Global Truss, On-Stage)
  {
    itemNumber: 'Chauvet DJ GigBAR Move + ILS',
    brand: 'Chauvet DJ',
    category: 'lighting',
    description:
      'All-in-one 5-in-1 lighting rig with dual 32W moving heads, derbies, quad-color washes, strobe, RF remote, tripod stand, and carry bags.',
    mapPrice: 1559.99,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/3a5720cc-f43c-43e4-97cf-5d1dbdc13d83.png?v=1738236616',
    priceNote: 'Complete Portable Stage Lighting Rig · ILS Wireless Sync',
  },
  {
    itemNumber: 'Chauvet DJ 4BAR Quad ILS',
    brand: 'Chauvet DJ',
    category: 'lighting',
    description:
      '4-pod RGBA quad-color LED stage wash bar system including tripod stand, wireless footswitch, and padded transport bag.',
    mapPrice: 649.99,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/582c53e2-d4f2-44b5-a865-052910464f44.png?v=1739363325',
  },
  {
    itemNumber: 'Chauvet DJ SlimPAR Q12 ILS',
    brand: 'Chauvet DJ',
    category: 'lighting',
    description:
      'Low-profile 12-LED quad-color RGBA par wash fixture with silent fanless operation and ILS/D-Fi USB wireless DMX compatibility.',
    mapPrice: 199.99,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/7a317215-3fad-4608-af33-adc132d055d8.png?v=1737575194',
  },
  {
    itemNumber: 'Chauvet DJ SlimPAR T6BT ILS',
    brand: 'Chauvet DJ',
    category: 'lighting',
    description:
      'Compact 6-LED tri-color RGB stage wash fixture featuring built-in Bluetooth app control and flicker-free output for sanctuary video.',
    mapPrice: 119.99,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/0fc52a5d-e0cc-4b37-9b46-3ac592a0e6e7.jpg?v=1758621717',
  },
  {
    itemNumber: 'Chauvet DJ Freedom Par Q9',
    brand: 'Chauvet DJ',
    category: 'lighting',
    description:
      '100% cable-free battery-powered RGBA LED uplight with built-in wireless DMX transceiver, magnetic diffuser, and spring-loaded kickstand.',
    mapPrice: 329.99,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0614/8122/2322/files/FREEDOM-PAR-Q9_w_DIFFUSER-RIGHT.jpg?v=1689006016',
  },
  {
    itemNumber: 'Chauvet DJ Freedom Par H9 IP',
    brand: 'Chauvet DJ',
    category: 'lighting',
    description:
      'Weather-resistant IP54 battery-powered RGBAW+UV LED uplight with 6-color mixing, wireless DMX, and OLED display for indoor or outdoor worship.',
    mapPrice: 399.99,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/ff945fb7-05a3-4ca4-82e9-70023796690f.png?v=1739364839',
  },
  {
    itemNumber: 'Chauvet DJ COLORband PiX-M ILS',
    brand: 'Chauvet DJ',
    category: 'lighting',
    description:
      'Motorized tilting 10-zone RGB LED batten wash strip light with individual pixel mapping for stage backdrops and wall grazing.',
    mapPrice: 529.99,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/a0d97f15-3073-4585-bbf7-f9ba24b86904.png?v=1737654830',
  },
  {
    itemNumber: 'Chauvet DJ Intimidator Spot 160 ILS',
    brand: 'Chauvet DJ',
    category: 'lighting',
    description:
      'Compact 32W LED moving-head spotlight with dual gobo/color wheels, 17-degree beam angle, and ILS wireless ecosystem sync.',
    mapPrice: 409.0,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/21fc17a6-408c-48bd-8f9c-d18d18edfbbb.png?v=1737575230',
  },
  {
    itemNumber: 'Chauvet DJ Intimidator 260X',
    brand: 'Chauvet DJ',
    category: 'lighting',
    description:
      '75W LED moving-head spotlight with motorized focus, 3-facet rotating prism, Totem mode, and RF remote compatibility.',
    mapPrice: 849.99,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/b80d6588-761e-4608-bed0-3767e1871378.png?v=1738236914',
  },
  {
    itemNumber: 'Chauvet DJ ILS Command',
    brand: 'Chauvet DJ',
    category: 'lighting',
    description:
      'Handheld and desktop wireless ILS lighting controller commanding unlimited compatible Chauvet washes, bars, and moving heads without DMX cables.',
    mapPrice: 329.99,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/98c61482-876b-4a1d-a03b-43465ebc0e43.png?v=1737575190',
  },
  {
    itemNumber: 'Chauvet DJ Obey 40',
    brand: 'Chauvet DJ',
    category: 'lighting',
    description:
      '192-channel universal DMX-512 lighting console supporting up to 12 intelligent fixtures with fogger trigger and MIDI control.',
    mapPrice: 149.99,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/b90983bb-47ff-4674-8038-332366adb642.png?v=1739364811',
  },
  {
    itemNumber: 'Chauvet DJ Hurricane Haze 4D',
    brand: 'Chauvet DJ',
    category: 'lighting',
    description:
      'High-output water-based haze machine with digital DMX control, quiet variable-speed fan, and directional scoop for wide sanctuaries.',
    mapPrice: 559.99,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/bf7a5425-39e9-4f1a-8710-591c84cf942f.png?v=1738129101',
  },
  {
    itemNumber: 'ADJ Focus Spot 4Z',
    brand: 'ADJ',
    category: 'lighting',
    description:
      '200W cool-white LED moving-head spot with motorized zoom (11–22°), motorized focus, dual rotating prisms, and PowerCON in/out.',
    mapPrice: 1649.99,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/180d9178-8d7b-4e69-b032-c90e695f4b1a.png?v=1738238524',
  },
  {
    itemNumber: 'Chauvet DJ Intimidator Spot 375ZX',
    brand: 'Chauvet DJ',
    category: 'lighting',
    description:
      'High-output 200W cool-white LED moving-head spot with motorized zoom, dual rotating prisms, Totem mode, and wireless RF control.',
    mapPrice: 1459.99,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/b27b82d1-e886-4770-95d0-67a82d443317.png?v=1739364823',
    priceNote: '200W Sanctuary Moving Head · Motorized Zoom & Prism',
  },
  {
    itemNumber: 'Chauvet DJ Intimidator Beam 360X',
    brand: 'Chauvet DJ',
    category: 'lighting',
    description:
      '110W compact LED moving-head aerial beam fixture featuring motorized frost filter, 16-facet prism, and built-in RF receiver.',
    mapPrice: 1449.99,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/035bd124-aac4-463f-82ed-55f0d5d17348.png?v=1736712772',
  },
  {
    itemNumber: 'Chauvet DJ Intimidator Spot 360X',
    brand: 'Chauvet DJ',
    category: 'lighting',
    description:
      '100W LED moving-head spot designed for large worship stages with motorized focus, 3-facet prism, and dual gobo/color wheels.',
    mapPrice: 999.0,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/52f07928-fd79-4da8-a3f7-ed0492d05365.png?v=1737134233',
  },
  {
    itemNumber: 'Chauvet DJ Intimidator Spot 110',
    brand: 'Chauvet DJ',
    category: 'lighting',
    description:
      'Ultra-compact lightweight 10W LED moving-head spot with separate color/gobo wheels for youth rooms and mobile stages.',
    mapPrice: 208.95,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/5d5ae0ad-70d7-4cba-9bb3-69f810950766.png?v=1787357700',
  },
  {
    itemNumber: 'Chauvet DJ EVE E-100Z LED Spot',
    brand: 'Chauvet DJ',
    category: 'lighting',
    description:
      '100W warm-white 3500K ellipsoidal LED stage spot with crisp manual framing shutters and variable zoom (14–30°) for pulpits.',
    mapPrice: 999.99,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/df02a96c-86cd-4f18-a8ff-95edd24b25b8.png?v=1738752962',
    priceNote: 'Whisper-Quiet Warm-White Pulpit & Choir Key Light',
  },
  {
    itemNumber: 'ADJ Focus Spot 5Z',
    brand: 'ADJ',
    category: 'lighting',
    description:
      '200W LED moving-head fixture with motorized zoom (11–22°), motorized focus, dual color wheels, and PowerCON locking power I/O.',
    mapPrice: 1899.99,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/4dd96ebb-1524-49d3-af4f-ffedfb46d47b.png?v=1739341029',
  },
  {
    itemNumber: 'ADJ Focus Beam LED Moving Head',
    brand: 'ADJ',
    category: 'lighting',
    description:
      'High-intensity 80W white LED moving-head beam projector delivering razor-sharp 2.5° aerial columns, dual prisms, and motorized focus.',
    mapPrice: 1719.99,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/0eece43b-6ad4-4cf8-a25f-2c24767f1ff7.png?v=1739341043',
  },
  {
    itemNumber: 'ADJ Focus Flex Moving Head Wash',
    brand: 'ADJ',
    category: 'lighting',
    description:
      'Versatile 7x 40W RGBW pixel-mappable moving-head LED wash with ultra-wide 6°–55° zoom for crisp sanctuary color washes.',
    mapPrice: 1649.99,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/67f8b241-99c6-4869-9014-9769fd36b9cd.jpg?v=1739341047',
  },
  {
    itemNumber: 'ADJ Startec Stinger Spot Mini',
    brand: 'ADJ',
    category: 'lighting',
    description:
      '30W bright white LED mini moving head with crisp 6-facet prism and smooth DMX stepper motors for portable worship rigs.',
    mapPrice: 342.95,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/d94ba349-b2bf-44f4-bd76-14cf826c477e.png?v=1737504663',
  },
  {
    itemNumber: 'Eliminator Stealth Wash Zoom',
    brand: 'Eliminator',
    category: 'lighting',
    description:
      'Compact 7x 15W RGBW moving-head stage wash fixture with motorized zoom and fast pan/tilt response for dynamic stage backdrops.',
    mapPrice: 449.99,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/d336f07d-031f-43a3-8e23-7f9d0a669561.jpg?v=1739340731',
  },
  {
    itemNumber: 'ADJ DP-DMX20L 4-Ch Dimmer Pack',
    brand: 'ADJ',
    category: 'lighting',
    description:
      '4-channel DMX dimmer and relay power switch pack for controlling conventional stage PARs, house accents, and truss lighting power.',
    mapPrice: 234.99,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/14902678-bafd-42b2-8ecd-cc84cec6d7f8.jpg?v=1737084242',
  },
  {
    itemNumber: 'Chauvet DJ Xpress 1024 DMX Interface',
    brand: 'Chauvet DJ',
    category: 'lighting',
    description:
      'Dual-universe 1024-channel ShowXpress USB-to-DMX lighting interface with standalone cue playback for church lighting computers.',
    mapPrice: 399.99,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/e0afdfca-3384-4077-bb93-fe23ccce9574.png?v=1737780335',
  },
  {
    itemNumber: 'Global Truss ST-132 Crank Stand',
    brand: 'Global Truss',
    category: 'rigging',
    description:
      'Medium-duty steel crank-up lighting and truss tower extending up to 13.2 ft with 220 lb load capacity for church productions and outdoor events.',
    mapPrice: 391.0,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/ae6eb8d7-8cca-424e-b0c6-a7f4d8afef0e.jpg?v=1739414552',
  },
  {
    itemNumber: 'On-Stage LS7730 Lighting Truss',
    brand: 'On-Stage',
    category: 'rigging',
    description:
      'Complete 10 ft wide portable aluminum lighting truss bridge supported by dual heavy-duty cranking tripod stands up to 10 ft tall.',
    mapPrice: 299.95,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/ccbab392-183e-4d03-abb3-805735800dbe.jpg?v=1738103840',
  },
  // Speaker Hanging, Rigging Yokes, Wall Mounts, Eyebolts & Stands (QSC, EV, JBL, K&M, Gator, Ultimate Support)
  {
    itemNumber: 'QSC K12.2-YOKE',
    brand: 'QSC',
    category: 'rigging',
    description:
      'Powder-coated steel yoke mount bracket engineered for safe horizontal or vertical wall and ceiling hanging of QSC K12.2 loudspeakers.',
    mapPrice: 189.99,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/01cf5db9-6fc9-42bd-b8ee-c2257a1c0447.png?v=1739273241',
    priceNote: 'Authorized QSC Suspension Hardware · Wall/Ceiling Ready',
  },
  {
    itemNumber: 'QSC K10.2-YOKE',
    brand: 'QSC',
    category: 'rigging',
    description:
      'Heavy-gauge steel yoke mount bracket allowing secure vertical or horizontal overhead suspension of QSC K10.2 10" loudspeakers.',
    mapPrice: 179.99,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0614/8122/2322/products/63194_sq.jpg?v=1751307436',
  },
  {
    itemNumber: 'QSC K8.2-YOKE',
    brand: 'QSC',
    category: 'rigging',
    description:
      'Powder-coated steel yoke mount kit for hanging QSC K8.2 speakers cleanly onto sanctuary beams, walls, or truss bars.',
    mapPrice: 169.99,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0614/8122/2322/files/1495543829_1339420.jpg?v=1751308081',
  },
  {
    itemNumber: 'QSC M10 Kit-C',
    brand: 'QSC',
    category: 'rigging',
    description:
      'Rated M10 forged-shoulder steel eyebolt kit (3-pack) required for overhead flown rigging and pullback suspension of QSC K.2, K, and KW cabinets.',
    mapPrice: 83.99,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0614/8122/2322/products/66183_sq.jpg?v=1751314610',
  },
  {
    itemNumber: 'Electro-Voice ZLX-G2-BRKT',
    brand: 'Electro-Voice',
    category: 'rigging',
    description:
      'Steel wall-mount bracket specifically engineered for vertical or horizontal installation of Electro-Voice ZLX-12P-G2 and ZLX-15P-G2 speakers.',
    mapPrice: 109.0,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/d2c54f7c-4954-4b20-a117-0a61978f6750.png?v=1739418584',
  },
  {
    itemNumber: 'Electro-Voice ELX200-BRKT',
    brand: 'Electro-Voice',
    category: 'rigging',
    description:
      'Heavy-duty steel wall mounting bracket for vertical hanging of Electro-Voice ELX200 10", 12", and 15" loudspeakers in churches and venues.',
    mapPrice: 119.0,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/be9ba936-b973-45c8-bdf1-f9503b945d05.png?v=1739420025',
  },
  {
    itemNumber: 'Electro-Voice EBK-M10-4PACK',
    brand: 'Electro-Voice',
    category: 'rigging',
    description:
      'Set of 4 rated forged M10 rigging eyebolts for flying Electro-Voice ELX200, EKX, and ETX powered sanctuary loudspeakers.',
    mapPrice: 172.95,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/90ac717c-5a8e-4e92-b80d-b22315dea8f9.png?v=1739419242',
  },
  {
    itemNumber: 'JBL VTX-PM Universal Pole Mount',
    brand: 'JBL',
    category: 'rigging',
    description:
      'Heavy-duty 35mm pole mount adapter allowing flown-frame or subwoofer-mounted vertical angle adjustment for PA speakers.',
    mapPrice: 119.0,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/935f7fc5-dfc4-4176-ae46-0904115cb4d5.png?v=1750450021',
  },
  {
    itemNumber: 'K&M 24120 Speaker Wall Mount',
    brand: 'K&M',
    category: 'rigging',
    description:
      'German-made swiveling and tilting heavy-duty steel speaker wall mount supporting up to 110 lbs for permanent sanctuary installs.',
    mapPrice: 259.99,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0614/8122/2322/files/24120-000-55.jpg?v=1721654562',
  },
  {
    itemNumber: 'On-Stage SS7322B Wall Mount Pair',
    brand: 'On-Stage',
    category: 'rigging',
    description:
      'Pair of adjustable steel PA speaker wall-mount brackets with multi-angle downward tilt locking up to 80 lbs per cabinet.',
    mapPrice: 101.95,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/529bf2d7-bc94-4595-be76-2c2563f804ed.png?v=1788287830',
  },
  {
    itemNumber: 'On-Stage SS7323B Wall Mount Pair',
    brand: 'On-Stage',
    category: 'rigging',
    description:
      'Low-profile heavy-duty speaker wall brackets (pair) with dual tilt angles and integrated 1-3/8" pole shafts for sanctuary side fills.',
    mapPrice: 119.95,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/87d8ba78-502c-4098-b6bd-fd04b3019612.png?v=1739487433',
  },
  {
    itemNumber: 'Ultimate Support TS-100B',
    brand: 'Ultimate Support',
    category: 'rigging',
    description:
      'Air-powered Lift-Assist aluminum speaker tripod stand supporting up to 150 lbs with effortless one-person speaker elevation.',
    mapPrice: 199.99,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/db307b21-40c6-4bc6-ad09-a1d243a5bc9e.jpg?v=1739542437',
  },
  {
    itemNumber: 'Ultimate Support TS-90B',
    brand: 'Ultimate Support',
    category: 'rigging',
    description:
      'TeleLock aluminum tripod PA speaker stand supporting 150 lbs with locking collar mechanism that safely lowers heavy speakers.',
    mapPrice: 159.99,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/18880982-b896-407c-bcfd-e47180f0f7eb.jpg?v=1736808072',
  },
  {
    itemNumber: 'Gator Frameworks GFW-SPK-2000SET',
    brand: 'Gator Frameworks',
    category: 'rigging',
    description:
      'Matched pair of lightweight aluminum PA speaker tripod stands (125 lb rating each) complete with a rugged nylon transport bag.',
    mapPrice: 199.99,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/30383656-32b2-44ff-a79b-221cae204317.jpg?v=1736471815',
  },
  {
    itemNumber: 'Gator Frameworks GFW-SPK-2000',
    brand: 'Gator Frameworks',
    category: 'rigging',
    description:
      'Single aluminum PA speaker tripod stand featuring dual 35mm/38mm mounting compatibility and dual-safety pin height locking.',
    mapPrice: 89.99,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0614/8122/2322/products/1471006041_924297.jpg?v=1665647890',
  },
  {
    itemNumber: 'Gator Frameworks GFW-SPK-SUB60',
    brand: 'Gator Frameworks',
    category: 'rigging',
    description:
      'Adjustable steel subwoofer-to-speaker mounting pole with removable M20 threaded adapter and 125 lb weight rating.',
    mapPrice: 54.99,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0614/8122/2322/files/GFW-SPK-SUB60_01_FRONT.jpg?v=1719509488',
  },
  {
    itemNumber: 'Gator Frameworks GFW-ID-SPKR-SPSET',
    brand: 'Gator Frameworks',
    category: 'rigging',
    description:
      'Pair of Gator ID Series air-assisted subwoofer poles with integrated M20 threads and padded carrying case for rapid mobile setup.',
    mapPrice: 279.99,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/e19c2e21-27aa-47e4-84b9-e1c20fb4ce34.png?v=1738707484',
  },
  {
    itemNumber: 'Chauvet DJ CLP-15 Truss Clamp',
    brand: 'Chauvet DJ',
    category: 'rigging',
    description:
      'Heavy-duty lightweight aluminum C-clamp rated up to 150 lbs for safely hanging lighting fixtures and lightweight loudspeakers onto 1"–2" truss.',
    mapPrice: 19.95,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/52e2d907-0a20-471d-a925-a2ab1b698dc8.png?v=1739363282',
  },
  // Box Truss, Wood Beam Clamps, Steel I-Beam Clamps & Ceiling Hanging Rigs
  {
    itemNumber: 'Global Truss SQ-4112 6.56ft (2.0m) F34 Box Truss',
    brand: 'Global Truss',
    category: 'rigging',
    description:
      'Industry-standard 12"x12" aluminum F34 square box truss segment (6.56 ft / 2.0 m) with 2" outer tubing and conical couplers for sanctuaries & stage grids.',
    mapPrice: 491.0,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/1407676d-d64b-46ac-9a97-ffc6c55baa41.png?v=1736366878',
    priceNote: 'F34 Sanctuary Overhead Truss Standard · Couplers Included',
  },
  {
    itemNumber: 'Global Truss SQ-4111 4.92ft (1.5m) F34 Box Truss',
    brand: 'Global Truss',
    category: 'rigging',
    description:
      '4.92 ft (1.5 m) aluminum F34 12" square box truss section compatible with overhead ceiling spans and upright totem displays.',
    mapPrice: 426.0,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/ba141e51-8308-4e40-b90c-f0113e89c147.png?v=1736366885',
  },
  {
    itemNumber: 'Global Truss SQ-4121 90° Corner Junction F34',
    brand: 'Global Truss',
    category: 'rigging',
    description:
      'Heavy-duty 2-way 90-degree aluminum corner block for building rectangular goal-post truss frames and ceiling light grids.',
    mapPrice: 370.0,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/567408e9-3541-4c1c-90d8-470348fde766.jpg?v=1736366875',
  },
  {
    itemNumber: 'Global Truss SQ-4137 12x12" F34 Base Plate',
    brand: 'Global Truss',
    category: 'rigging',
    description:
      'Compact 12"x12" steel base plate with half-conical couplers to anchor upright F34 square truss lighting totems.',
    mapPrice: 100.0,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/7b48cd67-82e1-44df-9628-69a5a92aa123.jpg?v=1739414556',
  },
  {
    itemNumber: 'Global Truss SQ-4137H 16x16" Heavy Base Plate',
    brand: 'Global Truss',
    category: 'rigging',
    description:
      'Extra-wide 16"x16" heavy steel base plate providing rock-solid footing for tall moving-head truss towers and line-array columns.',
    mapPrice: 140.0,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/6d832e93-7a68-4824-8dfc-03feec5f9499.jpg?v=1739414554',
  },
  {
    itemNumber: 'Global Truss DT-3800L 13ft Crank Stand',
    brand: 'Global Truss',
    category: 'rigging',
    description:
      'Heavy-duty dual-crank steel lifting stand reaching 13 ft for hoisting F34 truss bridges, moving lights, and mobile PA speakers.',
    mapPrice: 319.0,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/99e37565-49d5-4d6c-a5d4-0ff5c06c37ca.png?v=1738410287',
  },
  {
    itemNumber: 'Global Truss ST-90 9ft Crank Stand',
    brand: 'Global Truss',
    category: 'rigging',
    description:
      'Portable 9 ft (2.75 m) gear-driven crank tripod stand for clean elevation of lighting T-bars and F34 truss spans.',
    mapPrice: 203.0,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/4cce02a2-715e-4d4c-ab90-813929563071.jpg?v=1738322039',
  },
  {
    itemNumber: 'Adaptive Technologies Wood Beam Swivel Clamp (BC-W7-12-9)',
    brand: 'Adaptive Technologies',
    category: 'rigging',
    description:
      'Structural wood beam & glulam timber hanging clamp with load-rated swivel eye for suspending sanctuary speakers and truss without weakening overhead wood beams.',
    mapPrice: 368.0,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0923/3012/files/adaptive-technologies-group-beam-clamp-wood-beam-suspension-with-swivel-eye__BC-W7-12-9_438d858e-2fa2-4548-b440-385c042c1004.jpg?v=1793137494',
    priceNote: 'Wood Timber Beam Suspension · Swivel Rigging Eye',
  },
  {
    itemNumber: 'Adaptive Technologies BC-GSA-100 Wood Beam Adapter',
    brand: 'Adaptive Technologies',
    category: 'rigging',
    description:
      'Structural wood-joist & wood beam mounting adapter allowing direct bolted overhead rigging of speakers and lighting grids from sanctuary timber beams.',
    mapPrice: 147.2,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0923/3012/files/adaptive-technologies-group-bc-gsa-100-wood-beam-mount-adapter.jpg?v=1793140202',
    priceNote: 'Wood Beam & Timber Sanctuary Rigging Mount',
  },
  {
    itemNumber: 'Adaptive Technologies BC-LAM-KIT Wood Beam Clamp Kit',
    brand: 'Adaptive Technologies',
    category: 'rigging',
    description:
      'Heavy-duty laminated wood beam (glulam) clamp adapter kit engineered to safely suspend audio arrays and ceiling trusses from wide sanctuary wood beams.',
    mapPrice: 120.0,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0923/3012/files/adaptive-technologies-group-beam-clamp-bc-lam-kit-wood-beam-clamp-adapter.jpg?v=1793152899',
  },
  {
    itemNumber: 'CM Screwlok Steel I-Beam Clamp',
    brand: 'CM Rigging',
    category: 'rigging',
    description:
      'Industrial screw-lock structural steel I-beam clamp providing a fast, non-welded overhead ceiling rigging hang point for truss spans, hoists, and flown speakers.',
    mapPrice: 141.37,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0923/3012/products/beamclamp.jpg?v=1437750997',
    priceNote: 'Structural Steel I-Beam & Girder Hang Point',
  },
  {
    itemNumber: 'AMH 1-Ton I-Beam Clamp w/ Shackle',
    brand: 'AMH',
    category: 'rigging',
    description:
      'Load-rated structural steel I-beam girder clamp integrated with a heavy-duty anchor shackle for ceiling rigging onto exposed steel rafters.',
    mapPrice: 99.71,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0923/3012/products/BCD_71387201-aadc-4ec6-be36-dfeef754fb9f.jpg?v=1681316334',
  },
  {
    itemNumber: 'Adaptive Technologies MP-150-115-CM 454lb Ceiling Mount',
    brand: 'Adaptive Technologies',
    category: 'rigging',
    description:
      'Heavy-duty 454 lb load-rated structural ceiling attachment plate engineered for permanent overhead ceiling hanging of PA speakers, yokes, and subwoofers.',
    mapPrice: 248.0,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0923/3012/files/adaptive-technologies-group-mp-150-115-cm-454lb-ceiling-attachment.jpg?v=1793151985',
    priceNote: '454 lb Overhead Ceiling Hanging Anchor',
  },
  {
    itemNumber: 'Adaptive Technologies MP-1.5NPT-GSA Gimbal Ceiling Mount',
    brand: 'Adaptive Technologies',
    category: 'rigging',
    description:
      '150 lb gimballed ceiling suspension mount enabling multi-axis pan/tilt aiming on sloped or cathedral sanctuary ceilings and wood beams.',
    mapPrice: 368.0,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0923/3012/files/adaptive-technologies-group-mp-1-5npt-gsa-150lb-gimballed-ceiling-mount.jpg?v=1793152159',
    priceNote: 'Sloped Ceiling & Cathedral Joist Gimbal Mount',
  },
  {
    itemNumber: 'Adaptive Technologies SAS-100-CM Ceiling Mount',
    brand: 'Adaptive Technologies',
    category: 'rigging',
    description:
      '100 lb indoor overhead ceiling speaker & rigging beam mount kit for suspending delay speakers and lighting bars cleanly from finished ceilings.',
    mapPrice: 320.0,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0923/3012/files/adaptive-technologies-group-sas-100-cm-100lb-indoor-ceiling-mount__SAS-100-CM_0e91642a-6fd1-4d61-8b36-ea53b1c9cd99.jpg?v=1793138032',
  },
  {
    itemNumber: 'Adaptive Technologies SAS-GL Gridlink Rigging Beam',
    brand: 'Adaptive Technologies',
    category: 'rigging',
    description:
      'Gridlink overhead structural rigging spreader beam system distributing multi-point ceiling loads across roof rafters and joists for safe array hanging.',
    mapPrice: 460.0,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0923/3012/files/sas-gl-gridlink-rigging-beam-system.jpg?v=1793197923',
  },
  {
    itemNumber: 'Electro-Voice MB200 Wall/Ceiling U-Mount',
    brand: 'Electro-Voice',
    category: 'rigging',
    description:
      'Heavy-gauge steel wall and ceiling U-bracket mount engineered for overhead ceiling suspension or angled beam mounting of EV SX/ZX cabinets.',
    mapPrice: 283.95,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/3aceb182-4187-4dcc-a1f0-927ab7303059.jpg?v=1739418710',
  },
  {
    itemNumber: 'JBL MTC-29CM Ceiling Mount Adapter',
    brand: 'JBL',
    category: 'rigging',
    description:
      'Overhead ceiling suspension down-rod mount kit built for clean suspended installation of compact JBL point-source loudspeakers.',
    mapPrice: 56.0,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/26429971-61d6-4e2e-89b3-bf71e5512634.png?v=1758924972',
  },
  {
    itemNumber: 'JBL MTC-SB2C Ceiling Suspension Bracket',
    brand: 'JBL',
    category: 'rigging',
    description:
      'Structural steel ceiling hanging bracket engineered to safely suspend commercial subwoofers and bass enclosures overhead.',
    mapPrice: 115.0,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/74452140-2706-4f78-868d-c9ac8504266b.png?v=1750473660',
  },
  {
    itemNumber: 'Yamaha UB-DXR10 Ceiling & Wall U-Bracket',
    brand: 'Yamaha',
    category: 'rigging',
    description:
      'Vertical or horizontal steel ceiling & beam U-bracket engineered specifically for Yamaha DXR10, DHR10, and CHR10 cabinets.',
    mapPrice: 208.95,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/acceb2ba-38f3-45e0-acb8-f928542f2445.png?v=1739548941',
  },
  {
    itemNumber: 'PreSonus CDL12P Overhead Rigging Grid',
    brand: 'PreSonus',
    category: 'rigging',
    description:
      'Certified steel overhead fly frame and array rigging grid for safely flying line-array loudspeakers and subwoofers from ceiling points.',
    mapPrice: 727.99,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/eb2c9ece-b2b4-4b37-94ad-e5bcffd65701.png?v=1739568154',
  },
  {
    itemNumber: 'Global Truss SNAP CLAMP Hook Clamp',
    brand: 'Global Truss',
    category: 'rigging',
    description:
      'Self-locking quick-hang wraparound aluminum hook clamp supporting 2-inch truss tubes so one technician can hang moving lights solo.',
    mapPrice: 30.0,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/31ce5074-a1b0-49c1-a5f7-a7d93794caa2.jpg?v=1739414564',
  },
  {
    itemNumber: 'Global Truss X-Pro Heavy Duty 2" Clamp',
    brand: 'Global Truss',
    category: 'rigging',
    description:
      'Extra-heavy-duty pro half-coupler clamp (1,100 lb max capacity) for flying speakers, beams, and high-weight moving heads on 2" F34 truss.',
    mapPrice: 32.0,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/fe0ed4f7-4da1-4cef-b7e6-dbac384b7890.png?v=1771614793',
  },
  {
    itemNumber: 'Global Truss ADJ Proswivel Dual Clamp',
    brand: 'Global Truss',
    category: 'rigging',
    description:
      'Heavy-duty dual 360-degree swivel half-coupler joining intersecting pipes or trusses safely at any angle up to 1,100 lbs.',
    mapPrice: 43.0,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/bf4632ae-dfae-41e0-bae6-1c3dedd02f80.png?v=1738410688',
  },
  {
    itemNumber: 'Elation Narrow Clamp Black',
    brand: 'Elation',
    category: 'rigging',
    description:
      'Low-profile black anodized 50mm aluminum trigger clamp built for tight spacing between moving-head bars and stage wash fixtures.',
    mapPrice: 30.0,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/6724aea0-c4a0-4cab-80a5-6425b30c4900_12b0e94d-2016-4636-a03f-f9906ed3cbd1.png?v=1739388963',
  },
  {
    itemNumber: 'ProX T-C17-BLK Truss C-Clamp (330 lb)',
    brand: 'ProX',
    category: 'rigging',
    description:
      'Black anodized aluminum C-clamp with 330 lb load rating for 1.5" to 2" pipe grids and lighting truss rails.',
    mapPrice: 16.49,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/e109cece-702c-4711-9069-e144ee9ecedc.jpg?v=1738410339',
  },
  {
    itemNumber: 'LiftAll Steelflex Stage Rigging Round Sling',
    brand: 'LiftAll',
    category: 'rigging',
    description:
      'Black steel-core polyester round sling (spansets) engineered for wrapping structural wood or steel ceiling beams and hanging overhead truss.',
    mapPrice: 21.83,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0923/3012/files/LiftAll_Sling.png?v=1754408904',
  },
  {
    itemNumber: 'Crosby G-2130 Bolt-Type Anchor Shackle',
    brand: 'Crosby',
    category: 'rigging',
    description:
      'Genuine USA-forged bolt-type anchor shackle with nut and cotter pin for permanent overhead sanctuary truss, beam, and speaker rigging.',
    mapPrice: 11.75,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0923/3012/files/Untitleddesign_1.png?v=1749029453',
  },
  {
    itemNumber: 'Chauvet DJ CH-05 Safety Cable',
    brand: 'Chauvet DJ',
    category: 'rigging',
    description:
      'Essential braided steel secondary safety tether cable required by fire & building code whenever lights or speakers hang overhead.',
    mapPrice: 5.95,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/c5aed201-f886-40d5-b779-8c4638e4bcce.png?v=1736712769',
  },
  {
    itemNumber: 'ADJ SCABLE 24" 60-lb Steel Safety Cable',
    brand: 'ADJ',
    category: 'rigging',
    description:
      '24-inch braided steel safety cable rated at 60 lb test load for securing overhead moving heads, ceiling brackets, and stage PARs.',
    mapPrice: 8.95,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/e4261888-d26a-413b-9b67-b3e6779991c5.jpg?v=1736712651',
  },
  // Digital & Analog Stage Boxes, XLR / DMX / Speakon Cables, DI Boxes, Power & Racks
  {
    itemNumber: 'Behringer SD16 16-Ch Stage Box',
    brand: 'Behringer',
    category: 'cables',
    description:
      '16-input / 8-output digital AES50 stagebox with 16 Midas-designed mic preamps, ULTRANET P16 personal monitor hub, and dual AES50 ports.',
    mapPrice: 509.0,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/4ab83167-5018-4aa6-9174-22c80b2435cf.png?v=1783720407',
  },
  {
    itemNumber: 'Behringer SD8 8-Ch Stage Box',
    brand: 'Behringer',
    category: 'cables',
    description:
      'Compact 8-input / 8-output AES50 digital stagebox with 8 Midas preamps and combo XLR/TRS inputs for drum islands and altar stages.',
    mapPrice: 409.0,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/85e57e5a-081d-4de0-bff0-c20bc71e2219.png?v=1747443941',
  },
  {
    itemNumber: 'Midas DL16 16x8 Stage Box',
    brand: 'Midas',
    category: 'cables',
    description:
      '16-input / 8-output digital stagebox equipped with 16 Midas PRO microphone preamps, Ultranet networking, and rugged 2U rack chassis.',
    mapPrice: 1049.0,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/c99fe486-331a-4302-9933-35732c2c0b3e.png?v=1736976067',
  },
  {
    itemNumber: 'Allen & Heath AB168 16x8 AudioRack',
    brand: 'Allen & Heath',
    category: 'cables',
    description:
      '16-XLR input / 8-XLR output dSNAKE stagebox engineered for Allen & Heath SQ and Qu consoles over a single shielded Cat5e cable.',
    mapPrice: 1199.0,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/dc410dc9-2f40-4644-b76c-3dd4624cfa0b.png?v=1739341899',
  },
  {
    itemNumber: 'Allen & Heath DX168 16x8 96kHz Stage Box',
    brand: 'Allen & Heath',
    category: 'cables',
    description:
      'Portable 96kHz 16-in / 8-out SLink digital stagebox delivering studio-grade preamps for Allen & Heath SQ-5, SQ-6, SQ-7, and Avantis.',
    mapPrice: 1679.0,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/7a508ca7-f155-45a2-b5b6-8a38fc0b82f0.png?v=1791065448',
  },
  {
    itemNumber: 'Yamaha Tio1608-D2 16x8 Dante Stage Box',
    brand: 'Yamaha',
    category: 'cables',
    description:
      '16-in / 8-out Dante 96kHz digital stagebox with recallable D-PRE preamps engineered for Yamaha DM3, TF, and QL consoles.',
    mapPrice: 1649.99,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/137ba83c-9f84-46a0-9d60-b434b50f94fd.jpg?v=1738493308',
  },
  {
    itemNumber: 'Pro Co SMC1604FBX-100 100ft 16x4 Stage Snake',
    brand: 'Pro Co',
    category: 'cables',
    description:
      '100 ft 16-channel XLR send + 4-channel return analog metal stage box snake built for permanent sanctuary conduits or mobile analog setups.',
    mapPrice: 419.95,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/7924b268-a9f9-4858-98dc-a2bce03a66a5.jpg?v=1739484145',
  },
  {
    itemNumber: 'ProX XC-SB164XLR50 50ft 16x4 Stage Box Snake',
    brand: 'ProX',
    category: 'cables',
    description:
      '50 ft 16x4 XLR analog stage box audio snake with heavy-duty steel stage box, numbered fantails, and protective strain relief.',
    mapPrice: 279.99,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/8e6ff636-624a-4446-b84b-0a28905407a6.png?v=1792086009',
  },
  {
    itemNumber: 'RapCo Shielded CAT5e EtherCON 100ft Cable',
    brand: 'RapCo',
    category: 'cables',
    description:
      '100 ft heavy-duty touring-grade shielded Cat5e digital snake cable with locking Neutrik EtherCON ends and drain wire for X32/SQ/WING stageboxes.',
    mapPrice: 109.0,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/54583c91-2534-4321-850b-e147d18957ce.png?v=1736545326',
  },
  {
    itemNumber: 'ProX XC-MIC10 10ft Balanced XLR Cable',
    brand: 'ProX',
    category: 'cables',
    description:
      '10 ft balanced tour-grade XLR male-to-female microphone & patch cable with 93% braided copper shielding and metal connectors.',
    mapPrice: 12.99,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/c0f489c3-d26a-438e-ac2d-4bcaa84ad25c.png?v=1737083635',
  },
  {
    itemNumber: 'ProX XC-MIC25 25ft Balanced XLR Cable',
    brand: 'ProX',
    category: 'cables',
    description:
      '25 ft balanced professional XLR vocal & stage microphone cable designed to resist hum, RF interference, and stage tangling.',
    mapPrice: 18.99,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/2ee6dd3c-9898-428c-b598-7930c307c846.jpg?v=1737666795',
  },
  {
    itemNumber: 'ProX XC-MIC50 50ft Balanced XLR Cable',
    brand: 'ProX',
    category: 'cables',
    description:
      '50 ft heavy-duty balanced XLR microphone & PA feeder cable for long runs across sanctuaries, powered speakers, and subwoofers.',
    mapPrice: 33.99,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/4bc4c51b-fcda-47c5-86ea-c96abfd56550.jpg?v=1738494304',
  },
  {
    itemNumber: 'Stagg 50ft XLR Cable',
    brand: 'Stagg',
    category: 'cables',
    description:
      '50 ft reliable black XLR balanced microphone and speaker signal cable with metal latch connectors for worship teams.',
    mapPrice: 27.95,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/d698bd8c-675a-425f-b2b1-272bfab52cbe.png?v=1770432012',
  },
  {
    itemNumber: 'Mogami Gold Studio-25 25ft XLR Cable',
    brand: 'Mogami',
    category: 'cables',
    description:
      'Studio & broadcast flagship 25 ft Neglex Quad XLR cable with gold Neutrik pins delivering ultra-low noise floor on pulpits and choirs.',
    mapPrice: 119.95,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/d36c1fce-7055-46eb-af7c-f3289bc762a2_f5b66767-5d23-4647-9400-8ddba108ba92.jpg?v=1737575015',
  },
  {
    itemNumber: 'ProX 3-Pin 25ft DMX Lighting Cable',
    brand: 'ProX',
    category: 'cables',
    description:
      'True 110-ohm 3-pin DMX-512 lighting control data cable (25 ft) preventing flicker and signal drops on moving-head & wash chains.',
    mapPrice: 19.99,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/d61fb2b7-e99d-4b5a-844e-066a27396ad7.jpg?v=1739487000',
  },
  {
    itemNumber: 'On-Stage SP14-25SS 25ft Speakon Cable',
    brand: 'On-Stage',
    category: 'cables',
    description:
      '25 ft 14-AWG locking NL4 Speakon-to-Speakon loudspeaker cable engineered for passive mains, stage wedges, and amplifier racks.',
    mapPrice: 46.95,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/190a4b14-8ad5-4782-a501-1cf29a40b448.png?v=1792083343',
  },
  {
    itemNumber: 'Radial J48 Active Direct Box',
    brand: 'Radial',
    category: 'cables',
    description:
      'Studio-standard 48V phantom-powered active DI box eliminating acoustic guitar and bass hum cleanly without tone loss.',
    mapPrice: 299.99,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/a8a7426b-f4bf-47a0-bfc9-ff8e76e7e942.jpg?v=1739491419',
  },
  {
    itemNumber: 'Radial ProD2 Stereo Direct Box',
    brand: 'Radial',
    category: 'cables',
    description:
      'Passive stereo transformer DI box with ground lift to isolate worship keyboards, playback tracks, and livestream interfaces from 60Hz buzz.',
    mapPrice: 239.99,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/0b372bfa-1cd5-4d00-94f0-5e12e9b61e9c.jpg?v=1736447944',
  },
  {
    itemNumber: 'Furman PL-PLUS DMC Power Conditioner',
    brand: 'Furman',
    category: 'cables',
    description:
      '15A 1U rack power conditioner with Series Multi-Stage Protection, LED voltage meter, and pull-out rack lights to protect digital consoles & IEM racks.',
    mapPrice: 464.95,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/35e6fa9d-8850-4058-94d4-05725f8da7a1.png?v=1737751612',
  },
  {
    itemNumber: 'Furman M-8X AR Voltage Regulator',
    brand: 'Furman',
    category: 'cables',
    description:
      '15A True RMS AC voltage regulator & power conditioner stabilizing sanctuary power sags and spikes for amps and mixers.',
    mapPrice: 725.95,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/4afa5e2f-3615-4df3-a50d-beabcbbe44ba.png?v=1739417504',
  },
  {
    itemNumber: 'Gator G-PRO-6U-19 Rack Case',
    brand: 'Gator',
    category: 'cables',
    description:
      'Made-in-USA molded MIL-grade 6U 19" deep rolling/stackable rack case built for wireless receivers, X32/WING rack mixers, and stageboxes.',
    mapPrice: 269.99,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/97390f1b-edcb-4efe-913d-9fe88e05329f.jpg?v=1739275091',
  },
  {
    itemNumber: 'Behringer Powerplay P16-D Ultranet Hub',
    brand: 'Behringer',
    category: 'cables',
    description:
      '16-channel Ultranet distributor sending digital monitor feeds and bus power over Cat5 cables to up to eight P16-M personal mixers.',
    mapPrice: 139.0,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/f663fc52-844c-4298-8fba-54d2f873dae5.png?v=1738961035',
  },
  // Additional Wireless, Wired Microphones & Stands
  {
    itemNumber: 'Shure GLXD24+/SM58',
    brand: 'Shure',
    category: 'mics',
    description:
      'Dual-band 2.4GHz & 5.8GHz digital wireless handheld system with rechargeable battery, automatic channel hopping, and SM58 vocal capsule.',
    mapPrice: 559.0,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/0aae0504-7a89-4e28-a1d1-55b7e0fbf7a5.png?v=1738493959',
  },
  {
    itemNumber: 'Shure BLX288/SM58 Dual',
    brand: 'Shure',
    category: 'mics',
    description:
      'Dual-channel UHF wireless handheld system pairing two legendary SM58 vocal transmitters with one tabletop dual receiver.',
    mapPrice: 655.0,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/64676bfe-e2df-4a06-b00b-2ff0bb66839b.png?v=1736808219',
  },
  {
    itemNumber: 'Shure BLX14/CVL Lavalier',
    brand: 'Shure',
    category: 'mics',
    description:
      'Wireless bodypack presenter kit featuring CVL cardioid clip-on lapel mic and easy QuickScan receiver for pastors and speakers.',
    mapPrice: 305.0,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/5e4cd671-29d7-479d-8d39-2e1b86244ebc.png?v=1763409495',
  },
  {
    itemNumber: 'Shure BLX14R/SM35 Headset',
    brand: 'Shure',
    category: 'mics',
    description:
      'Rackmount wireless headset system combining BLX4R half-rack metal receiver with comfortable SM35 cardioid headworn mic.',
    mapPrice: 519.0,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/ba6121d2-a412-48c3-99e8-e6dd59a488f3.png?v=1738493558',
  },
  {
    itemNumber: 'Sennheiser EW-D CI1 Instrument Set',
    brand: 'Sennheiser',
    category: 'mics',
    description:
      'Digital UHF wireless acoustic/electric guitar and bass instrument system with ultra-low latency and Smart Assist app coordination.',
    mapPrice: 679.0,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/9e39ef2b-3303-4029-b693-01ed38f8ce9b.png?v=1737159955',
  },
  {
    itemNumber: 'Shure Beta 52A Kick Drum Mic',
    brand: 'Shure',
    category: 'mics',
    description:
      'Supercardioid dynamic kick drum & bass cab microphone delivering tight punchy low end with integrated locking stand adapter.',
    mapPrice: 185.0,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/3e68d632-e002-40ff-ba35-db4816889f58.png?v=1738494013',
  },
  {
    itemNumber: 'Shure SM81-LC Condenser',
    brand: 'Shure',
    category: 'mics',
    description:
      'Reference small-diaphragm cardioid condenser microphone ideal for acoustic guitars, drum overheads, pianos, and sanctuary choirs.',
    mapPrice: 375.0,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/1a74f128-2aa5-4fbe-b722-c8f4d3f24582.png?v=1738262060',
  },
  {
    itemNumber: 'Shure PGADRUMKIT7 7-Piece Drum Kit',
    brand: 'Shure',
    category: 'mics',
    description:
      'Complete 7-microphone worship drum pack with kick, snare, tom, and overhead condensers, rim mounts, XLR cables, and hard carrying case.',
    mapPrice: 659.0,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/04068c6f-1b1e-4bae-bbac-95b750622149.jpg?v=1736711620',
  },
  {
    itemNumber: 'Shure Beta 87A Vocal Condenser',
    brand: 'Shure',
    category: 'mics',
    description:
      'Studio-quality handheld supercardioid condenser vocal mic giving lead worship vocalists silky air and high off-axis rejection.',
    mapPrice: 245.0,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/fb958c9a-dc1a-44e0-919d-0ec997ac7eb9.png?v=1739531983',
  },
  {
    itemNumber: 'Sennheiser e609 Silver Guitar Mic',
    brand: 'Sennheiser',
    category: 'mics',
    description:
      'Side-address supercardioid dynamic microphone built to drape straight over guitar amps cleanly without needing a floor stand.',
    mapPrice: 99.95,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/c9fa4ff9-7733-4b51-bc20-42d371215866.jpg?v=1738262099',
  },
  {
    itemNumber: 'Sennheiser e835 3-Pack Vocal Mics',
    brand: 'Sennheiser',
    category: 'mics',
    description:
      'Touring 3-pack of wired cardioid dynamic vocal microphones with clips and pouches to outfit the entire worship backing vocal line.',
    mapPrice: 279.0,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/31f7fbbb-ed6f-4a56-9324-1c32ce953048.jpg?v=1736471982',
  },
  {
    itemNumber: 'Rode NT5 Condenser Matched Pair',
    brand: 'Rode',
    category: 'mics',
    description:
      'Matched stereo pair of small-diaphragm cardioid condensers for grand pianos, worship drum overheads, and choir loft recording.',
    mapPrice: 449.0,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/aa65fc92-d47c-4360-bcd7-b24d1e38a4a4.jpg?v=1739532598',
  },
  {
    itemNumber: 'Audio-Technica PRO 45W Hanging Choir Mic',
    brand: 'Audio-Technica',
    category: 'mics',
    description:
      'Discreet white overhead hanging cardioid condenser microphone with 25 ft cable and positioning hanger for church choirs and sanctuary ceilings.',
    mapPrice: 109.0,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/af169354-d198-485e-85bd-6ecbcbe615b4.jpg?v=1737084227',
  },
  {
    itemNumber: 'K&M 210/9 Boom Mic Stand',
    brand: 'K&M',
    category: 'mics',
    description:
      'German-engineered tripod telescoping boom microphone stand trusted in houses of worship and touring rigs for lifetime clutch stability.',
    mapPrice: 116.99,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/00e00980-2d64-498c-9662-a3af11d2ec1e.jpg?v=1738103788',
  },
  {
    itemNumber: 'On-Stage MS7701B Boom Mic Stand',
    brand: 'On-Stage',
    category: 'mics',
    description:
      'Affordable euro-style tripod boom microphone stand with midpoint locking clutch and durable powder-coated black steel shaft.',
    mapPrice: 30.95,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/1fb4ee41-a2db-4697-81f1-d7379d77b6b6.png?v=1763755593',
  },
  {
    itemNumber: 'Shure UA874US Active Directional Antenna',
    brand: 'Shure',
    category: 'combiners',
    description:
      'Log-periodic directional UHF paddle antenna with 4-position gain switch eliminating Wi-Fi and wall-bounce wireless dropouts.',
    mapPrice: 427.95,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/366e71a7-82f5-4509-a7d2-63834f2a07a1.jpg?v=1763755611',
  },
  {
    itemNumber: 'Shure SE215 Pro In-Ear Earphones',
    brand: 'Shure',
    category: 'iem',
    description:
      'Sound-isolating single dynamic-driver in-ear monitor earphones with Kevlar detachable cable blocking 37 dB of loud stage noise.',
    mapPrice: 99.0,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/dbc66ce2-4509-4f68-8098-132a326b4d64.png?v=1739271518',
  },
  // High-Output Powered Subwoofers (Essential Companion to Sanctuary & Touring Tops)
  {
    itemNumber: 'QSC KS118',
    brand: 'QSC',
    description:
      'High-output 18" 3600W Class-D active subwoofer featuring Deep mode DSP, cardioid array preset, and heavy-duty birch enclosure.',
    mapPrice: 1849.99,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0614/8122/2322/products/ks118-1.jpg?v=1751309690',
    priceNote: 'Sanctuary Low-End Partner to K12.2 / K10.2',
  },
  {
    itemNumber: 'Electro-Voice ELX200-18SP',
    brand: 'Electro-Voice',
    description:
      '18" 1200W Class-D powered subwoofer with QuickSmartDSP, mobile app control, and integrated M20 threaded pole plate.',
    mapPrice: 949.0,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/51d92f37-2205-4c9c-9d5f-f94f5d8c5a1c.jpg?v=1736712661',
  },
  {
    itemNumber: 'QSC K12.2',
    brand: 'QSC',
    description:
      'Class-D 2000W powered 12" 2-way PA loudspeaker with high-performance woofer, compression driver, and DMT Directivity-Matched Transition.',
    mapPrice: 999.99,
    imageUrl: `${FDW}/322207.jpg`,
  },
  {
    itemNumber: 'JBL SRX912M',
    brand: 'JBL',
    description:
      'Compact high-output 12" 2-way powered multi-purpose loudspeaker (90x60) built for main PA, stage monitor, or front-fill duty.',
    mapPrice: 1799.0,
    imageUrl: `${FDW}/562749.jpg`,
  },
  {
    itemNumber: 'Yamaha DXR12 mk3',
    brand: 'Yamaha',
    description:
      '2000W powered 12" full-range loudspeaker in rugged black ABS housing with intuitive DSP controls for speech and live music.',
    mapPrice: 999.99,
    imageUrl: `${FDW}/568865.jpg`,
  },
  {
    itemNumber: 'Yamaha DXR15 mk3',
    brand: 'Yamaha',
    description:
      'Maximum output powered 15" full-range loudspeaker with deep low-end, clear highs, and advanced DSP control for bands and production.',
    mapPrice: 1099.99,
    imageUrl: `${FDW}/577267.jpg`,
  },
  {
    itemNumber: 'Electro-Voice ZLX-12PG2-US',
    brand: 'Electro-Voice',
    description:
      '12" 2-way powered loudspeaker advancing the ZLX series with higher output, extended low-frequency response, and enhanced DSP control.',
    mapPrice: 549.0,
    imageUrl: `${FDW}/561633.jpg`,
  },
  {
    itemNumber: 'QSC K10.2',
    brand: 'QSC',
    description:
      '10" 2000W Class-D active loudspeaker pairing a high-performance woofer and compression driver with smooth DMT coverage.',
    mapPrice: 899.99,
    imageUrl: `${FDW}/357920.jpg`,
  },
  {
    itemNumber: 'QSC CP8',
    brand: 'QSC',
    description:
      'Lightweight 8" 2-way active compact powered loudspeaker engineered with signature QSC reliability, clarity, and portable output.',
    mapPrice: 549.99,
    imageUrl: `${FDW}/331383.jpg`,
  },
  {
    itemNumber: 'QSC K8.2',
    brand: 'QSC',
    description:
      '8" 2000W Class-D active loudspeaker featuring matched woofer/HF transducers and Directivity-Matched Transition coverage.',
    mapPrice: 799.99,
    imageUrl: `${FDW}/357893.jpg`,
  },
  {
    itemNumber: 'Yamaha DXR10 mk3',
    brand: 'Yamaha',
    description:
      'Compact portable 10" full-range powered loudspeaker delivering 2000W of clear, high-output sound with advanced DSP and remote control.',
    mapPrice: 899.99,
    imageUrl: `${FDW}/568862.jpg`,
  },
  {
    itemNumber: 'JBL SRX922',
    brand: 'JBL',
    description:
      'Compact dual-12" 3-way powered point-source loudspeaker (90x60) built for high-output sanctuaries demanding precise coverage and headroom.',
    mapPrice: 2499.0,
    imageUrl: `${FDW}/562729.jpg`,
  },
  {
    itemNumber: 'FBT X-Pro-115A',
    brand: 'FBT',
    description:
      '15" + 1" 1200W RMS processed active 2-way loudspeaker (80x50) in a durable gas-injected plywood cabinet for portable or fixed installs.',
    mapPrice: 1015.0,
    imageUrl: `${FDW}/539324.jpg`,
  },
  {
    itemNumber: 'Martin Audio CDD-LIVE15B',
    brand: 'Martin Audio',
    description:
      'Active 2-way 15" LF / 1.4" exit HF Coaxial Differential Dispersion loudspeaker in black for demanding live sound and sanctuary installs.',
    mapPrice: 4250.0,
    imageUrl: `${FDW}/500217.jpg`,
  },
  {
    itemNumber: 'Electro-Voice ZLX-8P-G2-US',
    brand: 'Electro-Voice',
    description:
      '8" 2-way powered loudspeaker building on the ZLX legacy with higher output, extended frequency response, and QuickSmart DSP.',
    mapPrice: 499.0,
    imageUrl: `${FDW}/561618.jpg`,
  },
  {
    itemNumber: 'BASSBOSS AT212-MK3',
    brand: 'BASSBOSS',
    description:
      'High-efficiency active 2-way dual 12" loudspeaker engineered for full-range clarity, effortless headroom, and direct subwoofer stacking.',
    mapPrice: 4995.0,
    imageUrl: `${FDW}/497358.jpg`,
  },
  {
    itemNumber: 'Electro-Voice ELX200-15P',
    brand: 'Electro-Voice',
    description:
      'Live X 15" 2-way active loudspeaker with 1200W Class-D amplification, QuickSmartDSP, and up to 132 dB peak SPL.',
    mapPrice: 949.0,
    imageUrl: `${FDW}/295217.jpg`,
  },
  {
    itemNumber: 'Martin Audio CDD-LIVE12B',
    brand: 'Martin Audio',
    description:
      'Compact self-powered 12" 2-way coaxial CDD loudspeaker in black delivering 128 dB peak SPL with wide, uniform audience coverage.',
    mapPrice: 3450.0,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0871/7382/4696/files/CDD-LIVE12B_bfc3c95d-7e1b-4e33-ab00-f60c66f0502e.webp?v=1785871338',
  },
  {
    itemNumber: 'FBT X-Pro-112A',
    brand: 'FBT',
    description:
      'Bi-amplified 12" + 1" 1200W RMS processed active loudspeaker (80x50) housed in a road-ready plywood enclosure.',
    mapPrice: 860.0,
    imageUrl: `${FDW}/539315.jpg`,
  },
  {
    itemNumber: 'Electro-Voice ZLX-15P-G2-US',
    brand: 'Electro-Voice',
    description:
      '15" 2-way powered loudspeaker for live events and fixed installs featuring extended low-frequency response and Bluetooth/DSP control.',
    mapPrice: 649.0,
    imageUrl: `${FDW}/561643.jpg`,
  },
  {
    itemNumber: 'EAW RS 123',
    brand: 'EAW',
    description:
      '12" 2-way self-powered loudspeaker with Neutrik powerCON connector and touring-grade EAW wooden enclosure performance.',
    mapPrice: 1647.0,
    imageUrl: `${FDW}/372043.jpg`,
  },
  {
    itemNumber: 'Yamaha DBR10',
    brand: 'Yamaha',
    description:
      'Ultra-compact 10" 2-way active speaker delivering up to 129 dB SPL with onboard DSP and clean floor-monitor ergonomics.',
    mapPrice: 409.99,
    imageUrl: `${FDW}/207141.jpg`,
  },
  {
    itemNumber: 'Yamaha DBR12',
    brand: 'Yamaha',
    description:
      '12" 2-way active speaker with 1000W dynamic power and crisp resolution for front-of-house, floor monitoring, or stage side-fills.',
    mapPrice: 459.99,
    imageUrl: `${FDW}/207144.jpg`,
  },
  {
    itemNumber: 'JBL SRX915M',
    brand: 'JBL',
    description:
      'High-output 15" 2-way powered multi-purpose loudspeaker (90x60) built for extended bass response and generous main PA headroom.',
    mapPrice: 1899.0,
    imageUrl: `${FDW}/562741.jpg`,
  },
  {
    itemNumber: 'EAW RS 151',
    brand: 'EAW',
    description:
      '15" 2-way self-powered loudspeaker (IEC connector) delivering EAW touring-grade high-frequency clarity in a portable wooden enclosure.',
    mapPrice: 1402.0,
    imageUrl: `${FDW}/372081.jpg`,
  },
  {
    itemNumber: 'BASSBOSS SV9-MK3',
    brand: 'BASSBOSS',
    description:
      'Active 2-way single 9" loudspeaker offering rugged portability, studio-grade vocal detail, and high-output reliability.',
    mapPrice: 1595.0,
    imageUrl: `${FDW}/497352.jpg`,
  },
  {
    itemNumber: 'FBT X-Pro-110A',
    brand: 'FBT',
    description:
      'Compact high-output 10" + 1" 1200W RMS processed active plywood loudspeaker designed for portable PA and fixed installations.',
    mapPrice: 780.0,
    imageUrl: `${FDW}/538508.jpg`,
  },
  {
    itemNumber: 'FBT X-Lite-115A',
    brand: 'FBT',
    description:
      '15" + 1" 1200W RMS bi-amplified bass-reflex active loudspeaker (90x60) in a lightweight gas-injected polypropylene enclosure.',
    mapPrice: 880.0,
    imageUrl: `${FDW}/538532.jpg`,
  },
  {
    itemNumber: 'JBL EON710',
    brand: 'JBL',
    description:
      '10" 2-way powered loudspeaker delivering 125 dB max SPL, 52 Hz–20 kHz response, advanced DSP, and Bluetooth control.',
    mapPrice: 499.0,
    imageUrl: `${FDW}/436846.jpg`,
  },
  {
    itemNumber: 'DAS Audio ALTEA-DUO-20A',
    brand: 'DAS Audio',
    description:
      'Portable powered column array system with dual 10" subwoofer, 2000W peak 2-channel Class-D amp, and integrated DAScontrol DSP.',
    mapPrice: 1949.99,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/fca0c907-3821-4619-9f15-05fb2b2cf5b3.png?v=1740617445',
  },
  {
    itemNumber: 'Electro-Voice ELX200-12P',
    brand: 'Electro-Voice',
    description:
      'Live X 12" 2-way active powered loudspeaker featuring 1200W Class-D power, QuickSmartDSP, and wireless mobile app control.',
    mapPrice: 849.0,
    imageUrl: `${FDW}/295271.jpg`,
  },
  {
    itemNumber: 'Yamaha DHR15',
    brand: 'Yamaha',
    description:
      '15" 2-way 1000W powered loudspeaker with plywood enclosure and dual-angle pole sockets tailored for main FOH reinforcement.',
    mapPrice: 894.99,
    imageUrl: `${FDW}/432534.jpg`,
  },
  {
    itemNumber: 'Martin Audio CDD-LIVE12W',
    brand: 'Martin Audio',
    description:
      'White active 2-way 12" coaxial CDD speaker (128 dB peak) ideal for architectural sanctuary installs requiring clean visual integration.',
    mapPrice: 3450.0,
    imageUrl: `${FDW}/523829.jpg`,
  },
  {
    itemNumber: 'JBL EON715',
    brand: 'JBL',
    description:
      '15" 2-way powered loudspeaker delivering 128 dB max SPL, 45 Hz–20 kHz bass extension, advanced DSP, and Bluetooth streaming.',
    mapPrice: 599.0,
    imageUrl: `${FDW}/436859.jpg`,
  },
  {
    itemNumber: 'FBT X-LITE-108A',
    brand: 'FBT',
    description:
      '8" 2-way 800W bi-amped active speaker with onboard mixer and Bluetooth for compact rooms, floor wedges, or wall mounts.',
    mapPrice: 575.0,
    imageUrl: `${FDW}/581953.jpg`,
  },
  {
    itemNumber: 'FBT PromaxX-110A',
    brand: 'FBT',
    description:
      'Professional 10" + 1" 900W (700W Class-D LF + 200W Class-AB HF) active speaker with B&C compression driver.',
    mapPrice: 1330.0,
    imageUrl: `${FDW}/539772.jpg`,
  },
  {
    itemNumber: 'PreSonus AIR-XD-15',
    brand: 'PreSonus',
    description:
      '15" 2-way active extended-definition loudspeaker powered by 1500W+ Class-D amplification for full-range church and live sound.',
    mapPrice: 699.99,
    imageUrl: `${FDW}/551281.jpg`,
  },
  {
    itemNumber: 'JBL PRX912',
    brand: 'JBL',
    description:
      '12" 2-way 2000W powered portable PA loudspeaker with cutting-edge JBL acoustic waveguides and Pro Connect BLE DSP.',
    mapPrice: 999.0,
    imageUrl: `${FDW}/451085.jpg`,
  },
  {
    itemNumber: 'Mackie THUMP15V4',
    brand: 'Mackie',
    description:
      '15" professional powered loudspeaker with Bluetooth, integrated SoundCheck DSP voicing modes, and feedback eliminator.',
    mapPrice: 549.99,
    imageUrl: `${FDW}/570045.jpg`,
  },
  {
    itemNumber: 'QSC CP12',
    brand: 'QSC',
    description:
      'Lightweight 12" 2-way active compact powered loudspeaker featuring QSC preset contours and rugged portability.',
    mapPrice: 649.99,
    imageUrl: `${FDW}/331392.jpg`,
  },
  {
    itemNumber: 'DAS Audio ALTEA-712A',
    brand: 'DAS Audio',
    description:
      '12" 2-way 1500W active speaker featuring DAScontrol interface and DASlink remote wireless control and streaming.',
    mapPrice: 1049.99,
    imageUrl: `${FDW}/403362.jpg`,
  },
  {
    itemNumber: 'FBT X-LITE-110A',
    brand: 'FBT',
    description:
      'Compact 10" 1500W powered loudspeaker with onboard 3-channel mixer, DSP presets, and Bluetooth connectivity.',
    mapPrice: 625.0,
    imageUrl: `${FDW}/580482.jpg`,
  },
  {
    itemNumber: 'JBL EON712',
    brand: 'JBL',
    description:
      '12" 2-way active speaker (127 dB max SPL, 50 Hz–20 kHz) with advanced dbx DSP, automatic feedback suppression, and Bluetooth.',
    mapPrice: 549.0,
    imageUrl: `${FDW}/436852.jpg`,
    priceNote: 'Ships in 10–15 Business Days · Authorized MAP',
  },
  {
    itemNumber: 'FBT X-Lite-110',
    brand: 'FBT',
    description:
      'Compact 10" + 1" passive 2-way bass-reflex loudspeaker (90x60) engineered for fixed architectural and live amplification.',
    mapPrice: 420.0,
    imageUrl: `${FDW}/538541.jpg`,
  },
  {
    itemNumber: 'PreSonus AIR-XD-12',
    brand: 'PreSonus',
    description:
      '12" 2-way active extended-definition loudspeaker with 2.56" LF voice coil and 1.35" compression driver for live bands and events.',
    mapPrice: 599.99,
    imageUrl: `${FDW}/551272.jpg`,
  },
  {
    itemNumber: 'Electro-Voice ELX200-10P',
    brand: 'Electro-Voice',
    description:
      'Live X 10" 2-way active powered loudspeaker with 1200W Class-D amp, QuickSmartDSP, and lightweight composite cabinet.',
    mapPrice: 799.0,
    imageUrl: `${FDW}/295315.jpg`,
  },
  {
    itemNumber: 'Anchor MiniVox Lite Deluxe',
    brand: 'Anchor',
    description:
      'Portable personal PA system package with AN-MINIU2BT speaker/receiver, 1 wireless handheld mic, 1 wired handheld mic, and soft case.',
    mapPrice: 1153.95,
    imageUrl: `${FDW}/529974.jpg`,
    category: 'mics',
  },
  {
    itemNumber: 'PreSonus CDL10P',
    brand: 'PreSonus',
    description:
      '10" Constant Directivity loudspeaker combining point-source and line-array dispersion attributes for uniform sanctuary SPL.',
    mapPrice: 839.99,
    imageUrl: `${FDW}/480153.jpg`,
  },
  {
    itemNumber: 'Yamaha DZR10',
    brand: 'Yamaha',
    description:
      '10" 2000W powered loudspeaker with rotatable 90x60 constant-directivity horn and 96kHz DSP for horizontal or vertical mounting.',
    mapPrice: 1349.99,
    imageUrl: `${FDW}/329204.jpg`,
  },
  {
    itemNumber: 'Electro-Voice Dual EKX-12P Bundle 2',
    brand: 'Electro-Voice',
    description:
      'Complete PA bundle with 2x EKX-12P 12" powered speakers (1500W Class-D), 2 speaker stands, and 2 XLR mic cables.',
    mapPrice: undefined,
    imageUrl: `${FDW}/535838.jpg`,
    priceNote: 'Complete Pair + Stands Bundle · Call for Dealer Quote',
  },
  {
    itemNumber: 'DAS Audio ALTEA-715A',
    brand: 'DAS Audio',
    description:
      '15" 2-way 1500W peak active loudspeaker with DAScontrol DSP interface for extended low-frequency punch and dynamic clarity.',
    mapPrice: 1114.99,
    imageUrl: `${FDW}/403989.jpg`,
  },
  {
    itemNumber: 'Electro-Voice Dual ELX200-15P Bundle',
    brand: 'Electro-Voice',
    description:
      'Matched pair of two Electro-Voice ELX200-15P 15" 2-way active speakers delivering 1200W and 132 dB SPL per cabinet.',
    mapPrice: 1898.0,
    imageUrl: `${FDW}/535843.jpg`,
  },
  {
    itemNumber: 'JBL IRX108BT',
    brand: 'JBL',
    description:
      'Compact 8" 1000W powered portable PA speaker with Bluetooth streaming, automatic feedback suppression, and ducking.',
    mapPrice: 385.0,
    imageUrl: `${FDW}/383127.jpg`,
  },
  {
    itemNumber: 'Anchor AN1000X+',
    brand: 'Anchor',
    description:
      'Compact 4.5" 50W powered monitor speaker in black built for A/V racks, studio reference, or auxiliary room fill.',
    mapPrice: 523.95,
    imageUrl: `${FDW}/140340.jpg`,
  },
  {
    itemNumber: 'Mackie THRASH212-GO',
    brand: 'Mackie',
    description:
      '12" 300W battery-powered Bluetooth loudspeaker for outdoor church services, outreach events, and portable ceremonies.',
    mapPrice: 499.99,
    imageUrl: `${FDW}/475456.jpg`,
  },
  {
    itemNumber: 'JBL PRX935',
    brand: 'JBL',
    description:
      'Professional 3-way powered 15" PA loudspeaker with horn-loaded midrange, advanced DSP, and BLE wireless control.',
    mapPrice: 1999.0,
    imageUrl: `${FDW}/528765.jpg`,
  },
  {
    itemNumber: 'Electro-Voice EKX-12P',
    brand: 'Electro-Voice',
    description:
      '12" 2-way 1500W Class-D active wood-cabinet loudspeaker with QuickSmart DSP and precision waveguide coverage.',
    mapPrice: 949.0,
    imageUrl: `${FDW}/319698.jpg`,
  },
  {
    itemNumber: 'Anchor MEGA-DP2-HH',
    brand: 'Anchor',
    description:
      'MegaVox Deluxe Package 2 portable PA system with MEGA2-U2 main speaker, MEGA2-COMP companion speaker, stands, and 2 wireless mics.',
    mapPrice: 2676.45,
    imageUrl: `${FDW}/467214.jpg`,
    category: 'mics',
  },
  {
    itemNumber: 'EAW LA153',
    brand: 'EAW',
    description:
      '15" 2-way 1500W active loudspeaker equipped with a Neodymium HF compression driver and touring-grade acoustic voicing.',
    mapPrice: 1515.0,
    imageUrl: `${FDW}/485175.jpg`,
    priceNote: 'Ships in 9–12 Business Days · Authorized MAP',
  },
  {
    itemNumber: 'Anchor GG-DP2-HH',
    brand: 'Anchor',
    description:
      'Go Getter Deluxe Package 2 portable PA with GG2-U2 speaker, GG2 companion, 2 speaker stands, and 2 wireless mics.',
    mapPrice: 2518.95,
    imageUrl: `${FDW}/466871.jpg`,
    category: 'mics',
  },
  {
    itemNumber: 'JBL PRX918XLF',
    brand: 'JBL',
    description:
      '18" 2000W Class-D portable powered subwoofer with integrated Wi-Fi/BLE control for deep, tight worship low end.',
    mapPrice: 1499.0,
    imageUrl: `${FDW}/451106.jpg`,
  },
  {
    itemNumber: 'Yamaha DZR15',
    brand: 'Yamaha',
    description:
      '15" 2000W bi-amped powered loudspeaker rated up to 139 dB max SPL with 96kHz DSP tuning for full-range sanctuary throw.',
    mapPrice: 1564.99,
    imageUrl: `${FDW}/329261.jpg`,
  },
  {
    itemNumber: 'PreSonus AIR-XD-10',
    brand: 'PreSonus',
    description:
      'Compact 10" 2-way 1500W+ Class-D active loudspeaker delivering extended low-end response and clear vocal articulation.',
    mapPrice: 499.99,
    imageUrl: `${FDW}/551196.jpg`,
  },
  {
    itemNumber: 'Mackie THRASH15V2',
    brand: 'Mackie',
    description:
      '15" 1300W powered loudspeaker engineered for straightforward, high-headroom portable PA reinforcement.',
    mapPrice: 399.99,
    imageUrl: `${FDW}/577870.jpg`,
  },
  {
    itemNumber: 'Pioneer DJ XPRS122',
    brand: 'Pioneer DJ',
    description:
      '12" full-range 2000W Class-D active loudspeaker ideal for mobile DJs, live sound, rentals, and fixed installs.',
    mapPrice: 899.0,
    imageUrl: `${FDW}/458051.jpg`,
  },
  {
    itemNumber: 'Yorkville EF15P',
    brand: 'Yorkville',
    description:
      'Elite Series 15" / 3" compression-driver 1200W wood-cabinet active loudspeaker built in Canada for high-SPL reliability.',
    mapPrice: 1719.0,
    imageUrl: `${FDW}/291480.jpg`,
  },
  {
    itemNumber: 'Martin Audio XP12',
    brand: 'Martin Audio',
    description:
      '12" 2-way compact self-powered Black Line series loudspeaker for main PA, wedge monitoring, or XP118 sub pairing.',
    mapPrice: 1200.0,
    imageUrl: `${FDW}/436546.jpg`,
  },
  {
    itemNumber: 'HK Audio SONAR 115 Xi',
    brand: 'HK Audio',
    description:
      '15" 1200W active speaker with 3 input channels (2 mic/line + AUX), expanded bass response, and Bluetooth 5.0.',
    mapPrice: 699.99,
    imageUrl: `${FDW}/451583.jpg`,
  },
  {
    itemNumber: 'Electro-Voice EVIVA15P-US',
    brand: 'Electro-Voice',
    description:
      'Lightweight 15" 2-way 1000W powered loudspeaker built for quick setup and dependable Electro-Voice clarity.',
    mapPrice: 469.0,
    imageUrl: `${FDW}/571367.jpg`,
    priceNote: 'Ships in 10–15 Business Days · Authorized MAP',
  },
  {
    itemNumber: 'DB Technologies OPERA 15',
    brand: 'DB Technologies',
    description:
      '15" 2-way 600W RMS (1200W peak) active speaker featuring asymmetrical horn dispersion and onboard DSP.',
    mapPrice: 649.0,
    imageUrl: `${FDW}/299031.jpg`,
  },
  {
    itemNumber: 'Anchor MEGA-BP1-H',
    brand: 'Anchor',
    description:
      'MegaVox 2 high-efficiency horn PA system with MEGA2-U2, SS-550 stand, and 1 Anchor-Link wireless handheld microphone.',
    mapPrice: 1836.45,
    imageUrl: `${FDW}/467016.jpg`,
    priceNote: 'Ships in 9–12 Business Days · Authorized MAP',
    category: 'mics',
  },
  {
    itemNumber: 'DAS Audio ALTEA-412A',
    brand: 'DAS Audio',
    description:
      '12" 2-way 800W peak Class-D active portable PA in multi-angle polypropylene cabinet for FOH or floor monitor placement.',
    mapPrice: 674.99,
    imageUrl: `${FDW}/403449.jpg`,
  },
  {
    itemNumber: 'RCF ART-715A-MK5',
    brand: 'RCF',
    description: 'Active 1400W 2-Way 15" Speaker with FiRPHASE DSP processing.',
    mapPrice: 699.0,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/e53cd5be-5411-43fb-bfd0-16404a07b70a.jpg?v=1736472298',
  },
  {
    itemNumber: 'Alto Professional TX410',
    brand: 'Alto Professional',
    description:
      '350W 10" powered PA speaker (117 dB peak SPL) with Bluetooth streaming for compact presentations and stage monitors.',
    mapPrice: 169.0,
    imageUrl: `${FDW}/531052.jpg`,
  },
  {
    itemNumber: 'HK Audio SONAR 112 Xi',
    brand: 'HK Audio',
    description:
      '12" 1200W active speaker with 3 input channels, 3-band channel EQ, and Bluetooth 5.0 streaming.',
    mapPrice: 619.99,
    imageUrl: `${FDW}/451573.jpg`,
  },
  {
    itemNumber: 'HK Audio SONAR 110 Xi',
    brand: 'HK Audio',
    description: '800W 10" Powered Speaker with 3-channel mixer and Bluetooth 5.0.',
    mapPrice: 569.99,
    imageUrl: 'https://thumbs.static-thomann.de/thumb/orig/pics/prod/504917.jpg',
  },
  {
    itemNumber: 'DAS Audio ALTEA-DUO-10A',
    brand: 'DAS Audio',
    description: 'Powered Column Array w/ Single 10" Sub and integrated DSP.',
    mapPrice: 1249.99,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0871/7382/4696/files/139835_DAS-Audio-ALTEA-DUO-10A-Powered-Portable-PA-Column-Array_1.jpg?v=1768876207',
  },
  {
    itemNumber: 'Mackie DRM212',
    brand: 'Mackie',
    description: '12" 2-Way Active Speaker, 1600W Advanced Impulse DSP.',
    mapPrice: 1099.99,
    imageUrl: 'https://cdn.shopify.com/s/files/1/1768/9095/files/01105212-wl.jpg?v=1785502779',
  },
  {
    itemNumber: 'Yamaha DZR15-D',
    brand: 'Yamaha',
    description: '15" Powered Speaker w/ Dante Networking, 2000W.',
    mapPrice: 1779.99,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/eb6a15b0-d99a-4909-8017-30334d97189f_6330427a-f07a-472e-a89a-c08e10a78908.jpg?v=1738104043',
  },
  {
    itemNumber: 'JBL IRX112BT',
    brand: 'JBL',
    description: '12" Active Portable Speaker w/ Bluetooth and feedback suppression.',
    mapPrice: 485.0,
    imageUrl: 'https://adn.harmanpro.com/productattachment/9369/product_attachment/x_large-bc3f3267c2ff2a66f975f25008bfcf43.webp',
  },
  {
    itemNumber: 'Yamaha DZR10-D',
    brand: 'Yamaha',
    description: '10" Powered Speaker w/ Dante Networking, 2000W.',
    mapPrice: 1549.99,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/da25ab43-6b34-4212-b4da-a20d5660ec00.jpg?v=1738104062',
  },
  {
    itemNumber: 'Mackie SRM212 V-Class',
    brand: 'Mackie',
    description: '12" 2000W Powered Loudspeaker with Sym-X horn.',
    mapPrice: 899.99,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0871/7382/4696/files/50477_Mackie-SRM212-V-Class-2000W-12-Inch-Powered-Speaker.jpg?v=1768239318',
  },
  {
    itemNumber: 'Alto Professional TS408',
    brand: 'Alto Professional',
    description: '8" 2000W 2-Way Powered Speaker with Bluetooth.',
    mapPrice: 299.0,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/16d7392d-fc58-425e-a312-5167c7223c15.png?v=1738028234',
  },
  {
    itemNumber: 'Yamaha DZR12',
    brand: 'Yamaha',
    description: '12" Powered Speaker w/ DSP, 2000W, 96kHz processing.',
    mapPrice: 1454.99,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0871/7382/4696/files/34548_Yamaha-DZR12-12-Inch-Powered-Speaker_ALT1sqr.jpg?v=1776463195',
  },
  {
    itemNumber: 'Alto Professional TS412',
    brand: 'Alto Professional',
    description: '12" 2000W 2-Way Powered Speaker with 3-channel mixer.',
    mapPrice: 399.0,
    imageUrl: 'https://www.altoprofessional.com/images/products/TS412-Angle-Right-WEB.jpg',
  },
  {
    itemNumber: 'Pioneer DJ XPRS102',
    brand: 'Pioneer DJ',
    description: '10" Active 2000W Class-D Speaker.',
    mapPrice: 799.0,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0871/7382/4696/files/137482_Pioneer-XPRS102-10-Inch-Powered-Speaker.jpg?v=1768874523',
  },
  {
    itemNumber: 'Peavey PVXP15-BLUETOOTH',
    brand: 'Peavey',
    description: '15" Powered Loudspeaker w/ Bluetooth.',
    mapPrice: 699.99,
    imageUrl: 'https://peavey.com/cdn/shop/files/4d5219ab-03620490-1.png?v=1779918028',
  },
  {
    itemNumber: 'Mackie THRASH12V2',
    brand: 'Mackie',
    description: '12" 1300W Powered Loudspeaker.',
    mapPrice: 349.99,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/f19a04f6-c943-4634-a931-848d012ba70f.jpg?v=1789588456',
  },
  {
    itemNumber: 'RCF ART 910A',
    brand: 'RCF',
    description: '10" 2-Way Powered Speaker, 2100W.',
    mapPrice: 799.0,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/82e7c30f-d869-4795-be35-37ac95db9722.png?v=1744857602',
  },
  {
    itemNumber: 'DB Technologies OPERA 12',
    brand: 'DB Technologies',
    description: '12" 2-Way Active Speaker, 600W, DSP.',
    mapPrice: 599.0,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0871/7382/4696/files/43990_dBTechnologies-Opera-12-12-Inch-Powered-Speaker.jpg?v=1768002075',
  },
  {
    itemNumber: 'Mackie SRT212',
    brand: 'Mackie',
    description: '12" 1600W Powered Loudspeaker with SRT Mix Control.',
    mapPrice: 649.99,
    imageUrl: 'https://cdn.shopify.com/s/files/1/1768/9095/files/01105208-wl.jpg?v=1785502751',
  },
  {
    itemNumber: 'Martin Audio XP15',
    brand: 'Martin Audio',
    description: '15" 2-Way Compact Self-Powered Speaker.',
    mapPrice: 1400.0,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0871/7382/4696/files/XP15_78674f58-07fc-4a41-a5df-0cef08bd1a80.webp?v=1785870554',
  },
  {
    itemNumber: 'Alto Professional TS410',
    brand: 'Alto Professional',
    description: '10" 2000W 2-Way Powered Speaker with Bluetooth.',
    mapPrice: 349.0,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0614/8122/2322/files/1664408723_1728922.jpg?v=1684162281',
  },
  {
    itemNumber: 'Samson Expedition Explor',
    brand: 'Samson',
    description: '8" Stereo 3-Way Portable PA, 200W.',
    mapPrice: 599.99,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0331/4689/6519/files/Samson-Expedition-EXPOLR-Portable-PA-System-200w-8_-w-Bluetooth-_-Recharegable-Battery.jpg?v=1694580204',
  },
  {
    itemNumber: 'Mackie SRM350v3',
    brand: 'Mackie',
    description: '10" Portable Powered Loudspeaker, 1000W.',
    mapPrice: 499.99,
    imageUrl: 'https://cdn.shopify.com/s/files/1/1768/9095/files/01170662-wl.jpg?v=1785502900',
  },
  {
    itemNumber: 'Yamaha DHR10',
    brand: 'Yamaha',
    description: '10" Powered Speaker, 700W.',
    mapPrice: 684.99,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0871/7382/4696/files/122971_Yamaha-DHR10-10-Inch-Powered-Speaker_2.jpg?v=1768868664',
  },
  {
    itemNumber: 'Samson Auro D208',
    brand: 'Samson',
    description: '8" Active 2-Way Speaker, 200W.',
    mapPrice: 229.99,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0871/7382/4696/files/AURO_20D208_09a94e81-393d-4035-9f3a-6468ad8d3359.webp?v=1785870288',
  },
  {
    itemNumber: 'Alto Professional TX415',
    brand: 'Alto Professional',
    description: '700W 15" Powered Speaker w/ Bluetooth.',
    mapPrice: 299.0,
    imageUrl: 'https://www.altoprofessional.com/images/products/ALTO-TX_SERIES-TX415-FRONT_copy.jpg',
  },
  {
    itemNumber: 'Alto Professional TX412',
    brand: 'Alto Professional',
    description: '700W 12" Powered Speaker w/ Bluetooth.',
    mapPrice: 279.0,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/f9e0ba21-657b-4b57-b116-5370c056ecd4.png?v=1777506376',
  },
  {
    itemNumber: 'JBL EON710 [Restock]',
    brand: 'JBL',
    description: '10" 2-Way Active Speaker w/ Bluetooth (Factory Restock).',
    mapPrice: 519.0,
    imageUrl: `${FDW}/436846.jpg`,
  },
];

function slugifyId(itemNumber: string): string {
  return (
    'map-' +
    itemNumber
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  );
}

function formatUsdLabel(amount: number): string {
  return `$${amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export const DEALER_MAP_PRODUCTS: GearProduct[] = RAW_MAP_ROWS.map((row) => {
  const explicit = row.category;
  const resolvedCategory: GearProduct['category'] = explicit
    ? explicit
    : /wireless.*mic/i.test(row.description)
      ? 'mics'
      : 'speakers';
  const hasMap = typeof row.mapPrice === 'number' && row.mapPrice > 0;
  const specMap: Record<GearProduct['category'], string> = {
    consoles: 'Mixing Console',
    lighting: 'Moving Lights & DMX Wash',
    rigging: 'Truss, Beam & Ceiling Rigging',
    cables: 'Stageboxes, XLR & Racks',
    mics: 'Wireless & Wired Mics',
    iem: 'In-Ear Monitoring',
    combiners: 'RF Antennas & Combiners',
    speakers: 'Pro Sound Reinforcement',
  };
  const specLabel = specMap[resolvedCategory];

  return {
    id: slugifyId(row.itemNumber),
    itemNumber: row.itemNumber,
    name: row.itemNumber,
    brand: row.brand,
    category: resolvedCategory,
    ...(hasMap ? { mapPrice: row.mapPrice } : {}),
    priceLabel: hasMap ? `${formatUsdLabel(row.mapPrice!)} MAP` : 'Best Price Quote',
    priceNote: row.priceNote || (hasMap ? 'In Stock · Authorized Dealer MAP' : 'Call for Dealer Quote'),
    descriptionEn: row.description,
    descriptionEs: row.description,
    specs: [
      row.brand,
      specLabel,
      hasMap ? 'Manufacturer MAP' : 'Complete Bundle Quote',
    ],
    imageUrl: row.imageUrl || `${FDW}/322207.jpg`,
    inStock: true,
  };
});
