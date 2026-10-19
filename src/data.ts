export interface Announcement {
  title: string
  date: string
  kind: 'Project' | 'Research' | 'Update'
  body: string
}

export interface Skill {
  name: string
  /** devicon path fragment, e.g. "python/python-original" */
  icon?: string
}

export interface SkillGroup {
  label: string
  skills: Skill[]
}

export interface ProjectItem {
  name: string
  tagline: string
  overview: string
  points: string[]
  outcome?: string
  stack: string[]
  award?: string
  link?: string
}

export interface ExperienceItem {
  role: string
  org: string
  period: string
  summary: string
  bullets: string[]
  tech: string[]
}

export interface Highlight {
  value: string
  label: string
}

export const ANNOUNCEMENTS: Announcement[] = [
  {
    title: 'Joined BeyondNeuro on UTD EPICS',
    date: 'August 2026',
    kind: 'Project',
    body: 'Joined the UTD EPICS team building BeyondNeuro, a cognitive wellness platform for stroke survivors, dementia patients, and caregivers.',
  },
  {
    title: '1st place at the EPPS x American Airlines Data Challenge',
    date: '2026',
    kind: 'Project',
    body: 'NavRisk took first place: an XGBoost model trained on 6M+ flight records that flags high-risk crew sequences, wrapped in a full-stack app with live METAR weather.',
  },
  {
    title: 'Joined the Computational Neuroscience Lab',
    date: 'June 2026',
    kind: 'Research',
    body: 'Working under Dr. Zirong Gu on pipelines that decode animal behavior from multi-camera tracking data: 3D pose, acceleration, and motion frequency at scale.',
  },
  {
    title: 'Won Best Use of Solana at HackHCC',
    date: 'June 2026',
    kind: 'Project',
    body: 'Our team built Kolana, a wallet that lets you pay someone by pointing your camera at them and speaking. Face recognition, voice parsing, and on-chain settlement.',
  },
  {
    title: 'MemeQA published at ACL 2025',
    date: 'July 2025',
    kind: 'Research',
    body: 'Co-authored MemeQA, a 9K+ question benchmark for holistic meme understanding, published at the 63rd Annual Meeting of the ACL.',
  },
]

const DEVICON = 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons'

export function iconUrl(fragment: string): string {
  return `${DEVICON}/${fragment}.svg`
}

export const SKILL_GROUPS: SkillGroup[] = [
  {
    label: 'Programming Languages',
    skills: [
      { name: 'Python', icon: 'python/python-original' },
      { name: 'Java', icon: 'java/java-original' },
      { name: 'C++', icon: 'cplusplus/cplusplus-original' },
      { name: 'C', icon: 'c/c-original' },
      { name: 'C#', icon: 'csharp/csharp-original' },
      { name: 'Swift', icon: 'swift/swift-original' },
      { name: 'SQL', icon: 'azuresqldatabase/azuresqldatabase-original' },
      { name: 'Assembly' },
    ],
  },
  {
    label: 'Frameworks & Tools',
    skills: [
      { name: 'React', icon: 'react/react-original' },
      { name: 'React Native', icon: 'react/react-original' },
      { name: 'Node.js', icon: 'nodejs/nodejs-original' },
      { name: 'GitHub Actions', icon: 'githubactions/githubactions-original' },
      { name: 'Supabase', icon: 'supabase/supabase-original' },
      { name: 'Linux', icon: 'linux/linux-original' },
      { name: 'Git', icon: 'git/git-original' },
    ],
  },
  {
    label: 'Machine Learning & Data',
    skills: [
      { name: 'XGBoost' },
      { name: 'MATLAB', icon: 'matlab/matlab-original' },
      { name: 'MongoDB Atlas', icon: 'mongodb/mongodb-original' },
      { name: 'FastAPI', icon: 'fastapi/fastapi-original' },
      { name: 'LoRA Fine-tuning' },
      { name: 'Gemini API' },
    ],
  },
  {
    label: 'Concepts',
    skills: [
      { name: 'Machine Learning' },
      { name: 'Computer Vision' },
      { name: 'NLP' },
      { name: 'LLMs' },
      { name: 'Vector Databases' },
      { name: 'RESTful APIs' },
      { name: 'CI/CD' },
      { name: 'Data Structures & Algorithms' },
    ],
  },
]

