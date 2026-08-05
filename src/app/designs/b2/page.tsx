import type { Metadata } from "next";

import { DesignSwitcher } from "../switcher";
import { profile } from "../content";
import styles from "./styles.module.css";

export const metadata: Metadata = { title: "B2 · Neon Bento" };

const SKILL_DOTS: [string, string][] = [
  ["React", "#61dafb"],
  ["TypeScript", "#3178c6"],
  ["Python", "#3776ab"],
  ["C# / .NET", "#a78bfa"],
  ["Java", "#f87171"],
  ["Docker", "#22d3ee"],
  ["Kubernetes", "#818cf8"],
  ["Next.js", "#e4e4e7"],
];

export default function NeonBento() {
  return (
    <div className={styles.page}>
      <div className={styles.blobOne} aria-hidden />
      <div className={styles.blobTwo} aria-hidden />
      <div className={styles.grid}>
        <section className={`${styles.card} ${styles.intro}`}>
          <div className={styles.avatar}>MW</div>
          <h1 className={styles.name}>{profile.name}</h1>
          <div className={styles.headline}>{profile.headline}</div>
          <p className={styles.introText}>{profile.about}</p>
        </section>

        <section className={`${styles.card} ${styles.span2}`}>
          <h2 className={styles.cardTitle}>Toolbox</h2>
          {SKILL_DOTS.map(([skill, color]) => (
            <span key={skill} className={styles.skill}>
              <span className={styles.dot} style={{ background: color }} />
              {skill}
            </span>
          ))}
        </section>

        <section className={styles.fun}>
          <h2 className={styles.cardTitle}>Beyond work</h2>
          <p className={styles.funText}>{profile.beyondWork}</p>
        </section>

        <section
          className={`${styles.card} ${styles.span2}`}
          style={{ gridRow: "span 2" }}
        >
          <h2 className={styles.cardTitle}>Experience</h2>
          {profile.experiences.map((exp) => (
            <div key={exp.company} className={styles.job}>
              <div className={styles.jobLogo}>{exp.logo}</div>
              <div>
                <h3 className={styles.jobTitle}>
                  {exp.title} — {exp.company}
                </h3>
                <div className={styles.jobSub}>
                  {exp.dates} · {exp.location}
                </div>
                <ul className={styles.jobBullets}>
                  {exp.bullets.map((bullet, i) => (
                    <li key={i}>{bullet}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </section>

        {profile.projects.map((project) => (
          <section key={project.name} className={styles.card}>
            <h3 className={styles.projName}>{project.name}</h3>
            <div className={styles.projOrg}>
              {project.org} · {project.dates}
            </div>
            <p className={styles.projText}>{project.bullets[0]}</p>
            {project.repoUrl ? (
              <a
                className={styles.repo}
                href={project.repoUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                View repo →
              </a>
            ) : null}
          </section>
        ))}

        <section className={`${styles.card} ${styles.span4} ${styles.contact}`}>
          <h2 className={styles.cardTitle} style={{ margin: 0 }}>
            Contact
          </h2>
          <div className={styles.contactBtns}>
            <a className={styles.cbtnHot} href={`mailto:${profile.contact.email}`}>
              Email
            </a>
            <a
              className={styles.cbtn}
              href={profile.contact.linkedin}
              target="_blank"
              rel="noopener noreferrer"
            >
              LinkedIn
            </a>
            <a
              className={styles.cbtn}
              href={profile.contact.github}
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
          </div>
        </section>
      </div>
      <DesignSwitcher current="b2" />
    </div>
  );
}
