import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { seoConfig, getPageMeta } from '../lib/seo';

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  canonical?: string;
  image?: string;
  type?: string;
}

export function SEOHead({
  title,
  description,
  keywords,
  canonical,
  image = 'https://madlink.fr/og-image.png',
  type = 'website'
}: SEOHeadProps) {
  const location = useLocation();

  useEffect(() => {
    const pageKey = location.pathname.split('/').pop() || 'home';
    const pageMeta = getPageMeta(pageKey as any) || seoConfig.pages.home;

    const finalTitle = title || pageMeta.title || seoConfig.defaultTitle;
    const finalDescription = description || pageMeta.description || seoConfig.defaultDescription;
    const finalKeywords = keywords || pageMeta.keywords;
    const finalCanonical = canonical || pageMeta.canonical || `${seoConfig.siteUrl}${location.pathname}`;

    document.title = finalTitle;

    updateMetaTag('name', 'description', finalDescription);
    if (finalKeywords) {
      updateMetaTag('name', 'keywords', finalKeywords);
    }

    updateMetaTag('property', 'og:title', finalTitle);
    updateMetaTag('property', 'og:description', finalDescription);
    updateMetaTag('property', 'og:url', finalCanonical);
    updateMetaTag('property', 'og:image', image);
    updateMetaTag('property', 'og:type', type);

    updateMetaTag('name', 'twitter:title', finalTitle);
    updateMetaTag('name', 'twitter:description', finalDescription);
    updateMetaTag('name', 'twitter:image', image);

    updateLinkTag('canonical', finalCanonical);

  }, [location, title, description, keywords, canonical, image, type]);

  return null;
}

function updateMetaTag(attr: string, key: string, content: string) {
  let element = document.querySelector(`meta[${attr}="${key}"]`);

  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attr, key);
    document.head.appendChild(element);
  }

  element.setAttribute('content', content);
}

function updateLinkTag(rel: string, href: string) {
  let element = document.querySelector(`link[rel="${rel}"]`);

  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', rel);
    document.head.appendChild(element);
  }

  element.setAttribute('href', href);
}
