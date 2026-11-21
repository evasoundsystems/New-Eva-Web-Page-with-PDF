import type { SiteContent } from '../types/site';
import { DEALER_MAP_PRODUCTS } from './dealerMapCatalog';

export const DEFAULT_SITE_CONTENT: SiteContent = {
  brand: {
    name: 'E.V.A Worship Engineer',
    companyFull: 'Elevation Voice Audio',
    leadEngineer: 'Luis Martinez',
    phoneDisplay: '(414) 554-4388',
    phoneHref: 'tel:+14145544388',
    email: 'eva.sound.systems@gmail.com',
    location: 'Milwaukee & Midwest Region',
    scriptureEn: 'Let everything that has breath praise the Lord.',
    scriptureEs: 'Todo lo que respira alabe al Señor.',
    scriptureRef: 'Psalm 150:6',
  },
  hero: {
    headlineEn: 'Pro Audio, Lighting & Rigging Sales + Sanctuary Engineering',
    headlineEs: 'Venta de Equipos Pro Audio, Luces y Montaje + Ingeniería AV',
    subheadlineEn:
      'We sell speakers, mixers, wireless mics, stage lighting, and rigging mounts — call (414) 554-4388 to beat Sweetwater and any internet price, backed by turnkey installs and $50/week sanctuary care.',
    subheadlineEs:
      'Vendemos parlantes, mezcladoras, micrófonos inalámbricos, luces y montaje — llame al (414) 554-4388 para mejorar el precio de Sweetwater y cualquier tienda en línea, con instalación y soporte semanal de $50.',
    primaryCtaEn: 'Call (414) 554-4388 · Beat Online Prices',
    primaryCtaEs: 'Llamar (414) 554-4388 · Mejorar Precio',
    imageUrl: 'asset:hero',
  },
  sectionOrder: ['gear', 'services', 'pricing', 'training', 'diagnostic', 'testimonials'],
  hiddenSections: [],
  services: [
    {
      id: 'svc-live-sound',
      titleEn: '01. Live Sound & Corporate Mixing',
      titleEs: '01. Mezcla de Sonido en Vivo y Eventos',
      descriptionEn:
        'Front-of-house and monitor engineering for Sunday worship, conferences, weddings, and private or corporate keynotes with zero feedback.',
      descriptionEs:
        'Ingeniería FOH y de monitores para cultos, conferencias, bodas y eventos privados o corporativos sin retroalimentación.',
      deliverableEn: 'Full FOH + Stage RF Management',
      deliverableEs: 'Control FOH + Radiofrecuencia',
      imageUrl: 'asset:hero',
      featured: true,
    },
    {
      id: 'svc-installs',
      titleEn: '02. Speaker, Line Array & Monitor Installs',
      titleEs: '02. Instalación de Parlantes, Line Array y Monitores',
      descriptionEn:
        'Custom sanctuary acoustic mapping, time-aligned subwoofers, clean rack wiring, and calibrated stage monitoring systems.',
      descriptionEs:
        'Mapeo acústico del santuario, subwoofers alineados en tiempo, racks ordenados y monitores calibrados.',
      deliverableEn: 'RTA Tuned + Turnkey Commissioning',
      deliverableEs: 'Calibración RTA + Entrega Lista',
      imageUrl: 'asset:console',
    },
    {
      id: 'svc-recall-safe',
      titleEn: '03. Recall-Safe Soundboard Architecture',
      titleEs: '03. Consolas Digitales con Escenas Protegidas',
      descriptionEn:
        'Bulletproof digital mixer scene locking and user permissions on Behringer X32, WING, Midas M32, and Allen & Heath SQ so Sunday presets stay intact.',
      descriptionEs:
        'Bloqueo seguro de escenas y permisos en Behringer X32, WING, Midas M32 y Allen & Heath SQ para proteger su mezcla dominical.',
      deliverableEn: 'Scene Backups + Volunteer Locks',
      deliverableEs: 'Respaldo de Escenas + Permisos',
      imageUrl: 'asset:iem',
    },
    {
      id: 'svc-events',
      titleEn: '04. Private, Retreats & Lighting Production',
      titleEs: '04. Eventos Privados, Retiros e Iluminación',
      descriptionEn:
        'Portable high-intelligibility audio, wireless mics, DMX LED stage washes, and clean water-based haze for retreats and special gatherings.',
      descriptionEs:
        'Audio portátil de alta claridad, micrófonos inalámbricos, luces LED DMX y neblina a base de agua para retiros y eventos.',
      deliverableEn: 'Audio + DMX Lighting + Water Haze',
      deliverableEs: 'Audio + Iluminación DMX + Neblina',
      imageUrl: 'asset:lighting',
    },
  ],
  pricing: {
    planNameEn: 'Priority Worship & Venue Care Plan',
    planNameEs: 'Plan Prioritario de Cuidado Técnico',
    weeklyRate: 50,
    monthlyEquivalent: 200,
    standaloneHourlyRate: 120,
    standaloneMinHours: 4,
    reEqIntervalMonths: 3,
    freeFollowUpEqPerYear: 1,
    inclusionsEn: [
      'Priority on-call maintenance & emergency tech support before services and events',
      'One (1) full re-EQing of your mixer or soundboard every 3 months',
      'One (1) free follow-up EQ within the year if needed outside the 3-month interval',
      'Recurring on-site diagnostic checkups for optimal audio, RF wireless & speaker health',
      'Digital console scene backups & remote troubleshooting guidance',
    ],
    inclusionsEs: [
      'Soporte técnico de emergencia y mantenimiento prioritario antes de sus cultos y eventos',
      'Una (1) re-ecualización completa de su mezcladora o consola cada 3 meses',
      'Una (1) ecualización de seguimiento gratis al año si la necesita fuera del intervalo de 3 meses',
      'Inspecciones diagnósticas periódicas en el sitio para rendimiento óptimo de audio y RF',
      'Respaldos de escenas digitales y asistencia remota inmediata',
    ],
    standaloneNotesEn: [
      'Billed at $120/hour with a strict 4-hour minimum ($480 minimum per service visit)',
      'Any re-EQing requested outside the care agreement is billed at $120/hr (4-hr minimum)',
      'Standard scheduling queue without weekend emergency standby',
    ],
    standaloneNotesEs: [
      'Tarifa regular de $120/hora con un mínimo de 4 horas ($480 mínimo por visita)',
      'Toda re-ecualización fuera del plan se factura a $120/hora (mínimo 4 horas)',
      'Agenda estándar sin guardia prioritaria de emergencia en fin de semana',
    ],
    valueProps: [
      {
        id: 'vp-panic',
        titleEn: 'Zero Sunday Morning Panic',
        titleEs: 'Cero Pánico el Domingo por la Mañana',
        bodyEn:
          'Prevent mic dropouts, feedback squeals, and routing mistakes before the congregation arrives with direct engineer standby.',
        bodyEs:
          'Evite cortes de micrófono, pitidos de feedback y fallas antes de que llegue la congregación.',
      },
      {
        id: 'vp-drift',
        titleEn: 'Quarterly Acoustic Drift Correction',
        titleEs: 'Corrección Acústica Trimestral',
        bodyEn:
          'Room acoustics shift with seasons, HVAC, and vocalist turnover. Scheduled 3-month re-EQs keep speech crisp and warm.',
        bodyEs:
          'La acústica cambia con el clima y los cantantes. La re-ecualización cada 3 meses mantiene las voces claras.',
      },
      {
        id: 'vp-hardware',
        titleEn: 'Protect Expensive Speakers & Drivers',
        titleEs: 'Proteja sus Parlantes y Drivers',
        bodyEn:
          'Routine gain-staging checkups prevent blown compression drivers and amplifier clipping that cost $1,500+ to replace.',
        bodyEs:
          'Las revisiones periódicas evitan dañar drivers y amplificadores cuya reparación supera los $1,500.',
      },
      {
        id: 'vp-budget',
        titleEn: 'Predictable Church Stewardship',
        titleEs: 'Presupuesto Predecible para su Iglesia',
        bodyEn:
          'Four standalone re-EQ visits at $480 each cost $1,920 before a single emergency call. $50/week covers your year calmly.',
        bodyEs:
          'Cuatro calibraciones sueltas de $480 cuestan $1,920 sin contar emergencias. Con $50/semana protege todo el año.',
      },
    ],
  },
  products: [
    ...DEALER_MAP_PRODUCTS,
    {
      id: 'gear-shure-psm',
      itemNumber: 'Shure PSM 900 / 1000',
      name: 'Shure PSM 900 / 1000 Wireless IEM',
      brand: 'Shure',
      category: 'iem',
      priceLabel: 'Best Price Quote',
      priceNote: 'Full RF coordination included',
      descriptionEn:
        'Pro-grade stereo wireless in-ear monitor transmitters and metal bodypacks so worship musicians hear every cue cleanly with zero wedge bleed.',
      descriptionEs:
        'Sistemas inalámbricos estéreo In-Ear profesionales para que sus músicos escuchen con claridad sin ruido excesivo en la tarima.',
      specs: ['Stereo / MixMode', 'Metal Bodypacks', 'Precision RF Tuning'],
      imageUrl: 'https://chucklevins.com/cdn/shop/files/14c74c36-3099-4510-846f-570e5efb4031.png?v=1744082867',
      inStock: true,
    },
    {
      id: 'gear-sennheiser-iem',
      itemNumber: 'Sennheiser EW IEM G4',
      name: 'Sennheiser EW IEM G4 Twin System',
      brand: 'Sennheiser',
      category: 'iem',
      mapPrice: 1299.0,
      priceLabel: '$1,299.00 MAP',
      priceNote: 'Includes rack kit & IE 4 earphones',
      descriptionEn:
        'Half-rack stereo wireless in-ear monitoring transmitter with rugged metal bodypacks and high-clarity UHF transmission for worship bands.',
      descriptionEs:
        'Sistema inalámbrico estéreo In-Ear Sennheiser G4 con transmisor de medio rack y receptores metálicos para bandas de alabanza.',
      specs: ['Focus & Stereo Modes', '42 MHz Tuning', 'Rack Kit Included'],
      imageUrl: 'https://cdn.shopify.com/s/files/1/1768/9095/files/509609-U.jpg?v=1784983008',
      inStock: true,
    },
    {
      id: 'gear-p16m',
      itemNumber: 'Behringer Powerplay P16-M',
      name: 'Behringer Powerplay P16-M Personal Mixer',
      brand: 'Behringer',
      category: 'iem',
      mapPrice: 299.0,
      priceLabel: '$299.00 MAP',
      priceNote: 'Cat5e/6 stage kit available',
      descriptionEn:
        '16-channel personal digital monitor mixer letting every singer and musician dial their own monitor balance on stage.',
      descriptionEs:
        'Mezclador personal digital de 16 canales para que cada músico ajuste su propia mezcla sin interrumpir al sonidista.',
      specs: ['16-Ch Personal Mix', 'Cat5 Ultranet', 'Zero Latency'],
      imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/e98a2d57-9daa-41b8-9b7c-a378a21bd9b8.png?v=1738961030',
      inStock: true,
    },
    {
      id: 'gear-pa421b',
      itemNumber: 'Shure PA421B Combiner',
      name: 'Shure PA421B Active IEM Combiner',
      brand: 'Shure',
      category: 'combiners',
      priceLabel: 'Best Price Quote',
      priceNote: 'Eliminates rack RF interference',
      descriptionEn:
        'Combines up to 4 wireless in-ear transmitters into one clean directional paddle antenna, preventing intermodulation and dropout zones.',
      descriptionEs:
        'Combina hasta 4 transmisores In-Ear en una sola antena direccional, eliminando interferencias y cortes de señal en el escenario.',
      specs: ['4-to-1 Active Combine', 'Wideband UHF', 'Rackmount + Power'],
      imageUrl: 'https://cdn.shopify.com/s/files/1/0614/8122/2322/files/PA421B.jpg?v=1758213579',
      inStock: true,
    },
    {
      id: 'gear-ua844',
      itemNumber: 'Shure UA844+SWB',
      name: 'Shure UA844+SWB Antenna Distribution',
      brand: 'Shure',
      category: 'combiners',
      mapPrice: 679.0,
      priceLabel: '$679.00 MAP',
      priceNote: 'Pair with Diversity Fin antennas',
      descriptionEn:
        'Active UHF antenna distribution system splitting a single high-gain antenna pair cleanly across up to 5 wireless mic receivers.',
      descriptionEs:
        'Sistema activo de distribución de antenas que alimenta hasta 5 receptores de micrófonos inalámbricos con máxima estabilidad.',
      specs: ['5-Way RF Split', 'Cascade Ready', 'Low-Noise Amplification'],
      imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/a653f23c-53fb-4747-b765-2f1b8d430c4d.png?v=1739531648',
      inStock: true,
    },
    {
      id: 'gear-water-haze',
      itemNumber: 'Chauvet Pro Haze',
      name: 'Chauvet Hurricane Haze 1DX Sanctuary Hazer',
      brand: 'Chauvet',
      category: 'lighting',
      priceLabel: 'Best Price Quote',
      priceNote: '100% water-based · Low residue',
      descriptionEn:
        'Whisper-quiet continuous water-based haze generator engineered for worship spaces to reveal lighting beams sharply without irritating vocalists.',
      descriptionEs:
        'Máquina de neblina silenciosa 100% a base de agua, ideal para santuarios: resalta los haces de luz sin molestar la garganta de los cantantes.',
      specs: ['DMX512 Control', 'Ultra-Fine Dry Haze', 'Water-Based Fluid'],
      imageUrl: 'https://cdn.shopify.com/s/files/1/1768/9095/files/01843935_1z.jpg?v=1788137183',
      inStock: true,
    },
    {
      id: 'gear-low-fog',
      itemNumber: 'Chauvet Low-Lying Fog',
      name: 'Chauvet Nimbus Dry Ice & Low-Lying Cloud Machine',
      brand: 'Chauvet',
      category: 'lighting',
      priceLabel: 'Best Price Quote',
      priceNote: 'Floor-hugging cloud effect',
      descriptionEn:
        'Produces thick floor-hugging cloud effects for Easter, Christmas productions, worship conferences, and weddings.',
      descriptionEs:
        'Genera nubes densas pegadas al piso para eventos de Semana Santa, Navidad, conferencias de alabanza y bodas.',
      specs: ['Floor-Hugging Cloud', 'Dual Heater Control', 'Touring & Stage Ready'],
      imageUrl: 'https://cdn.shopify.com/s/files/1/0268/0972/9087/files/cd402af0-1a2c-4e46-886d-02e83487bb3c.png?v=1739364817',
      inStock: true,
    },
    {
      id: 'gear-dmx-lights',
      itemNumber: 'Chauvet High-CRI LED',
      name: 'Chauvet SlimPAR Pro H USB High-CRI LED Wash',
      brand: 'Chauvet',
      category: 'lighting',
      priceLabel: 'Best Price Quote',
      priceNote: 'Flicker-free for 4K livestreams',
      descriptionEn:
        'High-CRI warm amber/white and RGBAW+UV LED stage wash fixture engineered for clean camera skin tones on church livestreams.',
      descriptionEs:
        'Iluminación LED DMX libre de parpadeo para transmisiones en 4K, con blanco cálido de alto CRI para rostros naturales y colores vibrantes.',
      specs: ['Flicker-Free Camera', 'RGBAW+UV Mixing', 'Silent Convection'],
      imageUrl: 'https://www.chauvetdj.com/wp-content/uploads/2016/01/slimpar-pro-h-usb-cat-BW.jpg',
      inStock: true,
    },
  ],
  testimonials: [
    {
      id: 'test-1',
      name: 'Pastor Carlos Méndez',
      roleEn: 'Lead Pastor',
      roleEs: 'Pastor Principal',
      organization: 'Iglesia Comunidad de Fe · Milwaukee, WI',
      category: 'church',
      outcomeMetric: 'Zero Feedback in 14 Months',
      gearContext: 'Behringer X32 · $50/wk Care Plan',
      quoteEn:
        'For over a year our pulpit mic squealed every Sunday morning. Luis re-EQed our sanctuary, trained our Spanish and English volunteers, and put us on the $50/week plan. Our congregation hears every word clearly now.',
      quoteEs:
        'Por más de un año el micrófono del púlpito pitaba cada domingo. Luis re-ecualizó el santuario, entrenó a nuestros voluntarios en español e inglés y nos puso en el plan de $50/semana. Ahora se escucha cristalino.',
    },
    {
      id: 'test-2',
      name: 'Marcus Vance',
      roleEn: 'Worship & Creative Arts Director',
      roleEs: 'Director de Alabanza y Artes',
      organization: 'Hope City Church · Wauwatosa, WI',
      category: 'church',
      outcomeMetric: 'Recall-Safe Sunday Presets',
      gearContext: 'Midas M32 LIVE · Shure PSM 900',
      quoteEn:
        'Before Luis rebuilt our digital scenes, youth nights and guest bands kept erasing our Sunday mix. Now everything is locked, our in-ear monitors are rock solid, and we saved over $1,100 buying our IEM combiners through E.V.A.',
      quoteEs:
        'Antes de que Luis reconstruyera nuestras escenas digitales, los eventos de jóvenes borraban la mezcla del domingo. Ahora todo está protegido y ahorramos más de $1,100 comprando nuestros combinadores IEM con E.V.A.',
    },
    {
      id: 'test-3',
      name: 'Elena Rodríguez-Cruz',
      roleEn: 'Director of Corporate Events',
      roleEs: 'Directora de Eventos Corporativos',
      organization: 'Great Lakes Executive Summit',
      category: 'corporate',
      outcomeMetric: '600 Attendees · 14 Mics · 0 Dropouts',
      gearContext: 'Allen & Heath SQ-6 · Shure QLX-D',
      quoteEn:
        'Luis ran live audio for our two-day leadership summit with 14 simultaneous wireless channels, panel Q&As, and broadcast feeds. Not a single RF glitch or late cue across 16 hours of programming.',
      quoteEs:
        'Luis operó el sonido en vivo de nuestra cumbre ejecutiva de dos días con 14 canales inalámbricos y transmisión simultánea. Cero cortes de señal durante 16 horas de programa.',
    },
    {
      id: 'test-4',
      name: 'Pastor Rubén Saldaña',
      roleEn: 'Senior Pastor',
      roleEs: 'Pastor General',
      organization: 'Centro Cristiano Emmanuel · Kenosha, WI',
      category: 'church',
      outcomeMetric: '35-Min Sunday Emergency Fix',
      gearContext: 'Behringer WING · S32 Stage Box',
      quoteEn:
        'Our digital snake lost sync at 8:10 AM on Sunday. Because we are on the $50/week Care Plan, Luis answered immediately, walked our tech through recovery, and arrived on-site before second service.',
      quoteEs:
        'Nuestra caja digital perdió señal a las 8:10 AM del domingo. Gracias al plan de $50/semana, Luis contestó al instante, nos guió por teléfono y estuvo en el sitio antes del segundo culto.',
    },
    {
      id: 'test-5',
      name: 'David & Sarah Lindquist',
      roleEn: 'Retreat Coordinators',
      roleEs: 'Coordinadores de Retiro',
      organization: 'Covenant Marriage Ministries',
      category: 'ministry',
      outcomeMetric: '80-Couple Weekend Retreat',
      gearContext: 'Portable PA + DMX Wash + Low Fog',
      quoteEn:
        'E.V.A handled both our main session sound and intimate acoustic worship lighting. Warm, clear speech throughout the hall without ever feeling harsh or overly loud.',
      quoteEs:
        'E.V.A se encargó del audio principal y la iluminación íntima de nuestro retiro de matrimonios. Sonido cálido, claro y nunca estridente.',
    },
  ],
};
