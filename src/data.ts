/**
 * Single source of truth for site content. Pages render from these objects;
 * nothing here knows about layout.
 */

export const LINKS = {
  email: 'mailto:alahari.nandhan@gmail.com',
  emailAddress: 'alahari.nandhan@gmail.com',
  github: 'https://github.com/nandhanalahari',
  linkedin: 'https://www.linkedin.com/in/nandhan-alahari/',
  devpost: 'https://devpost.com/nandhu-alahari',
}

export const PROFILE = {
  name: 'Nandhan Alahari',
  short: 'Nandhan',
  location: 'Dallas, Texas',
  school: 'The University of Texas at Dallas',
  degree: 'B.S. Computer Science',
  grad: 'December 2027',
  gpa: '4.0',
  /** One line, used in hero and meta description. */
  pitch: 'I build machine learning systems and the software that makes them usable, from research benchmarks to production pipelines.',
  status: 'Open to software engineering and machine learning roles',
}

export interface Metric {
  value: string
  label: string
}

export interface ProjectLink {
  label: string
  href: string
}

/** Project slugs double as camera stops in the universe (see src/cosmos/journey.ts). */
export type ProjectSlug = 'dc-router' | 'navrisk' | 'kolana' | 'memeqa' | 'nestor'

export interface Project {
  slug: ProjectSlug
  name: string
  year: string
  /** Where it was built: hackathon, challenge, lab. */
  venue: string
  award?: string
  /** Rank-like short form for compact UI, e.g. "2nd". */
  badge?: string
  tagline: string
  /** 2–3 sentence problem framing. */
  problem: string
  /** What was built and how; each item is one engineering decision. */
  approach: { title: string; body: string }[]
  /** First-person: what Nandhan personally owned. */
  role: string
  metrics: Metric[]
  stack: string[]
  links: ProjectLink[]
  team?: string
  featured: boolean
  /** Optional held-out evaluation, rendered as its own block on the case study. */
  evaluation?: { title: string; intro: string; rows: { label: string; value: string }[]; caveat: string }
}

