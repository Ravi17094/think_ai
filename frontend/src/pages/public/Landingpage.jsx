import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import './Landingpage.css';

const TERMINAL_LINES = [
  '<span class="kw">from</span> thinkz <span class="kw">import</span> trainer\n',
  '<span class="fn">model</span> = trainer.fine_tune(\n  base=<span class="str">"llama-3-8b"</span>,\n  data=<span class="str">"support_tickets.jsonl"</span>\n)\n',
  '<span class="cm"># running eval suite...</span>\n',
  '<span class="fn">model</span>.evaluate()  <span class="cm"> → 94.2% accuracy</span>',
];

const COURSES = [
  { thumb: 't1', icon: '</>', duration: '12h 40m', cat: 'Generative AI', title: 'Building Production LLM Apps with RAG', meta: 'Ananya Rao \u00b7 Updated Jul 2026', rating: '4.8', ratingCount: '9,204', oldPrice: '\u20b92,999', price: '\u20b9549' },
  { thumb: 't2', icon: '\u0192(x)', cat: 'Data Science', title: 'Applied Machine Learning from Scratch', meta: 'Rohit Menon \u00b7 Updated Jun 2026', rating: '4.7', ratingCount: '14,510', oldPrice: '\u20b93,499', price: '\u20b9599' },
  { thumb: 't3', icon: '{ }', cat: 'Web Development', title: 'Full-Stack TypeScript: React to Node', meta: 'Priya Nambiar \u00b7 Updated Jul 2026', rating: '4.6', ratingCount: '21,033', oldPrice: '\u20b92,499', price: '\u20b9499' },
  { thumb: 't4', icon: 'DSA', cat: 'Interviews', title: 'DSA Interview Mastery — 150 Problems', meta: 'Karthik Iyer \u00b7 Updated May 2026', rating: '4.9', ratingCount: '31,882', oldPrice: '\u20b91,999', price: '\u20b9449' },
  { thumb: 't5', icon: '\u2601', cat: 'Cloud & DevOps', title: 'AWS for AI Engineers: Deploy at Scale', meta: 'Sana Fatima \u00b7 Updated Jun 2026', rating: '4.5', ratingCount: '6,301', oldPrice: '\u20b93,199', price: '\u20b9649' },
  { thumb: 't6', icon: '\u25c8', cat: 'Design', title: 'Product Design Systems with Figma', meta: 'Devika Shetty \u00b7 Updated Jul 2026', rating: '4.6', ratingCount: '8,742', oldPrice: '\u20b92,199', price: '\u20b9499' },
  { thumb: 't7', icon: '\u03c0', cat: 'Data Science', title: 'Statistics & Probability for ML', meta: 'Arjun Bhat \u00b7 Updated Apr 2026', rating: '4.7', ratingCount: '5,410', oldPrice: '\u20b91,799', price: '\u20b9399' },
  { thumb: 't8', icon: '\u2318', cat: 'Product', title: 'AI Product Management in Practice', meta: 'Meera Krishnan \u00b7 Updated Jun 2026', rating: '4.8', ratingCount: '3,996', oldPrice: '\u20b92,899', price: '\u20b9599' },
];

const PATHS = [
  { title: 'Python & Programming Foundations', desc: 'Syntax, data structures, and your first 5 shipped scripts' },
  { title: 'Data Handling with Pandas & SQL', desc: 'Clean, query, and reason about real datasets' },
  { title: 'Machine Learning Fundamentals', desc: 'Train, evaluate, and explain your first models' },
  { title: 'Applied LLMs & RAG Systems', desc: 'Fine-tune, prompt, and deploy production AI apps' },
  { title: 'Capstone: Ship a Portfolio Project', desc: 'Get it reviewed by a working AI engineer, live' },
];

const CATEGORIES = ['All', 'Generative AI', 'Web Development', 'Data Science', 'DSA & Interviews', 'Cloud & DevOps', 'Product', 'Design'];

