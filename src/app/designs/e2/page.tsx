import type { Metadata } from "next";

import { DesignSwitcher } from "../switcher";
import { profile } from "../content";
import styles from "./styles.module.css";

export const metadata: Metadata = { title: "E2 · Warm Editorial" };

export default function WarmEditorial() {
  return (
    <div className={styles.page}>
      <div className={styles.in}>
        <header className={styles.mast}>
          <h1 className={styles.name}>{profile.name}</h1>
          <div className={styles.role}>SWE · Finance · Purdue</div>
        </header>
        <p className={styles.lede}>{profile.about}</p>

        <h2 className={styles.sectionTitle}>Experience</h2>
        {profile.experiences.map((exp) => (
          <article key={exp.company} className={styles.job}>
            <div className={styles.when}>{exp.dates}</div>
            <div>
              <h3 className={styles.jobTitle}>{exp.title}</h3>
              <div className={styles.co}>
                {exp.company} · {exp.location}
              </div>
              <ul className={styles.bullets}>
                {exp.bullets.map((bullet, i) => (
                  <li key={i}>{bullet}</li>
                ))}
              </ul>
              <div className={styles.skl}>
                {exp.skills.join(" · ").toUpperCase()}
              </div>
            </div>
          </article>
        ))}

        <h2 className={styles.sectionTitle}>Selected Projects</h2>
        <div className={styles.projRow}>
          {profile.projects.map((project) => (
            <article key={project.name}>
              <h3 className={styles.projName}>{project.name}</h3>
              <div className={styles.dts}>
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
                  View the repository ↗
                </a>
              ) : null}
            </article>
          ))}
        </div>

        <footer className={styles.colophon}>
          <a
            href={profile.contact.linkedin}
            target="_blank"
            rel="noopener noreferrer"
          >
            LINKEDIN
          </a>
          ·
          <a
            href={profile.contact.github}
            target="_blank"
            rel="noopener noreferrer"
          >
            GITHUB
          </a>
          ·<a href={`mailto:${profile.contact.email}`}>EMAIL</a>
          <br />
          <span className={styles.fine}>
            Set in Georgia. Published from a small Next.js press, 2026.
          </span>
        </footer>
      </div>
      <DesignSwitcher current="e2" />
    </div>
  );
}