export const PROJECTS: Project[] = [
  {
    slug: 'dc-router',
    name: 'DC Router',
    year: '2026',
    venue: 'HackUTD 2026, NMC² track',
    award: '2nd place, HackUTD 2026 (NMC² track)',
    badge: '2nd',
    tagline: 'Schedules GPU data-center maintenance at market prices without overheating the hall.',
    problem:
      'GPU compute is now a priced commodity. H100 rentals swing from $2.31 to $4.95 an hour across providers, yet operators still run maintenance as soon as possible, blind to what those GPU-hours are worth that day. Worse, the naive schedule takes two cooling units in neighboring zones down at the same time, and both zones overheat.',
    approach: [
      {
        title: 'Price every hour of downtime',
        body: 'Each candidate slot is priced with a weekly H100 forecast built from GetDeploying market data, plus SLA credits owed on pre-sold capacity and a failure risk that grows the longer a repair waits.',
      },
      {
        title: 'Never overheat, by construction',
        body: 'A greedy optimizer takes the most urgent task first and the cheapest open slot, then improves locally. Every candidate is checked against an hour-by-hour thermal simulator with thermal inertia, so no zone crosses 32 °C. A full plan (40+ slots per task, 6 tasks) takes about 17 ms.',
      },
      {
        title: 'An agent that decides, while code computes',
        body: 'NVIDIA Nemotron, via build.nvidia.com function calling, orchestrates 9 FastAPI tools to turn a request like “UPS-B battery swap, 3 hours, vendor only Wed or Fri” into a priced, simulated plan. Guardrails keep every price and every piece of arithmetic in code; any explanation quoting a number the tools didn’t produce is replaced.',
      },
      {
        title: 'Watch the week play out',
        body: 'A Three.js cut-away of the GPU hall replays the week hour by hour, with racks going dark, zone temperatures shifting, and a live cost counter comparing both plans.',
      },
    ],
    role: 'I built the maintenance planner and its thermal-aware optimizer, wired in real GPU market prices, and built the Three.js data hall, price charts, hourly cost drill-down, and week report.',
    metrics: [
      { value: '42.8%', label: 'lower weekly cost than ASAP ($13.6K saved)' },
      { value: '0 vs 5', label: 'overheats, optimized vs ASAP' },
      { value: '0 / 100', label: 'unseen seeded weeks with an overheat' },
      { value: '~17 ms', label: 'to build and simulate a full week plan' },
    ],
    stack: ['Python', 'FastAPI', 'Pydantic', 'NVIDIA Nemotron', 'Function calling', 'Three.js', 'pytest'],
    links: [
      { label: 'Source on GitHub', href: 'https://github.com/Fawazjams/utdhacksDCRouter' },
      { label: 'Devpost', href: 'https://devpost.com/software/nemo-an40kd' },
    ],
    team: 'Built in 24 hours with Fawaz Jamshed and Lokesh Reddy Penugonda.',
    featured: true,
    evaluation: {
      title: 'Tested on 100 weeks it never saw',
      intro:
        'One good demo week proves little, so both planners ran on 100 seeded weeks the optimizer was never tuned on.',
      rows: [
        { label: 'Weeks tested', value: '100' },
        { label: 'Optimized weeks with any overheat', value: '0 of 100' },
        { label: 'ASAP weeks with any overheat', value: '59 of 100' },
        { label: 'Planted cooling conflicts ASAP walked into', value: '45 of 45' },
        { label: 'Optimized cheaper than ASAP (like-for-like weeks)', value: '100%' },
        { label: 'Median saving per week', value: '$3,091.99' },
        { label: 'Jobs left unscheduled, ASAP vs optimized', value: '9 vs 0' },
      ],
      caveat:
        'Every week runs on an assumed thermal and cost model, so this shows the planner is reliable inside the simulation, not in a real hall. Optimized never overheating is by construction; the informative numbers are ASAP’s catch rate and the savings.',
    },
  },
  {
    slug: 'navrisk',
    name: 'NavRisk',
    year: '2026',
    venue: 'EPPS × American Airlines Data Challenge',
    award: '1st of 50+ teams, EPPS × American Airlines Data Challenge',
    badge: '1st',
    tagline: 'A predictive risk engine for airline crew scheduling.',
    problem:
      'Crew schedules fail in cascades: one delayed leg propagates downstream, pushes a crew past federal duty limits, and strands them away from their next departure. NavRisk scores that risk before it happens, while there is still time to re-sequence.',
    approach: [
      {
        title: 'Two decades of flights',
        body: 'Trained an XGBoost model on 6M+ Bureau of Transportation Statistics records across 141 airports and 21 years, scoring four failure modes: delay propagation, duty violations, missed connections, and weather.',
      },
      {
        title: 'Features that keep local signal',
        body: 'Engineered 36K+ airport-pair × season features so winter congestion at a northern hub stays a hub-specific signal instead of dissolving into a global average.',
      },
      {
        title: 'Make propagation visible',
        body: 'A live risk network graph models airports as nodes and crew connections as edges, fed by real-time METAR weather, so schedulers can trace where a delay will travel.',
      },
    ],
    role: 'I architected the full-stack app and REST API, and built the XGBoost scoring model and the feature engineering pipeline.',
    metrics: [
      { value: '1st', label: 'of 50+ teams, against graduate and PhD competitors' },
      { value: '6M+', label: 'flight records, 21 years' },
      { value: '36K+', label: 'engineered features' },
      { value: '141', label: 'airports in the risk graph' },
    ],
    stack: ['Python', 'XGBoost', 'REST API', 'METAR', 'React'],
    links: [],
    featured: true,
  },
  {
    slug: 'kolana',
    name: 'Kolana',
    year: '2026',
    venue: 'HackHCC',
    award: 'Best Use of Solana, HackHCC',
    badge: 'Best',
    tagline: 'Pay someone by pointing your camera at them and saying how much.',
    problem:
      'Crypto payments still ask people to copy a 44-character wallet address. Kolana replaces the address with a face and the form with a sentence.',
    approach: [
      {
        title: 'Faces as addresses',
        body: 'An InsightFace model on a DigitalOcean server turns each enrolled contact into a 512-dimensional embedding in MongoDB Atlas; live camera frames resolve to identities through Atlas Vector Search.',
      },
      {
        title: 'Speech as the interface',
        body: 'Gemini 2.5 Flash parses “send her twenty dollars” into a structured payment intent, and ElevenLabs speaks the confirmation back.',
      },
      {
        title: 'Settle on-chain, fast',
        body: 'A FastAPI backend coordinates recognition, intent, and a wallet-to-wallet SOL transfer that settles in roughly 400 ms.',
      },
    ],
    role: 'I learned Solana from scratch during the hackathon and shipped the on-chain integration, the face-recognition service, and the FastAPI orchestration.',
    metrics: [
      { value: '~400 ms', label: 'on-chain settlement' },
      { value: '512-d', label: 'face embeddings with vector search' },
    ],
    stack: ['FastAPI', 'Solana', 'InsightFace', 'MongoDB Atlas Vector Search', 'Gemini 2.5 Flash', 'ElevenLabs'],
    links: [{ label: 'Source on GitHub', href: 'https://github.com/nandhanalahari/Kolana' }],
    featured: true,
  },
  {
    slug: 'memeqa',
    name: 'MemeQA',
    year: '2025',
    venue: 'UT Dallas, Dr. Vincent Ng’s lab',
    award: 'Published at ACL 2025',
    badge: 'ACL',
    tagline: 'A benchmark that tests whether multimodal models actually get the joke.',
    problem:
      'A meme’s meaning lives between the image, its text, and shared culture. Earlier benchmarks tested narrow slices of that. MemeQA tests it whole, and shows state-of-the-art models still miss the point.',
    approach: [
      {
        title: 'Seven kinds of understanding',
        body: 'A 9K+ multiple-choice dataset spanning seven cognitive aspects, from fine-grained visual recognition to cultural and commonsense reasoning.',
      },
      {
        title: 'No shortcuts allowed',
        body: 'Adversarial filtering removed questions a model could answer from statistical artifacts alone, so the benchmark measures understanding.',
      },
      {
        title: 'Efficient adaptation',
        body: 'LoRA fine-tuning workflows adapted large vision-language models for sentiment, intent, and context classification.',
      },
    ],
    role: 'I built the data curation pipeline and the LoRA fine-tuning workflow, and co-authored the paper.',
    metrics: [
      { value: '9K+', label: 'questions' },
      { value: '7', label: 'cognitive aspects evaluated' },
      { value: 'ACL', label: '2025, long paper' },
    ],
    stack: ['PyTorch', 'Vision-language models', 'LoRA', 'Adversarial filtering'],
    links: [{ label: 'Read the paper', href: 'https://aclanthology.org/2025.acl-long.927' }],
    featured: true,
  },
  {
    slug: 'nestor',
    name: 'Nestor',
    year: '2026',
    venue: 'Goldman Sachs & JSOM Hackathon',
    award: 'Top 5, Goldman Sachs & JSOM Hackathon',
    badge: 'Top 5',
    tagline: 'Portfolio rebalancing for the specific scenario you’re worried about.',
    problem:
      'Generic portfolio advice optimizes for an average future. Nestor rebalances for a named scenario, like a pandemic, a tech surge, or a rate shock, using how comparable regimes behaved historically.',
    approach: [
      {
        title: 'Predict, then optimize',
        body: 'XGBoost predicts per-asset returns conditioned on the scenario; a mean-variance optimizer turns those predictions into the minimum-risk allocation at the target return.',
      },
      {
        title: 'Broad market data',
        body: '8,049 tickers, real-time Yahoo Finance prices, and FRED macro indicators (Treasury yields, CPI, unemployment, the VIX).',
      },
      {
        title: 'Explain the shift',
        body: 'Gemini translates the optimizer’s weight changes into plain-language reasoning.',
      },
    ],
    role: 'I designed the two-stage prediction and optimization engine and the data pipeline behind it.',
    metrics: [
      { value: '8,049', label: 'tickers' },
      { value: 'Top 5', label: 'Goldman Sachs & JSOM' },
    ],
    stack: ['Python', 'XGBoost', 'Mean-variance optimization', 'FRED', 'Gemini'],
    links: [{ label: 'Source on GitHub', href: 'https://github.com/nandhanalahari/Nestor' }],
    featured: false,
  },
]