export const HIGHLIGHTS: Highlight[] = [
  { value: '4.0', label: 'GPA at UT Dallas' },
  { value: '1st', label: 'EPPS x American Airlines Data Challenge' },
  { value: 'ACL 2025', label: 'Published co-author' },
  { value: '3', label: 'Hackathon & challenge awards' },
]

export const PROJECTS: ProjectItem[] = [
  {
    name: 'NavRisk',
    tagline: 'A predictive risk engine for airline crew scheduling.',
    overview:
      'Airline crew schedules fail in cascades: a single delayed leg propagates downstream, pushes crews past federal duty-time limits, and strands them away from their next departure. NavRisk quantifies that risk before it materializes, scoring proposed crew sequences against two decades of operational history and live weather conditions so schedulers can intervene while there is still time to re-sequence.',
    points: [
      'Trained an XGBoost classifier on more than six million Bureau of Transportation Statistics flight records spanning 141 airports and 21 years, labeling high-risk crew sequences across four distinct failure modes: delay propagation, duty-time violations, missed connections, and weather exposure.',
      'Engineered a feature space of over 36,000 airport-pair by season combinations, allowing the model to capture route-specific seasonal behavior, such as winter congestion at northern hubs, rather than diluting those signals into global averages.',
      'Constructed a live risk network graph that models airports as nodes and crew connections as edges, making delay propagation paths visible and traceable rather than implicit in a single score.',
      'Integrated real-time METAR aviation weather feeds into a full-stack web application that evaluates a proposed schedule and returns instant, ranked re-sequencing recommendations.',
    ],
    outcome:
      'NavRisk placed 1st out of 50+ teams at the EPPS x American Airlines Data Challenge, against graduate and PhD competitors.',
    stack: ['XGBoost', 'Python', 'METAR', 'Feature Engineering', 'Full-Stack'],
    award: '1st of 50+ teams, EPPS x American Airlines Data Challenge',
  },
  {
    name: 'Kolana',
    tagline: 'Identity-based payments: point your camera at a person and speak.',
    overview:
      'Crypto payments still require the least human interface imaginable: a 44-character wallet address. Kolana replaces addresses with faces and typing with natural speech. The user points a phone at an enrolled contact, says something like "send twenty dollars," and the transfer settles on-chain in under half a second.',
    points: [
      'Deployed an InsightFace facial recognition model on a DigitalOcean cloud server; every enrolled contact is represented as a 512-dimensional face embedding stored in MongoDB Atlas, and live camera frames are resolved to identities in real time through Atlas Vector Search similarity queries.',
      'Built a voice pipeline in which speech is parsed by Gemini 2.5 Flash into a structured payment intent (amount, recipient, timing), and ElevenLabs speaks a confirmation back to the user.',
      'Executed live wallet-to-wallet SOL transfers on the Solana blockchain with settlement in approximately 400 milliseconds, orchestrated by a FastAPI backend that coordinates recognition, intent parsing, and transaction submission.',
    ],
    outcome:
      'Kolana won Best Use of Solana at HackHCC, built end-to-end within the hackathon window.',
    stack: ['Solana', 'InsightFace', 'MongoDB Atlas', 'Vector Search', 'Gemini', 'ElevenLabs', 'FastAPI'],
    award: 'Best Use of Solana, HackHCC',
    link: 'https://devpost.com/nandhu-alahari',
  },
  {
    name: 'Nestor',
    tagline: 'Scenario-driven portfolio rebalancing grounded in market history.',
    overview:
      'Generic portfolio advice optimizes for an average future. Nestor rebalances for the specific scenario an investor is actually worried about, whether that is a pandemic, a technology surge, or a rate shock, by conditioning its predictions on how comparable regimes have behaved historically.',
    points: [
      'Designed a two-stage engine: XGBoost predicts per-asset returns conditioned on the selected market scenario, and a Mean-Variance Optimization layer solves for the allocation that minimizes portfolio risk at the target return, turning predictions into a mathematically grounded rebalancing decision.',
      'Built the training and inference pipeline on a Kaggle set of 8,049 tickers (5,884 stocks and 2,165 ETFs), real-time Yahoo Finance prices, and 10 FRED macroeconomic indicators. Six of those indicators feed the XGBoost model: Treasury yields, CPI, unemployment, and the VIX among them.',
      'Integrated the Gemini API to translate raw optimization outputs into plain-language, actionable insights, so users receive reasoning about why the allocation shifted rather than an unexplained weight vector.',
    ],
    outcome:
      'Nestor finished top 5 at the Goldman Sachs & JSOM Hackathon.',
    stack: ['XGBoost', 'Mean-Variance Optimization', 'Python', 'Gemini', 'FRED', 'Yahoo Finance'],
    award: 'Top 5, Goldman Sachs & JSOM Hackathon',
  },
  {
    name: 'MemeQA',
    tagline: 'A holistic benchmark for machine understanding of memes.',
    overview:
      'Memes are among the hardest multimodal understanding problems in NLP: the meaning lives in the interaction between an image, its text, and shared cultural context. Existing benchmarks tested narrow slices of that problem. MemeQA evaluates it holistically, and the results show that state-of-the-art models still miss the point.',
    points: [
      'Designed and implemented a multimodal AI system combining vision and NLP for meme understanding, leveraging large vision-language models with multi-task reasoning across sentiment, intent, and contextual inference.',
      'Built and evaluated a dataset pipeline of more than 9,000 multiple-choice questions spanning seven cognitive aspects of meme comprehension, from fine-grained visual recognition to commonsense and cultural reasoning.',
      'Applied LoRA fine-tuning to adapt large vision-language models efficiently, and adversarial filtering to eliminate questions solvable through statistical shortcuts, ensuring the benchmark measures genuine understanding.',
      'Evaluation showed state-of-the-art large multimodal models performing substantially below human accuracy, with errors concentrated on memes requiring reasoning beyond surface-level sentiment.',
    ],
    outcome:
      'Published at ACL 2025 (Proceedings of the 63rd Annual Meeting of the Association for Computational Linguistics), one of the premier venues in natural language processing.',
    stack: ['Vision-Language Models', 'LoRA', 'PyTorch', 'Multimodal QA', 'NLP'],
    award: 'Published at ACL 2025',
    link: 'https://aclanthology.org/2025.acl-long.927',
  },
]

