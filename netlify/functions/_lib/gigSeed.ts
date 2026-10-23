import type { Gig, GigsState } from './gigTypes.ts'
import { sortGigsChronological } from './gigTypes.ts'

/** Static season list used to seed empty local / blob stores. */
const SEED_GIGS: Array<Omit<Gig, 'id' | 'createdAt' | 'updatedAt' | 'bodyMarkdown' | 'venue' | 'doors' | 'music' | 'ticketPrices' | 'ticketsAvailable'> & {
  bodyMarkdown?: string
  ticketsAvailable?: boolean
}> = [
  {
    date: '2026-09-30',
    name: 'Àirdan',
    description:
      'High-energy music rooted in Scotland and influenced by the world, from Celtic Connections 2026 Battle of the Folk Bands finalists. "Raw energy and a modern young twist" (Celtic Music Radio). Àirdan is an exciting new trad band born from the vibrant pub scene of Edinburgh.',
    tickets: 'https://tickets-scotland.com/whats-on/irdan',
    imagepath: '/gig-pics/airdan.webp',
    website: 'https://airdanmusic.com/home',
  },
  {
    date: '2026-10-14',
    name: 'Alan Reid & Christine Kydd',
    description:
      'A collaboration between two of the finest performers from the Scottish Traditional Hall of Fame, bringing songs old and new. With years of experience delighting audiences worldwide Alan and Christine bring in this new collaboration a beautifully curated repertoire of old and new songs, irresistible harmonies and a warmth of enjoyment in sharing the stage together.',
    tickets: 'https://tickets-scotland.com/whats-on/alan-reid-christine-kydd',
    imagepath: '/gig-pics/reid-kydd.webp',
    website: '',
  },
  {
    date: '2026-10-28',
    name: 'Iona Fyfe',
    description:
      'A multi-award winning singer from Huntly, and a tireless advocate for the Scots Leid, Iona presents a lively mix of material rooted in the songs of Aberdeenshire. Honoured at the Scots Language Awards with the title of Speaker of the Year in 2021, Iona was influenced by bothy balladeers and travellers. She performs both folk and pop songs in the Scots language, always remaining true to her roots in tradition.',
    imagepath: '/gig-pics/ionafyfe.jpg.webp',
    tickets: 'https://tickets-scotland.com/whats-on/iona-fyfe-1',
    website: 'https://ionafyfe.com',
  },
  {
    date: '2026-11-11',
    name: 'Pete Morton',
    description:
      'Pete is an old-time troubadour from Leicester, and an EFC favourite celebrated for his unruly mix of storytelling, humour and song. In his teens he came across a Buffy St Marie record, and at that moment decided to become a folk singer. Discovering the songs of the early sixties protest movement inspired him to write and take his songs to folk clubs and beyond. After recording several successful albums, he now focuses entirely on live performance.',
    imagepath: '/gig-pics/pete-morton.webp',
    tickets: 'https://tickets-scotland.com/whats-on/pete-morton',
    website: '',
  },
  {
    date: '2026-11-25',
    name: 'George Machray',
    description:
      'A three-time winner of both the Audience Vote at the EFC Song Competition and the Glenfarg Folk Festival Song Competition, George is celebrated for his comedy songs and parodies. A popular EFC regular from the fishing and mining village of Port Seton, his forays into more thoughtful and poignant ballads ensure an evening of light and shade, with the principal focus on fun.',
    imagepath: '/gig-pics/machray.webp',
    tickets: '',
    website: '',
  },
  {
    date: '2026-12-09',
    name: 'Judy Barker & Sally Thomas',
    description:
      'Judy Barker and Sally Thomas bring together Scottish smallpipes, English concertina and beautiful, layered harmonies to create an absorbing sound. Their choice of programme, and their interpretation of music and song from across Scotland and England, provides a rich and reflective approach to traditional music, constantly reminding us that these songs grow out of real life, and are still relevant to it.',
    website: 'https://jsfolk.co.uk',
    imagepath: '/gig-pics/judy-and-sally-folk-duo.webp',
    tickets: '',
  },
  {
    date: '2026-12-16',
    name: 'Curmudgeon',
    description:
      'The Edinburgh-based trio of Laurie Brett (vocals and guitar) Andrew Macintyre (vocals, Scottish small pipes and whistles) and Donald Gorman (fiddle, mandola and backing vocals) bring songs, tunes and a bit of light-hearted banter assured. Two-thirds Scottish and one-third Essex-but-adopted-Edinburgher, their repertoire is also mostly, but not exclusively, in the Scottish tradition.',
    imagepath: '/gig-pics/Curmudgeon.webp',
    tickets: '',
    website: '',
  },
  {
    date: '2027-01-25',
    name: 'Burns Night',
    description:
      'In an experimental break from previous years, the 2027 EFC Burns Night will be a celebration of the man and poet, rather than the Burns Supper tradition. There will be no haggis. Instead there will be poetry and song, tunes and talk that tries to represent an evening Burns might have recognised rather than the industry that has developed in his name. More details to follow…',
    imagepath: '/gig-pics/burns.webp',
    tickets: '',
    website: '',
  },
]

export function buildSeedGigsState(): GigsState {
  const now = new Date().toISOString()
  const gigs: Gig[] = SEED_GIGS.map((raw) => ({
    id: `gig-seed-${raw.date}`,
    date: raw.date,
    name: raw.name,
    description: raw.description,
    tickets: raw.tickets ?? '',
    ticketsAvailable: raw.ticketsAvailable ?? true,
    website: raw.website ?? '',
    imagepath: raw.imagepath ?? '',
    bodyMarkdown: raw.bodyMarkdown ?? '',
    venue: '',
    doors: '',
    music: '',
    ticketPrices: {},
    createdAt: now,
    updatedAt: now,
  }))
  return {
    gigs: sortGigsChronological(gigs),
    updatedAt: now,
  }
}