export const projectBySlug = (slug: string | undefined) => PROJECTS.find((p) => p.slug === slug)

export interface Role {
  id: string
  title: string
  org: string
  where: string
  start: string
  end: string
  current: boolean
  summary: string
  bullets: string[]
  tech: string[]
}

export const EXPERIENCE: Role[] = [
  {
    id: 'beyondneuro',
    title: 'Software Engineer & Project Liaison',
    org: 'BeyondNeuro, UTD EPICS',
    where: 'Richardson, TX',
    start: 'Aug 2026',
    end: 'Present',
    current: true,
    summary:
      'Architecting a cognitive wellness platform for stroke survivors, dementia patients, and caregivers, for a nonprofit client.',
    bullets: [
      'Translated clinical priorities into a 4-sprint roadmap: interactive cognitive modules, an activity library, local progress tracking, and a PWA with an AI avatar, agreed in biweekly stakeholder syncs.',
      'Shipping sprint 1 of 4: the first cognitive training modules and the onboarding flow.',
      'Designed for WCAG accessibility and role-based access, so patients, family caregivers, and providers each see only what they should.',
    ],
    tech: ['React', 'PWA', 'WCAG', 'RBAC'],
  },
  {
    id: 'askutd',
    title: 'AI Software Engineer',
    org: 'Google Developer Groups, UT Dallas',
    where: 'Richardson, TX',
    start: 'Sep 2026',
    end: 'Present',
    current: true,
    summary: 'Building AskUTD, a retrieval-augmented assistant that answers university policy questions with exact page citations.',
    bullets: [
      'Indexing 200+ official PDFs: course requirements, degree plans, registrar policy, and academic regulations.',
      'Hybrid retrieval: BM25 plus dense vectors (sentence-transformers), reranked by a local BGE cross-encoder.',
      'Query decomposition and Self-RAG verification with nightly RAGAS evaluations, on a local Llama 3.1 8B.',
    ],
    tech: ['RAG', 'BM25', 'Llama 3.1', 'FastAPI', 'Next.js', 'RAGAS'],
  },
  {
    id: 'skyalert',
    title: 'Machine Learning Engineer',
    org: 'Artificial Intelligence Society, UT Dallas',
    where: 'Richardson, TX',
    start: 'Sep 2026',
    end: 'Present',
    current: true,
    summary: 'Building SkyAlert, which detects and maps wildfire and flood damage from satellite imagery for first responders.',
    bullets: [
      'Two-phase vision pipeline: a ResNet classifier flags affected regions, then U-Net segmentation maps damage per pixel.',
      'NASA FIRMS and DeepGlobe imagery with spectral indices (NDVI, NBR), served through FastAPI and a Folium map.',
    ],
    tech: ['PyTorch', 'ResNet', 'U-Net', 'FastAPI'],
  },
  {
    id: 'gu-lab',
    title: 'Research Assistant',
    org: 'Computational Neuroscience Lab, Dr. Zirong Gu',
    where: 'UT Dallas',
    start: 'Jun 2026',
    end: 'Aug 2026',
    current: false,
    summary: 'Restored a stalled behavioral-analysis pipeline, then built the tooling that shows researchers what each cluster actually is.',
    bullets: [
      'Diagnosed and restored a broken MATLAB pipeline running affinity propagation clustering over multi-camera tracking data (3D pose, acceleration, motion frequency), unblocking 12+ experimental sessions.',
      'Engineered a Python video-processing pipeline from scratch that auto-generates per-cluster clips from clustered sensor data.',
      'Redesigned the cluster-to-frame mapping algorithm, cutting processing time 60% on 10+ hour recordings.',
    ],
    tech: ['Python', 'MATLAB', 'Affinity propagation', '3D pose'],
  },
  {
    id: 'ride',
    title: 'AI/ML Security Engineer',
    org: 'R.I.D.E. Program, UT Dallas',
    where: 'Richardson, TX',
    start: 'Sep 2025',
    end: 'Dec 2025',
    current: false,
    summary: 'Machine learning for software security: hardening code against reverse engineering, and measuring whether it held.',
    bullets: [
      'Built Python ML systems that design and apply code obfuscation techniques.',
      'Built benchmarks and models that measure obfuscation strength and resistance to automated deobfuscation.',
    ],
    tech: ['Python', 'Machine learning', 'Obfuscation'],
  },
  {
    id: 'ng-lab',
    title: 'Machine Learning Researcher',
    org: 'Human Language Technology, Dr. Vincent Ng',
    where: 'UT Dallas',
    start: 'Jun 2024',
    end: 'Sep 2024',
    current: false,
    summary: 'Multimodal NLP research on machine understanding of memes, published as MemeQA at ACL 2025.',
    bullets: [
      'Built a multimodal system (vision + NLP) using vision-language models to classify sentiment, intent, and context in memes.',
      'Engineered the data curation pipeline and LoRA fine-tuning workflow, with adversarial filtering across a 9K+ question dataset.',
    ],
    tech: ['PyTorch', 'VLMs', 'LoRA'],
  },
]

