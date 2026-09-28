export type TicketPrices = {
  standard: string;
  unwaged: string;
  members: string;
};

export type GigDetails = {
  venue: string;
  doors: string;
  music: string;
  ticketPrices: TicketPrices;
};

export const GIG_DEFAULTS: GigDetails = {
  venue: '14 Royal Terrace, EH7 5AB',
  doors: '7:30pm',
  music: '8:00pm',
  ticketPrices: {
    standard: '£15',
    unwaged: '£12',
    members: '£10',
  },
};

type GigOverrides = {
  venue?: string;
  doors?: string;
  music?: string;
  ticketPrices?: Partial<TicketPrices>;
  'ticket-prices'?: Partial<TicketPrices>;
};

export function resolveGigDetails(
  gig: GigOverrides | Record<string, unknown>,
): GigDetails {
  const overrides = gig as GigOverrides;
  const priceOverrides =
    overrides.ticketPrices ?? overrides['ticket-prices'];

  return {
    venue: overrides.venue ?? GIG_DEFAULTS.venue,
    doors: overrides.doors ?? GIG_DEFAULTS.doors,
    music: overrides.music ?? GIG_DEFAULTS.music,
    ticketPrices: {
      standard:
        priceOverrides?.standard ?? GIG_DEFAULTS.ticketPrices.standard,
      unwaged: priceOverrides?.unwaged ?? GIG_DEFAULTS.ticketPrices.unwaged,
      members: priceOverrides?.members ?? GIG_DEFAULTS.ticketPrices.members,
    },
  };
}

export function formatTicketPrices(prices: TicketPrices): string {
  return `${prices.standard} / ${prices.unwaged} / ${prices.members}`;
}
