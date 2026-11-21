import heroConsoleImg from './images/hero_sanctuary_console_1795132513875.jpg';
import gearConsoleImg from './images/gear_digital_console_1795132513746.jpg';
import gearIemImg from './images/gear_iem_wireless_1795132513480.jpg';
import gearLightingImg from './images/gear_lighting_haze_1795132514350.jpg';
import serviceTrainingImg from './images/service_sound_training_1795132514105.jpg';
import shureWirelessImg from './images/gear_shure_wireless_mic_1795136193237.jpg';
import sennheiserWirelessImg from './images/gear_sennheiser_wireless_mic_1795136193599.jpg';
import behringerWingImg from './images/gear_behringer_wing_mixer_1795136193108.jpg';
import compactMixerImg from './images/gear_compact_behringer_mixer_1795136193960.jpg';
import rcfDigitalMixerImg from './images/gear_rcf_digital_mixer_1795136193558.jpg';

export const BUNDLED_ASSETS: Record<string, { label: string; src: string }> = {
  'asset:hero': {
    label: 'Sanctuary FOH Console (Wide)',
    src: heroConsoleImg,
  },
  'asset:console': {
    label: 'Digital Mixing Console',
    src: gearConsoleImg,
  },
  'asset:iem': {
    label: 'Wireless IEM & RF Combiner',
    src: gearIemImg,
  },
  'asset:lighting': {
    label: 'Stage Lighting & Atmospheric Haze',
    src: gearLightingImg,
  },
  'asset:training': {
    label: 'Sound Engineer & Volunteer Coaching',
    src: serviceTrainingImg,
  },
  'asset:shure-mic': {
    label: 'Shure Pro Wireless Mic System (Studio)',
    src: shureWirelessImg,
  },
  'asset:sennheiser-mic': {
    label: 'Sennheiser Pro Wireless Mic System (Studio)',
    src: sennheiserWirelessImg,
  },
  'asset:wing-mixer': {
    label: 'Behringer WING / Pro Digital Console (Studio)',
    src: behringerWingImg,
  },
  'asset:compact-mixer': {
    label: 'Compact Analog / USB Mixer (Studio)',
    src: compactMixerImg,
  },
  'asset:rcf-mixer': {
    label: 'RCF / Compact Digital Touchscreen Mixer (Studio)',
    src: rcfDigitalMixerImg,
  },
};

const STUDIO_ASSET_KEYS = new Set([
  'asset:shure-mic',
  'asset:sennheiser-mic',
  'asset:wing-mixer',
  'asset:compact-mixer',
  'asset:rcf-mixer',
]);

export function isStudioProductImage(imageUrl: string | undefined): boolean {
  if (!imageUrl) return false;
  return imageUrl.startsWith('http') || STUDIO_ASSET_KEYS.has(imageUrl);
}

export function resolveImageUrl(value: string | undefined): string {
  if (!value) {
    return heroConsoleImg;
  }
  const bundled = BUNDLED_ASSETS[value];
  if (bundled) {
    return bundled.src;
  }
  if (
    value.startsWith('https://cdn.shopify.com/') &&
    !value.includes('width=')
  ) {
    return value.includes('?') ? `${value}&width=600` : `${value}?width=600`;
  }
  return value;
}