export interface NewsItem {
  date: string
  title: string
  href?: string
  win?: boolean
}

export const NEWS: NewsItem[] = [
  { date: 'Nov 2026', title: 'DC Router took 2nd place in the NMC² track at HackUTD 2026', href: '/work/dc-router', win: true },
  { date: 'Sep 2026', title: 'Started building AskUTD (GDG) and SkyAlert (AI Society)' },
  { date: 'Aug 2026', title: 'Joined BeyondNeuro on UTD EPICS as software engineer and liaison' },
  { date: 'Jun 2026', title: 'Kolana won Best Use of Solana at HackHCC', href: '/work/kolana', win: true },
  { date: 'Jun 2026', title: 'Joined Dr. Zirong Gu’s Computational Neuroscience Lab' },
  { date: '2026', title: 'NavRisk placed 1st of 50+ teams at the EPPS × American Airlines Data Challenge', href: '/work/navrisk', win: true },
  { date: 'Jul 2025', title: 'MemeQA published at ACL 2025', href: '/work/memeqa', win: true },
]

export const STATS: Metric[] = [
  { value: '4', label: 'competition awards' },
  { value: 'ACL', label: '2025 publication' },
  { value: '4.0', label: 'GPA at UT Dallas' },
  { value: '6M+', label: 'records in my largest model' },
]