export interface TimelineItem {
  when: string
  /** Rendered as: lead <strong>focus</strong> rest */
  lead: string
  focus: string
  rest: string
}

export const TIMELINE: TimelineItem[] = [
  {
    when: 'Age 7',
    lead: 'Started',
    focus: 'building',
    rest: ' with LEGO, learning to turn a big idea into small, ordered steps. That habit became how I approach engineering.',
  },
  {
    when: 'Age 12',
    lead: 'Got into',
    focus: 'puzzles',
    rest: " and Rubik's cubes. My first solve took over two minutes; better algorithms, not faster hands, got me to 40 seconds.",
  },
  {
    when: 'Age 17',
    lead: 'Moved into',
    focus: 'research',
    rest: ', co-authoring MemeQA, published at ACL 2025, then joining more research labs at UT Dallas.',
  },
  {
    when: 'Age 18',
    lead: 'Focused on',
    focus: 'shipping',
    rest: ': delivering projects for competitions and clubs on real deadlines, and building the communication skills to lead them. 1st of 50+ teams at EPPS x American Airlines, Best Use of Solana at HackHCC, top 5 at Goldman Sachs.',
  },
  {
    when: 'Today',
    lead: 'Building',
    focus: 'applied ML',
    rest: ' on three teams at once: BeyondNeuro for patients and caregivers, AskUTD for campus questions, and SkyAlert for disaster response.',
  },
]

