import type { Metadata } from "next";

import { DesignSwitcher } from "../switcher";
import { profile } from "../content";
import styles from "./styles.module.css";

export const metadata: Metadata = { title: "F1 · Aurora" };

export default function Aurora() {
  return (
    <div className={styles.page}>
      <div className={styles.ribbonOne} aria-hidden />
      <div className={styles.ribbonTwo} aria-hidden />
      <div className={styles.in}>
        <header className={styles.hero}>
          <h1 className={styles.name}>{profile.name}</h1>
          <div className={styles.headline}>
            {profile.headline} — Purdue University
          </div>
        </header>

        <h2 className={styles.sectionTitle}>Experience</h2>
        {profile.experiences.map((exp) => (
          <article key={exp.company} className={styles.glass}>
            <h3 className={styles.jobTitle}>
              {exp.title} · {exp.company}
            </h3>
            <div className={styles.sub}>
              {exp.dates} · {exp.location}
            </div>
            <ul className={styles.bullets}>
              {exp.bullets.map((bullet, i) => (
                <li key={i}>{bullet}</li>
              ))}
            </ul>
            <div className={styles.chips}>
              {exp.skills.map((skill) => (
                <span key={skill} className={styles.chip}>
                  {skill}
                </span>
              ))}
            </div>
          </article>
        ))}

        <h2 className={styles.sectionTitle}>Projects</h2>
        <div className={styles.projRow}>
          {profile.projects.map((project) => (
            <article key={project.name} className={styles.glass}>
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
                  Repo ↗
                </a>
              ) : null}
            </article>
          ))}
        </div>

        <div className={styles.cta}>
          <a className={styles.solid} href={`mailto:${profile.contact.email}`}>
            Email me
          </a>
          <a
            className={styles.ghostBtn}
            href={profile.contact.linkedin}
            target="_blank"
            rel="noopener noreferrer"
          >
            LinkedIn
          </a>
          <a
            className={styles.ghostBtn}
            href={profile.contact.github}
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
        </div>
      </div>
      <DesignSwitcher current="f1" />
    </div>
  );
}
