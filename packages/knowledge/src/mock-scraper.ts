import type { ScrapedContent, ExtractedKnowledge } from './types';

/**
 * Mock scraper returning sample hair salon data for testing
 */
export function getMockScrapedContent(): ScrapedContent {
  return {
    url: 'https://example-salon.co.uk',
    title: 'Style & Grace Hair Salon - Premium Hair Services in London',
    markdown: `
# Style & Grace Hair Salon

Welcome to Style & Grace, your premier destination for exceptional hair care in the heart of London.

## Our Services

### Haircuts
- **Ladies Haircut** - Full consultation, wash, cut and blow dry. From £45
- **Gents Haircut** - Classic cut with wash and style. From £25
- **Children's Haircut** - For under 12s. From £18

### Colouring
- **Full Head Colour** - Complete colour transformation. From £65
- **Highlights/Lowlights** - Half head from £55, full head from £85
- **Balayage** - Hand-painted highlights for a natural look. From £95
- **Root Touch-Up** - Quick refresh for regrowth. From £40

### Styling & Treatments
- **Blow Dry** - Wash and professional blow dry. From £30
- **Keratin Treatment** - Smoothing treatment for frizz-free hair. From £150
- **Deep Conditioning** - Intensive moisture treatment. From £25
- **Wedding/Special Occasion** - Consultation required. From £75

## Opening Hours

- Monday: Closed
- Tuesday: 9:00 AM - 6:00 PM
- Wednesday: 9:00 AM - 6:00 PM
- Thursday: 9:00 AM - 8:00 PM
- Friday: 9:00 AM - 8:00 PM
- Saturday: 8:00 AM - 5:00 PM
- Sunday: Closed

## Frequently Asked Questions

**Do I need to book an appointment?**
We recommend booking in advance, especially for colour services. However, we do accept walk-ins when availability allows.

**What happens if I need to cancel?**
We kindly ask for 24 hours notice for cancellations. Late cancellations may incur a 50% charge.

**Do you offer consultations?**
Yes! We offer free consultations for colour services and major changes. Just give us a call to book.

**Is parking available?**
Street parking is available nearby, and there's a pay car park on Green Street, 2 minutes walk away.

**Do you use cruelty-free products?**
Yes, we're proud to use only cruelty-free and vegan-friendly products from sustainable brands.

## Contact Us

123 High Street, London, W1 2AB
Phone: 020 1234 5678
Email: hello@styleandgrace.co.uk
    `.trim(),
    scrapedAt: new Date(),
  };
}

/**
 * Mock extracted knowledge from the hair salon content
 */
export function getMockExtractedKnowledge(): ExtractedKnowledge {
  return {
    businessDescription:
      'Style & Grace is a premium hair salon in London offering cuts, colouring, styling and treatments for ladies, gents and children.',
    services: [
      { name: 'Ladies Haircut', description: 'Full consultation, wash, cut and blow dry', duration: 60, price: 45 },
      { name: 'Gents Haircut', description: 'Classic cut with wash and style', duration: 30, price: 25 },
      { name: "Children's Haircut", description: 'For under 12s', duration: 30, price: 18 },
      { name: 'Full Head Colour', description: 'Complete colour transformation', duration: 120, price: 65 },
      { name: 'Highlights (Half Head)', description: 'Partial highlights', duration: 90, price: 55 },
      { name: 'Highlights (Full Head)', description: 'Full head highlights', duration: 120, price: 85 },
      { name: 'Balayage', description: 'Hand-painted highlights for a natural look', duration: 150, price: 95 },
      { name: 'Root Touch-Up', description: 'Quick refresh for regrowth', duration: 45, price: 40 },
      { name: 'Blow Dry', description: 'Wash and professional blow dry', duration: 30, price: 30 },
      { name: 'Keratin Treatment', description: 'Smoothing treatment for frizz-free hair', duration: 180, price: 150 },
      { name: 'Deep Conditioning', description: 'Intensive moisture treatment', duration: 30, price: 25 },
      { name: 'Wedding/Special Occasion', description: 'Consultation required', duration: 90, price: 75 },
    ],
    faqs: [
      {
        question: 'Do I need to book an appointment?',
        answer:
          'We recommend booking in advance, especially for colour services. However, we do accept walk-ins when availability allows.',
      },
      {
        question: 'What is your cancellation policy?',
        answer:
          'We kindly ask for 24 hours notice for cancellations. Late cancellations may incur a 50% charge.',
      },
      {
        question: 'Do you offer free consultations?',
        answer:
          'Yes! We offer free consultations for colour services and major changes. Just give us a call to book.',
      },
      {
        question: 'Is parking available?',
        answer:
          "Street parking is available nearby, and there's a pay car park on Green Street, 2 minutes walk away.",
      },
      {
        question: 'Do you use cruelty-free products?',
        answer:
          'Yes, we use only cruelty-free and vegan-friendly products from sustainable brands.',
      },
    ],
    openingHours: {
      monday: 'Closed',
      tuesday: '9:00 AM - 6:00 PM',
      wednesday: '9:00 AM - 6:00 PM',
      thursday: '9:00 AM - 8:00 PM',
      friday: '9:00 AM - 8:00 PM',
      saturday: '8:00 AM - 5:00 PM',
      sunday: 'Closed',
    },
  };
}