export default function LandingPage() {
  const termRef = useRef(null);
  const badgeRef = useRef(null);
  const rootRef = useRef(null);
  const [activeCategory, setActiveCategory] = useState('All');

  useEffect(() => {
    let li = 0;
    let ci = 0;
    let buffer = '';
    let timeoutId;

    function escapeAndTag(raw, count) {
      let visible = 0, out = '', i = 0;
      while (i < raw.length && visible < count) {
        if (raw[i] === '<') {
          const close = raw.indexOf('>', i);
          out += raw.slice(i, close + 1);
          i = close + 1;
        } else {
          out += raw[i];
          visible++;
          i++;
        }
      }
      return out;
    }

    function typeNext() {
      const el = termRef.current;
      const badge = badgeRef.current;
      if (!el || !badge) return;

      if (li >= TERMINAL_LINES.length) {
        badge.classList.add('show');
        return;
      }
      const raw = TERMINAL_LINES[li];
      ci++;
      const plain = raw.replace(/<[^>]+>/g, '');
      if (ci <= plain.length) {
        el.innerHTML = buffer + escapeAndTag(raw, ci) + '<span class="caret"></span>';
        timeoutId = setTimeout(typeNext, 14 + Math.random() * 18);
      } else {
        buffer += raw;
        el.innerHTML = buffer + '<span class="caret"></span>';
        li++;
        ci = 0;
        timeoutId = setTimeout(typeNext, 260);
      }
    }

    timeoutId = setTimeout(typeNext, 200);
    return () => clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const targets = root.querySelectorAll('.reveal');
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    targets.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div className="landing-page" ref={rootRef}>
      <header>
        <div className="wrap nav">
          <div className="logo">
            <span className="logo-mark">tz</span>Thinkz<span style={{ color: 'var(--amber)' }}>.ai</span>
          </div>
          <nav className="nav-links">
            <a href="#courses">Courses</a>
            <a href="#paths">Learning paths</a>
            <a href="#why">Why Thinkz</a>
            <a href="#">For teams</a>
          </nav>
          <div className="nav-cta">
            <Link to="/login" className="btn btn-ghost-dark hide-mobile">Log in</Link>
            <Link to="/login" className="btn btn-amber">Get started</Link>
          </div>
        </div>
      </header>

      <section className="hero">
        <div className="wrap hero-grid">
          <div>
            <div className="eyebrow">● Live cohorts open this week</div>
            <h1>Learn the skill.<br />Ship the <span className="accent">proof.</span></h1>
            <p className="lead">Thinkz AI is where builders learn by shipping {'\u2014'} code-first courses in AI, data and software, taught by people who ship for a living.</p>
            <div className="hero-actions">
              <a href="#courses" className="btn btn-amber btn-lg">Browse courses</a>
              <a href="#paths" className="btn btn-ghost-dark btn-lg">See learning paths</a>
            </div>
            <div className="hero-stats">
              <div className="stat"><b>420K+</b><span>learners</span></div>
              <div className="stat"><b>1,180</b><span>hands-on courses</span></div>
              <div className="stat"><b>4.7★</b><span>avg. rating</span></div>
            </div>
          </div>

          <div className="signature">
            <div className="term-bar">
              <span className="dot r" /><span className="dot y" /><span className="dot g" />
              <span className="term-title mono">module_04_train.py</span>
            </div>
            <div className="term-body">
              <div className="term-line mono" ref={termRef} />
              <div className="badge-reveal" ref={badgeRef}>
                <div className="badge-check">✓</div>
                <div>
                  <b>Skill verified: Model Fine-tuning</b>
                  <span>Added to your Thinkz profile</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="cat-rail">
        <div className="wrap">
          {CATEGORIES.map((cat) => (
            <div
              key={cat}
              className={`pill ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </div>
          ))}
        </div>
      </div>

      <section id="courses">
        <div className="wrap">
          <div className="sec-head reveal">
            <div>
              <h2>Courses people actually finish</h2>
              <p>Project-graded, not just video-watched {'\u2014'} every course ends with something you can show.</p>
            </div>
            <a href="#" className="sec-link">View all 1,180 courses →</a>
          </div>

          <div className="course-grid">
            {COURSES.map((c) => (
              <div className="course-card reveal" key={c.title}>
                <div className={`course-thumb ${c.thumb}`}>
                  {c.icon}
                  {c.duration && <span>{c.duration}</span>}
                </div>
                <div className="course-body">
                  <div className="course-cat">{c.cat}</div>
                  <div className="course-title">{c.title}</div>
                  <div className="course-meta">{c.meta}</div>
                  <div className="course-rating">{c.rating} <span>({c.ratingCount} ratings)</span></div>
                  <div className="course-foot">
                    <div className="price"><span className="old">{c.oldPrice}</span>{c.price}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="paths" className="path-section">
        <div className="wrap">
          <div className="sec-head reveal">
            <div>
              <h2>Learning paths, not just a course list</h2>
              <p>Follow a sequence built by hiring engineers {'\u2014'} each stage unlocks the next once you ship the project.</p>
            </div>
          </div>
          <div className="path-list">
            {PATHS.map((p, i) => (
              <div className="path-item reveal" key={p.title}>
                <div className="path-num"><b>{String(i + 1).padStart(2, '0')}</b>of 05</div>
                <div className="path-info">
                  <h3>{p.title}</h3>
                  <p>{p.desc}</p>
                </div>
                <div className="path-arrow"> →</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="why">
        <div className="wrap">
          <div className="sec-head reveal">
            <div>
              <h2>Why learners pick Thinkz AI</h2>
              <p>Built around one idea: a certificate means nothing until you've shipped something with it.</p>
            </div>
          </div>
          <div className="feat-grid">
            <div className="feat reveal">
              <div className="feat-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 18l6-6-6-6M8 6l-6 6 6 6" /></svg>
              </div>
              <h3>Project-graded courses</h3>
              <p>Every course ends in a real, reviewed project — not a multiple-choice quiz.</p>
            </div>
            <div className="feat reveal">
              <div className="feat-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></svg>
              </div>
              <h3>Learn at your pace</h3>
              <p>Self-paced by default, with weekly live cohorts when you want structure.</p>
            </div>
            <div className="feat reveal">
              <div className="feat-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 12l2 2 4-4M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <h3>Skill badges, not vanity certs</h3>
              <p>Each verified skill goes on a public profile you can actually link on a resume.</p>
            </div>
            <div className="feat reveal">
              <div className="feat-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg>
              </div>
              <h3>Taught by working engineers</h3>
              <p>Instructors ship in production at the companies you're trying to get into.</p>
            </div>
            <div className="feat reveal">
              <div className="feat-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
              </div>
              <h3>Code reviews included</h3>
              <p>Submit your project, get line-by-line feedback before you call it done.</p>
            </div>
            <div className="feat reveal">
              <div className="feat-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>
              </div>
              <h3>Paths, not a random playlist</h3>
              <p>Structured sequences that build on each other, so nothing feels disconnected.</p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="wrap">
          <div className="sec-head reveal">
            <div><h2>What learners say</h2></div>
          </div>
          <div className="test-grid">
            <div className="test reveal">
              <p>"First platform where I actually built something I could show in an interview {'\u2014'} not just watched videos."</p>
              <div className="test-who">
                <div className="avatar" style={{ background: '#6C5CE7' }}>RS</div>
                <div><b>Rahul Sharma</b><span>Applied ML path, hired at a fintech startup</span></div>
              </div>
            </div>
            <div className="test reveal">
              <p>"The code reviews are what set it apart. A real engineer actually read my project and told me what was wrong."</p>
              <div className="test-who">
                <div className="avatar" style={{ background: '#1C1D1F', color: '#fff' }}>NT</div>
                <div><b>Neha Thomas</b><span>Full-Stack TypeScript course</span></div>
              </div>
            </div>
            <div className="test reveal">
              <p>"Went from zero to shipping a RAG chatbot in six weeks. The path made it feel achievable, not overwhelming."</p>
              <div className="test-who">
                <div className="avatar" style={{ background: '#2DD4BF', color: '#0D1B1E' }}>AV</div>
                <div><b>Aditya Verma</b><span>Applied LLMs & RAG Systems</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="cta-band reveal">
          <h2>Your next skill is one project away.</h2>
          <p>Join 420,000+ learners building things worth showing.</p>
          <Link to="/login" className="btn btn-amber btn-lg">Start learning free</Link>
        </div>
      </section>

      <footer>
        <div className="wrap">
          <div className="foot-grid">
            <div className="foot-col">
              <div className="logo" style={{ marginBottom: 14 }}>
                <span className="logo-mark">tz</span>Thinkz<span style={{ color: 'var(--amber)' }}>.ai</span>
              </div>
              <p style={{ fontSize: 13.5, maxWidth: 260, color: 'var(--muted-light)' }}>
                A project-graded learning platform for AI, data, and software skills.
              </p>
            </div>
            <div className="foot-col">
              <h4>Learn</h4>
              <a href="#">Courses</a><a href="#">Learning paths</a><a href="#">Skill badges</a><a href="#">Live cohorts</a>
            </div>
            <div className="foot-col">
              <h4>Company</h4>
              <a href="#">About</a><a href="#">Careers</a><a href="#">Become an instructor</a><a href="#">Contact</a>
            </div>
            <div className="foot-col">
              <h4>Legal</h4>
              <a href="#">Terms</a><a href="#">Privacy</a><a href="#">Refund policy</a>
            </div>
          </div>
          <div className="foot-bottom">
            <span>{'\u00a9'} 2026 Thinkz AI. All rights reserved.</span>
            <span>Made for people who'd rather ship than scroll.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}