export interface WorkCard {
  meta: string
  name: string
  line: string
  tags: string[]
  status: string
  to: string
}

export const WORK: WorkCard[] = [
  {
    meta: 'AI software engineer, GDSC · sep 2026 - present',
    name: 'AskUTD',
    line: 'Answers UTD policy and degree questions from 200+ official PDFs, with exact page citations.',
    tags: ['rag', 'bm25', 'bge-reranker', 'llama-3.1', 'fastapi', 'next.js'],
    status: 'in development · nightly RAGAS evals',
    to: '/experience',
  },
  {
    meta: 'ml engineer, AI Society · sep 2026 - present',
    name: 'SkyAlert',
    line: 'Detects and maps wildfire and flood damage from satellite imagery for first responders.',
    tags: ['resnet', 'u-net', 'nasa-firms', 'fastapi', 'streamlit'],
    status: 'in development · two-phase vision pipeline',
    to: '/experience',
  },
  {
    meta: 'software engineer, UTD EPICS · aug 2026 - present',
    name: 'BeyondNeuro',
    line: 'Cognitive wellness platform for stroke survivors, dementia patients, and caregivers.',
    tags: ['react', 'pwa', 'wcag', 'rbac'],
    status: 'shipping · sprint 1 of 4',
    to: '/experience',
  },
  {
    meta: 'data challenge · 2026',
    name: 'NavRisk',
    line: 'Scores airline crew schedules for delay, duty, connection, and weather risk.',
    tags: ['xgboost', 'python', 'metar', 'rest-api'],
    status: '1st of 50+ teams · EPPS x American Airlines',
    to: '/projects',
  },
  {
    meta: 'hackathon · 2026',
    name: 'Kolana',
    line: 'Pay someone on Solana by pointing your camera at them and speaking.',
    tags: ['solana', 'insightface', 'mongodb-vector', 'gemini', 'fastapi'],
    status: 'Best Use of Solana · HackHCC',
    to: '/projects',
  },
  {
    meta: 'research · 2024 - 2025',
    name: 'MemeQA',
    line: 'A 9,000+ question benchmark testing whether multimodal models understand memes.',
    tags: ['vision-language', 'lora', 'pytorch', 'nlp'],
    status: 'published · ACL 2025',
    to: '/projects',
  },
]

export const ROLES = [
  'building machine learning systems',
  'designing retrieval pipelines',
  'training vision models',
  'shipping under deadlines',
  'solving cubes in 40 seconds',
]

export interface FocusArea {
  id: string
  name: string
  blurb: string
  examples: { kind: 'project' | 'tools'; label: string }[]
}

export const FOCUS: FocusArea[] = [
  {
    id: 'machine_learning',
    name: 'Machine Learning',
    blurb: 'Models that are trained, evaluated, and served behind a real API.',
    examples: [
      { kind: 'project', label: 'NavRisk: XGBoost risk scoring for crew schedules' },
      { kind: 'project', label: 'Nestor: scenario-driven portfolio rebalancing' },
      { kind: 'tools', label: 'Python, XGBoost, PyTorch, FastAPI' },
    ],
  },
  {
    id: 'nlp_retrieval',
    name: 'NLP & Retrieval',
    blurb: 'Language systems whose answers can be traced back to a source.',
    examples: [
      { kind: 'project', label: 'AskUTD: hybrid search, reranking, page citations' },
      { kind: 'project', label: 'MemeQA: multimodal benchmark, ACL 2025' },
      { kind: 'tools', label: 'BM25, sentence-transformers, Llama 3.1, LoRA' },
    ],
  },
  {
    id: 'computer_vision',
    name: 'Computer Vision',
    blurb: 'Turning images and video into decisions people can act on.',
    examples: [
      { kind: 'project', label: 'SkyAlert: ResNet classifier and U-Net segmentation' },
      { kind: 'project', label: 'Kolana: face recognition for identity payments' },
      { kind: 'tools', label: 'PyTorch, InsightFace, NASA FIRMS' },
    ],
  },
  {
    id: 'full_stack',
    name: 'Full-stack',
    blurb: 'The interface and the backend that make a model usable.',
    examples: [
      { kind: 'project', label: 'BeyondNeuro: accessible PWA for patients and caregivers' },
      { kind: 'project', label: 'Kolana: FastAPI service on MongoDB vector search' },
      { kind: 'tools', label: 'React, Next.js, FastAPI, Supabase' },
    ],
  },
  {
    id: 'research',
    name: 'Research',
    blurb: 'Careful experiments, reproducible pipelines, and written results.',
    examples: [
      { kind: 'project', label: 'MemeQA: published at ACL 2025' },
      { kind: 'project', label: 'Gu Lab: neural data and video pipelines' },
      { kind: 'tools', label: 'Python, MATLAB, PyTorch' },
    ],
  },
]