export const PUBLICATION = {
  title: 'MemeQA: Holistic Evaluation for Meme Understanding',
  venue: 'Proceedings of the 63rd Annual Meeting of the Association for Computational Linguistics (ACL 2025)',
  href: 'https://aclanthology.org/2025.acl-long.927',
}

export const SKILLS: { group: string; items: string[] }[] = [
  { group: 'Languages', items: ['Python', 'Java', 'C++', 'C', 'C#', 'Swift', 'MATLAB', 'SQL', 'Assembly'] },
  { group: 'ML & data', items: ['PyTorch', 'XGBoost', 'LoRA', 'Vision-language models', 'RAG', 'Vector databases', 'Computer vision', 'NLP'] },
  { group: 'Systems & web', items: ['FastAPI', 'React', 'React Native', 'Node.js', 'Three.js', 'Supabase', 'MongoDB', 'REST APIs'] },
  { group: 'Practice', items: ['Git', 'Linux', 'GitHub Actions', 'CI/CD', 'Agile', 'pytest'] },
]

export const PRINCIPLES = [
  {
    title: 'Find the better method',
    body: 'My first Rubik’s cube solve took two minutes. Five hundred solves later it took forty seconds, and my hands were no faster. The algorithm changed. I look for that change before I look for more effort.',
  },
  {
    title: 'Back it with evidence',
    body: 'A result is not finished until it can be measured. DC Router got a 100-week evaluation; MemeQA got adversarial filtering. I would rather prove it than assume it.',
  },
  {
    title: 'Design for the person using it',
    body: 'A model nobody can use is a notebook. Clarity and accessibility come before features.',
  },
  {
    title: 'Ship on the deadline',
    body: 'Scope early, ship something that works, then improve it. Four hackathon and challenge awards say this works.',
  },
]
