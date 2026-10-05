import React from 'react';
import { Link } from 'react-router-dom';
import founderImage from '../assets/harish-sonkar.jpg';
import {
  Code2,
  Terminal,
  ExternalLink,
  Award,
  GraduationCap,
  Sparkles,
  ChevronRight,
  Shield,
  Layers,
  Cpu,
  Brain,
  Rocket,
  Compass,
  ArrowUpRight,
  CheckCircle2,
  Flame,
  Globe,
  Database,
  Wrench,
} from 'lucide-react';

export const FounderPage = () => {

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const skillsData = {
    languages: [
      { name: 'C', icon: Code2, desc: 'Procedural & Systems Programming' },
      { name: 'Java', icon: Terminal, desc: 'Object-Oriented Architecture' },
      { name: 'Python', icon: Brain, desc: 'Scripting & Machine Learning' },
    ],
    web: [
      { name: 'HTML5', icon: Globe, desc: 'Semantic Markup & Accessibility' },
      { name: 'CSS3', icon: Layers, desc: 'Responsive Design & Animations' },
      { name: 'React.js', icon: Code2, desc: 'Component Architecture & State' },
      { name: 'Node.js', icon: Cpu, desc: 'Asynchronous Event-Driven Backend' },
      { name: 'Express.js', icon: Terminal, desc: 'RESTful API Engineering' },
    ],
    database: [
      { name: 'MongoDB Atlas', icon: Database, desc: 'NoSQL Document Store & Aggregations' },
    ],
    tools: [
      { name: 'Git', icon: Terminal, desc: 'Distributed Version Control' },
      { name: 'GitHub', icon: Globe, desc: 'Collaborative Source Code Workflow' },
      { name: 'VS Code', icon: Code2, desc: 'Primary IDE & Development Tooling' },
      { name: 'Render', icon: Globe, desc: 'Cloud Application Deployment' },
      { name: 'Netlify', icon: Globe, desc: 'Continuous Deployment & JAMstack' },
    ],
  };

  const projects = [
    {
      title: 'CrowdSignal',
      badge: 'Real-Time MERN Platform',
      tagline: 'Real-Time Crowd Monitoring Platform',
      description:
        'Built a real-time crowd monitoring platform using React, Node.js, Express, and MongoDB Atlas with REST APIs for accurate location telemetry.',
      techStack: ['React', 'Node.js', 'Express', 'MongoDB Atlas', 'REST APIs'],
      liveDemo: 'https://cloud-signal-frontend.onrender.com/',
      github: 'https://github.com/Jagadambh',
      featured: true,
      accent: 'from-orange-500/10 via-amber-500/5 to-transparent',
      borderColor: 'border-orange-500/30',
      badgeColor: 'bg-orange-50 text-orange-700 border-orange-200',
    },
    {
      title: 'Pooja Bhandaar',
      badge: 'E-Commerce Website',
      tagline: 'Responsive Puja & Devotional Merchandise Store',
      description:
        'Developed a responsive e-commerce web application with comprehensive product catalogs, dynamic item browsing, and an intuitive user authentication interface built using modern web standards.',
      techStack: ['HTML5', 'CSS3', 'Responsive UI', 'Authentication UI'],
      liveDemo: 'https://puja-bhandaar.netlify.app/',
      github: 'https://github.com/Jagadambh',
      featured: false,
      accent: 'from-blue-500/10 via-indigo-500/5 to-transparent',
      borderColor: 'border-blue-500/30',
      badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-850 antialiased selection:bg-brand-primary selection:text-white">

      {/* STICKY QUICK SUB-NAV */}
      <div className="sticky top-16 z-30 bg-white/85 backdrop-blur-md border-b border-slate-200 shadow-2xs py-2.5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between overflow-x-auto gap-4 scrollbar-none text-xs font-semibold">
          <div className="flex items-center gap-1.5 shrink-0 text-slate-900 font-extrabold tracking-tight">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Harish Sonkar</span>
            <span className="text-slate-400 font-normal">|</span>
            <span className="text-brand-primary">Founder Portfolio</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {[
              { id: 'about', label: 'About' },
              { id: 'skills', label: 'Skills' },
              { id: 'projects', label: 'Projects' },
              { id: 'hackathons', label: 'SIH 2025 & Adobe' },
              { id: 'education', label: 'Education' },
              { id: 'interests', label: 'Beyond Coding' },
              { id: 'github', label: 'GitHub' },
            ].map((nav) => (
              <button
                key={nav.id}
                onClick={() => scrollToSection(nav.id)}
                className="px-3 py-1 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
              >
                {nav.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* HERO SECTION */}
      <section className="relative overflow-hidden py-16 sm:py-24 bg-gradient-to-b from-white via-slate-50/80 to-slate-50 border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">

            {/* Left Content */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left order-2 lg:order-1">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-primary/10 border border-brand-primary/20 text-brand-primary text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Founder &amp; CEO · Platform Architect</span>
              </div>

              <div className="space-y-2">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-none">
                  HARISH SONKAR
                </h1>
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 pt-1">
                  <span className="text-lg sm:text-xl font-bold text-brand-secondary">
                    Founder &amp; CEO
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="text-sm sm:text-base font-semibold text-slate-600">
                    B.Tech CSE · KIIT University (2024–28)
                  </span>
                </div>
              </div>

              <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl mx-auto lg:mx-0">
                Computer Science student passionate about software development, full-stack engineering, AI/ML, real-time systems, and building practical technology solutions.
              </p>

              {/* Call to Actions */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3.5 pt-2">
                <a
                  href="https://github.com/Jagadambh"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm flex items-center gap-2 shadow-sm transition hover:shadow"
                >
                  <Terminal className="w-4 h-4" />
                  <span>GitHub Profile</span>
                  <ArrowUpRight className="w-3.5 h-3.5 opacity-70" />
                </a>

                <button
                  onClick={() => scrollToSection('projects')}
                  className="px-5 py-2.5 rounded-xl bg-white border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-800 font-bold text-sm flex items-center gap-2 shadow-2xs transition"
                >
                  <Code2 className="w-4 h-4 text-brand-primary" />
                  <span>View Projects</span>
                </button>

                <Link
                  to="/colleges"
                  className="px-4 py-2.5 rounded-xl bg-brand-primary/10 hover:bg-brand-primary/15 text-brand-primary font-bold text-sm flex items-center gap-1.5 transition"
                >
                  <span>Explore College Platform</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>

              {/* Verified Credentials Pills */}
              <div className="pt-4 flex flex-wrap items-center justify-center lg:justify-start gap-2.5 text-xs text-slate-500 font-medium">
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 border border-slate-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>SIH 2025 Leader &amp; Adobe Hackathon</span>
                </span>
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 border border-slate-200">
                  <Flame className="w-3.5 h-3.5 text-orange-600" />
                  <span>Full-Stack MERN Architecture</span>
                </span>
              </div>
            </div>

            {/* Right Profile Image Frame */}
            <div className="lg:col-span-5 flex justify-center order-1 lg:order-2">
              <div className="relative group">
                {/* Subtle Animated Pulsing Ring */}
                <div className="absolute -inset-2.5 rounded-full bg-gradient-to-tr from-brand-primary via-indigo-400 to-brand-secondary opacity-30 blur-md group-hover:opacity-50 transition duration-700 animate-pulse" />

                {/* Outer Circular Frame */}
                <div className="relative w-56 h-56 sm:w-64 sm:h-64 md:w-72 md:h-72 rounded-full p-2 bg-white shadow-2xl border-2 border-slate-200 group-hover:scale-[1.02] transition-transform duration-500">
                  <div className="w-full h-full rounded-full overflow-hidden bg-slate-100 shadow-inner">
                    <img
                      src={founderImage}
                      alt="Harish Sonkar - Founder & CEO"
                      className="w-full h-full object-cover object-top filter contrast-[1.03] group-hover:scale-105 transition duration-500"
                      loading="eager"
                    />
                  </div>
                </div>

                {/* Floating Verified Badge */}
                <div className="absolute bottom-2 right-4 bg-white/95 backdrop-blur-xs px-3 py-1 rounded-full shadow-md border border-slate-200 flex items-center gap-1.5 text-[11px] font-bold text-slate-800">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>Founder &amp; CEO</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ABOUT ME SECTION */}
      <section id="about" className="py-16 max-w-6xl mx-auto px-4 sm:px-6">
        <div className="space-y-8">
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-primary">
              Core Background
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              About Me
            </h2>
            <p className="text-xs text-slate-500 max-w-2xl">
              An engineer's commitment to building usable, high-integrity digital products.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
            {/* Main Narrative Card */}
            <div className="md:col-span-8 bg-white p-7 sm:p-9 rounded-3xl border border-slate-200 shadow-sm space-y-5">
              <p className="text-sm sm:text-base text-slate-700 leading-relaxed">
                Computer Science student with hands-on experience building and deploying full-stack web applications using the <strong className="font-bold text-slate-900">MERN stack</strong>. Skilled in <strong className="font-bold text-slate-900">React, Node.js, Express, MongoDB Atlas</strong>, and <strong className="font-bold text-slate-900">REST APIs</strong>.
              </p>
              <p className="text-sm sm:text-base text-slate-700 leading-relaxed">
                Passionate about software development, systems engineering, and solving practical problems. Demonstrated leadership as Team Leader in <strong className="font-bold text-slate-900">Smart India Hackathon 2025 (SIH 2025)</strong> designing an AI/ML-based fake document detection system, and participating in the <strong className="font-bold text-slate-900">Adobe Hackathon</strong>.
              </p>

              <div className="pt-3 border-t border-slate-100 flex flex-wrap gap-4 text-xs font-semibold text-slate-600">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-brand-primary" />
                  Full-Stack Architecture
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-brand-primary" />
                  REST API Design
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-brand-primary" />
                  AI/ML Pipeline Integration
                </span>
              </div>
            </div>

            {/* Quick Profile Summary Card */}
            <div className="md:col-span-4 bg-gradient-to-br from-slate-900 to-navy-950 text-white p-7 rounded-3xl shadow-sm flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                  <Compass className="w-5 h-5 text-brand-secondary" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Focus &amp; Philosophy</h3>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    Engineering reliable, data-grounded software rather than speculative demos.
                  </p>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-white/10 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px] uppercase">Institution</span>
                  <span className="font-bold text-slate-100">KIIT University, Bhubaneswar</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px] uppercase">Discipline</span>
                  <span className="font-bold text-slate-100">B.Tech Computer Science (2024–28)</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px] uppercase">Primary Role</span>
                  <span className="font-bold text-emerald-400">Founder &amp; Lead Developer</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TECHNICAL SKILLS */}
      <section id="skills" className="py-16 bg-white border-y border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-10">
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-primary">
              Core Competencies
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Technical Skills
            </h2>
            <p className="text-xs text-slate-500 max-w-xl">
              Languages, frameworks, databases, and deployment platforms utilized across projects.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

            {/* LANGUAGES */}
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-4 hover:shadow-md transition">
              <div className="flex items-center gap-2.5 pb-2 border-b border-slate-200/80">
                <Code2 className="w-4 h-4 text-brand-primary" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Languages</h3>
              </div>
              <div className="space-y-2.5">
                {skillsData.languages.map((sk) => (
                  <div
                    key={sk.name}
                    className="p-2.5 rounded-xl bg-white border border-slate-200/90 hover:border-brand-primary/50 hover:shadow-xs transition group"
                  >
                    <div className="text-xs font-bold text-slate-800 group-hover:text-brand-primary transition">
                      {sk.name}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{sk.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* WEB TECHNOLOGIES */}
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-4 hover:shadow-md transition">
              <div className="flex items-center gap-2.5 pb-2 border-b border-slate-200/80">
                <Globe className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Web Technologies</h3>
              </div>
              <div className="space-y-2.5">
                {skillsData.web.map((sk) => (
                  <div
                    key={sk.name}
                    className="p-2.5 rounded-xl bg-white border border-slate-200/90 hover:border-indigo-400 hover:shadow-xs transition group"
                  >
                    <div className="text-xs font-bold text-slate-800 group-hover:text-indigo-600 transition">
                      {sk.name}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{sk.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* DATABASE */}
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-4 hover:shadow-md transition">
              <div className="flex items-center gap-2.5 pb-2 border-b border-slate-200/80">
                <Database className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Database</h3>
              </div>
              <div className="space-y-2.5">
                {skillsData.database.map((sk) => (
                  <div
                    key={sk.name}
                    className="p-3 rounded-xl bg-white border border-slate-200/90 hover:border-emerald-400 hover:shadow-xs transition group"
                  >
                    <div className="text-xs font-bold text-slate-800 group-hover:text-emerald-600 transition">
                      {sk.name}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">{sk.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* TOOLS & PLATFORMS */}
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-4 hover:shadow-md transition">
              <div className="flex items-center gap-2.5 pb-2 border-b border-slate-200/80">
                <Wrench className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Tools &amp; Platforms</h3>
              </div>
              <div className="space-y-2">
                {skillsData.tools.map((sk) => (
                  <div
                    key={sk.name}
                    className="p-2 rounded-xl bg-white border border-slate-200/90 hover:border-amber-400 hover:shadow-xs transition group flex items-center justify-between"
                  >
                    <span className="text-xs font-bold text-slate-800 group-hover:text-amber-700 transition">
                      {sk.name}
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal">{sk.desc.split(' ')[0]}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* HACKATHONS SECTION (SIH 2025 & ADOBE HACKATHON) */}
      <section id="hackathons" className="py-20 max-w-6xl mx-auto px-4 sm:px-6">
        <div className="space-y-10">
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-primary">
              Competitive Engineering
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Hackathons &amp; Innovation
            </h2>
            <p className="text-xs text-slate-500 max-w-xl">
              National and industry hackathon achievements, team leadership, and competitive problem-solving.
            </p>
          </div>

          {/* SIH 2025 CARD */}
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-navy-950 text-white p-8 sm:p-12 shadow-xl border border-slate-800">
            <div className="absolute top-0 right-0 w-80 h-80 bg-brand-secondary/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 space-y-8">
              {/* Header Badge & Title */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-400 text-xs font-bold tracking-wider uppercase">
                    <Award className="w-3.5 h-3.5" />
                    <span>National Hackathon Leadership</span>
                  </div>
                  <h3 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
                    Smart India Hackathon 2025
                  </h3>
                  <p className="text-emerald-400 font-bold text-sm tracking-wide">
                    ROLE: TEAM LEADER
                  </p>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-2 text-xs font-semibold">
                  <span className="px-3 py-1.5 rounded-xl bg-white/10 border border-white/15 text-slate-200">
                    AI/ML
                  </span>
                  <span className="px-3 py-1.5 rounded-xl bg-white/10 border border-white/15 text-slate-200">
                    OCR Text Extraction
                  </span>
                  <span className="px-3 py-1.5 rounded-xl bg-white/10 border border-white/15 text-slate-200">
                    OpenCV
                  </span>
                  <span className="px-3 py-1.5 rounded-xl bg-white/10 border border-white/15 text-slate-200">
                    TensorFlow
                  </span>
                </div>
              </div>

              {/* Context & Description */}
              <div className="space-y-4 max-w-3xl">
                <h4 className="text-lg font-bold text-slate-100">
                  AI/ML-Based Fake Document Detection System
                </h4>
                <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                  Led a team in designing and building an AI/ML-based Fake Document Detection System to address a real-world document verification problem.
                </p>
              </div>

              {/* Technical Work vs Leadership Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                {/* Technical Work */}
                <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-3.5">
                  <div className="flex items-center gap-2 text-brand-secondary font-bold text-sm">
                    <Brain className="w-4 h-4" />
                    <span>Technical Implementation</span>
                  </div>
                  <ul className="space-y-2 text-xs sm:text-sm text-slate-300">
                    <li className="flex items-start gap-2">
                      <span className="text-brand-secondary mt-1">•</span>
                      <span><strong>OCR (Optical Character Recognition)</strong> for extracting and validating text from scanned documents</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-brand-secondary mt-1">•</span>
                      <span><strong>OpenCV</strong> for image preprocessing, alignment, and noise filtering</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-brand-secondary mt-1">•</span>
                      <span><strong>Tamper &amp; Forgery Detection</strong> analyzing pixel anomalies and inconsistent typography</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-brand-secondary mt-1">•</span>
                      <span><strong>TensorFlow</strong> deep learning document classification distinguishing genuine from forged certificates</span>
                    </li>
                  </ul>
                </div>

                {/* Leadership Role */}
                <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-3.5">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                    <Shield className="w-4 h-4" />
                    <span>Team Leadership Responsibilities</span>
                  </div>
                  <ul className="space-y-2 text-xs sm:text-sm text-slate-300">
                    <li className="flex items-start gap-2">
                      <span className="text-amber-400 mt-1">•</span>
                      <span>Coordinated task allocation across frontend, backend, and machine learning modules</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-amber-400 mt-1">•</span>
                      <span>Led core technical discussions and system design reviews</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-amber-400 mt-1">•</span>
                      <span>Managed end-to-end sprint planning and milestone deliverables</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-amber-400 mt-1">•</span>
                      <span>Presented solution architecture and execution strategy to evaluation panels</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* ADOBE HACKATHON CARD */}
          <div className="relative rounded-3xl overflow-hidden bg-white text-slate-900 p-8 sm:p-10 shadow-sm border border-slate-200">
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold tracking-wider uppercase">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Industry Hackathon</span>
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                    Adobe Hackathon
                  </h3>
                  <p className="text-rose-600 font-bold text-sm tracking-wide">
                    INNOVATION &amp; RAPID PROTOTYPING
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 text-xs font-semibold">
                  <span className="px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-700">
                    Product Innovation
                  </span>
                  <span className="px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-700">
                    Modern Web Architecture
                  </span>
                  <span className="px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-700">
                    Agile Sprint
                  </span>
                </div>
              </div>

              <div className="space-y-3 max-w-3xl">
                <h4 className="text-base sm:text-lg font-bold text-slate-900">
                  Competitive Problem-Solving &amp; Creative Engineering
                </h4>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Participated in the competitive Adobe Hackathon solving real-world technological challenges. Focused on transforming complex user requirements into performant, elegant digital architectures under tight sprint constraints.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 text-xs">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                  <span className="font-bold text-slate-900 block">Creative Solution Design</span>
                  <p className="text-slate-500">Structured user-centric workflows and scalable module design.</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                  <span className="font-bold text-slate-900 block">Rapid Prototyping</span>
                  <p className="text-slate-500">Accelerated implementation through agile milestone execution.</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                  <span className="font-bold text-slate-900 block">Technical Collaboration</span>
                  <p className="text-slate-500">High-velocity engineering and competitive evaluation presentation.</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* PROJECTS SECTION */}
      <section id="projects" className="py-16 bg-slate-100/70 border-y border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-10">
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-primary">
              Portfolio
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Projects I've Built
            </h2>
            <p className="text-xs text-slate-500 max-w-xl">
              Production web applications, real-time telemetry systems, and interactive tools.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {projects.map((proj) => (
              <div
                key={proj.title}
                className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col justify-between group"
              >
                <div className="p-6 sm:p-7 space-y-4">
                  {/* Badge & Title */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${proj.badgeColor}`}>
                        {proj.badge}
                      </span>
                    </div>
                    <h3 className="text-xl font-extrabold text-slate-900 group-hover:text-brand-primary transition">
                      {proj.title}
                    </h3>
                    <p className="text-xs font-semibold text-slate-500">
                      {proj.tagline}
                    </p>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {proj.description}
                  </p>

                  {/* Tech stack chips */}
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {proj.techStack.map((tech) => (
                      <span
                        key={tech}
                        className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-semibold border border-slate-200"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Footer Action Links */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                  <a
                    href={proj.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-slate-950 transition"
                  >
                    <Terminal className="w-3.5 h-3.5" />
                    <span>GitHub</span>
                  </a>

                  {proj.liveDemo && (
                    <a
                      href={proj.liveDemo}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-primary hover:text-navy-950 transition"
                    >
                      <span>Live Demo</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* EDUCATION SECTION */}
      <section id="education" className="py-16 max-w-6xl mx-auto px-4 sm:px-6">
        <div className="space-y-8">
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-primary">
              Academic Foundation
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Education
            </h2>
            <p className="text-xs text-slate-500 max-w-xl">
              Undergraduate computer science engineering degree.
            </p>
          </div>

          <div className="bg-white p-7 sm:p-9 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 text-brand-primary flex items-center justify-center shrink-0">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                  <span>Currently Enrolled</span>
                </div>
                <h3 className="text-lg sm:text-xl font-extrabold text-slate-900">
                  Bachelor of Technology (B.Tech) in Computer Science &amp; Engineering
                </h3>
                <p className="text-sm font-semibold text-slate-600">
                  KIIT University (Kalinga Institute of Industrial Technology), Bhubaneswar
                </p>
                <p className="text-xs text-slate-500">
                  Undergraduate Academic Batch: 2024–2028
                </p>
              </div>
            </div>

            <div className="shrink-0 w-full md:w-auto text-left md:text-right pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
              <span className="px-3 py-1 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200 inline-block">
                2024–28 Batch
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* GITHUB DEDICATED PROFILE SECTION */}
      <section id="github" className="py-16 bg-white border-y border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="p-8 sm:p-10 rounded-3xl bg-slate-900 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-lg">
            <div className="flex items-center gap-4 text-center md:text-left">
              <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center shrink-0">
                <Terminal className="w-7 h-7 text-white" />
              </div>
              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Open Source &amp; Code Repository
                </span>
                <h3 className="text-2xl font-black text-white">
                  github.com/Jagadambh
                </h3>
                <p className="text-xs text-slate-300">
                  Explore full public source repositories, commit history, and active branches.
                </p>
              </div>
            </div>

            <a
              href="https://github.com/Jagadambh"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-extrabold text-sm flex items-center gap-2 shadow-sm transition shrink-0"
            >
              <span>Visit GitHub Profile</span>
              <ArrowUpRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </section>

      {/* BEYOND CODING / PERSONAL INTERESTS */}
      <section id="interests" className="py-16 max-w-6xl mx-auto px-4 sm:px-6">
        <div className="space-y-8">
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-primary">
              Personal Side
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Beyond Coding
            </h2>
            <p className="text-xs text-slate-500 max-w-xl">
              Interests, strategic recreation, and creative pursuits.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              {
                title: 'Chess',
                icon: '♟',
                desc: 'Strategic thinking, tactical foresight, and deep analytical pattern recognition.',
              },
              {
                title: 'Games',
                icon: '🎮',
                desc: 'Exploring game mechanics, interactive simulations, and real-time multiplayer systems.',
              },
              {
                title: 'Technology',
                icon: '💻',
                desc: 'Reading engineering teardowns, emerging distributed tools, and system architectures.',
              },
              {
                title: 'Building Projects',
                icon: '🚀',
                desc: 'Transforming real-world student and community pain points into working web products.',
              },
            ].map((interest) => (
              <div
                key={interest.title}
                className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2 hover:shadow-md hover:border-slate-300 transition"
              >
                <div className="text-3xl">{interest.icon}</div>
                <h3 className="font-extrabold text-sm text-slate-900">{interest.title}</h3>
                <p className="text-[11px] text-slate-500 leading-relaxed">{interest.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CONNECT & PLATFORM CTA */}
      <section className="py-16 bg-gradient-to-t from-slate-100/80 to-white border-t border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-6">
          <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 text-brand-primary flex items-center justify-center mx-auto">
            <Rocket className="w-6 h-6" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Connect with Harish Sonkar
            </h2>
            <p className="text-sm text-slate-600 max-w-lg mx-auto">
              Open to technical conversations, collaborative open-source engineering, and student transparency initiatives.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <a
              href="https://github.com/Jagadambh"
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition"
            >
              <Terminal className="w-4 h-4" />
              <span>GitHub (@Jagadambh)</span>
            </a>

            <Link
              to="/colleges"
              className="px-5 py-2.5 rounded-xl bg-brand-primary hover:bg-navy-800 text-white font-bold text-xs flex items-center gap-1.5 transition"
            >
              <span>Explore Placement Reality</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
};

export default FounderPage;
