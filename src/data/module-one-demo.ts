import { hiveSymbol } from '@/components/hive/primitives';
import type { Listing } from '@/components/hive/listing';

export const demoListings: Listing[] = [
  {
    id: 'hazel',
    title: 'The Hazel',
    price: '$1,850',
    location: 'Williamsburg, Brooklyn',
    image: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=1200&q=86',
    beds: 2,
    baths: 1,
    amenities: ['In-unit W/D', 'City view'],
    match: 92,
    status: 'matched',
  },
  {
    id: 'linden',
    title: 'The Linden',
    price: '$1,650',
    location: 'Bushwick, Brooklyn',
    image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=86',
    beds: 2,
    baths: 1,
    amenities: ['Elevator', 'Rooftop'],
    match: 89,
    status: 'discussing',
  },
  {
    id: 'greenpoint',
    title: 'Greenpoint Lofts',
    price: '$1,900',
    location: 'Greenpoint, Brooklyn',
    image: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&q=86',
    beds: 3,
    baths: 2,
    amenities: ['Dishwasher', 'Workspace'],
    match: 90,
    status: 'matched',
  },
  {
    id: 'cooper',
    title: 'The Cooper',
    price: '$1,700',
    location: 'Long Island City',
    image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=86',
    beds: 2,
    baths: 1,
    amenities: ['Doorman', 'Gym'],
    match: 86,
    status: 'discussing',
  },
];

export function getListingById(id: string | string[] | undefined) {
  const listingId = Array.isArray(id) ? id[0] : id;

  return demoListings.find((listing) => listing.id === listingId) ?? demoListings[0];
}

export const demoPeople = [
  { name: 'Maya Chen' },
  { name: 'Jordan Lee' },
  { name: 'Ari Patel' },
  { name: 'Sam Rivera' },
];

export const preferenceItems = [
  {
    icon: hiveSymbol({ ios: 'dollarsign.circle.fill', android: 'attach_money', web: 'attach_money' }),
    label: 'Budget',
    value: '$1,200 - $2,000',
  },
  {
    icon: hiveSymbol({ ios: 'mappin.and.ellipse', android: 'location_on', web: 'location_on' }),
    label: 'Neighborhoods',
    value: 'Williamsburg, Bushwick',
  },
  {
    icon: hiveSymbol({ ios: 'calendar', android: 'calendar_month', web: 'calendar_month' }),
    label: 'Move-in',
    value: 'Aug 1 - Sep 1',
  },
  {
    icon: hiveSymbol({ ios: 'pawprint.fill', android: 'pets', web: 'pets' }),
    label: 'Pets',
    value: 'Pet friendly',
  },
];

export const sharedPreferenceChips = ['Budget aligned', 'Pet friendly', 'Move-in window', 'Quiet evenings'];

export const profileTraits = ['Clean', 'Social', 'Quiet', 'Early Bird', 'Coffee Lover'];
