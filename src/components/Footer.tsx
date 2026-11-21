import { Lock, Mail, Pencil, Phone } from 'lucide-react';
import type { BrandConfig, Language, PageCopyConfig, SectionId } from '../types/site';
import { mergePageCopy } from '../utils/siteLogic';
import { EvaLogo } from './EvaLogo';

interface FooterProps {
  brand: BrandConfig;
  pageCopy?: PageCopyConfig;
  lang: Language;
  onOpenQuote: (preselectedService?: string) => void;
  onOpenPortal: () => void;
  isAdmin: boolean;
  adminEditMode?: boolean;
  onEditSectionCopy?: () => void;
  hiddenSections: SectionId[];
}

export function Footer({
  brand,
  pageCopy: rawPageCopy,
  lang,
  onOpenQuote,
  onOpenPortal,
  isAdmin,
  adminEditMode = false,
  onEditSectionCopy,
  hiddenSections,
}: FooterProps) {
  const copy = mergePageCopy(rawPageCopy);
  const allLinks: Array<{ id: SectionId; href: string; labelEn: string; labelEs: string }> = [
    { id: 'gear', href: '#gear', labelEn: copy.navGearEn, labelEs: copy.navGearEs },
    { id: 'services', href: '#services', labelEn: copy.navServicesEn, labelEs: copy.navServicesEs },
    { id: 'pricing', href: '#pricing', labelEn: copy.navPricingEn, labelEs: copy.navPricingEs },
    { id: 'training', href: '#training', labelEn: copy.navTrainingEn, labelEs: copy.navTrainingEs },
    { id: 'testimonials', href: '#testimonials', labelEn: copy.navReviewsEn, labelEs: copy.navReviewsEs },
  ];
  const links = allLinks.filter((l) => !hiddenSections.includes(l.id));

  return (
    <footer className="bg-[#0F1115] text-stone-300 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-10 border-b border-stone-800">
          <div className="space-y-3">
            <EvaLogo size="md" theme="dark" showText />
            <p className="text-sm text-stone-400">
              {brand.companyFull} · {brand.leadEngineer}
            </p>
            <p className="text-xs italic text-stone-400">
              “{lang === 'en' ? brand.scriptureEn : brand.scriptureEs}” — {brand.scriptureRef}
            </p>
          </div>

          <div className="space-y-2.5 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-3">
              {lang === 'en' ? copy.footerContactTitleEn : copy.footerContactTitleEs}
            </p>
            <div>
              <a
                href={brand.phoneHref}
                className="inline-flex items-center gap-2 text-stone-200 hover:text-white font-mono tabular-nums"
              >
                <Phone className="w-4 h-4 text-[#E0A446]" aria-hidden="true" />
                <span>{brand.phoneDisplay}</span>
              </a>
            </div>
            <div>
              <a
                href={`mailto:${brand.email}`}
                className="inline-flex items-center gap-2 text-stone-200 hover:text-white break-all"
              >
                <Mail className="w-4 h-4 text-[#E0A446] shrink-0" aria-hidden="true" />
                <span>{brand.email}</span>
              </a>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => onOpenQuote()}
                className="text-xs font-semibold text-[#E0A446] hover:text-white transition-colors cursor-pointer"
              >
                {lang === 'en' ? copy.footerQuoteLinkEn : copy.footerQuoteLinkEs}
              </button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                {lang === 'en' ? copy.footerLinksTitleEn : copy.footerLinksTitleEs}
              </p>
              {isAdmin && adminEditMode && onEditSectionCopy && (
                <button
                  type="button"
                  onClick={onEditSectionCopy}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-200 text-[11px] font-semibold cursor-pointer"
                >
                  <Pencil className="w-3 h-3" aria-hidden="true" />
                  <span>{lang === 'en' ? 'Edit Footer Text' : 'Editar Pie'}</span>
                </button>
              )}
            </div>
            <ul className="space-y-2 text-sm">
              {links.map((l) => (
                <li key={l.id}>
                  <a href={l.href} className="hover:text-white transition-colors">
                    {lang === 'en' ? l.labelEn : l.labelEs}
                  </a>
                </li>
              ))}
              <li className="pt-2">
                <button
                  type="button"
                  onClick={onOpenPortal}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-200 hover:text-[#E0A446] transition-colors cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>
                    {isAdmin
                      ? lang === 'en'
                        ? 'Open Admin Studio & Lead Tracker'
                        : 'Abrir Panel Admin y Clientes'
                      : lang === 'en'
                        ? 'Sound Engineer Admin Portal'
                        : 'Portal Admin del Ingeniero'}
                  </span>
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-stone-500">
          <p>
            © {new Date().getFullYear()} {brand.name} ({brand.companyFull}).{' '}
            {lang === 'en' ? copy.footerCopyrightEn : copy.footerCopyrightEs}
          </p>
          <p>{brand.location}</p>
        </div>
      </div>
    </footer>
  );
}
