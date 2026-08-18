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
    title: 'Personal website launched',
    date: 'August 17, 2026',
    kind: 'Project',
    body: 'This site is live. Built with React and TypeScript, with a hand-rolled ASCII 3D engine and a generative flow-field background. More projects and writing to come.',
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
      { name: 'RESTful APIs' },
      { name: 'Data Structures & Algorithms' },
      { name: 'Agile Development' },
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
      'NavRisk won 1st place at the EPPS x American Airlines Data Challenge, judged on both modeling rigor and operational applicability.',
    stack: ['XGBoost', 'Python', 'METAR', 'Feature Engineering', 'Full-Stack'],
    award: '1st Place, EPPS x American Airlines Data Challenge',
  },
  {
    name: 'Kolana',
    tagline: 'Identity-based payments: point your camera at a person and speak.',
    overview:
      'Crypto payments still require the least human interface imaginable: a 44-character wallet address. Kolana replaces addresses with faces and typing with natural speech. The user points a phone at an enrolled contact, says something like "send twenty dollars," and the transfer settles on-chain in under half a second.',
    points: [
      'Deployed an InsightFace facial recognition model on a DigitalOcean cloud server; every enrolled contact is represented as a 512-dimensional face embedding stored in MongoDB Atlas, and live camera frames are resolved to identities in real time through Atlas Vector Search similarity queries.',
      'Built a voice pipeline in which ElevenLabs transcribes the spoken command, the Gemini API parses the natural language into a structured payment intent (amount, recipient, timing), and ElevenLabs speaks a confirmation back to the user, closing the loop without a screen interaction.',
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
      'Built the training and inference pipeline across three data sources: historical market data from Kaggle for training, real-time prices from Yahoo Finance for current positions, and FRED macroeconomic indicators to anchor each scenario in measurable regime characteristics.',
      'Integrated the Gemini API to translate raw optimization outputs into plain-language, actionable insights, so users receive reasoning about why the allocation shifted rather than an unexplained weight vector.',
    ],
    outcome:
      'Nestor earned an Honorable Mention and a top-six finish at the Goldman Sachs & JSOM Hackathon.',
    stack: ['XGBoost', 'Mean-Variance Optimization', 'Python', 'Gemini', 'FRED', 'Yahoo Finance'],
    award: 'Honorable Mention (Top 6), Goldman Sachs & JSOM Hackathon',
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
  {
    name: 'ObfuXtreme',
    tagline: 'Measurable code obfuscation for software security research.',
    overview:
      'Obfuscation is only meaningful if its strength can be measured. This research project, part of the R.I.D.E. program at UT Dallas, builds both sides of that equation: systems that harden code against reverse engineering, and the benchmarking machinery that quantifies how much harder the code actually became.',
    points: [
      'Developed Python-based AI/ML systems that design and apply code obfuscation techniques, raising the cost of reverse engineering and exploitation for protected software.',
      'Built benchmarking frameworks that score obfuscation strength and surface residual vulnerabilities in protected code, replacing intuition with repeatable measurement.',
      'Trained machine learning models to evaluate resistance against automated deobfuscation tooling across varying threat scenarios, closing the loop between defensive transformation and adversarial evaluation.',
    ],
    stack: ['Python', 'Machine Learning', 'Software Security', 'Benchmarking'],
  },
]

export const EXPERIENCE: ExperienceItem[] = [
  {
    role: 'Research Assistant, Computational Neuroscience Lab',
    org: 'The University of Texas at Dallas, under Dr. Zirong Gu',
    period: 'Jun 2026 - Present',
    summary:
      'The lab investigates how neural activity drives behavior. My work is the data infrastructure that makes those questions answerable: transforming terabytes of raw multi-camera video into labeled, quantified behavioral sequences that downstream analyses can trust.',
    bullets: [
      'Debug and maintain a MATLAB clustering pipeline that classifies animal action sequences from multi-camera behavioral tracking data, operating on 3D pose reconstructions, acceleration signals, and motion frequency features across large experimental datasets.',
      'Built a Python video-analysis pipeline that generates per-cluster behavioral videos from clustered motion data, giving researchers a direct visual audit of what each statistical cluster corresponds to in the raw footage, a critical validation step before any scientific claim rests on the clustering.',
      'Redesigned the cluster-to-frame mapping logic at the core of the video pipeline, substantially reducing processing time on recording sessions exceeding ten hours and making full-session analysis a same-day operation rather than an overnight batch job.',
    ],
    tech: ['MATLAB', 'Python', 'Clustering', '3D Pose Estimation', 'Signal Processing'],
  },
  {
    role: 'AI/ML Security Software Engineer',
    org: 'The University of Texas at Dallas, R.I.D.E. Program',
    period: 'Sep 2025 - Dec 2025',
    summary:
      'Research engineering on "Leveraging AI/ML for Software Security," a project that applies machine learning to both sides of the software protection problem: hardening code against attack and rigorously measuring the protection achieved.',
    bullets: [
      'Developed Python-based AI/ML systems to design and apply code obfuscation techniques, enhancing software resilience against reverse engineering and exploitation.',
      'Built benchmarking frameworks that quantify obfuscation strength and identify vulnerabilities in protected code, establishing an objective basis for comparing protection strategies.',
      'Trained machine learning models to evaluate resistance to automated deobfuscation tools across varying threat scenarios, ensuring defenses were validated against realistic adversaries rather than assumed effective.',
    ],
    tech: ['Python', 'Machine Learning', 'Code Obfuscation', 'Security Benchmarking'],
  },
  {
    role: 'Machine Learning Researcher',
    org: 'The University of Texas at Dallas, NLP Group',
    period: 'Jun 2024 - Sep 2024',
    summary:
      'Multimodal NLP research on machine understanding of memes, culminating in MemeQA, a benchmark published at ACL 2025.',
    bullets: [
      'Designed and implemented a multimodal AI system combining vision and NLP for meme understanding, leveraging large vision-language models and multi-task reasoning across sentiment, intent, and contextual inference.',
      'Built and evaluated a dataset pipeline of more than 9,000 questions for multimodal question answering, applying LoRA fine-tuning for efficient model adaptation and adversarial filtering to remove questions solvable by shortcut heuristics.',
      'Co-authored the resulting paper, MemeQA: Holistic Evaluation for Meme Understanding, published in the Proceedings of the 63rd Annual Meeting of the Association for Computational Linguistics (ACL 2025).',
    ],
    tech: ['PyTorch', 'Vision-Language Models', 'LoRA', 'Dataset Engineering', 'NLP'],
  },
]

export const EDUCATION = {
  school: 'University of Texas at Dallas',
  degree: 'B.S. Computer Science',
  grad: 'Expected May 2028',
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