export const PRINCIPLES = [
  {
    title: 'Find the better method',
    body: 'Before working harder, I look for a smarter approach. Understanding the problem comes before optimizing it.',
  },
  {
    title: 'Back it with evidence',
    body: 'A result is not finished until it can be measured and checked. I would rather prove something works than assume it does.',
  },
  {
    title: 'Design for the end user',
    body: 'Software is only as good as the experience of the person using it. Clarity and accessibility come before extra features.',
  },
  {
    title: 'Deliver on deadline',
    body: 'Scope early, ship a working version, then improve it. Progress you can show beats a perfect plan.',
  },
]

export const EXPERIENCE: ExperienceItem[] = [
  {
    role: 'AI Software Engineer, GDSC',
    org: 'Google Developer Student Clubs, UT Dallas',
    period: 'Sep 2026 - Present',
    summary:
      'AskUTD is a RAG chatbot for questions that only the university can answer: course requirements, degree plans, registrar policies, and academic regulations. Every answer has to point at the page it came from.',
    bullets: [
      'Developing AskUTD across 200+ official PDF documents, returning answers on course requirements, degree plans, registrar policies, and academic regulations with exact page citations.',
      'Implementing a hybrid retrieval pipeline that combines BM25 keyword search with dense vector search (sentence-transformers) and a local BGE cross-encoder reranker.',
      'Building query decomposition and Self-RAG verification loops, with nightly RAGAS evaluations, to cut hallucinations. The stack is Python, FastAPI, Next.js, and a local Llama 3.1 8B served through Ollama.',
    ],
    tech: ['RAG', 'FastAPI', 'Next.js', 'BM25', 'Llama 3.1', 'RAGAS'],
  },
  {
    role: 'Machine Learning Engineer, Artificial Intelligence Society',
    org: 'Artificial Intelligence Society at UT Dallas',
    period: 'Sep 2026 - Present',
    summary:
      'SkyAlert turns satellite imagery into something a first responder can use: is this area on fire, is it flooded, and where exactly.',
    bullets: [
      'Building SkyAlert, a computer vision system that detects wildfires and floods from satellite imagery so first responders get a damage assessment without waiting on a manual review.',
      'Engineering a two-phase pipeline: a ResNet binary classifier flags affected regions, then a U-Net semantic segmentation model maps the damage at the pixel level.',
      'Ingesting imagery from NASA FIRMS and the DeepGlobe dataset, computing spectral indices (NDVI, NBR) as features, and serving the result through FastAPI plus an interactive Streamlit and Folium map.',
    ],
    tech: ['ResNet', 'U-Net', 'FastAPI', 'Streamlit', 'NASA FIRMS', 'Computer Vision'],
  },
  {
    role: 'Software Engineer, BeyondNeuro',
    org: 'UTD EPICS, partnered with a nonprofit client',
    period: 'Aug 2026 - Present',
    summary:
      'BeyondNeuro is a cognitive wellness platform for stroke survivors, dementia patients, and the people who care for them. I am the software engineer and project liaison on a UTD EPICS team, turning clinical priorities into a build plan and shipping it.',
    bullets: [
      'Architected the platform around interactive cognitive modules, an activity library, local progress tracking, and a progressive web app with an AI avatar, sequenced across a 4-sprint roadmap agreed with the client in biweekly stakeholder syncs.',
      'Shipping sprint 1 of 4: the first cognitive training modules and the user onboarding flow.',
      'Designed the system for WCAG accessibility and role-based access so patients, family caregivers, and healthcare providers each see only what they should.',
    ],
    tech: ['React', 'PWA', 'Accessibility', 'RBAC', 'AI'],
  },
  {
    role: 'Research Assistant, Computational Neuroscience Lab',
    org: 'The University of Texas at Dallas, under Dr. Zirong Gu',
    period: 'Jun 2026 - Aug 2026',
    summary:
      'The lab studies how neural activity drives behavior. I restored the analysis pipeline that had stalled, then built the tooling that lets researchers see what each cluster actually is.',
    bullets: [
      'Diagnosed and restored a broken MATLAB pipeline implementing affinity propagation clustering over multi-camera behavioral tracking data (3D pose, acceleration, and motion frequency), clearing classification failures that had stalled analysis across 12+ experimental sessions.',
      'Engineered a Python video-processing pipeline from scratch to auto-generate per-cluster outputs from clustered sensor data, so researchers can visually audit what each statistical cluster corresponds to in the raw footage.',
      'Redesigned the cluster-to-frame mapping algorithm, cutting processing time 60% on recording sessions longer than 10 hours.',
    ],
    tech: ['MATLAB', 'Python', 'Affinity Propagation', '3D Pose', 'Video Processing'],
  },
  {
    role: 'AI/ML Security Software Engineer',
    org: 'The University of Texas at Dallas, R.I.D.E. Program',
    period: 'Sep 2025 - Dec 2025',
    summary:
      'Research on using machine learning for software security: systems that harden code against reverse engineering, and the measurements that say whether the hardening worked.',
    bullets: [
      'Developed Python-based AI/ML systems to design and apply code obfuscation techniques, making software harder to reverse engineer and exploit.',
      'Built benchmarking frameworks and trained models to measure obfuscation strength, surface vulnerabilities, and test resistance to automated deobfuscation tools across different threat scenarios.',
    ],
    tech: ['Python', 'Machine Learning', 'Code Obfuscation', 'Security Benchmarking'],
  },
  {
    role: 'Machine Learning Researcher',
    org: 'The University of Texas at Dallas, under Dr. Vincent Ng',
    period: 'Jun 2024 - Sep 2024',
    summary:
      'Multimodal NLP research on machine understanding of memes, culminating in MemeQA, published at ACL 2025.',
    bullets: [
      'Built a multimodal system combining computer vision and NLP, using vision-language models to classify sentiment, intent, and context in memes.',
      'Engineered a data curation pipeline and LoRA fine-tuning workflow with adversarial filtering across a 9,000+ question dataset, so the benchmark measures understanding rather than shortcut heuristics.',
      'Co-authored MemeQA: Holistic Evaluation for Meme Understanding, published in the Proceedings of the 63rd Annual Meeting of the Association for Computational Linguistics (ACL 2025).',
    ],
    tech: ['PyTorch', 'Vision-Language Models', 'LoRA', 'Dataset Engineering', 'NLP'],
  },
]

export const EDUCATION = {
  school: 'University of Texas at Dallas',
  degree: 'B.S. Computer Science',
  grad: 'Expected December 2027',
  gpa: '4.0 / 4.0',
  coursework: [
    'Data Structures & Algorithms',
    'Computer Architecture',
    'Systems Programming (C, POSIX threads/sockets)',
  ],
}

export const LINKS = {
  github: 'https://github.com/nandhanalahari',
  linkedin: 'https://www.linkedin.com/in/nandhan-alahari/',
  devpost: 'https://devpost.com/nandhu-alahari',
  email: 'mailto:alahari.nandhan@gmail.com',
}
